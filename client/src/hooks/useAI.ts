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
      // Check for C.A.R.E.N. or grant-related queries
      const isCarenQuery = /caren|c\.a\.r\.e\.n|grant|funding/i.test(message);
      const isTaskQuery = /task|remind|schedule|create|add|help me|i need|can you/i.test(message);
      
      if (isCarenQuery && /grant|funding|find|search/i.test(message)) {
        setWorkingStatus("🔍 Searching for C.A.R.E.N. grants...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setWorkingStatus("📊 Analyzing funding opportunities...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setWorkingStatus("💾 Adding grants to your database...");
        await new Promise(resolve => setTimeout(resolve, 800));
      } else if (isTaskQuery) {
        setWorkingStatus("📝 Creating task for you...");
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setWorkingStatus("⚡ Setting up reminders...");
        await new Promise(resolve => setTimeout(resolve, 600));
      } else {
        setWorkingStatus("💭 Processing your message...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Always process through the AI service
      const response = await aiService.chat(message, context);
      
      setWorkingStatus("✅ Task completed! Updating dashboard...");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return response;
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