import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Note: Using validation schemas from middleware instead of Drizzle-generated ones
// The middleware schemas are designed for request validation (no userId required)
// while Drizzle schemas are for database operations (userId required)

// Security Middleware Imports
import { requireAuth, getUserId, generateToken, loginHardwiredUser } from "./middleware/auth";
import { 
  apiRateLimit, 
  emailRateLimit, 
  aiRateLimit, 
  progressiveDelay,
  emailQueue 
} from "./middleware/rateLimiting";
import { auditLogger, auditMiddleware } from "./middleware/auditLogger";
import { 
  validateRequest, 
  validateQuery, 
  sanitizeMiddleware, 
  schemas 
} from "./middleware/inputValidation";
import { contentFilter } from "./middleware/contentFilter";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply global security middleware
  app.use(sanitizeMiddleware);
  app.use(auditMiddleware);
  app.use(apiRateLimit);
  app.use(progressiveDelay);

  // Health check endpoint (no auth required)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Authentication endpoints (no auth required)
  app.post("/api/auth/login", async (req, res) => {
    try {
      await auditLogger.logAuth(req, 'login', true);
      const { token, user } = await loginHardwiredUser();
      res.json({ token, user });
    } catch (error) {
      await auditLogger.logAuth(req, 'login', false, error instanceof Error ? error.message : 'Login failed');
      res.status(401).json({ error: "Authentication failed", message: error instanceof Error ? error.message : "Login failed" });
    }
  });

  app.get("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      await auditLogger.logDataAccess(req, 'read', 'user', userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Dashboard (protected)
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const stats = await storage.getDashboardStats(userId);
      await auditLogger.logDataAccess(req, 'read', 'dashboard_stats', userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Contacts (all protected)
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const contacts = await storage.getContacts(userId);
      await auditLogger.logDataAccess(req, 'read', 'contacts', userId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", requireAuth, validateRequest(schemas.contact), async (req, res) => {
    try {
      const userId = getUserId(req);
      const contactData = { ...req.body, userId };
      const contact = await storage.createContact(contactData);
      await auditLogger.logDataAccess(req, 'create', 'contact', contact.id, true);
      res.json(contact);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'contact', undefined, false);
      res.status(400).json({ error: "Invalid contact data" });
    }
  });

  app.put("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const contact = await storage.updateContact(id, req.body);
      if (!contact) {
        await auditLogger.logDataAccess(req, 'update', 'contact', id, false);
        return res.status(404).json({ error: "Contact not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'contact', id, true);
      res.json(contact);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'contact', req.params.id, false);
      res.status(400).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteContact(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'contact', id, false);
        return res.status(404).json({ error: "Contact not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'contact', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'contact', req.params.id, false);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // Radio Stations (all protected)
  app.get("/api/radio-stations", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const stations = await storage.getRadioStations(userId);
      await auditLogger.logDataAccess(req, 'read', 'radio_stations', userId);
      res.json(stations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch radio stations" });
    }
  });

  app.post("/api/radio-stations", requireAuth, validateRequest(schemas.radioStation), async (req, res) => {
    try {
      const userId = getUserId(req);
      const stationData = { ...req.body, userId };
      const station = await storage.createRadioStation(stationData);
      await auditLogger.logDataAccess(req, 'create', 'radio_station', station.id, true);
      res.json(station);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'radio_station', undefined, false);
      res.status(400).json({ error: "Invalid radio station data" });
    }
  });

  app.put("/api/radio-stations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const station = await storage.updateRadioStation(id, req.body);
      if (!station) {
        await auditLogger.logDataAccess(req, 'update', 'radio_station', id, false);
        return res.status(404).json({ error: "Radio station not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'radio_station', id, true);
      res.json(station);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'radio_station', req.params.id, false);
      res.status(400).json({ error: "Failed to update radio station" });
    }
  });

  app.delete("/api/radio-stations/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteRadioStation(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'radio_station', id, false);
        return res.status(404).json({ error: "Radio station not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'radio_station', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'radio_station', req.params.id, false);
      res.status(500).json({ error: "Failed to delete radio station" });
    }
  });

  // Grants (all protected)
  app.get("/api/grants", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const grants = await storage.getGrants(userId);
      await auditLogger.logDataAccess(req, 'read', 'grants', userId);
      res.json(grants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch grants" });
    }
  });

  app.post("/api/grants", requireAuth, validateRequest(schemas.grant), async (req, res) => {
    try {
      const userId = getUserId(req);
      const grantData = { ...req.body, userId };
      const grant = await storage.createGrant(grantData);
      await auditLogger.logDataAccess(req, 'create', 'grant', grant.id, true);
      res.json(grant);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'grant', undefined, false);
      res.status(400).json({ error: "Invalid grant data" });
    }
  });

  app.put("/api/grants/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const grant = await storage.updateGrant(id, req.body);
      if (!grant) {
        await auditLogger.logDataAccess(req, 'update', 'grant', id, false);
        return res.status(404).json({ error: "Grant not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'grant', id, true);
      res.json(grant);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'grant', req.params.id, false);
      res.status(400).json({ error: "Failed to update grant" });
    }
  });

  app.delete("/api/grants/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteGrant(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'grant', id, false);
        return res.status(404).json({ error: "Grant not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'grant', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'grant', req.params.id, false);
      res.status(500).json({ error: "Failed to delete grant" });
    }
  });

  // Invoices (all protected)
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const invoices = await storage.getInvoices(userId);
      await auditLogger.logDataAccess(req, 'read', 'invoices', userId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", requireAuth, validateRequest(schemas.invoice), async (req, res) => {
    try {
      const userId = getUserId(req);
      const invoiceData = { ...req.body, userId };
      const invoice = await storage.createInvoice(invoiceData);
      await auditLogger.logDataAccess(req, 'create', 'invoice', invoice.id, true);
      res.json(invoice);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'invoice', undefined, false);
      res.status(400).json({ error: "Invalid invoice data" });
    }
  });

  app.put("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.updateInvoice(id, req.body);
      if (!invoice) {
        await auditLogger.logDataAccess(req, 'update', 'invoice', id, false);
        return res.status(404).json({ error: "Invoice not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'invoice', id, true);
      res.json(invoice);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'invoice', req.params.id, false);
      res.status(400).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteInvoice(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'invoice', id, false);
        return res.status(404).json({ error: "Invoice not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'invoice', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'invoice', req.params.id, false);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Tasks (all protected)
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const tasks = await storage.getTasks(userId);
      await auditLogger.logDataAccess(req, 'read', 'tasks', userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, validateRequest(schemas.task), async (req, res) => {
    try {
      const userId = getUserId(req);
      const taskData = { ...req.body, userId };
      const task = await storage.createTask(taskData);
      await auditLogger.logDataAccess(req, 'create', 'task', task.id, true);
      res.json(task);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'task', undefined, false);
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.updateTask(id, req.body);
      if (!task) {
        await auditLogger.logDataAccess(req, 'update', 'task', id, false);
        return res.status(404).json({ error: "Task not found" });
      }
      await auditLogger.logDataAccess(req, 'update', 'task', id, true);
      res.json(task);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'update', 'task', req.params.id, false);
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTask(id);
      if (!deleted) {
        await auditLogger.logDataAccess(req, 'delete', 'task', id, false);
        return res.status(404).json({ error: "Task not found" });
      }
      await auditLogger.logDataAccess(req, 'delete', 'task', id, true);
      res.json({ success: true });
    } catch (error) {
      await auditLogger.logDataAccess(req, 'delete', 'task', req.params.id, false);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Email Campaigns (all protected with rate limiting)
  app.get("/api/email-campaigns", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaigns = await storage.getEmailCampaigns(userId);
      await auditLogger.logDataAccess(req, 'read', 'email_campaigns', userId);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email campaigns" });
    }
  });

  app.post("/api/email-campaigns", requireAuth, emailRateLimit, validateRequest(schemas.emailCampaign), async (req, res) => {
    try {
      const userId = getUserId(req);
      const campaignData = { ...req.body, userId };
      const campaign = await storage.createEmailCampaign(campaignData);
      
      // Queue emails for campaign
      const queuePromises = campaignData.recipients.map((email: string) => 
        emailQueue.addJob({
          userId,
          to: email,
          subject: campaignData.subject,
          body: campaignData.template,
          priority: 'normal'
        })
      );
      
      await Promise.all(queuePromises);
      await auditLogger.logEmail(req, campaignData, true);
      await auditLogger.logDataAccess(req, 'create', 'email_campaign', campaign.id, true);
      
      res.json(campaign);
    } catch (error) {
      await auditLogger.logEmail(req, req.body, false, error instanceof Error ? error.message : 'Campaign creation failed');
      await auditLogger.logDataAccess(req, 'create', 'email_campaign', undefined, false);
      res.status(400).json({ error: "Invalid email campaign data" });
    }
  });

  // Knowledge Docs (all protected)
  app.get("/api/knowledge-docs", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const docs = await storage.getKnowledgeDocs(userId);
      await auditLogger.logDataAccess(req, 'read', 'knowledge_docs', userId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge docs" });
    }
  });

  app.post("/api/knowledge-docs", requireAuth, validateRequest(schemas.knowledgeDoc), async (req, res) => {
    try {
      const userId = getUserId(req);
      const docData = { ...req.body, userId };
      const doc = await storage.createKnowledgeDoc(docData);
      await auditLogger.logDataAccess(req, 'create', 'knowledge_doc', doc.id, true);
      res.json(doc);
    } catch (error) {
      await auditLogger.logDataAccess(req, 'create', 'knowledge_doc', undefined, false);
      res.status(400).json({ error: "Invalid knowledge doc data" });
    }
  });

  // Chat Messages (all protected with AI rate limiting)
  app.get("/api/chat-messages", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const messages = await storage.getChatMessages(userId);
      await auditLogger.logDataAccess(req, 'read', 'chat_messages', userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat-messages", requireAuth, aiRateLimit, validateRequest(schemas.chatMessage), async (req, res) => {
    try {
      const userId = getUserId(req);
      const messageData = { ...req.body, userId };
      
      // Enhanced AI response with task management capabilities and content filtering
      const aiResponse = await processAIMessage(messageData.message, userId);
      
      // Apply content filtering to AI response
      const filteredResponse = contentFilter.filterAIResponse(aiResponse.message, {
        userMessage: messageData.message,
        confidence: aiResponse.confidence
      });
      
      if (filteredResponse.blocked) {
        await auditLogger.logSecurityEvent(req, 'ai_content_blocked', {
          reason: filteredResponse.reason,
          userMessage: messageData.message.substring(0, 100)
        }, 'medium');
        return res.status(400).json({ 
          error: "Content filtered", 
          message: "This request contains content that cannot be processed.",
          reason: filteredResponse.reason
        });
      }
      
      const messageWithResponse = await storage.createChatMessage({
        ...messageData,
        response: filteredResponse.filtered + (filteredResponse.disclaimer || ''),
        context: { 
          citations: [],
          sources: [],
          confidence: aiResponse.confidence || 0.8,
          actions: aiResponse.actions || [],
          filtered: filteredResponse.disclaimer ? true : false
        }
      });
      
      await auditLogger.logAIInteraction(req, {
        id: messageWithResponse.id,
        message: messageData.message,
        response: filteredResponse.filtered,
        confidence: aiResponse.confidence,
        actions: aiResponse.actions
      }, true);
      
      await auditLogger.logDataAccess(req, 'create', 'chat_message', messageWithResponse.id, true);
      res.json(messageWithResponse);
    } catch (error) {
      await auditLogger.logAIInteraction(req, {
        message: req.body.message,
        response: null,
        confidence: 0
      }, false, error instanceof Error ? error.message : 'AI processing failed');
      await auditLogger.logDataAccess(req, 'create', 'chat_message', undefined, false);
      res.status(400).json({ error: "Invalid chat message data" });
    }
  });

  // AI Processing Endpoints (protected with AI rate limiting)
  app.post("/api/ai/process", requireAuth, aiRateLimit, async (req, res) => {
    try {
      const { message, type, context } = req.body;
      const userId = getUserId(req);
      
      const response = await processAIMessage(message, userId, type, context);
      
      // Apply content filtering
      const filteredResponse = contentFilter.filterAIResponse(response.message, {
        userMessage: message,
        confidence: response.confidence,
        type: type
      });
      
      if (filteredResponse.blocked) {
        await auditLogger.logSecurityEvent(req, 'ai_content_blocked', {
          reason: filteredResponse.reason,
          userMessage: message.substring(0, 100),
          type: type
        }, 'medium');
        return res.status(400).json({ 
          error: "Content filtered", 
          message: "This request contains content that cannot be processed.",
          reason: filteredResponse.reason
        });
      }
      
      await auditLogger.logAIInteraction(req, {
        message: message,
        response: filteredResponse.filtered,
        confidence: response.confidence,
        type: type
      }, true);
      
      res.json({
        ...response,
        message: filteredResponse.filtered + (filteredResponse.disclaimer || '')
      });
    } catch (error) {
      await auditLogger.logAIInteraction(req, {
        message: req.body.message,
        response: null,
        confidence: 0
      }, false, error instanceof Error ? error.message : 'AI processing failed');
      res.status(500).json({ error: "AI processing failed" });
    }
  });

  app.get("/api/ai/monitor-tasks", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const monitoring = await monitorUserTasks(userId);
      await auditLogger.logDataAccess(req, 'read', 'task_monitoring', userId);
      res.json(monitoring);
    } catch (error) {
      res.status(500).json({ error: "Task monitoring failed" });
    }
  });

  // Email queue status endpoint (protected)
  app.get("/api/email/queue-status", requireAuth, async (req, res) => {
    try {
      const stats = emailQueue.getQueueStats();
      await auditLogger.logDataAccess(req, 'read', 'email_queue_status', getUserId(req));
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch queue status" });
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
  
  // Get conversation history for context and memory
  const recentMessages = await storage.getChatMessages(userId);
  const conversationContext = buildConversationContext(recentMessages, message);
  
  // Personal information/name handling
  if (lowerMessage.includes("my name") || lowerMessage.includes("name is") || lowerMessage.includes("i'm") || lowerMessage.includes("i am")) {
    // Store name if introduced, recall if asked
    const nameMatch = message.match(/(my name is|i'm|i am)\s+([a-zA-Z]+)/i);
    if (nameMatch) {
      const name = nameMatch[2];
      return {
        message: `Nice to meet you, ${name}! I'll remember your name for our future conversations. How can I assist you with your music career and daily tasks?`,
        confidence: 0.95,
        suggestions: [
          "Schedule a task",
          "Research grants",
          "Add radio stations",
          "Create an invoice"
        ]
      };
    } else if (lowerMessage.includes("what is my name") || lowerMessage.includes("what's my name")) {
      if (conversationContext.userName) {
        return {
          message: `Your name is ${conversationContext.userName}! How can I help you today?`,
          confidence: 0.95,
          suggestions: [
            "Schedule a task",
            "Research grants",
            "Add radio stations",
            "Create an invoice"
          ]
        };
      } else {
        return {
          message: "I don't know your name yet. Could you tell me your name so I can remember it for future conversations?",
          confidence: 0.9,
          suggestions: ["My name is..."]
        };
      }
    }
  }
  
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
  
  // General assistance with personalization
  const greeting = conversationContext.userName ? `Hi ${conversationContext.userName}! ` : 'Hello! ';
  const welcomeBack = recentMessages.length > 0 ? 'Welcome back to ' : 'Welcome to ';
  
  return {
    message: `${greeting}${welcomeBack}your Life Assistant. I'm here to help you manage your music career and daily tasks. I can help you with:\n\n• **Grant Research** - Track C.A.R.E.N. funding opportunities\n• **Radio Promotion** - Manage station submissions and follow-ups\n• **Sync Licensing** - Track opportunities for movies, TV, games\n• **Task Management** - Create reminders and schedule activities\n• **Invoicing** - Manage payments and track income\n• **Knowledge Base** - Store important information and contacts\n\nWhat would you like help with today?`,
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
    const newTask = await storage.createTask(taskData);
    
    // Log task creation for audit
    await storage.createAuditLog({
      userId,
      action: 'ai_create_task',
      resource: 'task',
      resourceId: newTask.id,
      details: {
        taskTitle: taskData.title,
        priority: taskData.priority,
        category: taskData.category,
        aiGenerated: true
      }
    });
    
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

// Build conversation context for memory and personalization
function buildConversationContext(messages: any[], currentMessage: string): {
  userName?: string;
  recentTopics: string[];
  lastInteraction?: Date;
} {
  const context: {
    userName?: string;
    recentTopics: string[];
    lastInteraction?: Date;
  } = {
    recentTopics: []
  };
  
  // Extract user's name from conversation history
  for (const msg of messages) {
    if (msg.message) {
      const nameMatch = msg.message.match(/(my name is|i'm|i am)\s+([a-zA-Z]+)/i);
      if (nameMatch) {
        context.userName = nameMatch[2];
      }
      
      // Track recent topics
      const msgLower = msg.message.toLowerCase();
      if (msgLower.includes('grant')) context.recentTopics.push('grants');
      if (msgLower.includes('radio')) context.recentTopics.push('radio');
      if (msgLower.includes('sync') || msgLower.includes('licensing')) context.recentTopics.push('licensing');
      if (msgLower.includes('task') || msgLower.includes('remind')) context.recentTopics.push('tasks');
      if (msgLower.includes('invoice') || msgLower.includes('payment')) context.recentTopics.push('invoices');
    }
    
    if (msg.createdAt) {
      context.lastInteraction = new Date(msg.createdAt);
    }
  }
  
  // Remove duplicates from recent topics
  context.recentTopics = [...new Set(context.recentTopics)];
  
  return context;
}
