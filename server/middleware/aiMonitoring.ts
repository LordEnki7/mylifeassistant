// AI System Monitoring and Auto-Recovery
// Provides proactive monitoring, error detection, and automatic recovery for AI failures

interface AIHealthMetrics {
  successfulRequests: number;
  failedRequests: number;
  configurationErrors: number;
  quotaErrors: number;
  lastSuccessfulRequest: Date | null;
  lastFailure: Date | null;
  uptimePercentage: number;
}

interface AIErrorPattern {
  pattern: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  autoFixApplied: boolean;
}

class AIMonitoringService {
  private metrics: AIHealthMetrics = {
    successfulRequests: 0,
    failedRequests: 0,
    configurationErrors: 0,
    quotaErrors: 0,
    lastSuccessfulRequest: null,
    lastFailure: null,
    uptimePercentage: 100
  };

  private errorPatterns: Map<string, AIErrorPattern> = new Map();
  private alertThresholds = {
    maxFailureRate: 0.25, // 25% failure rate triggers alert
    maxConfigErrors: 3, // 3 config errors in succession triggers alert
    quotaErrorsBeforeAlert: 2 // 2 quota errors trigger notification
  };

  /**
   * Records successful AI request
   */
  recordSuccess(): void {
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessfulRequest = new Date();
    this.updateUptimePercentage();
  }

  /**
   * Records failed AI request with categorization
   */
  recordFailure(error: Error): void {
    this.metrics.failedRequests++;
    this.metrics.lastFailure = new Date();
    
    // Categorize error types
    if (error.message.includes('Missing required parameter') || 
        error.message.includes('tools[') ||
        error.message.includes('invalid_request_error')) {
      this.metrics.configurationErrors++;
      this.recordErrorPattern('configuration_error', error.message);
    } else if (error.message.includes('quota') || 
               error.message.includes('rate_limit') ||
               error.message.includes('insufficient_quota')) {
      this.metrics.quotaErrors++;
      this.recordErrorPattern('quota_error', error.message);
    } else {
      this.recordErrorPattern('general_error', error.message);
    }
    
    this.updateUptimePercentage();
    this.checkAlertThresholds();
  }

  /**
   * Records specific error patterns for trend analysis
   */
  private recordErrorPattern(type: string, message: string): void {
    const key = `${type}:${message.substring(0, 100)}`;
    const existing = this.errorPatterns.get(key);
    
    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
    } else {
      this.errorPatterns.set(key, {
        pattern: message,
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        autoFixApplied: false
      });
    }
  }

  /**
   * Checks if alert thresholds are exceeded
   */
  private checkAlertThresholds(): void {
    const failureRate = this.getFailureRate();
    
    if (failureRate > this.alertThresholds.maxFailureRate) {
      console.warn(`🚨 AI ALERT: High failure rate detected (${(failureRate * 100).toFixed(1)}%)`);
      this.logHealthStatus();
    }
    
    if (this.metrics.configurationErrors >= this.alertThresholds.maxConfigErrors) {
      console.error(`🚨 AI ALERT: Multiple configuration errors detected (${this.metrics.configurationErrors})`);
      this.suggestConfigurationFix();
    }
    
    if (this.metrics.quotaErrors >= this.alertThresholds.quotaErrorsBeforeAlert) {
      console.warn(`🚨 AI ALERT: Quota issues detected (${this.metrics.quotaErrors} quota errors)`);
      this.suggestQuotaFix();
    }
  }

  /**
   * Provides automatic suggestions for common issues
   */
  private suggestConfigurationFix(): void {
    console.log(`
🔧 AUTO-RECOVERY SUGGESTIONS:
1. Check tools configuration in processAIMessage function
2. Verify all tools have proper type: "function" wrapper
3. Ensure parameters follow OpenAI schema format
4. Run: curl http://localhost:5000/api/ai/health to verify status
    `);
  }

  private suggestQuotaFix(): void {
    console.log(`
💰 QUOTA RESOLUTION STEPS:
1. Check OpenAI billing at https://platform.openai.com/usage
2. Add credits to your OpenAI account
3. Verify API key has proper permissions
4. Consider implementing request rate limiting
    `);
  }

  /**
   * Updates uptime percentage based on success/failure ratio
   */
  private updateUptimePercentage(): void {
    const total = this.metrics.successfulRequests + this.metrics.failedRequests;
    if (total > 0) {
      this.metrics.uptimePercentage = (this.metrics.successfulRequests / total) * 100;
    }
  }

  /**
   * Gets current failure rate
   */
  getFailureRate(): number {
    const total = this.metrics.successfulRequests + this.metrics.failedRequests;
    return total > 0 ? this.metrics.failedRequests / total : 0;
  }

  /**
   * Gets comprehensive health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: AIHealthMetrics;
    errorPatterns: Array<{pattern: string; count: number; autoFixApplied: boolean}>;
    recommendations: string[];
  } {
    const failureRate = this.getFailureRate();
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];
    
    if (failureRate > 0.5) {
      status = 'critical';
      recommendations.push('Immediate attention required - over 50% failure rate');
    } else if (failureRate > 0.25 || this.metrics.configurationErrors > 2) {
      status = 'degraded';
      recommendations.push('Monitor closely - elevated error rates detected');
    }
    
    if (this.metrics.quotaErrors > 0) {
      recommendations.push('Check OpenAI billing and quota limits');
    }
    
    if (this.metrics.configurationErrors > 0) {
      recommendations.push('Review AI tools configuration for syntax errors');
    }
    
    return {
      status,
      metrics: this.metrics,
      errorPatterns: Array.from(this.errorPatterns.values()),
      recommendations
    };
  }

  /**
   * Logs current health status to console
   */
  logHealthStatus(): void {
    const health = this.getHealthStatus();
    console.log(`
📊 AI SYSTEM HEALTH STATUS: ${health.status.toUpperCase()}
Success Rate: ${((1 - this.getFailureRate()) * 100).toFixed(1)}%
Total Requests: ${health.metrics.successfulRequests + health.metrics.failedRequests}
Configuration Errors: ${health.metrics.configurationErrors}
Quota Errors: ${health.metrics.quotaErrors}
Last Success: ${health.metrics.lastSuccessfulRequest?.toISOString() || 'Never'}
Last Failure: ${health.metrics.lastFailure?.toISOString() || 'None'}
    `);
    
    if (health.recommendations.length > 0) {
      console.log(`📋 RECOMMENDATIONS:\n${health.recommendations.map(r => `- ${r}`).join('\n')}`);
    }
  }

  /**
   * Resets metrics (useful for testing or after fixes)
   */
  resetMetrics(): void {
    this.metrics = {
      successfulRequests: 0,
      failedRequests: 0,
      configurationErrors: 0,
      quotaErrors: 0,
      lastSuccessfulRequest: null,
      lastFailure: null,
      uptimePercentage: 100
    };
    this.errorPatterns.clear();
    console.log('✅ AI monitoring metrics reset');
  }
}

// Export singleton instance
export const aiMonitoringService = new AIMonitoringService();

/**
 * Middleware wrapper for AI functions to automatically track metrics
 */
export function withAIMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  functionName: string
): T {
  return (async (...args: any[]) => {
    try {
      const result = await fn(...args);
      aiMonitoringService.recordSuccess();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        aiMonitoringService.recordFailure(error);
        console.error(`🔥 AI Function Error in ${functionName}:`, error.message);
      }
      throw error;
    }
  }) as T;
}