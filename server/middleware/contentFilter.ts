// AI Content Filtering and Legal Disclaimers
import type { Request, Response, NextFunction } from 'express';

// Legal and ethical content filtering for AI responses
export class AIContentFilter {
  private readonly prohibitedTopics = [
    'illegal activities',
    'financial fraud',
    'copyright infringement',
    'harmful advice',
    'dangerous activities',
    'inappropriate content'
  ];

  private readonly legalDisclaimers = {
    general: `
⚠️ **Important Disclaimer**: This AI assistant provides general information and suggestions only. It is not a substitute for professional legal, financial, or business advice. Always consult with qualified professionals for important decisions.
`,
    legal: `
⚖️ **Legal Disclaimer**: This information is for educational purposes only and does not constitute legal advice. Laws vary by jurisdiction. Please consult with a qualified attorney for legal matters.
`,
    financial: `
💰 **Financial Disclaimer**: This is not financial or investment advice. Past performance does not guarantee future results. Please consult with a qualified financial advisor before making investment decisions.
`,
    music_business: `
🎵 **Music Industry Disclaimer**: Music industry practices and contracts vary significantly. This information is general guidance only. Always have contracts reviewed by an entertainment lawyer.
`
  };

  // Filter AI messages for problematic content
  filterAIResponse(message: string, context?: any): {
    filtered: string;
    blocked: boolean;
    reason?: string;
    disclaimer?: string;
  } {
    const lowerMessage = message.toLowerCase();

    // Check for prohibited content patterns
    const prohibitedPatterns = [
      // Illegal activities
      {
        pattern: /\b(pirate|steal|hack|fraud|launder|illegal)\b/i,
        reason: 'Contains references to illegal activities',
        disclaimer: this.legalDisclaimers.legal
      },
      
      // Harmful financial advice
      {
        pattern: /\b(guaranteed profit|risk-free|insider trading|tax evasion)\b/i,
        reason: 'Contains potentially harmful financial advice',
        disclaimer: this.legalDisclaimers.financial
      },
      
      // Dangerous activities
      {
        pattern: /\b(dangerous|harmful|risky|illegal remedy)\b/i,
        reason: 'Contains potentially dangerous advice',
        disclaimer: this.legalDisclaimers.general
      },

      // Legal advice without disclaimer
      {
        pattern: /\b(sue|lawsuit|legal action|copyright law|contract law)\b/i,
        reason: 'Contains legal information requiring disclaimer',
        disclaimer: this.legalDisclaimers.legal
      }
    ];

    // Check each pattern
    for (const check of prohibitedPatterns) {
      if (check.pattern.test(lowerMessage)) {
        // For some patterns, block entirely
        if (check.reason.includes('illegal') || check.reason.includes('dangerous')) {
          return {
            filtered: "I can't provide advice on that topic. Let me help you with something else related to your music career or Life Assistant features.",
            blocked: true,
            reason: check.reason
          };
        }
        
        // For others, add disclaimer
        return {
          filtered: message + '\n\n' + check.disclaimer,
          blocked: false,
          disclaimer: check.disclaimer
        };
      }
    }

    // Add context-appropriate disclaimers
    const contextDisclaimer = this.getContextualDisclaimer(message, context);
    if (contextDisclaimer) {
      return {
        filtered: message + '\n\n' + contextDisclaimer,
        blocked: false,
        disclaimer: contextDisclaimer
      };
    }

    return {
      filtered: message,
      blocked: false
    };
  }

  private getContextualDisclaimer(message: string, context?: any): string | null {
    const lowerMessage = message.toLowerCase();

    // Music business topics
    if (lowerMessage.includes('contract') || 
        lowerMessage.includes('licensing') || 
        lowerMessage.includes('royalties') ||
        lowerMessage.includes('publishing')) {
      return this.legalDisclaimers.music_business;
    }

    // Financial topics
    if (lowerMessage.includes('invest') || 
        lowerMessage.includes('tax') || 
        lowerMessage.includes('deduction') ||
        lowerMessage.includes('business expense')) {
      return this.legalDisclaimers.financial;
    }

    // Legal topics
    if (lowerMessage.includes('rights') || 
        lowerMessage.includes('law') || 
        lowerMessage.includes('legal') ||
        lowerMessage.includes('dispute')) {
      return this.legalDisclaimers.legal;
    }

    return null;
  }

  // Validate user input for harmful content
  validateUserInput(message: string): {
    valid: boolean;
    reason?: string;
  } {
    const lowerMessage = message.toLowerCase();

    // Check for prompt injection attempts
    const injectionPatterns = [
      /ignore.*(previous|above|instruction)/i,
      /forget.*(previous|above|instruction)/i,
      /(act as|pretend to be|roleplay as)/i,
      /system.*(prompt|instruction)/i,
      /(override|bypass|disable).*(safety|filter|restriction)/i
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(lowerMessage)) {
        return {
          valid: false,
          reason: 'Potential prompt injection detected'
        };
      }
    }

    // Check for harmful requests
    const harmfulPatterns = [
      /how to.*(hack|crack|break|bypass)/i,
      /(illegal|unlawful).*(method|way|technique)/i,
      /generate.*(fake|false).*(document|id|certificate)/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(lowerMessage)) {
        return {
          valid: false,
          reason: 'Request for potentially harmful information'
        };
      }
    }

    return { valid: true };
  }
}

export const contentFilter = new AIContentFilter();

// Middleware to filter AI responses
export function aiContentFilterMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Store original json method
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Filter AI responses if present
    if (data && typeof data === 'object') {
      if (data.response) {
        const filtered = contentFilter.filterAIResponse(data.response, data.context);
        data.response = filtered.filtered;
        
        if (filtered.blocked) {
          data.blocked = true;
          data.blockReason = filtered.reason;
        }
        
        if (filtered.disclaimer) {
          data.disclaimer = filtered.disclaimer;
        }
      }
      
      if (data.message && typeof data.message === 'string') {
        const filtered = contentFilter.filterAIResponse(data.message);
        data.message = filtered.filtered;
        
        if (filtered.disclaimer) {
          data.disclaimer = filtered.disclaimer;
        }
      }
    }
    
    return originalJson.call(this, data);
  };

  next();
}

// Middleware to validate user input
export function inputContentFilterMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.body && req.body.message) {
    const validation = contentFilter.validateUserInput(req.body.message);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Content not allowed',
        message: 'Your message contains content that cannot be processed.',
        reason: validation.reason
      });
      return;
    }
  }

  next();
}