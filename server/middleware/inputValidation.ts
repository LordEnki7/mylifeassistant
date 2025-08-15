// Comprehensive Input Validation with Zod Schemas
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// Enhanced validation schemas for all inputs
export const schemas = {
  // Contact validation
  contact: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
    email: z.string().email('Invalid email format').optional().nullable(),
    company: z.string().max(100, 'Company name too long').optional().nullable(),
    notes: z.string().max(1000, 'Notes too long').optional().nullable(),
    userId: z.string().uuid('Invalid user ID')
  }),

  // Radio station validation
  radioStation: z.object({
    name: z.string().min(1, 'Station name is required').max(100, 'Name too long').trim(),
    frequency: z.string().max(20, 'Frequency too long').optional().nullable(),
    location: z.string().max(100, 'Location too long').optional().nullable(),
    genre: z.string().max(50, 'Genre too long').optional().nullable(),
    contactEmail: z.string().email('Invalid contact email').optional().nullable(),
    contactName: z.string().max(100, 'Contact name too long').optional().nullable(),
    website: z.string().url('Invalid website URL').optional().nullable(),
    status: z.enum(['pending', 'contacted', 'responded', 'rejected']).default('pending'),
    notes: z.string().max(1000, 'Notes too long').optional().nullable(),
    userId: z.string().uuid('Invalid user ID')
  }),

  // Grant validation
  grant: z.object({
    title: z.string().min(1, 'Grant title is required').max(200, 'Title too long').trim(),
    organization: z.string().min(1, 'Organization is required').max(100, 'Organization name too long').trim(),
    amount: z.string().max(50, 'Amount too long').optional().nullable(),
    deadline: z.string().datetime('Invalid deadline date').optional().nullable(),
    status: z.enum(['discovered', 'applied', 'awarded', 'rejected']).default('discovered'),
    description: z.string().max(2000, 'Description too long').optional().nullable(),
    requirements: z.string().max(2000, 'Requirements too long').optional().nullable(),
    applicationUrl: z.string().url('Invalid application URL').optional().nullable(),
    notes: z.string().max(1000, 'Notes too long').optional().nullable(),
    userId: z.string().uuid('Invalid user ID')
  }),

  // Invoice validation
  invoice: z.object({
    clientName: z.string().min(1, 'Client name is required').max(100, 'Client name too long').trim(),
    clientEmail: z.string().email('Invalid client email'),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
    description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
    dueDate: z.string().datetime('Invalid due date').optional().nullable(),
    status: z.enum(['draft', 'sent', 'paid', 'overdue']).default('draft'),
    paidDate: z.string().datetime('Invalid paid date').optional().nullable(),
    userId: z.string().uuid('Invalid user ID')
  }),

  // Task validation
  task: z.object({
    title: z.string().min(1, 'Task title is required').max(200, 'Title too long').trim(),
    description: z.string().max(2000, 'Description too long').optional().nullable(),
    dueDate: z.date().optional().nullable(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
    category: z.string().max(50, 'Category too long').optional().nullable(),
    relatedId: z.string().optional().nullable(),
    userId: z.string().uuid('Invalid user ID')
  }),

  // Chat message validation with content filtering
  chatMessage: z.object({
    message: z.string()
      .min(1, 'Message cannot be empty')
      .max(4000, 'Message too long')
      .trim()
      .refine(
        (msg) => !containsProhibitedContent(msg),
        'Message contains prohibited content'
      ),
    userId: z.string().uuid('Invalid user ID')
  }),

  // Email campaign validation
  emailCampaign: z.object({
    name: z.string().min(1, 'Campaign name is required').max(100, 'Name too long').trim(),
    subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long').trim(),
    body: z.string().min(1, 'Email body is required').max(10000, 'Email body too long'),
    recipients: z.array(z.string().email('Invalid recipient email')).min(1, 'At least one recipient required'),
    status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'cancelled']).default('draft'),
    scheduledAt: z.string().datetime('Invalid schedule date').optional().nullable(),
    userId: z.string().uuid('Invalid user ID')
  }),

  // Knowledge document validation
  knowledgeDoc: z.object({
    title: z.string().min(1, 'Document title is required').max(200, 'Title too long').trim(),
    content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
    category: z.string().max(50, 'Category too long').optional().nullable(),
    tags: z.array(z.string().max(30, 'Tag too long')).optional().nullable(),
    source: z.string().max(500, 'Source too long').optional().nullable(),
    citation: z.string().max(500, 'Citation too long').optional().nullable(),
    userId: z.string().uuid('Invalid user ID')
  }),

  // Auth validation
  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
};

// Content filtering for prohibited content
function containsProhibitedContent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  const prohibitedPatterns = [
    // Legal/illegal activities
    /\b(illegal|unlawful|fraud|scam|money laundering)\b/i,
    /\b(hack|hacking|crack|cracking|exploit)\b/i,
    /\b(pirate|piracy|copyright infringement)\b/i,
    
    // Harmful content
    /\b(suicide|self[\-\s]?harm|kill[\s]?(yourself|myself))\b/i,
    /\b(bomb|explosive|weapon|gun)\b/i,
    /\b(drug dealing|sell drugs|buy drugs)\b/i,
    
    // Spam/abuse patterns
    /\b(click here|make money fast|get rich quick)\b/i,
    /\b(viagra|cialis|casino|gambling)\b/i,
    
    // Prompt injection attempts
    /\b(ignore previous|forget instructions|system prompt)\b/i,
    /\b(act as|pretend to be|roleplay)\b/i
  ];

  return prohibitedPatterns.some(pattern => pattern.test(lowerMessage));
}

// Validation middleware factory
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid input data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      } else {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid input data'
        });
      }
    }
  };
}

// Query parameter validation
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        res.status(400).json({
          error: 'Invalid query parameters'
        });
      }
    }
  };
}

// Sanitize input data
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return data
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}

// Middleware to sanitize all input data
export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
}