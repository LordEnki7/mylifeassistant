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
    notes: z.string().max(1000, 'Notes too long').optional().nullable()
    // userId is extracted from JWT token
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
    notes: z.string().max(1000, 'Notes too long').optional().nullable()
    // userId is extracted from JWT token
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
    notes: z.string().max(1000, 'Notes too long').optional().nullable()
    // userId is extracted from JWT token
  }),

  // Invoice validation
  invoice: z.object({
    clientName: z.string().min(1, 'Client name is required').max(100, 'Client name too long').trim(),
    clientEmail: z.string().email('Invalid client email'),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
    description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
    dueDate: z.string().datetime('Invalid due date').optional().nullable(),
    status: z.enum(['draft', 'sent', 'paid', 'overdue']).default('draft'),
    paidDate: z.string().datetime('Invalid paid date').optional().nullable()
    // userId is extracted from JWT token
  }),

  // Task validation
  task: z.object({
    title: z.string().min(1, 'Task title is required').max(200, 'Title too long').trim(),
    description: z.string().max(2000, 'Description too long').optional().nullable(),
    dueDate: z.date().optional().nullable(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
    category: z.string().max(50, 'Category too long').optional().nullable(),
    relatedId: z.string().optional().nullable()
    // userId is extracted from JWT token
  }),

  // Music contract validation
  musicContract: z.object({
    name: z.string().min(1, 'Contract name is required').max(200, 'Name too long').trim(),
    type: z.string().min(1, 'Contract type is required').max(50, 'Type too long'),
    description: z.string().max(2000, 'Description too long').optional().nullable(),
    template: z.string().min(1, 'Template is required'),
    variables: z.record(z.string(), z.any()).optional().nullable(),
    status: z.enum(['template', 'draft', 'active', 'completed', 'cancelled']).default('template'),
    parties: z.record(z.string(), z.any()).optional().nullable(),
    terms: z.record(z.string(), z.any()).optional().nullable(),
    tags: z.array(z.string().max(50)).optional().nullable(),
    isActive: z.boolean().default(true)
    // userId is extracted from JWT token
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
      )
    // userId is now extracted from JWT token, not required in request body
  }),

  // Email campaign validation
  emailCampaign: z.object({
    name: z.string().min(1, 'Campaign name is required').max(100, 'Name too long').trim(),
    subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long').trim(),
    template: z.string().min(1, 'Email body is required').max(10000, 'Email body too long'),
    recipients: z.array(z.string().email('Invalid recipient email')).min(1, 'At least one recipient required'),
    status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'cancelled']).default('draft'),
    scheduledAt: z.string().datetime('Invalid schedule date').optional().nullable()
    // userId is extracted from JWT token
  }),

  // Knowledge document validation
  knowledgeDoc: z.object({
    title: z.string().min(1, 'Document title is required').max(200, 'Title too long').trim(),
    content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
    category: z.string().max(50, 'Category too long').optional().nullable(),
    tags: z.array(z.string().max(30, 'Tag too long')).optional().nullable(),
    source: z.string().max(500, 'Source too long').optional().nullable(),
    citation: z.string().max(500, 'Citation too long').optional().nullable()
    // userId is extracted from JWT token
  }),

  // Legal document template validation
  legalDocumentTemplate: z.object({
    title: z.string().min(1, 'Template title is required').max(200, 'Title too long').trim(),
    description: z.string().max(500, 'Description too long').optional().nullable(),
    category: z.string().min(1, 'Category is required').max(50, 'Category too long').trim(),
    documentType: z.string().min(1, 'Document type is required').max(50, 'Document type too long').trim(),
    recipient: z.string().max(50, 'Recipient too long').optional().nullable(),
    template: z.string().min(1, 'Template content is required').max(50000, 'Template too long'),
    variables: z.record(z.string(), z.any()).optional().nullable(),
    legalBasis: z.array(z.string().max(100, 'Legal basis too long')).optional().nullable(),
    escalationLevel: z.number().int().min(1).max(10).default(1),
    instructions: z.string().max(1000, 'Instructions too long').optional().nullable(),
    tags: z.array(z.string().max(30, 'Tag too long')).optional().nullable(),
    isActive: z.boolean().default(true)
    // userId is extracted from JWT token
  }),

  // Song validation
  song: z.object({
    title: z.string().min(1, 'Song title is required').max(200, 'Title too long').trim(),
    artist: z.string().min(1, 'Artist is required').max(100, 'Artist name too long').trim(),
    album: z.string().max(100, 'Album name too long').optional().nullable(),
    genre: z.string().max(50, 'Genre too long').optional().nullable(),
    duration: z.number().int().positive('Duration must be positive').optional().nullable(),
    isrc: z.string().max(20, 'ISRC too long').optional().nullable(),
    filePath: z.string().max(500, 'File path too long').optional().nullable(),
    fileFormat: z.enum(['mp3', 'wav', 'flac', 'aac']).optional().nullable(),
    description: z.string().max(1000, 'Description too long').optional().nullable(),
    promotionStatus: z.enum(['active', 'paused', 'completed']).default('active'),
    targetLicenseTypes: z.array(z.enum(['film', 'tv', 'commercial', 'game', 'other'])).optional().nullable()
    // userId is extracted from JWT token
  }),

  // Audiobook validation
  audiobook: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
    author: z.string().min(1, 'Author is required').max(100, 'Author name too long').trim(),
    series: z.string().max(100, 'Series name too long').optional().nullable(),
    seriesBook: z.number().int().positive('Series book number must be positive').optional().nullable(),
    genre: z.string().min(1, 'Genre is required').max(50, 'Genre too long').trim(),
    targetAudience: z.enum(['adult', 'young_adult', 'children']).optional().nullable(),
    narrator: z.string().max(100, 'Narrator name too long').optional().nullable(),
    duration: z.number().int().positive('Duration must be positive').optional().nullable(),
    chapters: z.number().int().positive('Chapters must be positive').optional().nullable(),
    isbn: z.string().max(20, 'ISBN too long').optional().nullable(),
    publishedDate: z.string().datetime('Invalid published date').optional().nullable(),
    filePath: z.string().max(500, 'File path too long').optional().nullable(),
    fileFormat: z.enum(['mp3', 'm4a', 'wav', 'aac']).optional().nullable(),
    coverImagePath: z.string().max(500, 'Cover image path too long').optional().nullable(),
    description: z.string().max(2000, 'Description too long').optional().nullable(),
    website: z.string().url('Invalid website URL').optional().nullable(),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format').optional().nullable(),
    promotionStatus: z.enum(['active', 'paused', 'completed']).default('active'),
    salesPlatforms: z.array(z.enum(['audible', 'spotify', 'apple', 'amazon', 'other'])).optional().nullable(),
    rightsStatus: z.enum(['owned', 'licensed', 'pending']).default('owned'),
    totalSales: z.number().int().min(0, 'Total sales cannot be negative').default(0),
    monthlyRevenue: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid revenue format').default('0')
    // userId is extracted from JWT token
  }),

  // Audiobook sale validation
  audiobookSale: z.object({
    audiobookId: z.string().min(1, 'Audiobook ID is required'),
    platform: z.string().min(1, 'Platform is required').max(50, 'Platform name too long').trim(),
    saleDate: z.string().datetime('Invalid sale date'),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
    currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
    royaltyRate: z.string().regex(/^0(\.\d{1,4})?$|^1(\.0{1,4})?$/, 'Invalid royalty rate').optional().nullable(),
    netEarnings: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid earnings format').optional().nullable(),
    transactionId: z.string().max(100, 'Transaction ID too long').optional().nullable(),
    customerLocation: z.string().max(100, 'Customer location too long').optional().nullable()
    // userId is extracted from JWT token
  }),

  // Audiobook promotional campaign validation
  audiobookPromotionalCampaign: z.object({
    audiobookId: z.string().min(1, 'Audiobook ID is required'),
    name: z.string().min(1, 'Campaign name is required').max(200, 'Campaign name too long').trim(),
    objective: z.string().min(1, 'Objective is required').max(100, 'Objective too long').trim(),
    targetAudience: z.string().max(100, 'Target audience too long').optional().nullable(),
    budget: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid budget format').optional().nullable(),
    status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']).default('planning'),
    startDate: z.string().datetime('Invalid start date').optional().nullable(),
    endDate: z.string().datetime('Invalid end date').optional().nullable(),
    description: z.string().max(2000, 'Description too long').optional().nullable(),
    goals: z.record(z.any()).optional().nullable(),
    channels: z.array(z.enum(['social_media', 'email', 'podcast', 'blog', 'press', 'influencer', 'other'])).optional().nullable(),
    metrics: z.record(z.any()).optional().nullable(),
    notes: z.string().max(2000, 'Notes too long').optional().nullable()
    // userId is extracted from JWT token
  }),

  // Audiobook promotional activity validation
  audiobookPromotionalActivity: z.object({
    campaignId: z.string().min(1, 'Campaign ID is required'),
    title: z.string().min(1, 'Activity title is required').max(200, 'Title too long').trim(),
    type: z.string().min(1, 'Activity type is required').max(50, 'Type too long').trim(),
    channel: z.string().min(1, 'Channel is required').max(50, 'Channel too long').trim(),
    status: z.enum(['planned', 'in_progress', 'completed', 'cancelled', 'scheduled']).default('planned'),
    scheduledDate: z.string().datetime('Invalid scheduled date').optional().nullable(),
    completedDate: z.string().datetime('Invalid completed date').optional().nullable(),
    description: z.string().max(2000, 'Description too long').optional().nullable(),
    content: z.string().max(10000, 'Content too long').optional().nullable(),
    targetUrl: z.string().url('Invalid target URL').optional().nullable(),
    budget: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid budget format').optional().nullable(),
    results: z.record(z.any()).optional().nullable(),
    notes: z.string().max(2000, 'Notes too long').optional().nullable()
  }),

  // Audiobook promotional content validation
  audiobookPromotionalContent: z.object({
    audiobookId: z.string().min(1, 'Audiobook ID is required'),
    campaignId: z.string().min(1, 'Campaign ID is required').optional().nullable(),
    title: z.string().min(1, 'Content title is required').max(200, 'Title too long').trim(),
    type: z.string().min(1, 'Content type is required').max(50, 'Type too long').trim(),
    platform: z.string().max(50, 'Platform too long').optional().nullable(),
    content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
    mediaUrls: z.array(z.string().url('Invalid media URL')).optional().nullable(),
    hashtags: z.array(z.string().max(50, 'Hashtag too long')).optional().nullable(),
    status: z.enum(['draft', 'approved', 'published', 'archived']).default('draft'),
    publishedDate: z.string().datetime('Invalid published date').optional().nullable(),
    engagement: z.record(z.any()).optional().nullable(),
    tags: z.array(z.string().max(30, 'Tag too long')).optional().nullable(),
    notes: z.string().max(2000, 'Notes too long').optional().nullable()
    // userId is extracted from JWT token
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