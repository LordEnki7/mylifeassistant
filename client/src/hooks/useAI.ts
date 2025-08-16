// AI Assistant hook for task management and chat
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { aiService, type AITaskRequest, type AIResponse } from "@/lib/ai-service";
import type { Task } from "@shared/schema";

export function useAI() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [workingStatus, setWorkingStatus] = useState<string>("");
  const queryClient = useQueryClient();

  // Process AI request with task management capabilities
  const processRequest = async (request: AITaskRequest): Promise<AIResponse> => {
    setIsProcessing(true);
    try {
      const response = await aiService.processRequest(request);
      
      // Invalidate relevant queries if actions were taken
      if (response.actions?.length) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      }
      
      return response;
    } finally {
      setIsProcessing(false);
    }
  };

  // Chat with AI assistant
  const chat = async (message: string, context?: any): Promise<string> => {
    setIsProcessing(true);
    setWorkingStatus("🤔 Thinking about your request...");
    
    try {
      // Check if message has task intent
      const taskIntent = aiService.parseTaskIntent(message);
      
      if (taskIntent.hasTaskIntent) {
        setWorkingStatus("📝 Creating task for you...");
        
        // Process as task creation request
        const response = await processRequest({
          message,
          type: "task_creation",
          context: {
            ...context,
            dueDate: taskIntent.dueDate,
            category: "ai_generated"
          }
        });
        
        setWorkingStatus("✅ Task created! Updating your dashboard...");
        
        // Add a small delay to show the status
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return response.message;
      } else {
        setWorkingStatus("💭 Processing your message...");
        
        // Process as general chat
        const response = await aiService.chat(message, context);
        
        setWorkingStatus("📋 Checking if any actions are needed...");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return response;
      }
    } finally {
      setIsProcessing(false);
      setWorkingStatus("");
    }
  };

  // Monitor scheduled tasks
  const monitorTasks = async () => {
    try {
      return await aiService.checkScheduledTasks();
    } catch (error) {
      console.error("Task monitoring failed:", error);
      return {
        overdueTasks: [],
        upcomingTasks: [],
        suggestions: ["Unable to monitor tasks at this time."]
      };
    }
  };

  // Auto-check tasks periodically
  useEffect(() => {
    const checkTasks = async () => {
      const monitoring = await monitorTasks();
      
      // Alert user about overdue tasks
      if (monitoring.overdueTasks.length > 0) {
        console.log(`${monitoring.overdueTasks.length} overdue tasks detected`);
        // Could show notification or update UI
      }
    };

    // Check tasks every 30 minutes
    const interval = setInterval(checkTasks, 30 * 60 * 1000);
    
    // Initial check
    checkTasks();

    return () => clearInterval(interval);
  }, []);

  return {
    processRequest,
    chat,
    monitorTasks,
    isProcessing,
    workingStatus
  };
}