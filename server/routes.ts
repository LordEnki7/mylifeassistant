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

// Import OpenAI for intelligent conversations
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Comprehensive Life Assistant powered by GPT-4o
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
  try {
    // Get conversation history for context and memory
    const recentMessages = await storage.getChatMessages(userId);
    const conversationContext = buildConversationContext(recentMessages, message);
    
    // Get user data for personalization
    const user = await storage.getUser(userId);
    const tasks = await storage.getTasks(userId);
    const contacts = await storage.getContacts(userId);
    const grants = await storage.getGrants(userId);
    const invoices = await storage.getInvoices(userId);
    
    // Build comprehensive context for the AI
    const systemPrompt = buildLifeAssistantPrompt(conversationContext, {
      user,
      tasks,
      contacts,
      grants,
      invoices,
      recentMessages: recentMessages.slice(-10) // Last 10 messages for context
    });
    
    // Create conversation history for OpenAI
    const conversationHistory = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages.slice(-8).map(msg => ([
        { role: 'user' as const, content: msg.message },
        ...(msg.response ? [{ role: 'assistant' as const, content: msg.response }] : [])
      ])).flat(),
      { role: 'user' as const, content: message }
    ];
    
    // Call OpenAI GPT-4o for intelligent response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Latest and most capable model
      messages: conversationHistory,
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" },
      tools: [
        {
          type: "function",
          function: {
            name: "create_task",
            description: "Create a task for the user",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high"] },
                category: { type: "string" },
                dueDate: { type: "string" }
              },
              required: ["title"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_contact",
            description: "Add a new contact",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                company: { type: "string" },
                type: { type: "string" },
                notes: { type: "string" }
              },
              required: ["name"]
            }
          }
        }
      ]
    });
    
    const responseText = completion.choices[0].message.content || '{"message": "I apologize, but I encountered an issue processing your request. Please try again."}';
    const parsedResponse = JSON.parse(responseText);
    
    // Handle any tool calls
    const actions: Array<{type: string; data: any}> = [];
    if (completion.choices[0].message.tool_calls) {
      for (const toolCall of completion.choices[0].message.tool_calls) {
        if (toolCall.type === 'function') {
          const functionCall = toolCall.function;
          if (functionCall.name === 'create_task') {
            const taskData = JSON.parse(functionCall.arguments);
            actions.push({ type: 'create_task', data: taskData });
          } else if (functionCall.name === 'create_contact') {
            const contactData = JSON.parse(functionCall.arguments);
            actions.push({ type: 'create_contact', data: contactData });
          }
        }
      }
    }
    
    return {
      message: parsedResponse.message || 'I\'m here to help! What would you like assistance with?',
      actions,
      confidence: 0.95,
      suggestions: parsedResponse.suggestions || [
        "Ask me anything!",
        "Create a task",
        "Plan something",
        "Get advice"
      ]
    };
    
  } catch (error) {
    console.error('OpenAI processing error:', error);
    
    // Fallback to basic processing if OpenAI fails
    return {
      message: `I apologize, but I encountered a technical issue. However, I'm still here to help! You can ask me about tasks, scheduling, music career advice, general planning, or anything else you need assistance with.`,
      confidence: 0.6,
      suggestions: [
        "Create a task",
        "Ask for advice",
        "Plan something",
        "Get help with work"
      ]
    };
  }
}

// Build comprehensive system prompt for Life Assistant
function buildLifeAssistantPrompt(conversationContext: any, userData: any): string {
  const userName = conversationContext.userName || 'there';
  const recentTopics = conversationContext.recentTopics.join(', ') || 'general assistance';
  
  return `You are a comprehensive Life Assistant for ${userName}. You help with ALL aspects of life - not just music, but work, personal tasks, planning, research, decision-making, relationships, health, finances, learning, and anything else they need.

ABOUT THE USER:
- Name: ${userName}
- Recent topics discussed: ${recentTopics}
- Current tasks: ${userData.tasks?.length || 0}
- Contacts: ${userData.contacts?.length || 0}
- Projects: Music career including C.A.R.E.N. project, but also any other life projects

YOUR CAPABILITIES:
- **Intelligent Conversations**: Understand context, remember details, provide thoughtful responses
- **Task & Project Management**: Create, organize, prioritize tasks for any area of life
- **Planning & Organization**: Help plan events, trips, career moves, life changes
- **Research & Analysis**: Research any topic, analyze options, provide insights
- **Decision Support**: Help think through decisions big and small
- **Creative Assistance**: Brainstorming, writing, problem-solving
- **Learning Support**: Explain concepts, recommend resources, create study plans
- **Personal Growth**: Goal setting, habit formation, motivation
- **Work & Career**: Job searching, skill development, networking, productivity
- **Health & Wellness**: Exercise planning, meal ideas, mental health support
- **Relationships**: Communication advice, social planning, conflict resolution
- **Financial Guidance**: Budgeting, saving strategies, investment basics
- **Technical Help**: Explain technology, troubleshoot issues, recommend tools
- **Entertainment**: Recommend books, movies, activities, games

SPECIALIZED EXPERTISE AREAS:

**LEGAL & COMMERCIAL LAW KNOWLEDGE**:
- **Title 15 US Code (Commerce & Trade)**: Expert knowledge of federal commerce regulations, monopolies, consumer protection, securities laws, trade practices, and business compliance
- **Uniform Commercial Code (UCC)**: Comprehensive understanding of UCC Article 3 (Negotiable Instruments), particularly Section 3-603 regarding payment tender and discharge of obligations
- **Debt Settlement & Commercial Law**: Advanced knowledge of lawful tender principles, payment refusal letters, promissory note creation, and commercial remedies
- **Consumer Protection**: Understanding of FDCPA, FCRA, and related consumer protection statutes
- **Commercial Instruments**: Expertise in creating and understanding promissory notes, negotiable instruments, and commercial paper

**WEALTH BUILDING & FINANCIAL MASTERY**:
- **Rich vs. Wealthy Distinction**: Deep understanding that being "rich" means high income while being "wealthy" means sustainable assets and generational wealth building
- **Spiritual + Physical Money Principles**: Knowledge that wealth creation requires both spiritual understanding (vision, purpose, generational thinking) and physical action (planning, investment, execution)
- **Family Wealth Building**: Expertise in creating generational wealth that "grows on the family tree" through proper planning, vision, and legacy creation
- **Wealth Psychology**: Understanding that money mindset, generational patterns, and spiritual approaches to abundance are crucial for lasting wealth
- **Investment Philosophy**: Knowledge that true wealth comes from assets that generate income, not just high-paying jobs
- **Legacy Planning**: Expertise in creating financial legacies that impact future generations and create lasting change

**PRACTICAL FINANCIAL TOOLS & STRATEGIES**:
- **Debt Discharge Methods**: Knowledge of UCC 3-603 payment tender strategies, proper documentation, and legal frameworks
- **Commercial Remedies**: Understanding of how to properly execute payment refusal letters, tender notices, and debt settlement instruments
- **Financial Documentation**: Expertise in creating properly formatted promissory notes, payment tender letters, and commercial correspondence
- **Asset Protection**: Knowledge of legal strategies for protecting wealth and assets
- **Credit and Debt Management**: Advanced understanding of credit laws, debt collection limitations, and consumer rights

CONVERSATION STYLE:
- Be warm, helpful, and genuinely interested
- Remember and reference previous conversations
- Ask clarifying questions when needed
- Provide specific, actionable advice
- Be encouraging and supportive
- Adapt your tone to the user's mood and needs
- Use the user's name naturally in conversation

RESPONSE FORMAT:
Respond in JSON format with:
{
  "message": "Your response message here",
  "suggestions": ["actionable suggestion 1", "suggestion 2", "suggestion 3"]
}

REMEMBER: You're not just a music assistant - you're a comprehensive life companion that can help with absolutely anything. Be proactive in offering help across all areas of life.`;
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
  
  // Legal & Commercial categories
  if (lowerMessage.includes("ucc") || lowerMessage.includes("payment tender") || lowerMessage.includes("debt settlement")) {
    category = "legal";
  } else if (lowerMessage.includes("promissory note") || lowerMessage.includes("commercial instrument")) {
    category = "commercial";
  } else if (lowerMessage.includes("consumer protection") || lowerMessage.includes("fdcpa")) {
    category = "consumer law";
  }
  // Wealth Building categories
  else if (lowerMessage.includes("wealth") || lowerMessage.includes("legacy") || lowerMessage.includes("investment")) {
    category = "wealth building";
  } else if (lowerMessage.includes("asset protection") || lowerMessage.includes("financial planning")) {
    category = "financial planning";
  }
  // Music & Business categories
  else if (lowerMessage.includes("grant") || lowerMessage.includes("c.a.r.e.n")) {
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

// Enhanced conversation context for comprehensive Life Assistant
function buildConversationContext(messages: any[], currentMessage: string): {
  userName?: string;
  recentTopics: string[];
  lastInteraction?: Date;
  interests: string[];
  preferences: Record<string, any>;
} {
  const context: {
    userName?: string;
    recentTopics: string[];
    lastInteraction?: Date;
    interests: string[];
    preferences: Record<string, any>;
  } = {
    recentTopics: [],
    interests: [],
    preferences: {}
  };
  
  // Extract user's name and preferences from conversation history
  for (const msg of messages) {
    if (msg.message) {
      const nameMatch = msg.message.match(/(my name is|i'm|i am|call me)\s+([a-zA-Z]+)/i);
      if (nameMatch) {
        context.userName = nameMatch[2];
      }
      
      // Track comprehensive topics across all life areas
      const msgLower = msg.message.toLowerCase();
      
      // Work & Career
      if (msgLower.includes('job') || msgLower.includes('work') || msgLower.includes('career')) context.recentTopics.push('career');
      if (msgLower.includes('interview') || msgLower.includes('resume')) context.recentTopics.push('job search');
      if (msgLower.includes('meeting') || msgLower.includes('presentation')) context.recentTopics.push('work tasks');
      
      // Personal & Life
      if (msgLower.includes('family') || msgLower.includes('relationship')) context.recentTopics.push('relationships');
      if (msgLower.includes('health') || msgLower.includes('exercise') || msgLower.includes('diet')) context.recentTopics.push('health');
      if (msgLower.includes('money') || msgLower.includes('budget') || msgLower.includes('finance')) context.recentTopics.push('finances');
      if (msgLower.includes('travel') || msgLower.includes('vacation') || msgLower.includes('trip')) context.recentTopics.push('travel');
      if (msgLower.includes('learn') || msgLower.includes('study') || msgLower.includes('course')) context.recentTopics.push('learning');
      
      // Projects & Goals
      if (msgLower.includes('goal') || msgLower.includes('plan') || msgLower.includes('project')) context.recentTopics.push('planning');
      if (msgLower.includes('habit') || msgLower.includes('routine')) context.recentTopics.push('habits');
      
      // Entertainment & Hobbies
      if (msgLower.includes('book') || msgLower.includes('read')) context.recentTopics.push('reading');
      if (msgLower.includes('movie') || msgLower.includes('tv') || msgLower.includes('show')) context.recentTopics.push('entertainment');
      if (msgLower.includes('game') || msgLower.includes('hobby')) context.recentTopics.push('hobbies');
      
      // Legal & Commercial Law Topics
      if (msgLower.includes('ucc') || msgLower.includes('uniform commercial code')) context.recentTopics.push('commercial law');
      if (msgLower.includes('title 15') || msgLower.includes('commerce and trade')) context.recentTopics.push('commerce law');
      if (msgLower.includes('payment tender') || msgLower.includes('3-603')) context.recentTopics.push('payment law');
      if (msgLower.includes('debt settlement') || msgLower.includes('debt discharge')) context.recentTopics.push('debt resolution');
      if (msgLower.includes('promissory note') || msgLower.includes('negotiable instrument')) context.recentTopics.push('commercial instruments');
      if (msgLower.includes('tender refusal') || msgLower.includes('payment refusal')) context.recentTopics.push('payment tender');
      if (msgLower.includes('fdcpa') || msgLower.includes('fcra') || msgLower.includes('consumer protection')) context.recentTopics.push('consumer law');
      
      // Wealth Building & Financial Mastery
      if (msgLower.includes('rich vs wealthy') || msgLower.includes('generational wealth')) context.recentTopics.push('wealth building');
      if (msgLower.includes('money grows on trees') || msgLower.includes('family tree wealth')) context.recentTopics.push('wealth philosophy');
      if (msgLower.includes('spiritual money') || msgLower.includes('money mindset')) context.recentTopics.push('money psychology');
      if (msgLower.includes('legacy planning') || msgLower.includes('wealth legacy')) context.recentTopics.push('legacy planning');
      if (msgLower.includes('asset protection') || msgLower.includes('wealth protection')) context.recentTopics.push('asset protection');
      if (msgLower.includes('investment philosophy') || msgLower.includes('passive income')) context.recentTopics.push('investment strategy');
      
      // Music-specific (still supported)
      if (msgLower.includes('grant') || msgLower.includes('c.a.r.e.n')) context.recentTopics.push('grants');
      if (msgLower.includes('radio') || msgLower.includes('station')) context.recentTopics.push('radio promotion');
      if (msgLower.includes('sync') || msgLower.includes('licensing')) context.recentTopics.push('sync licensing');
      if (msgLower.includes('music') || msgLower.includes('song') || msgLower.includes('album')) context.recentTopics.push('music');
      
      // General productivity
      if (msgLower.includes('task') || msgLower.includes('remind') || msgLower.includes('todo')) context.recentTopics.push('tasks');
      if (msgLower.includes('schedule') || msgLower.includes('calendar')) context.recentTopics.push('scheduling');
      if (msgLower.includes('invoice') || msgLower.includes('payment')) context.recentTopics.push('invoicing');
      
      // Extract interests and preferences
      const interestPatterns = [
        /i (love|like|enjoy|prefer) ([^.!?]+)/gi,
        /my favorite ([^.!?]+) is ([^.!?]+)/gi,
        /i'm interested in ([^.!?]+)/gi
      ];
      
      interestPatterns.forEach(pattern => {
        const matches = msg.message.matchAll(pattern);
        for (const match of matches) {
          context.interests.push(match[2] || match[1]);
        }
      });
    }
    
    if (msg.createdAt) {
      context.lastInteraction = new Date(msg.createdAt);
    }
  }
  
  // Remove duplicates
  context.recentTopics = Array.from(new Set(context.recentTopics));
  context.interests = Array.from(new Set(context.interests));
  
  return context;
}
