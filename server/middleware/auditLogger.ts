// Comprehensive Audit Logging System
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface AuditEvent {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  payloadHash?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

// Generate hash of sensitive payload data
export function generatePayloadHash(payload: any): string {
  const payloadString = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload, null, 0);
  
  return crypto
    .createHash('sha256')
    .update(payloadString)
    .digest('hex');
}

// Enhanced audit logger class
class AuditLogger {
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    };

    try {
      // Store in database (using existing schema fields)
      await storage.createAuditLog({
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId || null,
        details: {
          ...event.details,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          success: event.success,
          errorMessage: event.errorMessage || null
        }
      });

      // Also log to console for development/debugging
      console.log('[AUDIT]', {
        timestamp: auditEvent.timestamp.toISOString(),
        user: event.userId,
        action: event.action,
        resource: event.resource,
        success: event.success,
        ip: event.ipAddress
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  // Log authentication events
  async logAuth(req: Request, action: 'login' | 'logout' | 'token_refresh', success: boolean, error?: string): Promise<void> {
    await this.logEvent({
      userId: req.user?.id || null,
      action: `auth_${action}`,
      resource: 'authentication',
      details: {
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
      },
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      success,
      errorMessage: error
    });
  }

  // Log email sending events with payload hashing
  async logEmail(req: Request, emailData: any, success: boolean, error?: string): Promise<void> {
    const payloadHash = generatePayloadHash({
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body.substring(0, 100) // Only hash first 100 chars for privacy
    });

    await this.logEvent({
      userId: req.user?.id || null,
      action: 'email_send',
      resource: 'email',
      resourceId: emailData.id,
      details: {
        to: emailData.to,
        subject: emailData.subject,
        priority: emailData.priority || 'normal',
        queuedAt: new Date().toISOString()
      },
      payloadHash,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      success,
      errorMessage: error
    });
  }

  // Log AI/Chat interactions
  async logAIInteraction(req: Request, interaction: any, success: boolean, error?: string): Promise<void> {
    const payloadHash = generatePayloadHash({
      message: interaction.message,
      response: interaction.response?.substring(0, 100) // Only hash first 100 chars
    });

    await this.logEvent({
      userId: req.user?.id || null,
      action: 'ai_interaction',
      resource: 'ai_chat',
      resourceId: interaction.id,
      details: {
        messageLength: interaction.message?.length || 0,
        responseLength: interaction.response?.length || 0,
        confidence: interaction.confidence,
        hasActions: !!(interaction.actions && interaction.actions.length > 0)
      },
      payloadHash,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      success,
      errorMessage: error
    });
  }

  // Log data access/modification events
  async logDataAccess(req: Request, operation: 'create' | 'read' | 'update' | 'delete', resource: string, resourceId?: string, success: boolean = true): Promise<void> {
    await this.logEvent({
      userId: req.user?.id || null,
      action: `data_${operation}`,
      resource,
      resourceId,
      details: {
        method: req.method,
        path: req.path,
        query: req.query,
        bodySize: req.body ? JSON.stringify(req.body).length : 0
      },
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      success
    });
  }

  // Log security events
  async logSecurityEvent(req: Request, event: string, details: Record<string, any>, severity: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    await this.logEvent({
      userId: req.user?.id || null,
      action: `security_${event}`,
      resource: 'security',
      details: {
        ...details,
        severity,
        timestamp: new Date().toISOString()
      },
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      success: false // Security events are generally concerning
    });
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
           req.headers['x-real-ip'] as string || 
           req.connection.remoteAddress || 
           req.ip || 
           'unknown';
  }
}

export const auditLogger = new AuditLogger();

// Middleware to automatically log all API requests
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Store original json method to capture response data
  const originalJson = res.json;
  let responseData: any;
  
  res.json = function(data: any) {
    responseData = data;
    return originalJson.call(this, data);
  };

  // Log request completion
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    try {
      await auditLogger.logEvent({
        userId: req.user?.id || null,
        action: 'api_request',
        resource: 'api',
        resourceId: `${req.method}:${req.path}`,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          queryParams: req.query,
          bodySize: req.body ? JSON.stringify(req.body).length : 0,
          responseSize: responseData ? JSON.stringify(responseData).length : 0
        },
        ipAddress: auditLogger['getClientIP'](req),
        userAgent: req.headers['user-agent'] || 'unknown',
        success,
        errorMessage: !success ? responseData?.error || responseData?.message : undefined
      });
    } catch (error) {
      console.error('Failed to log API request:', error);
    }
  });

  next();
}