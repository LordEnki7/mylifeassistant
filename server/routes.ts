import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertContactSchema,
  insertRadioStationSchema,
  insertGrantSchema,
  insertInvoiceSchema,
  insertTaskSchema,
  insertEmailCampaignSchema,
  insertKnowledgeDocSchema,
  insertChatMessageSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const userId = "demo-user"; // In real app, get from authentication
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Contacts
  app.get("/api/contacts", async (req, res) => {
    try {
      const userId = "demo-user";
      const contacts = await storage.getContacts(userId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const userId = "demo-user";
      const contactData = insertContactSchema.parse({ ...req.body, userId });
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: "Invalid contact data" });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const contact = await storage.updateContact(id, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteContact(id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // Radio Stations
  app.get("/api/radio-stations", async (req, res) => {
    try {
      const userId = "demo-user";
      const stations = await storage.getRadioStations(userId);
      res.json(stations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch radio stations" });
    }
  });

  app.post("/api/radio-stations", async (req, res) => {
    try {
      const userId = "demo-user";
      const stationData = insertRadioStationSchema.parse({ ...req.body, userId });
      const station = await storage.createRadioStation(stationData);
      res.json(station);
    } catch (error) {
      res.status(400).json({ error: "Invalid radio station data" });
    }
  });

  app.put("/api/radio-stations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const station = await storage.updateRadioStation(id, req.body);
      if (!station) {
        return res.status(404).json({ error: "Radio station not found" });
      }
      res.json(station);
    } catch (error) {
      res.status(400).json({ error: "Failed to update radio station" });
    }
  });

  app.delete("/api/radio-stations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteRadioStation(id);
      if (!deleted) {
        return res.status(404).json({ error: "Radio station not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete radio station" });
    }
  });

  // Grants
  app.get("/api/grants", async (req, res) => {
    try {
      const userId = "demo-user";
      const grants = await storage.getGrants(userId);
      res.json(grants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch grants" });
    }
  });

  app.post("/api/grants", async (req, res) => {
    try {
      const userId = "demo-user";
      const grantData = insertGrantSchema.parse({ ...req.body, userId });
      const grant = await storage.createGrant(grantData);
      res.json(grant);
    } catch (error) {
      res.status(400).json({ error: "Invalid grant data" });
    }
  });

  app.put("/api/grants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const grant = await storage.updateGrant(id, req.body);
      if (!grant) {
        return res.status(404).json({ error: "Grant not found" });
      }
      res.json(grant);
    } catch (error) {
      res.status(400).json({ error: "Failed to update grant" });
    }
  });

  app.delete("/api/grants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGrant(id);
      if (!deleted) {
        return res.status(404).json({ error: "Grant not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete grant" });
    }
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const userId = "demo-user";
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const userId = "demo-user";
      const invoiceData = insertInvoiceSchema.parse({ ...req.body, userId });
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.updateInvoice(id, req.body);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(400).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvoice(id);
      if (!deleted) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const userId = "demo-user";
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const userId = "demo-user";
      const taskData = insertTaskSchema.parse({ ...req.body, userId });
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.updateTask(id, req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTask(id);
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Email Campaigns
  app.get("/api/email-campaigns", async (req, res) => {
    try {
      const userId = "demo-user";
      const campaigns = await storage.getEmailCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email campaigns" });
    }
  });

  app.post("/api/email-campaigns", async (req, res) => {
    try {
      const userId = "demo-user";
      const campaignData = insertEmailCampaignSchema.parse({ ...req.body, userId });
      const campaign = await storage.createEmailCampaign(campaignData);
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ error: "Invalid email campaign data" });
    }
  });

  // Knowledge Docs
  app.get("/api/knowledge-docs", async (req, res) => {
    try {
      const userId = "demo-user";
      const docs = await storage.getKnowledgeDocs(userId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge docs" });
    }
  });

  app.post("/api/knowledge-docs", async (req, res) => {
    try {
      const userId = "demo-user";
      const docData = insertKnowledgeDocSchema.parse({ ...req.body, userId });
      const doc = await storage.createKnowledgeDoc(docData);
      res.json(doc);
    } catch (error) {
      res.status(400).json({ error: "Invalid knowledge doc data" });
    }
  });

  // Chat Messages
  app.get("/api/chat-messages", async (req, res) => {
    try {
      const userId = "demo-user";
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat-messages", async (req, res) => {
    try {
      const userId = "demo-user";
      const messageData = insertChatMessageSchema.parse({ ...req.body, userId });
      
      // Enhanced AI response with task management capabilities
      const aiResponse = await processAIMessage(messageData.message, userId);
      
      const messageWithResponse = await storage.createChatMessage({
        ...messageData,
        response: aiResponse.message,
        context: { 
          citations: [],
          sources: [],
          confidence: aiResponse.confidence || 0.8,
          actions: aiResponse.actions || []
        }
      });
      
      res.json(messageWithResponse);
    } catch (error) {
      res.status(400).json({ error: "Invalid chat message data" });
    }
  });

  // AI Processing Endpoints
  app.post("/api/ai/process", async (req, res) => {
    try {
      const { message, type, context } = req.body;
      const userId = "demo-user";
      
      const response = await processAIMessage(message, userId, type, context);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "AI processing failed" });
    }
  });

  app.get("/api/ai/monitor-tasks", async (req, res) => {
    try {
      const userId = "demo-user";
      const monitoring = await monitorUserTasks(userId);
      res.json(monitoring);
    } catch (error) {
      res.status(500).json({ error: "Task monitoring failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// AI Task Management Functions
async function processAIMessage(
  message: string, 
  userId: string, 
  type: string = "general", 
  context?: any
): Promise<{
  message: string;
  actions?: Array<{type: string; data: any}>;
  confidence: number;
  suggestions?: string[];
}> {
  const lowerMessage = message.toLowerCase();
  
  // Task creation detection
  const taskKeywords = [
    "remind me", "schedule", "add task", "create task", 
    "need to", "have to", "should", "must", "todo", "deadline"
  ];
  
  const hasTaskIntent = taskKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (hasTaskIntent) {
    return await handleTaskCreation(message, userId);
  }
  
  // Grant research
  if (lowerMessage.includes("grant") || lowerMessage.includes("c.a.r.e.n") || lowerMessage.includes("funding")) {
    return {
      message: "I can help you research grants for your C.A.R.E.N. project. Would you like me to add any specific grant opportunities to track? I can also help you organize application deadlines and requirements.",
      confidence: 0.9,
      suggestions: [
        "Add a new grant opportunity",
        "Check upcoming grant deadlines",
        "Review C.A.R.E.N. project grants"
      ]
    };
  }
  
  // Radio submission
  if (lowerMessage.includes("radio") || lowerMessage.includes("submit") || lowerMessage.includes("music promotion")) {
    return {
      message: "I can help you manage radio station submissions for your music. Would you like me to help you find new stations, track submission status, or schedule follow-ups?",
      confidence: 0.9,
      suggestions: [
        "Add new radio stations",
        "Check submission status",
        "Schedule follow-up emails"
      ]
    };
  }
  
  // Sync licensing
  if (lowerMessage.includes("sync") || lowerMessage.includes("licensing") || lowerMessage.includes("tv") || lowerMessage.includes("movie") || lowerMessage.includes("commercial")) {
    return {
      message: "I can assist with sync licensing opportunities for movies, TV shows, games, and commercials. Would you like me to help you track submissions or research new opportunities?",
      confidence: 0.9,
      suggestions: [
        "Research new sync opportunities",
        "Track licensing submissions",
        "Organize music library for sync"
      ]
    };
  }
  
  // Invoice management
  if (lowerMessage.includes("invoice") || lowerMessage.includes("payment") || lowerMessage.includes("bill")) {
    return {
      message: "I can help you manage invoices and track payments. Would you like me to create a new invoice, check payment status, or send reminders?",
      confidence: 0.9,
      suggestions: [
        "Create new invoice",
        "Check overdue payments",
        "Send payment reminders"
      ]
    };
  }
  
  // General assistance
  return {
    message: `I'm your Life Assistant, here to help you manage your music career and daily tasks. I can help you with:\n\n• **Grant Research** - Track C.A.R.E.N. funding opportunities\n• **Radio Promotion** - Manage station submissions and follow-ups\n• **Sync Licensing** - Track opportunities for movies, TV, games\n• **Task Management** - Create reminders and schedule activities\n• **Invoicing** - Manage payments and track income\n• **Knowledge Base** - Store important information and contacts\n\nWhat would you like help with today?`,
    confidence: 0.8,
    suggestions: [
      "Schedule a task",
      "Research grants",
      "Add radio stations",
      "Create an invoice"
    ]
  };
}

async function handleTaskCreation(
  message: string, 
  userId: string
): Promise<{
  message: string;
  actions: Array<{type: string; data: any}>;
  confidence: number;
}> {
  const lowerMessage = message.toLowerCase();
  
  // Extract task details
  let priority = "medium";
  if (lowerMessage.includes("urgent") || lowerMessage.includes("asap")) {
    priority = "high";
  } else if (lowerMessage.includes("whenever") || lowerMessage.includes("low priority")) {
    priority = "low";
  }
  
  // Extract due date
  let dueDate: Date | null = null;
  if (lowerMessage.includes("today")) {
    dueDate = new Date();
  } else if (lowerMessage.includes("tomorrow")) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
  } else if (lowerMessage.includes("next week")) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
  }
  
  // Determine category
  let category = "general";
  if (lowerMessage.includes("grant") || lowerMessage.includes("c.a.r.e.n")) {
    category = "grants";
  } else if (lowerMessage.includes("radio") || lowerMessage.includes("submission")) {
    category = "radio";
  } else if (lowerMessage.includes("sync") || lowerMessage.includes("licensing")) {
    category = "licensing";
  } else if (lowerMessage.includes("invoice") || lowerMessage.includes("payment")) {
    category = "invoicing";
  }
  
  // Create task
  const taskData = {
    userId,
    title: extractTaskTitle(message),
    description: message,
    priority,
    status: "pending",
    category,
    dueDate: dueDate || null
  };
  
  try {
    await storage.createTask(taskData);
    
    const dueDateText = dueDate ? ` for ${dueDate.toLocaleDateString()}` : "";
    
    return {
      message: `✅ I've created a ${priority} priority task: "${taskData.title}"${dueDateText}. I'll monitor this task and remind you if needed.`,
      actions: [{
        type: "create_task",
        data: taskData
      }],
      confidence: 0.95
    };
  } catch (error) {
    return {
      message: "I had trouble creating that task. Could you try rephrasing your request?",
      actions: [],
      confidence: 0.3
    };
  }
}

function extractTaskTitle(message: string): string {
  // Simple title extraction - remove common prefixes
  let title = message;
  const prefixes = [
    "remind me to", "remind me", "i need to", "i have to", 
    "i should", "i must", "please", "can you", "schedule"
  ];
  
  for (const prefix of prefixes) {
    if (title.toLowerCase().startsWith(prefix)) {
      title = title.substring(prefix.length).trim();
      break;
    }
  }
  
  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
}

async function monitorUserTasks(userId: string): Promise<{
  overdueTasks: any[];
  upcomingTasks: any[];
  suggestions: string[];
}> {
  const tasks = await storage.getTasks(userId);
  const now = new Date();
  
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === "completed") return false;
    return new Date(task.dueDate) < now;
  });
  
  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === "completed") return false;
    const taskDate = new Date(task.dueDate);
    const daysDiff = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 3 && daysDiff >= 0;
  });
  
  const suggestions = [];
  
  if (overdueTasks.length > 0) {
    suggestions.push(`You have ${overdueTasks.length} overdue task(s). Consider updating their status or rescheduling.`);
  }
  
  if (upcomingTasks.length > 0) {
    suggestions.push(`${upcomingTasks.length} task(s) are due in the next 3 days.`);
  }
  
  if (tasks.filter(t => t.status === "pending").length > 10) {
    suggestions.push("You have many pending tasks. Consider prioritizing or breaking them into smaller items.");
  }
  
  return {
    overdueTasks,
    upcomingTasks,
    suggestions
  };
}
