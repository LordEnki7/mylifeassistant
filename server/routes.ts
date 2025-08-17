import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { BackupService } from "./backupService";
import { aiAutomationService } from "./aiAutomationService";
// Note: Using validation schemas from middleware instead of Drizzle-generated ones
// The middleware schemas are designed for request validation (no userId required)
// while Drizzle schemas are for database operations (userId required)

// Security Middleware Imports
import { requireAuth, getUserId, generateToken, loginHardwiredUser } from "./middleware/auth";
import { 
  apiRateLimit, 
  emailRateLimit, 
  aiRateLimit, 
  progressiveDelay,
  emailQueue 
} from "./middleware/rateLimiting";
import { auditLogger, auditMiddleware } from "./middleware/auditLogger";
import { 
  validateRequest, 
  validateQuery, 
  sanitizeMiddleware, 
  schemas 
} from "./middleware/inputValidation";
import { contentFilter } from "./middleware/contentFilter";
import { validateAndFixTools, performAIHealthCheck } from "./middleware/aiValidation";
import { aiMonitoringService, withAIMonitoring } from "./middleware/aiMonitoring";
import { aiProcessor } from "./ai/core";
import { dataDiscoveryService } from "./ai/dataDiscovery";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply global security middleware
  app.use(sanitizeMiddleware);
  app.use(auditMiddleware);
  app.use(apiRateLimit);
  app.use(progressiveDelay);

  // Health check endpoint (no auth required)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI system health check endpoint
  // AI Monitoring Control Endpoints
  app.get("/api/ai/monitoring/status", async (req, res) => {
    try {
      const health = aiMonitoringService.getHealthStatus();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: "Failed to get monitoring status" });
    }
  });

  app.post("/api/ai/monitoring/reset", async (req, res) => {
    try {
      aiMonitoringService.resetMetrics();
      res.json({ message: "AI monitoring metrics reset successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset monitoring metrics" });
    }
  });

  app.get("/api/ai/monitoring/log", async (req, res) => {
    try {
      aiMonitoringService.logHealthStatus();
      res.json({ message: "Health status logged to console" });
    } catch (error) {
      res.status(500).json({ error: "Failed to log health status" });
    }
  });

  // Data Discovery Endpoints
  app.post("/api/ai/discover", requireAuth, async (req, res) => {
    try {
      const { topic, dataTypes } = req.body;
      const userId = getUserId(req);
      
      const results = await dataDiscoveryService.discoverData(topic, userId, dataTypes);
      const externalSuggestions = await dataDiscoveryService.suggestExternalSources(topic);
      
      res.json({ 
        results, 
        externalSuggestions,
        count: results.length 
      });
    } catch (error) {
      res.status(500).json({ error: "Data discovery failed" });
    }
  });

  app.get("/api/ai/health", async (req, res) => {
    try {
      const healthCheck = performAIHealthCheck();
      
      // Also test basic OpenAI connectivity
      const testOpenAI = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const completion = await testOpenAI.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 5,
        temperature: 0
      });
      
      const aiHealth = aiMonitoringService.getHealthStatus();
      
      res.json({
        status: healthCheck.healthy && aiHealth.status !== 'critical' ? "healthy" : "unhealthy",
        config_issues: healthCheck.issues,
        ai_metrics: aiHealth.metrics,
        ai_status: aiHealth.status,
        recommendations: aiHealth.recommendations,
        openai_connectivity: "working",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        issues: ["OpenAI API connectivity failed"],
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // OpenAI API key test endpoint
  app.get("/api/test-openai", async (req, res) => {
    try {
      const testOpenAI = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const completion = await testOpenAI.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Say 'API key working' and nothing else." }],
        max_tokens: 10,
        temperature: 0
      });
      
      res.json({ 
        success: true, 
        keyWorking: true,
        response: completion.choices[0].message.content,
        apiKey: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'not found'
      });
    } catch (error) {
      res.json({ 
        success: false, 
        keyWorking: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        apiKey: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'not found'
      });
    }
  });

  // Authentication endpoints (no auth required)
  app.post("/api/auth/login", async (req, res) => {
    try {
      await auditLogger.logAuth(req, 'login', true);
      const { token, user } = await loginHardwiredUser();
      res.json({ token, user });
    } catch (error) {
      await auditLogger.logAuth(req, 'login', false, error instanceof Error ? error.message : 'Login failed');
      res.status(401).json({ error: "Authentication failed", message: error instanceof Error ? error.message : "Login failed" });
    }
  });

  // Backup endpoint (authenticated)
  app.get("/api/backup/download", requireAuth, async (req, res) => {
    try {
      await auditLogger.logDataAccess(req, 'read', 'backup', 'system', true);
      const backupService = new BackupService();
      await backupService.createBackup(res);
    } catch (error) {
      console.error('Backup failed:', error);
      await auditLogger.logDataAccess(req, 'read', 'backup', 'system', false);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create backup", message: error instanceof Error ? error.message : "Unknown error" });
      }
    }
  });

  // AI Automation endpoints
  app.get("/api/automation/jobs", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const jobs = await storage.getAiAutomationJobs(userId);
      await auditLogger.logDataAccess(req, 'read', 'automation_jobs', userId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation jobs" });
    }
  });

  app.post("/api/automation/jobs", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { name, type, config } = req.body;
      
      const job = await aiAutomationService.createAutomationJob(userId, name, type, config);
      await auditLogger.logDataAccess(req, 'create', 'automation_job', job.id, true);
      res.json(job);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'automation_job', undefined, false);
      res.status(400).json({ error: "Failed to create automation job" });
    }
  });

  app.put("/api/automation/jobs/:id/pause", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await aiAutomationService.pauseJob(id);
      await auditLogger.logDataAccess(req, 'update', 'automation_job', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'automation_job', req.params.id, false);
      res.status(400).json({ error: "Failed to pause job" });
    }
  });

  app.put("/api/automation/jobs/:id/resume", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await aiAutomationService.resumeJob(id);
      await auditLogger.logDataAccess(req, 'update', 'automation_job', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'automation_job', req.params.id, false);
      res.status(400).json({ error: "Failed to resume job" });
    }
  });

  app.get("/api/automation/jobs/:id/status", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const status = await aiAutomationService.getJobStatus(id);
      await auditLogger.logDataAccess(req, 'read', 'automation_job_status', id);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get job status" });
    }
  });

  app.post("/api/automation/jobs/:id/execute", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      // Execute job asynchronously
      aiAutomationService.executeJob(id).catch(error => {
        console.error(`Job execution failed for ${id}:`, error);
      });
      await auditLogger.logDataAccess(req, 'update', 'automation_job', id, true);
      res.json({ message: "Job execution started" });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'automation_job', req.params.id, false);
      res.status(400).json({ error: "Failed to execute job" });
    }
  });

  app.get("/api/automation/campaigns", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaigns = await storage.getAutomationCampaigns(userId);
      await auditLogger.logDataAccess(req, 'read', 'automation_campaigns', userId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automation campaigns" });
    }
  });

  app.get("/api/automation/tasks", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const tasks = await storage.getAutomatedTasks(userId);
      await auditLogger.logDataAccess(req, 'read', 'automated_tasks', userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automated tasks" });
    }
  });

  app.get("/api/content-analysis", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const analysis = await storage.getContentAnalysis(userId);
      await auditLogger.logDataAccess(req, 'read', 'content_analysis', userId);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content analysis" });
    }
  });

  // Smart Learning & Analytics endpoints (for AI automation efficiency enhancement)
  
  // Campaign Performance Metrics
  app.get("/api/analytics/performance-metrics", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { campaignId } = req.query;
      const metrics = await storage.getCampaignPerformanceMetrics(userId, campaignId as string);
      await auditLogger.logDataAccess(req, 'read', 'performance_metrics', userId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  app.post("/api/analytics/performance-metrics", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const metricData = { ...req.body, userId };
      const metric = await storage.createCampaignPerformanceMetric(metricData);
      await auditLogger.logDataAccess(req, 'create', 'performance_metric', metric.id, true);
      res.json(metric);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'performance_metric', undefined, false);
      res.status(400).json({ error: "Failed to create performance metric" });
    }
  });

  app.get("/api/analytics/performance-metrics/timeframe", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { startDate, endDate } = req.query;
      const metrics = await storage.getPerformanceMetricsByTimeframe(
        userId, 
        new Date(startDate as string), 
        new Date(endDate as string)
      );
      await auditLogger.logDataAccess(req, 'read', 'performance_metrics_timeframe', userId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance metrics by timeframe" });
    }
  });

  // AI Learning Data
  app.get("/api/analytics/learning-data", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { context } = req.query;
      const learningData = await storage.getAiLearningData(userId, context as string);
      await auditLogger.logDataAccess(req, 'read', 'learning_data', userId);
      res.json(learningData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI learning data" });
    }
  });

  app.post("/api/analytics/learning-data", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const learningData = { ...req.body, userId };
      const data = await storage.createAiLearningData(learningData);
      await auditLogger.logDataAccess(req, 'create', 'learning_data', data.id, true);
      res.json(data);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'learning_data', undefined, false);
      res.status(400).json({ error: "Failed to create AI learning data" });
    }
  });

  app.get("/api/analytics/learning-patterns", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const patterns = await storage.getActiveLearningPatterns(userId);
      await auditLogger.logDataAccess(req, 'read', 'learning_patterns', userId);
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch learning patterns" });
    }
  });

  // Success Prediction Scores
  app.get("/api/analytics/success-predictions", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { targetType } = req.query;
      const predictions = await storage.getSuccessPredictionScores(userId, targetType as string);
      await auditLogger.logDataAccess(req, 'read', 'success_predictions', userId);
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch success predictions" });
    }
  });

  app.post("/api/analytics/success-predictions", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const predictionData = { ...req.body, userId };
      const prediction = await storage.createSuccessPredictionScore(predictionData);
      await auditLogger.logDataAccess(req, 'create', 'success_prediction', prediction.id, true);
      res.json(prediction);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'success_prediction', undefined, false);
      res.status(400).json({ error: "Failed to create success prediction" });
    }
  });

  app.get("/api/analytics/predictions-validation", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const predictions = await storage.getPredictionsForValidation(userId);
      await auditLogger.logDataAccess(req, 'read', 'predictions_validation', userId);
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch predictions for validation" });
    }
  });

  // Adaptive Scheduling Data
  app.get("/api/analytics/adaptive-scheduling", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { context } = req.query;
      const schedulingData = await storage.getAdaptiveSchedulingData(userId, context as string);
      await auditLogger.logDataAccess(req, 'read', 'adaptive_scheduling', userId);
      res.json(schedulingData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch adaptive scheduling data" });
    }
  });

  app.post("/api/analytics/adaptive-scheduling", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const schedulingData = { ...req.body, userId };
      const data = await storage.createAdaptiveSchedulingData(schedulingData);
      await auditLogger.logDataAccess(req, 'create', 'adaptive_scheduling', data.id, true);
      res.json(data);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'adaptive_scheduling', undefined, false);
      res.status(400).json({ error: "Failed to create adaptive scheduling data" });
    }
  });

  app.get("/api/analytics/optimal-timing", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { context, targetType } = req.query;
      const optimalTime = await storage.getOptimalSchedulingTime(userId, context as string, targetType as string);
      await auditLogger.logDataAccess(req, 'read', 'optimal_timing', userId);
      res.json(optimalTime);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch optimal scheduling time" });
    }
  });

  // Performance Analytics
  app.get("/api/analytics/performance", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { timeframe, category } = req.query;
      const analytics = await storage.getPerformanceAnalytics(userId, timeframe as string, category as string);
      await auditLogger.logDataAccess(req, 'read', 'performance_analytics', userId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance analytics" });
    }
  });

  app.post("/api/analytics/performance", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const analyticsData = { ...req.body, userId };
      const analytics = await storage.createPerformanceAnalytics(analyticsData);
      await auditLogger.logDataAccess(req, 'create', 'performance_analytics', analytics.id, true);
      res.json(analytics);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'performance_analytics', undefined, false);
      res.status(400).json({ error: "Failed to create performance analytics" });
    }
  });

  app.get("/api/analytics/latest-analytics", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { category } = req.query;
      const analytics = await storage.getLatestAnalytics(userId, category as string);
      await auditLogger.logDataAccess(req, 'read', 'latest_analytics', userId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest analytics" });
    }
  });

  // Trend Analysis
  app.get("/api/analytics/trends", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { trendType, isActive } = req.query;
      const trends = await storage.getTrendAnalysis(
        userId, 
        trendType as string, 
        isActive ? isActive === 'true' : undefined
      );
      await auditLogger.logDataAccess(req, 'read', 'trend_analysis', userId);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trend analysis" });
    }
  });

  app.post("/api/analytics/trends", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const trendData = { ...req.body, userId };
      const trend = await storage.createTrendAnalysis(trendData);
      await auditLogger.logDataAccess(req, 'create', 'trend_analysis', trend.id, true);
      res.json(trend);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'trend_analysis', undefined, false);
      res.status(400).json({ error: "Failed to create trend analysis" });
    }
  });

  app.get("/api/analytics/active-trends", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const trends = await storage.getActiveTrends(userId);
      await auditLogger.logDataAccess(req, 'read', 'active_trends', userId);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active trends" });
    }
  });

  // Real-time Monitoring & Dashboard endpoints
  app.get("/api/monitoring/real-time-metrics", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { timeWindow, metricType } = req.query;
      const metrics = await storage.getRealTimeMetrics(userId, timeWindow as string, metricType as string);
      await auditLogger.logDataAccess(req, 'read', 'real_time_metrics', userId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch real-time metrics" });
    }
  });

  app.post("/api/monitoring/real-time-metrics", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const metricData = { ...req.body, userId };
      const metric = await storage.createRealTimeMetric(metricData);
      await auditLogger.logDataAccess(req, 'create', 'real_time_metric', metric.id, true);
      res.json(metric);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'real_time_metric', undefined, false);
      res.status(400).json({ error: "Failed to create real-time metric" });
    }
  });

  app.get("/api/monitoring/active-alerts", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const alerts = await storage.getActiveAlerts(userId);
      await auditLogger.logDataAccess(req, 'read', 'active_alerts', userId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active alerts" });
    }
  });

  app.get("/api/monitoring/job-metrics/:jobId", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.params;
      const metrics = await storage.getMetricsByJob(jobId);
      await auditLogger.logDataAccess(req, 'read', 'job_metrics', jobId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job metrics" });
    }
  });

  // A/B Testing System endpoints
  app.get("/api/ab-testing/campaigns", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { status } = req.query;
      const campaigns = await storage.getAbTestCampaigns(userId, status as string);
      await auditLogger.logDataAccess(req, 'read', 'ab_test_campaigns', userId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B test campaigns" });
    }
  });

  app.post("/api/ab-testing/campaigns", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaignData = { ...req.body, userId };
      const campaign = await storage.createAbTestCampaign(campaignData);
      await auditLogger.logDataAccess(req, 'create', 'ab_test_campaign', campaign.id, true);
      res.json(campaign);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'ab_test_campaign', undefined, false);
      res.status(400).json({ error: "Failed to create A/B test campaign" });
    }
  });

  app.get("/api/ab-testing/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getAbTestCampaign(id);
      if (!campaign) {
        return res.status(404).json({ error: "A/B test campaign not found" });
      }
      await auditLogger.logDataAccess(req, 'read', 'ab_test_campaign', id);
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B test campaign" });
    }
  });

  app.get("/api/ab-testing/campaigns/:id/variants", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const variants = await storage.getAbTestVariants(id);
      await auditLogger.logDataAccess(req, 'read', 'ab_test_variants', id);
      res.json(variants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B test variants" });
    }
  });

  app.post("/api/ab-testing/variants", requireAuth, async (req, res) => {
    try {
      const variant = await storage.createAbTestVariant(req.body);
      await auditLogger.logDataAccess(req, 'create', 'ab_test_variant', variant.id, true);
      res.json(variant);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'ab_test_variant', undefined, false);
      res.status(400).json({ error: "Failed to create A/B test variant" });
    }
  });

  app.get("/api/ab-testing/campaigns/:id/results", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { variantId } = req.query;
      const results = await storage.getAbTestResults(id, variantId as string);
      await auditLogger.logDataAccess(req, 'read', 'ab_test_results', id);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B test results" });
    }
  });

  app.post("/api/ab-testing/results", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const resultData = { ...req.body, userId };
      const result = await storage.createAbTestResult(resultData);
      await auditLogger.logDataAccess(req, 'create', 'ab_test_result', result.id, true);
      res.json(result);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'ab_test_result', undefined, false);
      res.status(400).json({ error: "Failed to create A/B test result" });
    }
  });

  app.get("/api/ab-testing/campaigns/:id/analysis", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const analysis = await storage.getAbTestAnalysis(id);
      await auditLogger.logDataAccess(req, 'read', 'ab_test_analysis', id);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B test analysis" });
    }
  });

  // Content Optimization System endpoints
  app.get("/api/content-optimization/suggestions", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { status, contentType } = req.query;
      const suggestions = await storage.getContentOptimizationSuggestions(userId, status as string, contentType as string);
      await auditLogger.logDataAccess(req, 'read', 'content_optimization_suggestions', userId);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content optimization suggestions" });
    }
  });

  app.post("/api/content-optimization/suggestions", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const suggestionData = { ...req.body, userId };
      const suggestion = await storage.createContentOptimizationSuggestion(suggestionData);
      await auditLogger.logDataAccess(req, 'create', 'content_optimization_suggestion', suggestion.id, true);
      res.json(suggestion);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'content_optimization_suggestion', undefined, false);
      res.status(400).json({ error: "Failed to create content optimization suggestion" });
    }
  });

  app.put("/api/content-optimization/suggestions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const suggestion = await storage.updateContentOptimizationSuggestion(id, req.body);
      if (!suggestion) {
        return res.status(404).json({ error: "Content optimization suggestion not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'content_optimization_suggestion', id, true);
      res.json(suggestion);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'content_optimization_suggestion', req.params.id, false);
      res.status(400).json({ error: "Failed to update content optimization suggestion" });
    }
  });

  app.get("/api/content-optimization/performance-history", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { contentType, platform } = req.query;
      const history = await storage.getContentPerformanceHistory(userId, contentType as string, platform as string);
      await auditLogger.logDataAccess(req, 'read', 'content_performance_history', userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content performance history" });
    }
  });

  app.post("/api/content-optimization/performance-history", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const historyData = { ...req.body, userId };
      const history = await storage.createContentPerformanceHistory(historyData);
      await auditLogger.logDataAccess(req, 'create', 'content_performance_history', history.id, true);
      res.json(history);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'content_performance_history', undefined, false);
      res.status(400).json({ error: "Failed to create content performance history" });
    }
  });

  app.get("/api/content-optimization/top-performing/:contentType", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { contentType } = req.params;
      const { limit } = req.query;
      const topContent = await storage.getTopPerformingContent(userId, contentType, limit ? parseInt(limit as string) : undefined);
      await auditLogger.logDataAccess(req, 'read', 'top_performing_content', userId);
      res.json(topContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top performing content" });
    }
  });

  app.get("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      await auditLogger.logDataAccess(req, 'read', 'user', userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Dashboard (protected)
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const stats = await storage.getDashboardStats(userId);
      await auditLogger.logDataAccess(req, 'read', 'dashboard_stats', userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Contacts (all protected)
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const contacts = await storage.getContacts(userId);
      await auditLogger.logDataAccess(req, 'read', 'contacts', userId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", requireAuth, validateRequest(schemas.contact), async (req, res) => {
    try {
      const userId = getUserId(req);
      const contactData = { ...req.body, userId };
      const contact = await storage.createContact(contactData);
      await auditLogger.logDataAccess(req, 'create', 'contact', contact.id, true);
      res.json(contact);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'contact', undefined, false);
      res.status(400).json({ error: "Invalid contact data" });
    }
  });

  app.put("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const contact = await storage.updateContact(id, req.body);
      if (!contact) {
        await auditLogger.logDataAccess(req, 'update', 'contact', id, false);
        return res.status(404).json({ error: "Contact not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'contact', id, true);
      res.json(contact);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'contact', req.params.id, false);
      res.status(400).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteContact(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'contact', id, false);
        return res.status(404).json({ error: "Contact not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'contact', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'contact', req.params.id, false);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // Radio Stations (all protected)
  app.get("/api/radio-stations", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const stations = await storage.getRadioStations(userId);
      await auditLogger.logDataAccess(req, 'read', 'radio_stations', userId);
      res.json(stations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch radio stations" });
    }
  });

  app.post("/api/radio-stations", requireAuth, validateRequest(schemas.radioStation), async (req, res) => {
    try {
      const userId = getUserId(req);
      const stationData = { ...req.body, userId };
      const station = await storage.createRadioStation(stationData);
      await auditLogger.logDataAccess(req, 'create', 'radio_station', station.id, true);
      res.json(station);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'radio_station', undefined, false);
      res.status(400).json({ error: "Invalid radio station data" });
    }
  });

  app.put("/api/radio-stations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const station = await storage.updateRadioStation(id, req.body);
      if (!station) {
        await auditLogger.logDataAccess(req, 'update', 'radio_station', id, false);
        return res.status(404).json({ error: "Radio station not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'radio_station', id, true);
      res.json(station);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'radio_station', req.params.id, false);
      res.status(400).json({ error: "Failed to update radio station" });
    }
  });

  app.delete("/api/radio-stations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteRadioStation(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'radio_station', id, false);
        return res.status(404).json({ error: "Radio station not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'radio_station', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'radio_station', req.params.id, false);
      res.status(500).json({ error: "Failed to delete radio station" });
    }
  });

  // Grants (all protected)
  app.get("/api/grants", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const grants = await storage.getGrants(userId);
      await auditLogger.logDataAccess(req, 'read', 'grants', userId);
      res.json(grants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch grants" });
    }
  });

  app.post("/api/grants", requireAuth, validateRequest(schemas.grant), async (req, res) => {
    try {
      const userId = getUserId(req);
      const grantData = { ...req.body, userId };
      const grant = await storage.createGrant(grantData);
      await auditLogger.logDataAccess(req, 'create', 'grant', grant.id, true);
      res.json(grant);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'grant', undefined, false);
      res.status(400).json({ error: "Invalid grant data" });
    }
  });

  app.put("/api/grants/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const grant = await storage.updateGrant(id, req.body);
      if (!grant) {
        await auditLogger.logDataAccess(req, 'update', 'grant', id, false);
        return res.status(404).json({ error: "Grant not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'grant', id, true);
      res.json(grant);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'grant', req.params.id, false);
      res.status(400).json({ error: "Failed to update grant" });
    }
  });

  app.delete("/api/grants/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGrant(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'grant', id, false);
        return res.status(404).json({ error: "Grant not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'grant', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'grant', req.params.id, false);
      res.status(500).json({ error: "Failed to delete grant" });
    }
  });

  // Music Contracts (all protected)
  app.get("/api/music-contracts", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const contracts = await storage.getMusicContracts(userId);
      await auditLogger.logDataAccess(req, 'read', 'music_contracts', userId);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch music contracts" });
    }
  });

  app.post("/api/music-contracts", requireAuth, validateRequest(schemas.musicContract), async (req, res) => {
    try {
      const userId = getUserId(req);
      const contractData = { ...req.body, userId };
      const contract = await storage.createMusicContract(contractData);
      await auditLogger.logDataAccess(req, 'create', 'music_contract', contract.id, true);
      res.json(contract);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'music_contract', undefined, false);
      res.status(400).json({ error: "Invalid music contract data" });
    }
  });

  app.put("/api/music-contracts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.updateMusicContract(id, req.body);
      if (!contract) {
        await auditLogger.logDataAccess(req, 'update', 'music_contract', id, false);
        return res.status(404).json({ error: "Music contract not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'music_contract', id, true);
      res.json(contract);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'music_contract', req.params.id, false);
      res.status(400).json({ error: "Failed to update music contract" });
    }
  });

  app.delete("/api/music-contracts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMusicContract(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'music_contract', id, false);
        return res.status(404).json({ error: "Music contract not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'music_contract', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'music_contract', req.params.id, false);
      res.status(500).json({ error: "Failed to delete music contract" });
    }
  });

  // Contract generation endpoint
  app.post("/api/music-contracts/:id/generate", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { variables } = req.body;
      const userId = getUserId(req);
      
      const contract = await storage.getMusicContract(id);
      if (!contract) {
        await auditLogger.logDataAccess(req, 'read', 'music_contract', id, false);
        return res.status(404).json({ error: "Music contract not found" });
      }

      // Verify the contract belongs to the user (security check)
      if (contract.userId !== userId) {
        await auditLogger.logDataAccess(req, 'read', 'music_contract', id, false);
        return res.status(403).json({ error: "Access denied" });
      }

      // Generate the contract by replacing variables in the template
      let generatedContract = contract.template;
      if (variables && typeof variables === 'object') {
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{{${key}}}`;
          generatedContract = generatedContract.replace(new RegExp(placeholder, 'g'), String(value));
        });
      }

      await auditLogger.logDataAccess(req, 'read', 'music_contract', id, true);
      res.json({ generatedContract, contract });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'read', 'music_contract', req.params.id, false);
      res.status(500).json({ error: "Failed to generate contract" });
    }
  });

  // Invoices (all protected)
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const invoices = await storage.getInvoices(userId);
      await auditLogger.logDataAccess(req, 'read', 'invoices', userId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", requireAuth, validateRequest(schemas.invoice), async (req, res) => {
    try {
      const userId = getUserId(req);
      const invoiceData = { ...req.body, userId };
      const invoice = await storage.createInvoice(invoiceData);
      await auditLogger.logDataAccess(req, 'create', 'invoice', invoice.id, true);
      res.json(invoice);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'invoice', undefined, false);
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  app.put("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.updateInvoice(id, req.body);
      if (!invoice) {
        await auditLogger.logDataAccess(req, 'update', 'invoice', id, false);
        return res.status(404).json({ error: "Invoice not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'invoice', id, true);
      res.json(invoice);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'invoice', req.params.id, false);
      res.status(400).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvoice(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'invoice', id, false);
        return res.status(404).json({ error: "Invoice not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'invoice', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'invoice', req.params.id, false);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Tasks (all protected)
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const tasks = await storage.getTasks(userId);
      await auditLogger.logDataAccess(req, 'read', 'tasks', userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, validateRequest(schemas.task), async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskData = { ...req.body, userId };
      const task = await storage.createTask(taskData);
      await auditLogger.logDataAccess(req, 'create', 'task', task.id, true);
      res.json(task);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'task', undefined, false);
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.updateTask(id, req.body);
      if (!task) {
        await auditLogger.logDataAccess(req, 'update', 'task', id, false);
        return res.status(404).json({ error: "Task not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'task', id, true);
      res.json(task);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'task', req.params.id, false);
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTask(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'task', id, false);
        return res.status(404).json({ error: "Task not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'task', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'task', req.params.id, false);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Email Campaigns (all protected with rate limiting)
  app.get("/api/email-campaigns", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaigns = await storage.getEmailCampaigns(userId);
      await auditLogger.logDataAccess(req, 'read', 'email_campaigns', userId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email campaigns" });
    }
  });

  app.post("/api/email-campaigns", requireAuth, emailRateLimit, validateRequest(schemas.emailCampaign), async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaignData = { ...req.body, userId };
      const campaign = await storage.createEmailCampaign(campaignData);
      
      // Queue emails for campaign
      const queuePromises = campaignData.recipients.map((email: string) => 
        emailQueue.addJob({
          userId,
          to: email,
          subject: campaignData.subject,
          body: campaignData.template,
          priority: 'normal'
        })
      );
      
      await Promise.all(queuePromises);
      await auditLogger.logEmail(req, campaignData, true);
      await auditLogger.logDataAccess(req, 'create', 'email_campaign', campaign.id, true);
      
      res.json(campaign);
    } catch (error) {
      await auditLogger.logEmail(req, req.body, false, error instanceof Error ? error.message : 'Campaign creation failed');
      await auditLogger.logDataAccess(req, 'create', 'email_campaign', undefined, false);
      res.status(400).json({ error: "Invalid email campaign data" });
    }
  });

  // Knowledge Docs (all protected)
  app.get("/api/knowledge-docs", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const docs = await storage.getKnowledgeDocs(userId);
      await auditLogger.logDataAccess(req, 'read', 'knowledge_docs', userId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge docs" });
    }
  });

  app.post("/api/knowledge-docs", requireAuth, validateRequest(schemas.knowledgeDoc), async (req, res) => {
    try {
      const userId = getUserId(req);
      const docData = { ...req.body, userId };
      const doc = await storage.createKnowledgeDoc(docData);
      await auditLogger.logDataAccess(req, 'create', 'knowledge_doc', doc.id, true);
      res.json(doc);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'knowledge_doc', undefined, false);
      res.status(400).json({ error: "Invalid knowledge doc data" });
    }
  });

  // Legal Document Templates (all protected)
  app.get("/api/legal-document-templates", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const category = req.query.category as string;
      
      let templates;
      if (category) {
        templates = await storage.getLegalDocumentTemplatesByCategory(userId, category);
      } else {
        templates = await storage.getLegalDocumentTemplates(userId);
      }
      
      await auditLogger.logDataAccess(req, 'read', 'legal_document_templates', userId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch legal document templates" });
    }
  });

  app.get("/api/legal-document-templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getLegalDocumentTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Legal document template not found" });
      }
      await auditLogger.logDataAccess(req, 'read', 'legal_document_template', id);
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch legal document template" });
    }
  });

  app.post("/api/legal-document-templates", requireAuth, validateRequest(schemas.legalDocumentTemplate), async (req, res) => {
    try {
      const userId = getUserId(req);
      const templateData = { ...req.body, userId };
      const template = await storage.createLegalDocumentTemplate(templateData);
      await auditLogger.logDataAccess(req, 'create', 'legal_document_template', template.id, true);
      res.json(template);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'legal_document_template', undefined, false);
      res.status(400).json({ error: "Invalid legal document template data" });
    }
  });

  app.put("/api/legal-document-templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updateLegalDocumentTemplate(id, req.body);
      if (!template) {
        await auditLogger.logDataAccess(req, 'update', 'legal_document_template', id, false);
        return res.status(404).json({ error: "Legal document template not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'legal_document_template', id, true);
      res.json(template);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'legal_document_template', req.params.id, false);
      res.status(400).json({ error: "Failed to update legal document template" });
    }
  });

  app.delete("/api/legal-document-templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteLegalDocumentTemplate(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'legal_document_template', id, false);
        return res.status(404).json({ error: "Legal document template not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'legal_document_template', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'legal_document_template', req.params.id, false);
      res.status(500).json({ error: "Failed to delete legal document template" });
    }
  });

  app.post("/api/legal-document-templates/:id/generate", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { variables } = req.body;
      
      if (!variables) {
        return res.status(400).json({ error: "Variables are required to generate document" });
      }
      
      const generatedDocument = await storage.generateDocumentFromTemplate(id, variables);
      await auditLogger.logDataAccess(req, 'create', 'legal_document', id, true);
      
      res.json({ 
        document: generatedDocument,
        templateId: id,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'legal_document', req.params.id, false);
      res.status(500).json({ error: "Failed to generate document from template" });
    }
  });

  // Chat Messages (all protected with AI rate limiting)
  app.get("/api/chat-messages", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const messages = await storage.getChatMessages(userId);
      await auditLogger.logDataAccess(req, 'read', 'chat_messages', userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat-messages", requireAuth, aiRateLimit, validateRequest(schemas.chatMessage), async (req, res) => {
    try {
      const userId = getUserId(req);
      const messageData = { ...req.body, userId };
      
      // Enhanced AI response with task management capabilities and content filtering
      const aiResponse = await aiProcessor.processMessage(messageData.message, userId);
      
      // Apply content filtering to AI response
      const filteredResponse = contentFilter.filterAIResponse(aiResponse.message, {
        userMessage: messageData.message,
        confidence: aiResponse.confidence
      });
      
      if (filteredResponse.blocked) {
        await auditLogger.logSecurityEvent(req, 'ai_content_blocked', {
          reason: filteredResponse.reason,
          userMessage: messageData.message.substring(0, 100)
        }, 'medium');
        return res.status(400).json({ 
          error: "Content filtered", 
          message: "This request contains content that cannot be processed.",
          reason: filteredResponse.reason
        });
      }
      
      const messageWithResponse = await storage.createChatMessage({
        ...messageData,
        response: filteredResponse.filteredContent + (filteredResponse.disclaimer || ''),
        context: { 
          citations: [],
          sources: [],
          confidence: aiResponse.confidence || 0.8,
          actions: aiResponse.actions || [],
          filtered: filteredResponse.disclaimer ? true : false
        }
      });
      
      await auditLogger.logAIInteraction(req, {
        id: messageWithResponse.id,
        message: messageData.message,
        response: filteredResponse.filteredContent,
        confidence: aiResponse.confidence,
        actions: aiResponse.actions
      }, true);
      
      await auditLogger.logDataAccess(req, 'create', 'chat_message', messageWithResponse.id, true);
      res.json(messageWithResponse);
    } catch (error) {
      await auditLogger.logAIInteraction(req, {
        message: req.body.message,
        response: null,
        confidence: 0
      }, false, error instanceof Error ? error.message : 'AI processing failed');
      await auditLogger.logDataAccess(req, 'create', 'chat_message', undefined, false);
      res.status(400).json({ error: "Invalid chat message data" });
    }
  });

  // AI Processing Endpoints (protected with AI rate limiting)
  app.post("/api/ai/process", requireAuth, aiRateLimit, async (req, res) => {
    try {
      const { message, type, context } = req.body;
      const userId = getUserId(req);
      
      const response = await aiProcessor.processMessage(message, userId, type, context);
      
      // Apply content filtering
      const filteredResponse = contentFilter.filterAIResponse(response.message, {
        userMessage: message,
        confidence: response.confidence,
        type: type
      });
      
      if (filteredResponse.blocked) {
        await auditLogger.logSecurityEvent(req, 'ai_content_blocked', {
          reason: filteredResponse.reason,
          userMessage: message.substring(0, 100),
          type: type
        }, 'medium');
        return res.status(400).json({ 
          error: "Content filtered", 
          message: "This request contains content that cannot be processed.",
          reason: filteredResponse.reason
        });
      }
      
      await auditLogger.logAIInteraction(req, {
        message: message,
        response: filteredResponse.filteredContent,
        confidence: response.confidence,
        type: type
      }, true);
      
      res.json({
        ...response,
        message: filteredResponse.filteredContent + (filteredResponse.disclaimer || '')
      });
    } catch (error) {
      await auditLogger.logAIInteraction(req, {
        message: req.body.message,
        response: null,
        confidence: 0
      }, false, error instanceof Error ? error.message : 'AI processing failed');
      res.status(500).json({ error: "AI processing failed" });
    }
  });

  app.get("/api/ai/monitor-tasks", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const monitoring = await aiProcessor.monitorUserTasks(userId);
      await auditLogger.logDataAccess(req, 'read', 'task_monitoring', userId);
      res.json(monitoring);
    } catch (error) {
      res.status(500).json({ error: "Task monitoring failed" });
    }
  });

  // AI Grant Search Endpoint (protected with AI rate limiting)
  app.post("/api/ai/search-grants", requireAuth, aiRateLimit, async (req, res) => {
    try {
      const { projectName, description, focus } = req.body;
      const userId = getUserId(req);
      
      // Use AI to search for relevant grants online
      const grantSearchResults = await aiProcessor.searchGrantsWithAI({
        projectName,
        description,
        focus,
        userId
      });
      
      await auditLogger.logAIInteraction(req, {
        message: `Grant search for ${projectName}: ${description}`,
        response: `Found ${grantSearchResults.grants.length} potential grants`,
        confidence: 0.9,
        type: 'grant_search'
      }, true);
      
      res.json({
        success: true,
        grants: grantSearchResults.grants,
        searchTerms: grantSearchResults.searchTerms,
        message: `Sunshine found ${grantSearchResults.grants.length} potential funding opportunities for ${projectName}!`
      });
    } catch (error) {
      await auditLogger.logAIInteraction(req, {
        message: `Grant search failed for ${req.body.projectName}`,
        response: null,
        confidence: 0
      }, false, error instanceof Error ? error.message : 'Grant search failed');
      res.status(500).json({ error: "Grant search failed" });
    }
  });

  // Songs (all protected)
  app.get("/api/songs", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const songs = await storage.getSongs(userId);
      await auditLogger.logDataAccess(req, 'read', 'songs', userId);
      res.json(songs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch songs" });
    }
  });

  app.post("/api/songs", requireAuth, validateRequest(schemas.song), async (req, res) => {
    try {
      const userId = getUserId(req);
      const songData = { ...req.body, userId };
      const song = await storage.createSong(songData);
      await auditLogger.logDataAccess(req, 'create', 'song', song.id, true);
      res.json(song);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'song', undefined, false);
      res.status(400).json({ error: "Invalid song data" });
    }
  });

  app.put("/api/songs/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const song = await storage.updateSong(id, req.body);
      if (!song) {
        await auditLogger.logDataAccess(req, 'update', 'song', id, false);
        return res.status(404).json({ error: "Song not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'song', id, true);
      res.json(song);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'song', req.params.id, false);
      res.status(400).json({ error: "Failed to update song" });
    }
  });

  app.delete("/api/songs/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSong(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'song', id, false);
        return res.status(404).json({ error: "Song not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'song', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'song', req.params.id, false);
      res.status(500).json({ error: "Failed to delete song" });
    }
  });

  // Song Versions API
  app.get('/api/songs/:songId/versions', requireAuth, async (req, res) => {
    try {
      const versions = await storage.getSongVersions(req.params.songId);
      await auditLogger.logDataAccess(req, 'read', 'song_versions', req.params.songId);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch song versions' });
    }
  });

  app.post('/api/songs/:songId/versions', requireAuth, async (req, res) => {
    try {
      const versionData = { ...req.body, songId: req.params.songId };
      const version = await storage.createSongVersion(versionData);
      await auditLogger.logDataAccess(req, 'create', 'song_version', version.id, true);
      res.json(version);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'song_version', undefined, false);
      res.status(400).json({ error: 'Failed to create song version' });
    }
  });

  app.put('/api/song-versions/:id', requireAuth, async (req, res) => {
    try {
      const version = await storage.updateSongVersion(req.params.id, req.body);
      if (!version) {
        return res.status(404).json({ error: 'Song version not found' });
      }
      await auditLogger.logDataAccess(req, 'update', 'song_version', req.params.id, true);
      res.json(version);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'song_version', req.params.id, false);
      res.status(400).json({ error: 'Failed to update song version' });
    }
  });

  app.delete('/api/song-versions/:id', requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteSongVersion(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Song version not found' });
      }
      await auditLogger.logDataAccess(req, 'delete', 'song_version', req.params.id, true);
      res.json({ message: 'Song version deleted successfully' });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'song_version', req.params.id, false);
      res.status(500).json({ error: 'Failed to delete song version' });
    }
  });

  // Music Supervisors API
  app.get('/api/music-supervisors', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const supervisors = await storage.getMusicSupervisors(userId);
      await auditLogger.logDataAccess(req, 'read', 'music_supervisors', userId);
      res.json(supervisors);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch music supervisors' });
    }
  });

  app.post('/api/music-supervisors', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const supervisorData = { ...req.body, userId };
      const supervisor = await storage.createMusicSupervisor(supervisorData);
      await auditLogger.logDataAccess(req, 'create', 'music_supervisor', supervisor.id, true);
      res.json(supervisor);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'music_supervisor', undefined, false);
      res.status(400).json({ error: 'Failed to create music supervisor' });
    }
  });

  app.put('/api/music-supervisors/:id', requireAuth, async (req, res) => {
    try {
      const supervisor = await storage.updateMusicSupervisor(req.params.id, req.body);
      if (!supervisor) {
        return res.status(404).json({ error: 'Music supervisor not found' });
      }
      await auditLogger.logDataAccess(req, 'update', 'music_supervisor', req.params.id, true);
      res.json(supervisor);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'music_supervisor', req.params.id, false);
      res.status(400).json({ error: 'Failed to update music supervisor' });
    }
  });

  app.delete('/api/music-supervisors/:id', requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteMusicSupervisor(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Music supervisor not found' });
      }
      await auditLogger.logDataAccess(req, 'delete', 'music_supervisor', req.params.id, true);
      res.json({ message: 'Music supervisor deleted successfully' });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'music_supervisor', req.params.id, false);
      res.status(500).json({ error: 'Failed to delete music supervisor' });
    }
  });

  // Sync Campaigns API
  app.get('/api/sync-campaigns', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaigns = await storage.getSyncCampaigns(userId);
      await auditLogger.logDataAccess(req, 'read', 'sync_campaigns', userId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sync campaigns' });
    }
  });

  app.post('/api/sync-campaigns', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaignData = { ...req.body, userId };
      const campaign = await storage.createSyncCampaign(campaignData);
      await auditLogger.logDataAccess(req, 'create', 'sync_campaign', campaign.id, true);
      res.json(campaign);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'sync_campaign', undefined, false);
      res.status(400).json({ error: 'Failed to create sync campaign' });
    }
  });

  app.put('/api/sync-campaigns/:id', requireAuth, async (req, res) => {
    try {
      const campaign = await storage.updateSyncCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ error: 'Sync campaign not found' });
      }
      await auditLogger.logDataAccess(req, 'update', 'sync_campaign', req.params.id, true);
      res.json(campaign);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'sync_campaign', req.params.id, false);
      res.status(400).json({ error: 'Failed to update sync campaign' });
    }
  });

  app.delete('/api/sync-campaigns/:id', requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteSyncCampaign(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Sync campaign not found' });
      }
      await auditLogger.logDataAccess(req, 'delete', 'sync_campaign', req.params.id, true);
      res.json({ message: 'Sync campaign deleted successfully' });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'sync_campaign', req.params.id, false);
      res.status(500).json({ error: 'Failed to delete sync campaign' });
    }
  });

  // Platform Submissions API
  app.get('/api/platform-submissions', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const submissions = await storage.getPlatformSubmissions(userId);
      await auditLogger.logDataAccess(req, 'read', 'platform_submissions', userId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch platform submissions' });
    }
  });

  app.post('/api/platform-submissions', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const submissionData = { ...req.body, userId };
      const submission = await storage.createPlatformSubmission(submissionData);
      await auditLogger.logDataAccess(req, 'create', 'platform_submission', submission.id, true);
      res.json(submission);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'platform_submission', undefined, false);
      res.status(400).json({ error: 'Failed to create platform submission' });
    }
  });

  app.put('/api/platform-submissions/:id', requireAuth, async (req, res) => {
    try {
      const submission = await storage.updatePlatformSubmission(req.params.id, req.body);
      if (!submission) {
        return res.status(404).json({ error: 'Platform submission not found' });
      }
      await auditLogger.logDataAccess(req, 'update', 'platform_submission', req.params.id, true);
      res.json(submission);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'platform_submission', req.params.id, false);
      res.status(400).json({ error: 'Failed to update platform submission' });
    }
  });

  app.delete('/api/platform-submissions/:id', requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deletePlatformSubmission(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Platform submission not found' });
      }
      await auditLogger.logDataAccess(req, 'delete', 'platform_submission', req.params.id, true);
      res.json({ message: 'Platform submission deleted successfully' });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'platform_submission', req.params.id, false);
      res.status(500).json({ error: 'Failed to delete platform submission' });
    }
  });

  // Action Items API
  app.get('/api/action-items', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const items = await storage.getActionItems(userId);
      await auditLogger.logDataAccess(req, 'read', 'action_items', userId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch action items' });
    }
  });

  app.post('/api/action-items', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const itemData = { ...req.body, userId };
      const item = await storage.createActionItem(itemData);
      await auditLogger.logDataAccess(req, 'create', 'action_item', item.id, true);
      res.json(item);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'action_item', undefined, false);
      res.status(400).json({ error: 'Failed to create action item' });
    }
  });

  app.put('/api/action-items/:id', requireAuth, async (req, res) => {
    try {
      const item = await storage.updateActionItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: 'Action item not found' });
      }
      await auditLogger.logDataAccess(req, 'update', 'action_item', req.params.id, true);
      res.json(item);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'action_item', req.params.id, false);
      res.status(400).json({ error: 'Failed to update action item' });
    }
  });

  app.delete('/api/action-items/:id', requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteActionItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Action item not found' });
      }
      await auditLogger.logDataAccess(req, 'delete', 'action_item', req.params.id, true);
      res.json({ message: 'Action item deleted successfully' });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'action_item', req.params.id, false);
      res.status(500).json({ error: 'Failed to delete action item' });
    }
  });

  // AI Licensing Opportunities Search (protected with AI rate limiting)
  app.post("/api/ai/search-licensing", requireAuth, aiRateLimit, async (req, res) => {
    try {
      const { songTitle, artist, genre, description } = req.body;
      const userId = getUserId(req);
      
      // Use AI to search for relevant sync licensing opportunities
      const licensingSearchResults = await aiProcessor.searchLicensingWithAI({
        songTitle,
        artist,
        genre,
        description,
        userId
      });
      
      await auditLogger.logAIInteraction(req, {
        message: `Licensing search for ${songTitle} by ${artist}: ${description}`,
        response: `Found ${licensingSearchResults.opportunities.length} potential opportunities`,
        confidence: 0.9,
        type: 'licensing_search'
      }, true);
      
      res.json({
        success: true,
        opportunities: licensingSearchResults.opportunities,
        searchTerms: licensingSearchResults.searchTerms,
        message: `Sunshine found ${licensingSearchResults.opportunities.length} sync licensing opportunities for "${songTitle}"!`
      });
    } catch (error) {
      await auditLogger.logAIInteraction(req, {
        message: `Licensing search failed for ${req.body.songTitle}`,
        response: null,
        confidence: 0
      }, false, error instanceof Error ? error.message : 'Licensing search failed');
      res.status(500).json({ error: "Licensing search failed" });
    }
  });

  // Email queue status endpoint (protected)
  app.get("/api/email/queue-status", requireAuth, async (req, res) => {
    try {
      const stats = emailQueue.getQueueStats();
      await auditLogger.logDataAccess(req, 'read', 'email_queue_status', getUserId(req));
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch queue status" });
    }
  });

  // Audiobooks (all protected)
  app.get("/api/audiobooks", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const audiobooks = await storage.getAudiobooks(userId);
      await auditLogger.logDataAccess(req, 'read', 'audiobooks', userId);
      res.json(audiobooks);
    } catch (error) {
      console.error("Error fetching audiobooks:", error);
      res.status(500).json({ error: "Failed to fetch audiobooks" });
    }
  });

  app.get("/api/audiobooks/:id", requireAuth, async (req, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }
      const userId = getUserId(req);
      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await auditLogger.logDataAccess(req, 'read', 'audiobooks', userId);
      res.json(audiobook);
    } catch (error) {
      console.error("Error fetching audiobook:", error);
      res.status(500).json({ error: "Failed to fetch audiobook" });
    }
  });

  app.post("/api/audiobooks", requireAuth, validateRequest(schemas.audiobook), async (req, res) => {
    try {
      const userId = getUserId(req);
      const audiobookData = { ...req.body, userId };
      const audiobook = await storage.createAudiobook(audiobookData);
      await auditLogger.logDataAccess(req, 'create', 'audiobooks', userId);
      res.status(201).json(audiobook);
    } catch (error) {
      console.error("Error creating audiobook:", error);
      res.status(500).json({ error: "Failed to create audiobook" });
    }
  });

  app.put("/api/audiobooks/:id", requireAuth, validateRequest(schemas.audiobook), async (req, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }
      const userId = getUserId(req);
      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updated = await storage.updateAudiobook(req.params.id, req.body);
      await auditLogger.logDataAccess(req, 'update', 'audiobooks', userId);
      res.json(updated);
    } catch (error) {
      console.error("Error updating audiobook:", error);
      res.status(500).json({ error: "Failed to update audiobook" });
    }
  });

  app.delete("/api/audiobooks/:id", requireAuth, async (req, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }
      const userId = getUserId(req);
      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteAudiobook(req.params.id);
      await auditLogger.logDataAccess(req, 'delete', 'audiobooks', userId);
      res.json({ message: "Audiobook deleted successfully" });
    } catch (error) {
      console.error("Error deleting audiobook:", error);
      res.status(500).json({ error: "Failed to delete audiobook" });
    }
  });

  // Audiobook chapters
  app.get("/api/audiobooks/:id/chapters", requireAuth, async (req, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }
      const userId = getUserId(req);
      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const chapters = await storage.getAudiobookChapters(req.params.id);
      await auditLogger.logDataAccess(req, 'read', 'audiobook_chapters', userId);
      res.json(chapters);
    } catch (error) {
      console.error("Error fetching audiobook chapters:", error);
      res.status(500).json({ error: "Failed to fetch audiobook chapters" });
    }
  });

  // Audiobook sales
  app.get("/api/audiobook-sales", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const sales = await storage.getAudiobookSales(userId);
      await auditLogger.logDataAccess(req, 'read', 'audiobook_sales', userId);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching audiobook sales:", error);
      res.status(500).json({ error: "Failed to fetch audiobook sales" });
    }
  });

  app.get("/api/audiobooks/:id/sales", requireAuth, async (req, res) => {
    try {
      const audiobook = await storage.getAudiobook(req.params.id);
      if (!audiobook) {
        return res.status(404).json({ error: "Audiobook not found" });
      }
      const userId = getUserId(req);
      if (audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const sales = await storage.getAudiobookSalesByBook(req.params.id);
      await auditLogger.logDataAccess(req, 'read', 'audiobook_sales', userId);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching audiobook sales:", error);
      res.status(500).json({ error: "Failed to fetch audiobook sales" });
    }
  });

  app.post("/api/audiobook-sales", requireAuth, validateRequest(schemas.audiobookSale), async (req, res) => {
    try {
      const userId = getUserId(req);
      const saleData = { ...req.body, userId };
      const sale = await storage.createAudiobookSale(saleData);
      await auditLogger.logDataAccess(req, 'create', 'audiobook_sales', userId);
      res.status(201).json(sale);
    } catch (error) {
      console.error("Error creating audiobook sale:", error);
      res.status(500).json({ error: "Failed to create audiobook sale" });
    }
  });

  // Audiobook Promotional Campaigns
  app.get("/api/audiobook-promotional-campaigns", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaigns = await storage.getAudiobookPromotionalCampaigns(userId);
      await auditLogger.logDataAccess(req, 'read', 'promotional_campaigns', userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching promotional campaigns:", error);
      res.status(500).json({ error: "Failed to fetch promotional campaigns" });
    }
  });

  app.get("/api/audiobook-promotional-campaigns/book/:audiobookId", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { audiobookId } = req.params;
      const campaigns = await storage.getAudiobookPromotionalCampaignsByBook(audiobookId);
      
      // Verify user owns the audiobook
      const audiobook = await storage.getAudiobook(audiobookId);
      if (!audiobook || audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await auditLogger.logDataAccess(req, 'read', 'promotional_campaigns', userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching promotional campaigns for book:", error);
      res.status(500).json({ error: "Failed to fetch promotional campaigns" });
    }
  });

  app.get("/api/audiobook-promotional-campaigns/:id", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const campaign = await storage.getAudiobookPromotionalCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      if (campaign.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await auditLogger.logDataAccess(req, 'read', 'promotional_campaigns', userId);
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching promotional campaign:", error);
      res.status(500).json({ error: "Failed to fetch promotional campaign" });
    }
  });

  app.post("/api/audiobook-promotional-campaigns", requireAuth, validateRequest(schemas.audiobookPromotionalCampaign), async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Verify user owns the audiobook
      const audiobook = await storage.getAudiobook(req.body.audiobookId);
      if (!audiobook || audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const campaignData = { ...req.body, userId };
      const campaign = await storage.createAudiobookPromotionalCampaign(campaignData);
      await auditLogger.logDataAccess(req, 'create', 'promotional_campaigns', userId);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating promotional campaign:", error);
      res.status(500).json({ error: "Failed to create promotional campaign" });
    }
  });

  app.put("/api/audiobook-promotional-campaigns/:id", requireAuth, validateRequest(schemas.audiobookPromotionalCampaign), async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify user owns the campaign
      const existingCampaign = await storage.getAudiobookPromotionalCampaign(id);
      if (!existingCampaign || existingCampaign.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updatedCampaign = await storage.updateAudiobookPromotionalCampaign(id, req.body);
      if (!updatedCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      await auditLogger.logDataAccess(req, 'update', 'promotional_campaigns', userId);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating promotional campaign:", error);
      res.status(500).json({ error: "Failed to update promotional campaign" });
    }
  });

  app.delete("/api/audiobook-promotional-campaigns/:id", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify user owns the campaign
      const campaign = await storage.getAudiobookPromotionalCampaign(id);
      if (!campaign || campaign.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteAudiobookPromotionalCampaign(id);
      if (!deleted) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      await auditLogger.logDataAccess(req, 'delete', 'promotional_campaigns', userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting promotional campaign:", error);
      res.status(500).json({ error: "Failed to delete promotional campaign" });
    }
  });

  // Audiobook Promotional Activities
  app.get("/api/audiobook-promotional-activities/:campaignId", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { campaignId } = req.params;
      
      // Verify user owns the campaign
      const campaign = await storage.getAudiobookPromotionalCampaign(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const activities = await storage.getAudiobookPromotionalActivities(campaignId);
      await auditLogger.logDataAccess(req, 'read', 'promotional_activities', userId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching promotional activities:", error);
      res.status(500).json({ error: "Failed to fetch promotional activities" });
    }
  });

  app.post("/api/audiobook-promotional-activities", requireAuth, validateRequest(schemas.audiobookPromotionalActivity), async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Verify user owns the campaign
      const campaign = await storage.getAudiobookPromotionalCampaign(req.body.campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const activity = await storage.createAudiobookPromotionalActivity(req.body);
      await auditLogger.logDataAccess(req, 'create', 'promotional_activities', userId);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating promotional activity:", error);
      res.status(500).json({ error: "Failed to create promotional activity" });
    }
  });

  app.put("/api/audiobook-promotional-activities/:id", requireAuth, validateRequest(schemas.audiobookPromotionalActivity), async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify user owns the activity through campaign ownership
      const existingActivity = await storage.getAudiobookPromotionalActivity(id);
      if (!existingActivity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      
      const campaign = await storage.getAudiobookPromotionalCampaign(existingActivity.campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updatedActivity = await storage.updateAudiobookPromotionalActivity(id, req.body);
      await auditLogger.logDataAccess(req, 'update', 'promotional_activities', userId);
      res.json(updatedActivity);
    } catch (error) {
      console.error("Error updating promotional activity:", error);
      res.status(500).json({ error: "Failed to update promotional activity" });
    }
  });

  app.delete("/api/audiobook-promotional-activities/:id", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify user owns the activity through campaign ownership
      const activity = await storage.getAudiobookPromotionalActivity(id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      
      const campaign = await storage.getAudiobookPromotionalCampaign(activity.campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deleteAudiobookPromotionalActivity(id);
      await auditLogger.logDataAccess(req, 'delete', 'promotional_activities', userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting promotional activity:", error);
      res.status(500).json({ error: "Failed to delete promotional activity" });
    }
  });

  // Audiobook Promotional Content
  app.get("/api/audiobook-promotional-content", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const content = await storage.getAudiobookPromotionalContent(userId);
      await auditLogger.logDataAccess(req, 'read', 'promotional_content', userId);
      res.json(content);
    } catch (error) {
      console.error("Error fetching promotional content:", error);
      res.status(500).json({ error: "Failed to fetch promotional content" });
    }
  });

  app.get("/api/audiobook-promotional-content/book/:audiobookId", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { audiobookId } = req.params;
      
      // Verify user owns the audiobook
      const audiobook = await storage.getAudiobook(audiobookId);
      if (!audiobook || audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const content = await storage.getAudiobookPromotionalContentByBook(audiobookId);
      await auditLogger.logDataAccess(req, 'read', 'promotional_content', userId);
      res.json(content);
    } catch (error) {
      console.error("Error fetching promotional content for book:", error);
      res.status(500).json({ error: "Failed to fetch promotional content" });
    }
  });

  app.get("/api/audiobook-promotional-content/campaign/:campaignId", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { campaignId } = req.params;
      
      // Verify user owns the campaign
      const campaign = await storage.getAudiobookPromotionalCampaign(campaignId);
      if (!campaign || campaign.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const content = await storage.getAudiobookPromotionalContentByCampaign(campaignId);
      await auditLogger.logDataAccess(req, 'read', 'promotional_content', userId);
      res.json(content);
    } catch (error) {
      console.error("Error fetching promotional content for campaign:", error);
      res.status(500).json({ error: "Failed to fetch promotional content" });
    }
  });

  app.post("/api/audiobook-promotional-content", requireAuth, validateRequest(schemas.audiobookPromotionalContent), async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Verify user owns the audiobook
      const audiobook = await storage.getAudiobook(req.body.audiobookId);
      if (!audiobook || audiobook.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // If campaign is specified, verify user owns it
      if (req.body.campaignId) {
        const campaign = await storage.getAudiobookPromotionalCampaign(req.body.campaignId);
        if (!campaign || campaign.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const contentData = { ...req.body, userId };
      const content = await storage.createAudiobookPromotionalContent(contentData);
      await auditLogger.logDataAccess(req, 'create', 'promotional_content', userId);
      res.status(201).json(content);
    } catch (error) {
      console.error("Error creating promotional content:", error);
      res.status(500).json({ error: "Failed to create promotional content" });
    }
  });

  app.put("/api/audiobook-promotional-content/:id", requireAuth, validateRequest(schemas.audiobookPromotionalContent), async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify user owns the content
      const existingContent = await storage.getAudiobookPromotionalContent(userId);
      const content = existingContent.find(c => c.id === id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      
      const updatedContent = await storage.updateAudiobookPromotionalContent(id, req.body);
      await auditLogger.logDataAccess(req, 'update', 'promotional_content', userId);
      res.json(updatedContent);
    } catch (error) {
      console.error("Error updating promotional content:", error);
      res.status(500).json({ error: "Failed to update promotional content" });
    }
  });

  app.delete("/api/audiobook-promotional-content/:id", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify user owns the content
      const existingContent = await storage.getAudiobookPromotionalContent(userId);
      const content = existingContent.find(c => c.id === id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      
      const deleted = await storage.deleteAudiobookPromotionalContent(id);
      await auditLogger.logDataAccess(req, 'delete', 'promotional_content', userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting promotional content:", error);
      res.status(500).json({ error: "Failed to delete promotional content" });
    }
  });

  // Demo endpoint for intelligent data discovery
  app.post("/api/sunshine/demo", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Use the new modular AI core with data discovery
      const { aiProcessor } = await import('./ai/core');
      const response = await aiProcessor.processMessage(message, userId, "demo");

      res.json({
        ...response,
        demonstration: {
          architecture: "Modular AI Core",
          components: ["Data Discovery", "AI Processor", "Action Executor"],
          discoveredDataCount: response.discoveredData?.length || 0,
          actionsExecuted: response.actions?.length || 0,
          systemInfo: "Sunshine using clean modular architecture"
        }
      });
    } catch (error) {
      console.error("Error in Sunshine demo:", error);
      res.status(500).json({ 
        error: "Demo failed", 
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // C.A.R.E.N. Crowdfunding Platform Routes
  app.get("/api/crowdfunding/platforms", requireAuth, async (req, res) => {
    try {
      const { crowdfundingPlatforms, impactInvestorNetworks, vcFirms, businessCapitalSources } = await import('./data/crowdfunding-platforms');
      
      // Combine all funding sources
      const allPlatforms = [
        ...crowdfundingPlatforms,
        ...impactInvestorNetworks,
        ...vcFirms,
        ...businessCapitalSources
      ];
      
      res.json(allPlatforms);
    } catch (error) {
      console.error("Error fetching crowdfunding platforms:", error);
      res.status(500).json({ error: "Failed to fetch platforms" });
    }
  });

  app.get("/api/crowdfunding/strategy", requireAuth, async (req, res) => {
    try {
      const { carenFundingStrategy, campaignProfile } = await import('./data/crowdfunding-platforms');
      
      res.json({
        strategy: carenFundingStrategy,
        profile: campaignProfile
      });
    } catch (error) {
      console.error("Error fetching funding strategy:", error);
      res.status(500).json({ error: "Failed to fetch strategy" });
    }
  });

  app.get("/api/crowdfunding/campaigns", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaigns = await storage.getCrowdfundingCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/crowdfunding/campaigns", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaignData = { ...req.body, userId };
      const campaign = await storage.createCrowdfundingCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.put("/api/crowdfunding/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify ownership
      const campaigns = await storage.getCrowdfundingCampaigns(userId);
      const campaign = campaigns.find(c => c.id === id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      const updated = await storage.updateCrowdfundingCampaign(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.delete("/api/crowdfunding/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify ownership
      const campaigns = await storage.getCrowdfundingCampaigns(userId);
      const campaign = campaigns.find(c => c.id === id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      await storage.deleteCrowdfundingCampaign(id);
      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // Personal Optimization Routes - User Preferences
  app.get("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        // Create default preferences for first-time users
        const defaultPreferences = {
          userId,
          dashboardLayout: {
            quickActions: { visible: true, order: 1 },
            aiAssistant: { visible: true, order: 2 },
            carenMetrics: { visible: true, order: 3 },
            recentTasks: { visible: true, order: 4 }
          },
          quickActionButtons: [
            'create_task', 'find_grants', 'add_contact', 'music_sync'
          ],
          preferredTasks: [
            'C.A.R.E.N. development', 'investor_outreach', 'grant_applications'
          ],
          carenMetrics: {
            showFundingProgress: true,
            showInvestorCount: true,
            showMilestones: true,
            preferredChart: 'progress'
          }
        };
        
        const newPreferences = await storage.createUserPreferences(defaultPreferences);
        return res.json(newPreferences);
      }
      
      await auditLogger.logDataAccess(req, 'read', 'user_preferences', userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ error: "Failed to fetch user preferences" });
    }
  });

  app.put("/api/user/preferences", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const updatedPreferences = await storage.updateUserPreferences(userId, req.body);
      
      if (!updatedPreferences) {
        return res.status(404).json({ error: "User preferences not found" });
      }
      
      await auditLogger.logDataAccess(req, 'update', 'user_preferences', userId, true);
      res.json(updatedPreferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      await auditLogger.logDataAccess(req, 'update', 'user_preferences', getUserId(req), false);
      res.status(500).json({ error: "Failed to update user preferences" });
    }
  });

  // Personal Optimization Routes - C.A.R.E.N. Project Tracking
  app.get("/api/caren/project", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      let project = await storage.getCarenProject(userId);
      
      if (!project) {
        // Create default C.A.R.E.N. project tracking
        const defaultProject = {
          userId,
          projectName: "C.A.R.E.N. - Citizen Assistance for Roadside Emergencies and Navigation",
          currentPhase: "Seed Funding",
          investorContacts: 0,
          grantApplications: 0,
          developmentProgress: 15, // 15% complete based on current state
          fundraisingGoal: "250000", // $250K seed goal
          currentFunding: "0",
          nextMilestone: "Complete investor one-pager presentation",
          milestoneDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks
        };
        
        project = await storage.createCarenProject(defaultProject);
      }
      
      await auditLogger.logDataAccess(req, 'read', 'caren_project', userId);
      res.json(project);
    } catch (error) {
      console.error("Error fetching C.A.R.E.N. project:", error);
      res.status(500).json({ error: "Failed to fetch C.A.R.E.N. project" });
    }
  });

  app.put("/api/caren/project", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const updatedProject = await storage.updateCarenProject(userId, req.body);
      
      if (!updatedProject) {
        return res.status(404).json({ error: "C.A.R.E.N. project not found" });
      }
      
      await auditLogger.logDataAccess(req, 'update', 'caren_project', userId, true);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating C.A.R.E.N. project:", error);
      await auditLogger.logDataAccess(req, 'update', 'caren_project', getUserId(req), false);
      res.status(500).json({ error: "Failed to update C.A.R.E.N. project" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
