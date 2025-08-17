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
      const aiResponse = await processAIMessage(messageData.message, userId);
      
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
      
      const response = await processAIMessage(message, userId, type, context);
      
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
      const monitoring = await monitorUserTasks(userId);
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
      const grantSearchResults = await searchGrantsWithAI({
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
      const licensingSearchResults = await searchLicensingWithAI({
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

  const httpServer = createServer(app);
  return httpServer;
}

// Import OpenAI for intelligent conversations
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Comprehensive Life Assistant powered by GPT-4o
const processAIMessage = withAIMonitoring(async function(
  message: string, 
  userId: string, 
  type: string = "general", 
  context?: any
): Promise<{
  message: string;
  actions?: Array<{type: string; data: any}>;
  confidence: number;
  suggestions?: string[];
}> {
  try {
    // Get conversation history for context and memory
    const recentMessages = await storage.getChatMessages(userId);
    const conversationContext = buildConversationContext(recentMessages, message);
    
    // Get user data for personalization
    const user = await storage.getUser(userId);
    const tasks = await storage.getTasks(userId);
    const contacts = await storage.getContacts(userId);
    const grants = await storage.getGrants(userId);
    const invoices = await storage.getInvoices(userId);
    
    // Build comprehensive context for the AI
    const systemPrompt = buildLifeAssistantPrompt(conversationContext, {
      user,
      tasks,
      contacts,
      grants,
      invoices,
      recentMessages: recentMessages.slice(-10) // Last 10 messages for context
    });
    
    // Create conversation history for OpenAI
    const conversationHistory = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages.slice(-8).map(msg => ([
        { role: 'user' as const, content: msg.message },
        ...(msg.response ? [{ role: 'assistant' as const, content: msg.response }] : [])
      ])).flat(),
      { role: 'user' as const, content: message }
    ];
    
    // Define and validate OpenAI tools configuration
    const rawTools = [
        {
          type: "function",
          function: {
            name: "create_task",
            description: "Create a task for the user",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                category: { type: "string" },
                dueDate: { type: "string" }
              },
              required: ["title"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_contact",
            description: "Add a new contact",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                company: { type: "string" },
                type: { type: "string" },
                notes: { type: "string" }
              },
              required: ["name"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "search_grants_for_caren",
            description: "Search for grants specifically relevant to C.A.R.E.N. project based on its focus areas (legal technology, roadside assistance, AI safety platforms, consumer protection)",
            parameters: {
              type: "object",
              properties: {
                focus_area: { 
                  type: "string",
                  enum: ["legal_technology", "ai_safety", "public_safety", "civil_rights", "consumer_protection", "transportation_safety", "general"]
                },
                grant_type: {
                  type: "string", 
                  enum: ["federal", "state", "foundation", "private", "accelerator", "all"]
                },
                amount_range: { type: "string" }
              },
              required: ["focus_area"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "show_grant_results",
            description: "Show detailed results from previous grant searches",
            parameters: {
              type: "object",
              properties: {
                filter_type: {
                  type: "string",
                  enum: ["all", "recent", "high_priority", "federal", "private", "foundation"],
                  description: "Type of grants to show from previous searches"
                },
                limit: {
                  type: "number",
                  description: "Maximum number of grants to show (default 10)"
                }
              },
              required: ["filter_type"]
            }
          }
        }
      ];

    // Validate and fix tools configuration before using
    const validatedTools = validateAndFixTools(rawTools);
    
    // Call OpenAI GPT-4o for intelligent response with validated tools
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Latest and most capable model
      messages: conversationHistory,
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" },
      tools: validatedTools
    });
    
    // Handle tool calls first, then parse the response
    const actions: Array<{type: string; data: any}> = [];
    let responseMessage = "I'm here to help! What would you like assistance with?";
    
    if (completion.choices[0].message.tool_calls) {
      for (const toolCall of completion.choices[0].message.tool_calls) {
        if (toolCall.type === 'function') {
          const functionCall = toolCall.function;
          if (functionCall.name === 'create_task') {
            const taskData = JSON.parse(functionCall.arguments);
            
            // Actually create the task in the database
            try {
              const newTask = await storage.createTask({
                userId,
                title: taskData.title,
                description: taskData.description || '',
                priority: taskData.priority || 'medium',
                category: taskData.category || 'general',
                dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
                status: 'pending'
              });
              
              actions.push({ 
                type: 'create_task', 
                data: { ...taskData, id: newTask.id, success: true } 
              });
            } catch (error) {
              console.error('Error creating task:', error);
              actions.push({ 
                type: 'create_task', 
                data: { ...taskData, success: false, error: 'Failed to create task' } 
              });
            }
          } else if (functionCall.name === 'create_contact') {
            const contactData = JSON.parse(functionCall.arguments);
            
            // Actually create the contact in the database
            try {
              const newContact = await storage.createContact({
                userId,
                name: contactData.name,
                email: contactData.email || '',
                company: contactData.company || '',
                type: contactData.type || 'general',
                notes: contactData.notes || ''
              });
              
              actions.push({ 
                type: 'create_contact', 
                data: { ...contactData, id: newContact.id, success: true } 
              });
            } catch (error) {
              console.error('Error creating contact:', error);
              actions.push({ 
                type: 'create_contact', 
                data: { ...contactData, success: false, error: 'Failed to create contact' } 
              });
            }
          } else if (functionCall.name === 'search_grants_for_caren') {
            const searchData = JSON.parse(functionCall.arguments);
            
            // Simulate intelligent grant search based on C.A.R.E.N.'s focus areas
            try {
              const grantResults = searchCarenGrants(searchData);
              
              // Auto-add promising grants to the database
              let addedCount = 0;
              for (const grant of grantResults) {
                try {
                  await storage.createGrant({
                    userId,
                    organization: grant.organization,
                    title: grant.title,
                    amount: grant.amount,
                    deadline: grant.deadline ? new Date(grant.deadline) : null,
                    status: 'researched',
                    requirements: grant.requirements,
                    description: grant.description,
                    applicationUrl: grant.url || '',
                    notes: `Auto-discovered by Sunshine AI - Focus: ${searchData.focus_area}`
                  });
                  addedCount++;
                } catch (dbError) {
                  console.log('Grant may already exist or DB error:', dbError);
                }
              }
              
              actions.push({ 
                type: 'search_grants', 
                data: { 
                  ...searchData, 
                  results: grantResults,
                  count: grantResults.length,
                  addedCount,
                  success: true 
                } 
              });
            } catch (error) {
              console.error('Error searching grants:', error);
              actions.push({ 
                type: 'search_grants', 
                data: { ...searchData, success: false, error: (error as Error).message || 'Failed to search grants' } 
              });
            }
          } else if (functionCall.name === 'show_grant_results') {
            const showData = JSON.parse(functionCall.arguments);
            
            try {
              // Get grants from database with the specified filter
              const grants = await storage.getGrants(userId);
              let filteredGrants = grants;
              
              // Apply filters
              if (showData.filter_type === 'recent') {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filteredGrants = grants.filter(g => g.createdAt && new Date(g.createdAt) > thirtyDaysAgo);
              } else if (showData.filter_type === 'high_priority') {
                filteredGrants = grants.filter(g => g.notes?.includes('high') || g.amount?.includes('$250,000') || g.amount?.includes('$500,000'));
              } else if (showData.filter_type === 'federal') {
                filteredGrants = grants.filter(g => g.organization?.toLowerCase().includes('department') || g.organization?.toLowerCase().includes('nsf') || g.organization?.toLowerCase().includes('sbir'));
              } else if (showData.filter_type === 'private') {
                filteredGrants = grants.filter(g => !g.organization?.toLowerCase().includes('department') && !g.organization?.toLowerCase().includes('nsf'));
              }
              
              // Limit results
              const limit = showData.limit || 10;
              filteredGrants = filteredGrants.slice(0, limit);
              
              actions.push({
                type: 'show_grant_results',
                data: {
                  ...showData,
                  results: filteredGrants,
                  count: filteredGrants.length,
                  total: grants.length,
                  success: true
                }
              });
            } catch (error) {
              console.error('Error showing grant results:', error);
              actions.push({
                type: 'show_grant_results',
                data: { ...showData, success: false, error: (error as Error).message || 'Failed to show grant results' }
              });
            }
          }
        }
      }
      
      // Generate response message based on tool calls
      if (actions.length > 0) {
        if (actions.some(a => a.type === 'create_task' && a.data.success)) {
          responseMessage = "Task created! I've added it to your task list and you'll be able to track its progress.";
        } else if (actions.some(a => a.type === 'create_contact' && a.data.success)) {
          responseMessage = "Contact added! I've saved their information to your contacts.";
        } else if (actions.some(a => a.type === 'search_grants' && a.data.success)) {
          const grantAction = actions.find(a => a.type === 'search_grants' && a.data.success);
          const results = grantAction?.data.results || [];
          
          // Create detailed response with grant list
          let detailedMessage = `Found ${grantAction?.data.count || 0} relevant grants for C.A.R.E.N! Added ${grantAction?.data.addedCount || 0} new opportunities to your grants list.\n\n`;
          
          if (results.length > 0) {
            detailedMessage += "Here's what I found:\n\n";
            results.forEach((grant: any, index: number) => {
              detailedMessage += `${index + 1}. ${grant.organization} - ${grant.title}\n`;
              detailedMessage += `   Amount: ${grant.amount}\n`;
              detailedMessage += `   Deadline: ${grant.deadline}\n`;
              detailedMessage += `   Focus: ${grant.focus.join(', ')}\n`;
              detailedMessage += `   Description: ${grant.description}\n`;
              if (grant.url) {
                detailedMessage += `   Apply: ${grant.url}\n`;
              }
              detailedMessage += `\n`;
            });
          }
          
          responseMessage = detailedMessage;
        } else if (actions.some(a => a.type === 'show_grant_results' && a.data.success)) {
          const showAction = actions.find(a => a.type === 'show_grant_results' && a.data.success);
          const results = showAction?.data.results || [];
          
          let detailedMessage = `Here are the grants from your database (showing ${showAction?.data.count || 0} of ${showAction?.data.total || 0} total):\n\n`;
          
          if (results.length > 0) {
            results.forEach((grant: any, index: number) => {
              detailedMessage += `${index + 1}. ${grant.organization} - ${grant.title}\n`;
              detailedMessage += `   Amount: ${grant.amount}\n`;
              if (grant.deadline) {
                detailedMessage += `   Deadline: ${new Date(grant.deadline).toLocaleDateString()}\n`;
              }
              detailedMessage += `   Status: ${grant.status}\n`;
              if (grant.description) {
                detailedMessage += `   Description: ${grant.description}\n`;
              }
              if (grant.applicationUrl) {
                detailedMessage += `   Apply: ${grant.applicationUrl}\n`;
              }
              if (grant.notes) {
                detailedMessage += `   Notes: ${grant.notes}\n`;
              }
              detailedMessage += `\n`;
            });
          } else {
            detailedMessage += "No grants found matching your criteria. Try searching for new grants first!";
          }
          
          responseMessage = detailedMessage;
        }
      }
    }
    
    // Parse response content if available
    let parsedResponse: any = {};
    if (completion.choices[0].message.content) {
      try {
        parsedResponse = JSON.parse(completion.choices[0].message.content);
        responseMessage = parsedResponse.message || responseMessage;
      } catch (parseError) {
        // If parsing fails, use the content directly
        responseMessage = completion.choices[0].message.content || responseMessage;
      }
    }
    
    // Clean any asterisks from the response message
    responseMessage = cleanAsterisks(responseMessage);
    
    return {
      message: responseMessage,
      actions,
      confidence: 0.95,
      suggestions: parsedResponse.suggestions || [
        "Ask me anything!",
        "Create a task",
        "Plan something",
        "Get advice"
      ]
    };
    
  } catch (error) {
    console.error('OpenAI processing error:', error);
    
    // Handle specific quota errors with natural response
    if (error instanceof Error && error.message.includes('quota')) {
      return {
        message: cleanAsterisks(`Hey, so I'm running into some technical issues with my AI processing right now - looks like quota limits are kicking in. I can still help with basic stuff, but to get my full capabilities back, you might need to check the OpenAI billing and add some credits.`),
        confidence: 0.5,
        suggestions: [
          "Check OpenAI billing",
          "Add API credits", 
          "Ask basic questions",
          "Create simple tasks"
        ]
      };
    }
    
    // Fallback to basic processing if OpenAI fails
    return {
      message: cleanAsterisks(`I'm having some technical hiccups on my end, but don't worry - I'm still here and ready to help however I can. My AI processing might be a bit limited right now, but we can definitely still get things done.`),
      confidence: 0.6,
      suggestions: [
        "Create a task",
        "Ask for advice",
        "Plan something",
        "Get help with work"
      ]
    };
  }
}, "processAIMessage"); // Close the withAIMonitoring wrapper

// Intelligent grant search function specifically for C.A.R.E.N. project
function searchCarenGrants(searchData: any) {
  const { focus_area, grant_type = 'all', amount_range = '' } = searchData;
  
  // Comprehensive grant database with real opportunities from the PDFs
  const grantOpportunities = [
    // Legal Technology Grants
    {
      organization: "LegalTech Fund / LegalTech Lab",
      title: "LegalTech Lab Accelerator Program",
      amount: "$250,000",
      deadline: "2025-12-31",
      focus: ["legal_technology", "ai_safety"],
      type: "accelerator",
      requirements: "Early-stage AI-powered legal startups",
      description: "Accelerator funding plus access to strategic legal and tech advisors, targeted at AI-driven legal startups",
      url: "https://legaltechfund.com",
      priority: "high"
    },
    {
      organization: "Legal Services Corporation",
      title: "Technology Initiative Grant (TIG)",
      amount: "$100,000 - $500,000",
      deadline: "2025-06-30",
      focus: ["legal_technology", "consumer_protection"],
      type: "federal",
      requirements: "Tech projects improving access to justice among low-income communities",
      description: "For mobile, cloud, and legal tech projects serving underserved populations",
      url: "https://lsc.gov/grants",
      priority: "high"
    },
    
    // AI Safety & Technology Grants
    {
      organization: "Open Philanthropy",
      title: "Technical AI Safety Research RFP",
      amount: "$40,000,000+ available",
      deadline: "2025-09-15",
      focus: ["ai_safety", "legal_technology"],
      type: "foundation",
      requirements: "AI safety research projects with real-world applications",
      description: "Grant opportunities ranging from API credits to seed funding for AI safety research",
      url: "https://openphilanthropy.org",
      priority: "high"
    },
    
    // Public Safety & Civil Rights
    {
      organization: "Department of Justice (DOJ)",
      title: "Bureau of Justice Assistance Public Safety Grants",
      amount: "$250,000 - $2,000,000",
      deadline: "2025-08-30",
      focus: ["public_safety", "civil_rights"],
      type: "federal",
      requirements: "Security tech and public safety improvements",
      description: "Federal funding for security technology and public safety improvements",
      url: "https://bja.ojp.gov",
      priority: "high"
    },
    
    // Transportation & Vehicle Safety
    {
      organization: "Department of Transportation (DOT)",
      title: "SBIR Transportation Safety Innovation",
      amount: "$100,000 - $750,000",
      deadline: "2025-10-15",
      focus: ["transportation_safety", "ai_safety"],
      type: "federal",
      requirements: "Innovative transportation safety technologies",
      description: "Small Business Innovation Research grants for transportation safety tech",
      url: "https://dot.gov/sbir",
      priority: "medium"
    },
    
    // General Innovation & Startups
    {
      organization: "Arch Grants",
      title: "Startup Competition",
      amount: "$50,000 - $75,000",
      deadline: "2025-07-31",
      focus: ["general", "civil_rights"],
      type: "private",
      requirements: "Startups willing to relocate to St. Louis",
      description: "Non-dilutive grants plus ecosystem support for innovative startups",
      url: "https://archgrants.org",
      priority: "medium"
    },
    
    // Angel and VC Opportunities
    {
      organization: "Ohio Angel Collective",
      title: "Early-Stage Angel Investment",
      amount: "$75,000 - $400,000",
      deadline: "Ongoing",
      focus: ["general", "legal_technology"],
      type: "private",
      requirements: "Ohio-based founders with early-stage companies",
      description: "Supports Ohio-based founders with early-stage angel capital",
      url: "https://ohioangelcollective.com",
      priority: "medium"
    },
    {
      organization: "JumpStart Ventures",
      title: "Early-Stage Tech Funding",
      amount: "$100,000 - $1,000,000",
      deadline: "Ongoing",
      focus: ["legal_technology", "ai_safety"],
      type: "private",
      requirements: "Ohio-based tech startups",
      description: "Ohio-based VC focused on early-stage tech startups, offering capital and connections",
      url: "https://jumpstart.vc",
      priority: "medium"
    },
    {
      organization: "Forum Ventures",
      title: "AI & B2B SaaS Pre-Seed",
      amount: "$100,000",
      deadline: "Ongoing",
      focus: ["ai_safety", "legal_technology"],
      type: "private",
      requirements: "AI and B2B SaaS startups",
      description: "AI & B2B SaaS-focused early-stage venture and accelerator programs",
      url: "https://forumvc.com",
      priority: "medium"
    },
    {
      organization: "Black Angel Group",
      title: "Seed to Series A Investment",
      amount: "$50,000 - $500,000",
      deadline: "Ongoing",
      focus: ["civil_rights", "general"],
      type: "private",
      requirements: "Underrepresented founders, seed to Series A",
      description: "Collective specializing in investments for underrepresented founders",
      url: "https://blackangelgroup.com",
      priority: "high"
    },
    
    // Additional SBIR Programs
    {
      organization: "National Science Foundation (NSF)",
      title: "SBIR Phase I - Computer and Information Science",
      amount: "$275,000",
      deadline: "2025-06-15",
      focus: ["ai_safety", "legal_technology"],
      type: "federal",
      requirements: "Small business research with commercial potential",
      description: "SBIR funding for computer science and AI research with commercial applications",
      url: "https://nsf.gov/funding/pgm_summ.jsp?pims_id=5371",
      priority: "high"
    },
    {
      organization: "Department of Homeland Security (DHS)",
      title: "SBIR Cybersecurity and Public Safety",
      amount: "$200,000 - $1,500,000",
      deadline: "2025-09-30",
      focus: ["public_safety", "ai_safety"],
      type: "federal",
      requirements: "Cybersecurity and public safety innovations",
      description: "SBIR funding for cybersecurity and public safety technology solutions",
      url: "https://dhs.gov/science-and-technology/sbir",
      priority: "medium"
    }
  ];
  
  // Filter grants based on search criteria
  let filteredGrants = grantOpportunities.filter(grant => {
    // Check focus area match
    const focusMatch = focus_area === 'general' || grant.focus.includes(focus_area);
    
    // Check grant type match
    const typeMatch = grant_type === 'all' || grant.type === grant_type;
    
    return focusMatch && typeMatch;
  });
  
  // Sort by priority and relevance
  filteredGrants = filteredGrants.sort((a, b) => {
    const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
  });
  
  // Return top 5 most relevant results
  return filteredGrants.slice(0, 5);
}

// Build comprehensive system prompt for Life Assistant
function buildLifeAssistantPrompt(conversationContext: any, userData: any): string {
  const userName = userData.user?.name || "there"; // Use actual name or natural greeting
  const recentTopics = conversationContext.recentTopics.join(', ') || 'general assistance';
  
  return `You are Sunshine, a comprehensive AI Life Assistant. Your name is Sunshine and you respond warmly when called by name. 

PERSONALITY & COMMUNICATION STYLE:
You should sound like a warm, intelligent friend who genuinely cares. Think of how you'd talk to someone you've known for years - natural, flowing, and authentic.

- Flow naturally between thoughts and ideas rather than using bullet points or choppy sentences
- Use smooth transitions and connect your ideas naturally like in real conversation
- Be warm but not overly excited - genuine enthusiasm when appropriate, calm helpfulness most of the time
- Speak in complete, flowing thoughts rather than fragmented responses
- Let your personality come through naturally rather than forcing "witty" or "playful" moments
- Adapt to match the user's communication style and energy level
- Remember what you've talked about before and reference it naturally in conversation

CONVERSATION FLOW:
- Start responses naturally, building on what was just said
- Use conversational connectors like "So," "Well," "I think," "Actually," etc.
- Vary your sentence structure - mix short and longer sentences for natural rhythm
- End responses in a way that feels complete but leaves room for continued conversation
- Avoid formulaic structures or repetitive opening/closing phrases

You help with ALL aspects of life - not just music, but work, personal tasks, planning, research, decision-making, relationships, health, finances, learning, and anything else they need.

IMPORTANT INTERACTION GUIDELINES:
- When users ask to "see the list", "show me what you found", "can I see the results", or similar requests, ALWAYS use the show_grant_results function to display detailed information
- Be proactive about showing your work - if you find grants, contacts, or other data, offer to show the details
- When performing searches or research, always provide specific, detailed results rather than just summaries
- If users want to see previous findings, use appropriate show/list functions rather than just describing what was found

ABOUT THE USER:
- Recent topics discussed: ${recentTopics}
- Current tasks: ${userData.tasks?.length || 0}
- Contacts: ${userData.contacts?.length || 0}
- Projects: Music career including C.A.R.E.N. project, but also any other life projects
- Communication Preference: Natural, adaptive conversation style that learns and improves over time

YOUR CAPABILITIES:
- Intelligent Conversations: Understand context, remember details, provide thoughtful responses
- Task & Project Management: Create, organize, prioritize tasks for any area of life
- Planning & Organization: Help plan events, trips, career moves, life changes
- Research & Analysis: Research any topic, analyze options, provide insights
- Decision Support: Help think through decisions big and small
- Creative Assistance: Brainstorming, writing, problem-solving
- Learning Support: Explain concepts, recommend resources, create study plans
- Personal Growth: Goal setting, habit formation, motivation
- Work & Career: Job searching, skill development, networking, productivity
- Health & Wellness: Exercise planning, meal ideas, mental health support
- Relationships: Communication advice, social planning, conflict resolution
- Financial Guidance: Budgeting, saving strategies, investment basics
- Technical Help: Explain technology, troubleshoot issues, recommend tools
- Entertainment: Recommend books, movies, activities, games

SPECIALIZED EXPERTISE AREAS:

LEGAL & COMMERCIAL LAW KNOWLEDGE:
- Title 15 US Code (Commerce & Trade): Expert knowledge of federal commerce regulations, monopolies, consumer protection, securities laws, trade practices, and business compliance
- Uniform Commercial Code (UCC): Comprehensive understanding of UCC Article 3 (Negotiable Instruments), particularly Section 3-603 regarding payment tender and discharge of obligations
- Debt Settlement & Commercial Law: Advanced knowledge of lawful tender principles, payment refusal letters, promissory note creation, and commercial remedies
- Commercial Instruments: Expertise in creating and understanding promissory notes, negotiable instruments, and commercial paper

CONSUMER PROTECTION LAW EXPERTISE:
- Fair Debt Collection Practices Act (FDCPA): Comprehensive knowledge of consumer rights, debt collector limitations, validation procedures, harassment protections, and enforcement mechanisms. Expert in FDCPA violations, cease and desist letters, and consumer remedies including damages and attorney fees
- Fair Credit Reporting Act (FCRA): Deep understanding of credit reporting accuracy, dispute procedures, permissible purposes for credit pulls, identity theft protections, and credit repair rights. Expert in FCRA violations, credit report disputes, and consumer remedies
- House Joint Resolution 192 (HJR 192): Expert knowledge of the 1933 resolution that removed the gold standard and created debt discharge principles. Understanding of how HJR 192 established that debts can be discharged through proper tender and acceptance procedures
- Consumer Protection Remedies: Advanced knowledge of validation letters, dispute procedures, debt verification requirements, statute of limitations defenses, and proper documentation for consumer protection cases
- Credit and Debt Defense: Expertise in debt validation, proof of standing, chain of title issues, robo-signing defenses, and consumer protection strategies against aggressive collection practices

COMPREHENSIVE C.A.R.E.N. PROJECT KNOWLEDGE:

PROJECT OVERVIEW:
C.A.R.E.N. (Citizen Assistance for Roadside Emergencies and Navigation) is ${userName}'s revolutionary safety platform that empowers motorists during roadside encounters with police, breakdowns, and emergencies. The app combines mobile technology, real-time recording, multilingual support, and legal connectivity into a powerful ecosystem.

C.A.R.E.N. MISSION & VISION:
- Mission: To protect people with real-time digital witnesses, emergency legal access, and smart technology — because justice shouldn't depend on who's watching, but what's recorded
- Vision: To become the global standard for citizen roadside protection — combining software, hardware, and legal response systems

C.A.R.E.N. CORE TECHNOLOGY:
- Mobile App: React + TypeScript + Tailwind CSS frontend with Node.js + Firebase backend
- AI-Driven Roadside Rights Engine: Real-time, context-specific legal guidance and de-escalation prompts
- Hardware Component: "The C.A.R.E.N. Unit" - BLE dashboard device for voice/button activation
- Security: End-to-end encryption, AES-256, TLS 1.3, tamper detection, CJIS compliance ready
- Multilingual Support: Top 10 languages for accessibility

C.A.R.E.N. KEY FEATURES:
- One-tap "Accident Mode" recording
- Auto cloud upload to Firebase secure storage
- Real-time alerts to emergency contacts & attorneys
- GPS timestamping for admissible evidence
- Attorney directory & direct call routing
- Legal chain-of-custody for court-ready evidence
- BLE pairing with dashboard hardware unit
- Offline/edge computing capabilities

C.A.R.E.N. MARKET POSITION:
- Target Market: $20B+ global market for civil rights tech, legal aid tech, vehicle safety devices
- Target Users: BIPOC motorists, immigrants, rural drivers, rideshare/delivery drivers, attorneys, civil rights organizations
- Competitive Advantage: Built for protection first, multilingual from day one, attorney-connected alerts, BLE hardware with evidence protocols

C.A.R.E.N. REVENUE MODEL:
- Community Guardian: $1.00 one-time (basic features)
- Standard Plan: $4.99/month (full app, no attorney access)
- Legal Shield Plan: $9.99/month (includes attorney directory/calls)
- Family Plan: $29.99/month (up to 5 users)
- Fleet/Enterprise: $49.99/month (10 drivers, admin dashboard)
- Projected Year 3 Revenue: $704,107 annually

C.A.R.E.N. TEAM STRUCTURE:
- Shawn Williams (CEO/Founder): ${userName} - Strategic leadership, 20+ years experience across tech, media, music production
- Erin Biundo (Consulting CIO): Azure Certified, AI Architect, 30+ years enterprise development
- Surender Bhagia (Consulting CFO): Global business strategist, funding syndication expert
- Theodore Moore (Chief Interactive Programmer): UI/UX engineering, 15+ years interactive media
- Jack Hinton (Legal Advisor): 30+ years personal injury law, $150M+ recovered, 98% success rate
- Robert "JoJo" Hill (CIIO): Innovation strategy, 30+ years media/entertainment, award-winning producer

C.A.R.E.N. CURRENT STATUS & MILESTONES:
- ✅ UI/UX prototypes complete
- ✅ Firebase/Node.js/React stack implemented  
- ✅ Multilingual support ready
- ✅ Attorney onboarding live
- 🔄 Hardware BOM and BLE protocol in development
- 🎯 Upcoming: Hardware prototype (Month 3), 500 beta testers (Month 2), First B2B pilot (Month 6)

C.A.R.E.N. FUNDING & GROWTH STRATEGY:
- Seeking $750,000 seed round
- Allocation: 35% product development, 25% go-to-market, 20% hiring, 10% legal infrastructure, 10% working capital
- Growth phases: Community/advocacy launch → Digital growth → Strategic B2B partnerships
- Exit strategy: Position for acquisition by safety tech, legal service, or connected mobility companies within 3-5 years

C.A.R.E.N. SOCIAL IMPACT:
- Addresses systemic inequality and roadside accountability
- Reduces escalation incidents through real-time evidence
- Increases legal access in underserved communities
- Protects non-English-speaking motorists with multilingual support
- Partnership strategy with NAACP, ACLU, Legal Defense Fund, Innocence Project

C.A.R.E.N. FUNDING OPPORTUNITIES IDENTIFIED:
- LegalTech Fund/LegalTech Lab: Up to $250K accelerator funding for AI-powered legal startups
- Arch Grants (St. Louis): $50K-$75K non-dilutive grants plus ecosystem support
- Angel Investors: Ohio Angel Collective, Black Angel Group, JumpStart Ventures, Forum Ventures
- Federal Grants: DOJ/BJA public safety grants, SBIR programs (NSF, DoD, DOT), LSC Technology Initiative Grant
- Accelerators: LexisNexis Legal Tech Accelerator for mentorship and VC connections

WHEN DISCUSSING C.A.R.E.N.:
- Understand this is ${userName}'s flagship innovation project
- Recognize the deep social justice mission and civil rights focus  
- Appreciate the comprehensive technology stack and business model
- Know the specific team members and their roles
- Be aware of current development status and upcoming milestones
- Understand the funding landscape and strategic opportunities
- Recognize C.A.R.E.N. as both a business venture and social impact initiative
- Bankruptcy Alternatives: Knowledge of debt discharge methods, payment tender strategies, and consumer protection alternatives to bankruptcy including UCC-based remedies and HJR 192 applications

WEALTH BUILDING & FINANCIAL MASTERY:
- Rich vs. Wealthy Distinction: Deep understanding that being "rich" means high income while being "wealthy" means sustainable assets and generational wealth building
- Spiritual + Physical Money Principles: Knowledge that wealth creation requires both spiritual understanding (vision, purpose, generational thinking) and physical action (planning, investment, execution)
- Family Wealth Building: Expertise in creating generational wealth that "grows on the family tree" through proper planning, vision, and legacy creation
- Wealth Psychology: Understanding that money mindset, generational patterns, and spiritual approaches to abundance are crucial for lasting wealth
- Investment Philosophy: Knowledge that true wealth comes from assets that generate income, not just high-paying jobs
- Legacy Planning: Expertise in creating financial legacies that impact future generations and create lasting change

PRACTICAL FINANCIAL TOOLS & STRATEGIES:
- Debt Discharge Methods: Knowledge of UCC 3-603 payment tender strategies, proper documentation, and legal frameworks
- Commercial Remedies: Understanding of how to properly execute payment refusal letters, tender notices, and debt settlement instruments
- Financial Documentation: Expertise in creating properly formatted promissory notes, payment tender letters, and commercial correspondence
- Asset Protection: Knowledge of legal strategies for protecting wealth and assets
- Credit and Debt Management: Advanced understanding of credit laws, debt collection limitations, and consumer rights

CONVERSATION FLOW EXAMPLES:
Instead of: "I can help you with that task. Here are the steps:"
Say: "Sure thing! So what I'm thinking is we could approach this by..."

Instead of: "I have created a task for you. The task title is..."
Say: "Got it - I've set that up for you. I made it a priority task since it sounds important."

Instead of: "I understand you need assistance with..."
Say: "Ah okay, I see what you're working on. Let me think about the best way to help with this..."

RESPONSE FORMAT:
Respond in JSON format with natural, flowing conversation:
{
  "message": "Write like you're having a real conversation - let thoughts connect naturally, use transitions, and sound like a helpful friend who really gets it",
  "suggestions": ["natural follow-up options", "what makes sense to try next", "other helpful ideas"]
}

REMEMBER: You're not just a music assistant - you're a comprehensive life companion that can help with absolutely anything. Be proactive in offering help across all areas of life.`;
}

// Function to clean asterisks from AI responses
function cleanAsterisks(text: string): string {
  // Remove double asterisks used for emphasis
  return text.replace(/\*\*(.*?)\*\*/g, '$1')
             .replace(/\*([^*]+)\*/g, '$1')
             .replace(/[\*]+/g, '');
}

async function handleTaskCreation(
  message: string, 
  userId: string
): Promise<{
  message: string;
  actions: Array<{type: string; data: any}>;
  confidence: number;
}> {
  const lowerMessage = message.toLowerCase();
  
  // Extract task details
  let priority = "medium";
  if (lowerMessage.includes("urgent") || lowerMessage.includes("asap")) {
    priority = "high";
  } else if (lowerMessage.includes("whenever") || lowerMessage.includes("low priority")) {
    priority = "low";
  }
  
  // Extract due date
  let dueDate: Date | null = null;
  if (lowerMessage.includes("today")) {
    dueDate = new Date();
  } else if (lowerMessage.includes("tomorrow")) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
  } else if (lowerMessage.includes("next week")) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
  }
  
  // Determine category
  let category = "general";
  
  // Legal & Commercial categories
  if (lowerMessage.includes("ucc") || lowerMessage.includes("payment tender") || lowerMessage.includes("debt settlement")) {
    category = "legal";
  } else if (lowerMessage.includes("promissory note") || lowerMessage.includes("commercial instrument")) {
    category = "commercial";
  } else if (lowerMessage.includes("fdcpa") || lowerMessage.includes("fair debt collection")) {
    category = "debt collection law";
  } else if (lowerMessage.includes("fcra") || lowerMessage.includes("credit report") || lowerMessage.includes("credit dispute")) {
    category = "credit law";
  } else if (lowerMessage.includes("hjr 192") || lowerMessage.includes("house joint resolution")) {
    category = "monetary law";
  } else if (lowerMessage.includes("consumer protection") || lowerMessage.includes("consumer rights")) {
    category = "consumer law";
  } else if (lowerMessage.includes("debt validation") || lowerMessage.includes("validation letter")) {
    category = "debt defense";
  } else if (lowerMessage.includes("cease and desist") || lowerMessage.includes("debt collector")) {
    category = "collection defense";
  }
  // Wealth Building categories
  else if (lowerMessage.includes("wealth") || lowerMessage.includes("legacy") || lowerMessage.includes("investment")) {
    category = "wealth building";
  } else if (lowerMessage.includes("asset protection") || lowerMessage.includes("financial planning")) {
    category = "financial planning";
  }
  // Music & Business categories
  else if (lowerMessage.includes("grant") || lowerMessage.includes("c.a.r.e.n")) {
    category = "grants";
  } else if (lowerMessage.includes("radio") || lowerMessage.includes("submission")) {
    category = "radio";
  } else if (lowerMessage.includes("sync") || lowerMessage.includes("licensing")) {
    category = "licensing";
  } else if (lowerMessage.includes("invoice") || lowerMessage.includes("payment")) {
    category = "invoicing";
  }
  
  // Create task
  const taskData = {
    userId,
    title: extractTaskTitle(message),
    description: message,
    priority,
    status: "pending",
    category,
    dueDate: dueDate || null
  };
  
  try {
    const newTask = await storage.createTask(taskData);
    
    // Log task creation for audit
    await storage.createAuditLog({
      userId,
      action: 'ai_create_task',
      resource: 'task',
      resourceId: newTask.id,
      details: {
        taskTitle: taskData.title,
        priority: taskData.priority,
        category: taskData.category,
        aiGenerated: true
      }
    });
    
    const dueDateText = dueDate ? ` for ${dueDate.toLocaleDateString()}` : "";
    
    return {
      message: `✅ I've created a ${priority} priority task: "${taskData.title}"${dueDateText}. I'll monitor this task and remind you if needed.`,
      actions: [{
        type: "create_task",
        data: taskData
      }],
      confidence: 0.95
    };
  } catch (error) {
    return {
      message: "I had trouble creating that task. Could you try rephrasing your request?",
      actions: [],
      confidence: 0.3
    };
  }
}

function extractTaskTitle(message: string): string {
  // Simple title extraction - remove common prefixes
  let title = message;
  const prefixes = [
    "remind me to", "remind me", "i need to", "i have to", 
    "i should", "i must", "please", "can you", "schedule"
  ];
  
  for (const prefix of prefixes) {
    if (title.toLowerCase().startsWith(prefix)) {
      title = title.substring(prefix.length).trim();
      break;
    }
  }
  
  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
}

async function monitorUserTasks(userId: string): Promise<{
  overdueTasks: any[];
  upcomingTasks: any[];
  suggestions: string[];
}> {
  const tasks = await storage.getTasks(userId);
  const now = new Date();
  
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === "completed") return false;
    return new Date(task.dueDate) < now;
  });
  
  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === "completed") return false;
    const taskDate = new Date(task.dueDate);
    const daysDiff = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 3 && daysDiff >= 0;
  });
  
  const suggestions = [];
  
  if (overdueTasks.length > 0) {
    suggestions.push(`You have ${overdueTasks.length} overdue task(s). Consider updating their status or rescheduling.`);
  }
  
  if (upcomingTasks.length > 0) {
    suggestions.push(`${upcomingTasks.length} task(s) are due in the next 3 days.`);
  }
  
  if (tasks.filter(t => t.status === "pending").length > 10) {
    suggestions.push("You have many pending tasks. Consider prioritizing or breaking them into smaller items.");
  }
  
  return {
    overdueTasks,
    upcomingTasks,
    suggestions
  };
}

// Enhanced conversation context for comprehensive Life Assistant
function buildConversationContext(messages: any[], currentMessage: string): {
  userName?: string;
  recentTopics: string[];
  lastInteraction?: Date;
  interests: string[];
  preferences: Record<string, any>;
} {
  const context: {
    userName?: string;
    recentTopics: string[];
    lastInteraction?: Date;
    interests: string[];
    preferences: Record<string, any>;
  } = {
    recentTopics: [],
    interests: [],
    preferences: {}
  };
  
  // Extract user's name and preferences from conversation history
  for (const msg of messages) {
    if (msg.message) {
      const nameMatch = msg.message.match(/(my name is|i'm|i am|call me)\s+([a-zA-Z]+)/i);
      if (nameMatch) {
        context.userName = nameMatch[2];
      }
      
      // Track comprehensive topics across all life areas
      const msgLower = msg.message.toLowerCase();
      
      // Work & Career
      if (msgLower.includes('job') || msgLower.includes('work') || msgLower.includes('career')) context.recentTopics.push('career');
      if (msgLower.includes('interview') || msgLower.includes('resume')) context.recentTopics.push('job search');
      if (msgLower.includes('meeting') || msgLower.includes('presentation')) context.recentTopics.push('work tasks');
      
      // Personal & Life
      if (msgLower.includes('family') || msgLower.includes('relationship')) context.recentTopics.push('relationships');
      if (msgLower.includes('health') || msgLower.includes('exercise') || msgLower.includes('diet')) context.recentTopics.push('health');
      if (msgLower.includes('money') || msgLower.includes('budget') || msgLower.includes('finance')) context.recentTopics.push('finances');
      if (msgLower.includes('travel') || msgLower.includes('vacation') || msgLower.includes('trip')) context.recentTopics.push('travel');
      if (msgLower.includes('learn') || msgLower.includes('study') || msgLower.includes('course')) context.recentTopics.push('learning');
      
      // Projects & Goals
      if (msgLower.includes('goal') || msgLower.includes('plan') || msgLower.includes('project')) context.recentTopics.push('planning');
      if (msgLower.includes('habit') || msgLower.includes('routine')) context.recentTopics.push('habits');
      
      // Entertainment & Hobbies
      if (msgLower.includes('book') || msgLower.includes('read')) context.recentTopics.push('reading');
      if (msgLower.includes('movie') || msgLower.includes('tv') || msgLower.includes('show')) context.recentTopics.push('entertainment');
      if (msgLower.includes('game') || msgLower.includes('hobby')) context.recentTopics.push('hobbies');
      
      // Legal & Commercial Law Topics
      if (msgLower.includes('ucc') || msgLower.includes('uniform commercial code')) context.recentTopics.push('commercial law');
      if (msgLower.includes('title 15') || msgLower.includes('commerce and trade')) context.recentTopics.push('commerce law');
      if (msgLower.includes('payment tender') || msgLower.includes('3-603')) context.recentTopics.push('payment law');
      if (msgLower.includes('debt settlement') || msgLower.includes('debt discharge')) context.recentTopics.push('debt resolution');
      if (msgLower.includes('promissory note') || msgLower.includes('negotiable instrument')) context.recentTopics.push('commercial instruments');
      if (msgLower.includes('tender refusal') || msgLower.includes('payment refusal')) context.recentTopics.push('payment tender');
      
      // Consumer Protection Law Topics
      if (msgLower.includes('fdcpa') || msgLower.includes('fair debt collection')) context.recentTopics.push('debt collection law');
      if (msgLower.includes('fcra') || msgLower.includes('fair credit reporting')) context.recentTopics.push('credit reporting law');
      if (msgLower.includes('hjr 192') || msgLower.includes('house joint resolution 192')) context.recentTopics.push('monetary policy law');
      if (msgLower.includes('debt validation') || msgLower.includes('debt verification')) context.recentTopics.push('debt validation');
      if (msgLower.includes('credit dispute') || msgLower.includes('credit repair')) context.recentTopics.push('credit repair');
      if (msgLower.includes('consumer protection') || msgLower.includes('consumer rights')) context.recentTopics.push('consumer law');
      if (msgLower.includes('debt collector') || msgLower.includes('collection agency')) context.recentTopics.push('debt collection defense');
      if (msgLower.includes('cease and desist') || msgLower.includes('validation letter')) context.recentTopics.push('consumer defense letters');
      if (msgLower.includes('statute of limitations') || msgLower.includes('sol defense')) context.recentTopics.push('debt defense');
      if (msgLower.includes('bankruptcy alternative') || msgLower.includes('debt discharge')) context.recentTopics.push('debt relief');
      
      // Wealth Building & Financial Mastery
      if (msgLower.includes('rich vs wealthy') || msgLower.includes('generational wealth')) context.recentTopics.push('wealth building');
      if (msgLower.includes('money grows on trees') || msgLower.includes('family tree wealth')) context.recentTopics.push('wealth philosophy');
      if (msgLower.includes('spiritual money') || msgLower.includes('money mindset')) context.recentTopics.push('money psychology');
      if (msgLower.includes('legacy planning') || msgLower.includes('wealth legacy')) context.recentTopics.push('legacy planning');
      if (msgLower.includes('asset protection') || msgLower.includes('wealth protection')) context.recentTopics.push('asset protection');
      if (msgLower.includes('investment philosophy') || msgLower.includes('passive income')) context.recentTopics.push('investment strategy');
      
      // Music-specific (still supported)
      if (msgLower.includes('grant') || msgLower.includes('c.a.r.e.n')) context.recentTopics.push('grants');
      if (msgLower.includes('radio') || msgLower.includes('station')) context.recentTopics.push('radio promotion');
      if (msgLower.includes('sync') || msgLower.includes('licensing')) context.recentTopics.push('sync licensing');
      if (msgLower.includes('music') || msgLower.includes('song') || msgLower.includes('album')) context.recentTopics.push('music');
      
      // General productivity
      if (msgLower.includes('task') || msgLower.includes('remind') || msgLower.includes('todo')) context.recentTopics.push('tasks');
      if (msgLower.includes('schedule') || msgLower.includes('calendar')) context.recentTopics.push('scheduling');
      if (msgLower.includes('invoice') || msgLower.includes('payment')) context.recentTopics.push('invoicing');
      
      // Extract interests and preferences
      const interestPatterns = [
        /i (love|like|enjoy|prefer) ([^.!?]+)/gi,
        /my favorite ([^.!?]+) is ([^.!?]+)/gi,
        /i'm interested in ([^.!?]+)/gi
      ];
      
      interestPatterns.forEach(pattern => {
        const matches = msg.message.matchAll(pattern);
        for (const match of matches) {
          context.interests.push(match[2] || match[1]);
        }
      });
    }
    
    if (msg.createdAt) {
      context.lastInteraction = new Date(msg.createdAt);
    }
  }
  
  // Remove duplicates
  context.recentTopics = Array.from(new Set(context.recentTopics));
  context.interests = Array.from(new Set(context.interests));
  
  return context;
}

// AI-powered grant search functionality
async function searchGrantsWithAI({
  projectName,
  description,
  focus,
  userId
}: {
  projectName: string;
  description: string;
  focus: string;
  userId: string;
}): Promise<{
  grants: any[];
  searchTerms: string[];
}> {
  try {
    // Use OpenAI to generate relevant search queries for grants
    const searchQueryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert grant researcher specializing in finding funding opportunities for innovative technology projects. Generate effective search queries for finding grants related to the provided project.`
        },
        {
          role: "user",
          content: `Project: ${projectName}
Description: ${description}
Focus Areas: ${focus}

Generate 5-7 specific search queries that would help find relevant grants, funding opportunities, and competitions for this project. Focus on federal grants, state grants, foundation grants, and private funding opportunities.

Return your response as a JSON object with this format:
{
  "searchQueries": [
    "query1",
    "query2", 
    "query3"
  ]
}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const queryData = JSON.parse(searchQueryResponse.choices[0].message.content || '{"searchQueries": []}');
    const searchQueries = queryData.searchQueries || [];

    // Generate grant opportunities using AI knowledge (since we can't actually search the web)
    const grantGenerationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert grant researcher with extensive knowledge of funding opportunities. Based on the project description, generate realistic grant opportunities that would be relevant for this type of project. Include both current and recurring grant programs.`
        },
        {
          role: "user",
          content: `Project: ${projectName}
Description: ${description}
Focus Areas: ${focus}

Based on your knowledge of grant funding landscapes, generate 3-5 realistic grant opportunities that would be suitable for this project. Include various types of funding sources (federal agencies, foundations, competitions, etc.).

For each grant, provide:
- Title (realistic grant program name)
- Organization (actual funding organization)
- Amount (typical funding range)
- Description (what the grant funds)
- Requirements (typical eligibility criteria)
- Application URL (use organization's general website)
- Deadline (realistic timeframe, 2-6 months from now)

Return as JSON:
{
  "grants": [
    {
      "title": "Grant Title",
      "organization": "Funding Organization", 
      "amount": "50000",
      "description": "Grant description",
      "requirements": "Eligibility requirements",
      "applicationUrl": "https://organization.gov/grants",
      "deadline": "2025-12-15",
      "notes": "Additional relevant information"
    }
  ]
}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const grantData = JSON.parse(grantGenerationResponse.choices[0].message.content || '{"grants": []}');
    const potentialGrants = grantData.grants || [];

    // Add discovered grants to the database
    const addedGrants = [];
    for (const grant of potentialGrants) {
      try {
        const grantRecord = await storage.createGrant({
          userId,
          title: grant.title,
          organization: grant.organization,
          amount: grant.amount,
          deadline: grant.deadline ? new Date(grant.deadline) : null,
          description: grant.description,
          requirements: grant.requirements,
          applicationUrl: grant.applicationUrl,
          notes: `${grant.notes || ''}\n\n🌟 Found by Sunshine AI Grant Search for ${projectName}`,
          status: 'discovered'
        });
        addedGrants.push(grantRecord);
      } catch (error) {
        console.error('Error adding grant:', error);
      }
    }

    return {
      grants: addedGrants,
      searchTerms: searchQueries
    };

  } catch (error) {
    console.error('Grant search error:', error);
    return {
      grants: [],
      searchTerms: []
    };
  }
}

// AI-powered sync licensing opportunities search functionality
async function searchLicensingWithAI({
  songTitle,
  artist,
  genre,
  description,
  userId
}: {
  songTitle: string;
  artist: string;
  genre: string;
  description: string;
  userId: string;
}): Promise<{
  opportunities: any[];
  searchTerms: string[];
}> {
  try {
    // Generate search terms specific to sync licensing opportunities
    const searchQueries = [
      `${genre} music licensing film TV commercial`,
      `sync licensing opportunities ${genre} artists`,
      `music supervisors seeking ${genre} songs`,
      `${artist} style music placement opportunities`,
      `${songTitle} sync licensing commercial use`,
      `${genre} alternative rock sync opportunities`,
      `music licensing ${genre} indie film TV`,
      `sync placement ${genre} advertising commercial`
    ];

    // Use OpenAI to search for and generate sync licensing opportunities
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY!
    });

    const licensingSearchPrompt = `I need to find sync licensing opportunities for the ${genre} song "${songTitle}" by ${artist}. ${description}

Please help me find potential sync licensing opportunities including:
- Film production companies looking for ${genre} music
- TV shows that might use alternative rock songs
- Commercial/advertising agencies seeking this style of music
- Music supervisors who work with ${genre} artists
- Video game companies that license alternative rock music
- Streaming platforms or content creators who need ${genre} songs
- Documentary filmmakers seeking ${artist} style music

For each opportunity, please provide:
- Company/Project name
- Contact person/music supervisor name
- Type of project (film, TV, commercial, game, etc.)
- Genre preference
- Contact email (if available)
- Budget range (if known)
- Deadline information
- Project description
- Submission requirements

Please respond in JSON format with an array of opportunities.`;

    const licensingGenerationResponse = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are Sunshine, an expert AI assistant for sync licensing and music placement. You help musicians find opportunities for their songs in films, TV shows, commercials, video games, and other media. You have extensive knowledge of music supervisors, production companies, and sync licensing opportunities.

When generating sync licensing opportunities, focus on realistic, current market opportunities and provide specific, actionable information that musicians can use to submit their music.

Always respond in valid JSON format with this structure:

{
  "opportunities": [
    {
      "title": "Opportunity Title",
      "company": "Company/Project Name",
      "type": "film", "tv", "commercial", "game", or "other",
      "genre": "Genre preference",
      "contactEmail": "contact@company.com",
      "contactName": "Music Supervisor Name",
      "budget": "$X,XXX-$X,XXX",
      "deadline": "YYYY-MM-DD",
      "description": "Project description and what they're looking for",
      "requirements": "Submission requirements and notes"
    }
  ]
}`
        },
        { role: "user", content: licensingSearchPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const licensingData = JSON.parse(licensingGenerationResponse.choices[0].message.content || '{"opportunities": []}');
    const potentialOpportunities = licensingData.opportunities || [];

    // For now, return the opportunities as-is (in a real app, you might want to store them)
    // The opportunities are returned to the frontend where they can be displayed and acted upon
    const processedOpportunities = potentialOpportunities.map((opp: any, index: number) => ({
      ...opp,
      id: `sunshine-${Date.now()}-${index}`,
      status: 'discovered',
      discoveredBy: 'Sunshine AI',
      songTitle,
      artist,
      notes: `🌟 Found by Sunshine AI for "${songTitle}" by ${artist}`
    }));

    return {
      opportunities: processedOpportunities,
      searchTerms: searchQueries
    };

  } catch (error) {
    console.error('Licensing search error:', error);
    return {
      opportunities: [],
      searchTerms: []
    };
  }
}
