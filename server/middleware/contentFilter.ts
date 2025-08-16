// AI Content Filtering (Disabled for Single User App)
import type { Request, Response, NextFunction } from 'express';

export interface FilterResult {
  blocked: boolean;
  filteredContent: string;
  originalContent: string;
  reason: string | null;
  disclaimer: string | null;
}

// Disabled content filtering for single-user application
export class AIContentFilter {
  // No content filtering or legal disclaimers for single user
  filterAIResponse(aiResponse: string, context?: {
    userMessage?: string;
    confidence?: number;
    type?: string;
  }): FilterResult {
    // Return unfiltered response since this is a single-user app
    return {
      blocked: false,
      filteredContent: aiResponse,
      originalContent: aiResponse,
      reason: null,
      disclaimer: null
    };
  }

  // Legacy method for compatibility (also disabled)
  filterAIMessage(message: string, context?: any): {
    filtered: string;
    blocked: boolean;
    reason?: string;
    disclaimer?: string;
  } {
    return {
      filtered: message,
      blocked: false,
      reason: undefined,
      disclaimer: undefined
    };
  }

  // Input validation - only check for empty messages
  validateUserInput(message: string): {
    valid: boolean;
    reason?: string;
  } {
    if (!message || message.trim().length === 0) {
      return {
        valid: false,
        reason: 'Message cannot be empty'
      };
    }

    return {
      valid: true
    };
  }

  // Express middleware (pass-through)
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      next();
    };
  }
}

// Export singleton instance
export const contentFilter = new AIContentFilter();