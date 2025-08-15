// Rate Limiting and Email Queue Management
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import slowDown from 'express-slow-down';
import type { Request, Response } from 'express';

// IPv6-safe key generator helper using express-rate-limit's ipKeyGenerator
function generateRateLimitKey(req: Request): string {
  // Use user ID if authenticated, otherwise use normalized IP
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // Get the client IP address
  const forwarded = req.headers['x-forwarded-for'] as string;
  const clientIP = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.connection?.remoteAddress || 'unknown';
  
  // Use express-rate-limit's built-in IPv6-safe key generator
  return ipKeyGenerator(clientIP);
}

// General API rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Stricter rate limiting for email/communication endpoints
export const emailRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each user to 50 emails per hour
  message: {
    error: 'Email rate limit exceeded',
    message: 'Too many emails sent. Please wait before sending more.',
    retryAfter: '1 hour'
  },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false
});

// AI/Chat rate limiting to prevent abuse
export const aiRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each user to 20 AI requests per 5 minutes
  message: {
    error: 'AI rate limit exceeded',
    message: 'Too many AI requests. Please wait before making more requests.',
    retryAfter: '5 minutes'
  },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false
});

// Progressive delay for suspicious activity
export const progressiveDelay = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per 15 minutes at full speed
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 10000, // Maximum delay of 10 seconds
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  validate: { delayMs: false } // Disable warning
});

// Email queue configuration (simple in-memory for now, can be upgraded to Redis later)
interface EmailJob {
  id: string;
  userId: string;
  to: string;
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  lastAttemptAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

class EmailQueue {
  private queue: EmailJob[] = [];
  private processing = false;
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s

  async addJob(emailData: {
    userId: string;
    to: string;
    subject: string;
    body: string;
    priority?: 'low' | 'normal' | 'high';
    delay?: number;
  }): Promise<string> {
    const job: EmailJob = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: emailData.userId,
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body,
      priority: emailData.priority || 'normal',
      attempts: 0,
      maxAttempts: this.maxRetries,
      createdAt: new Date(),
      scheduledAt: emailData.delay ? new Date(Date.now() + emailData.delay) : new Date(),
      status: 'pending'
    };

    // Insert job based on priority
    const insertIndex = this.queue.findIndex(existingJob => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[existingJob.priority] < priorityOrder[job.priority];
    });

    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    this.processQueue();
    return job.id;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const now = new Date();
        const job = this.queue.find(j => 
          j.status === 'pending' && 
          (!j.scheduledAt || j.scheduledAt <= now)
        );

        if (!job) {
          // No jobs ready to process
          break;
        }

        await this.processJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processJob(job: EmailJob): Promise<void> {
    job.status = 'processing';
    job.attempts++;
    job.lastAttemptAt = new Date();

    try {
      // Simulate email sending (replace with actual email service)
      await this.sendEmail(job);
      
      job.status = 'completed';
      this.removeJob(job.id);
      
      console.log(`Email sent successfully: ${job.id}`);
    } catch (error) {
      console.error(`Email send failed (attempt ${job.attempts}/${job.maxAttempts}):`, error);
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        this.removeJob(job.id);
      } else {
        // Schedule retry with exponential backoff
        const delay = this.retryDelays[job.attempts - 1] || 15000;
        job.scheduledAt = new Date(Date.now() + delay);
        job.status = 'pending';
        
        // Continue processing after delay
        setTimeout(() => this.processQueue(), delay);
      }
    }
  }

  private async sendEmail(job: EmailJob): Promise<void> {
    // Placeholder for actual email service integration
    // Replace with your preferred email service (SendGrid, AWS SES, etc.)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional failures for testing retry logic
    if (Math.random() < 0.1) {
      throw new Error('Simulated email service error');
    }
    
    console.log(`[EMAIL QUEUE] Sending email to ${job.to}: ${job.subject}`);
  }

  private removeJob(jobId: string): void {
    const index = this.queue.findIndex(job => job.id === jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  getQueueStats(): {
    pending: number;
    processing: number;
    failed: number;
    total: number;
  } {
    return {
      pending: this.queue.filter(j => j.status === 'pending').length,
      processing: this.queue.filter(j => j.status === 'processing').length,
      failed: this.queue.filter(j => j.status === 'failed').length,
      total: this.queue.length
    };
  }
}

export const emailQueue = new EmailQueue();