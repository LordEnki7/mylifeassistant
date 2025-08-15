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
      
      // Simple AI response simulation
      const aiResponse = `I understand you're asking about: "${messageData.message}". This is a placeholder response. In a production environment, this would integrate with OpenAI, Anthropic, or similar AI services for intelligent responses.`;
      
      const messageWithResponse = await storage.createChatMessage({
        ...messageData,
        response: aiResponse,
        context: { 
          citations: [],
          sources: [],
          confidence: 0.8
        }
      });
      
      res.json(messageWithResponse);
    } catch (error) {
      res.status(400).json({ error: "Invalid chat message data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
