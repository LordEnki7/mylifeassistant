// AI Task Management Service
// Handles AI-powered task execution and scheduling monitoring

import { apiRequest } from "./queryClient";
import type { Task } from "@shared/schema";

export interface AITaskRequest {
  message: string;
  type: "general" | "task_creation" | "task_monitoring" | "schedule_check";
  context?: {
    relatedTasks?: Task[];
    dueDate?: string;
    category?: string;
  };
}

export interface AIResponse {
  message: string;
  actions?: Array<{
    type: "create_task" | "update_task" | "schedule_reminder" | "send_email";
    data: any;
  }>;
  confidence: number;
  suggestions?: string[];
}

export class AIService {
  private static instance: AIService;

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Process user request and determine AI actions
  async processRequest(request: AITaskRequest): Promise<AIResponse> {
    try {
      // Send request to backend AI service
      const response = await apiRequest("POST", "/api/ai/process", request);
      const result = await response.json();
      
      // Execute any automated actions
      if (result.actions) {
        await this.executeActions(result.actions);
      }
      
      return result;
    } catch (error) {
      console.error("AI service error:", error);
      return {
        message: "I'm having trouble processing your request. Please try again.",
        confidence: 0.1
      };
    }
  }

  // Execute AI-suggested actions
  private async executeActions(actions: Array<{type: string; data: any}>): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case "create_task":
            await apiRequest("POST", "/api/tasks", action.data);
            break;
          case "update_task":
            await apiRequest("PUT", `/api/tasks/${action.data.id}`, action.data);
            break;
          case "schedule_reminder":
            // Could integrate with calendar or notification system
            console.log("Scheduling reminder:", action.data);
            break;
          case "send_email":
            // Could integrate with email service
            console.log("Sending email:", action.data);
            break;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  // Monitor scheduled tasks and check completion
  async checkScheduledTasks(): Promise<{
    overdueTasks: Task[];
    upcomingTasks: Task[];
    suggestions: string[];
  }> {
    try {
      const response = await apiRequest("GET", "/api/ai/monitor-tasks");
      return await response.json();
    } catch (error) {
      console.error("Task monitoring error:", error);
      return {
        overdueTasks: [],
        upcomingTasks: [],
        suggestions: ["Unable to check tasks. Please try again."]
      };
    }
  }

  // AI chat interface
  async chat(message: string, context?: any): Promise<string> {
    try {
      const response = await this.processRequest({
        message,
        type: "general",
        context
      });
      return response.message;
    } catch (error) {
      return "I'm sorry, I'm having trouble responding right now. Please try again.";
    }
  }

  // Parse user message for task intent
  parseTaskIntent(message: string): {
    hasTaskIntent: boolean;
    taskType?: string;
    priority?: string;
    dueDate?: string;
    description?: string;
  } {
    const lowerMessage = message.toLowerCase();
    
    // Task creation keywords
    const taskKeywords = [
      "remind me", "schedule", "add task", "create task", 
      "need to", "have to", "should", "must", "todo"
    ];
    
    const hasTaskIntent = taskKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    // Priority detection
    let priority = "medium";
    if (lowerMessage.includes("urgent") || lowerMessage.includes("asap")) {
      priority = "high";
    } else if (lowerMessage.includes("whenever") || lowerMessage.includes("low priority")) {
      priority = "low";
    }
    
    // Date extraction (simple patterns)
    let dueDate: string | undefined;
    if (lowerMessage.includes("today")) {
      dueDate = new Date().toISOString().split('T')[0];
    } else if (lowerMessage.includes("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
    }
    
    return {
      hasTaskIntent,
      priority,
      dueDate,
      description: hasTaskIntent ? message : undefined
    };
  }
}

// Export singleton instance
export const aiService = AIService.getInstance();