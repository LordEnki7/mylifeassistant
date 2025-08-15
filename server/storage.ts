import { 
  type User, type InsertUser,
  type Contact, type InsertContact,
  type RadioStation, type InsertRadioStation,
  type Grant, type InsertGrant,
  type Invoice, type InsertInvoice,
  type Task, type InsertTask,
  type EmailCampaign, type InsertEmailCampaign,
  type KnowledgeDoc, type InsertKnowledgeDoc,
  type ChatMessage, type InsertChatMessage,
  type AuditLog, type InsertAuditLog,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contacts
  getContacts(userId: string): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;

  // Radio Stations
  getRadioStations(userId: string): Promise<RadioStation[]>;
  getRadioStation(id: string): Promise<RadioStation | undefined>;
  createRadioStation(station: InsertRadioStation): Promise<RadioStation>;
  updateRadioStation(id: string, station: Partial<RadioStation>): Promise<RadioStation | undefined>;
  deleteRadioStation(id: string): Promise<boolean>;

  // Grants
  getGrants(userId: string): Promise<Grant[]>;
  getGrant(id: string): Promise<Grant | undefined>;
  createGrant(grant: InsertGrant): Promise<Grant>;
  updateGrant(id: string, grant: Partial<Grant>): Promise<Grant | undefined>;
  deleteGrant(id: string): Promise<boolean>;

  // Invoices
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;

  // Tasks
  getTasks(userId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Email Campaigns
  getEmailCampaigns(userId: string): Promise<EmailCampaign[]>;
  getEmailCampaign(id: string): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: string, campaign: Partial<EmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteEmailCampaign(id: string): Promise<boolean>;

  // Knowledge Docs
  getKnowledgeDocs(userId: string): Promise<KnowledgeDoc[]>;
  getKnowledgeDoc(id: string): Promise<KnowledgeDoc | undefined>;
  createKnowledgeDoc(doc: InsertKnowledgeDoc): Promise<KnowledgeDoc>;
  updateKnowledgeDoc(id: string, doc: Partial<KnowledgeDoc>): Promise<KnowledgeDoc | undefined>;
  deleteKnowledgeDoc(id: string): Promise<boolean>;

  // Chat Messages
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  getChatMessage(id: string): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Audit Logs
  getAuditLogs(userId: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Dashboard stats
  getDashboardStats(userId: string): Promise<{
    emailsSent: number;
    radioStations: number;
    grantOpportunities: number;
    revenue: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contacts: Map<string, Contact>;
  private radioStations: Map<string, RadioStation>;
  private grants: Map<string, Grant>;
  private invoices: Map<string, Invoice>;
  private tasks: Map<string, Task>;
  private emailCampaigns: Map<string, EmailCampaign>;
  private knowledgeDocs: Map<string, KnowledgeDoc>;
  private chatMessages: Map<string, ChatMessage>;
  private auditLogs: Map<string, AuditLog>;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.radioStations = new Map();
    this.grants = new Map();
    this.invoices = new Map();
    this.tasks = new Map();
    this.emailCampaigns = new Map();
    this.knowledgeDocs = new Map();
    this.chatMessages = new Map();
    this.auditLogs = new Map();

    // Initialize with demo user
    this.initializeDemoData();
  }

  private initializeDemoData() {
    const userId = randomUUID();
    const hardwiredUser: User = {
      id: userId,
      username: "user@mylifeassistant.com",
      password: "hardwired-user-no-password-needed",
      email: "user@mylifeassistant.com",
      name: "My Life Assistant User",
      createdAt: new Date(),
    };
    this.users.set(hardwiredUser.id, hardwiredUser);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Contacts
  async getContacts(userId: string): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(contact => contact.userId === userId);
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = {
      ...insertContact,
      id,
      email: insertContact.email || null,
      company: insertContact.company || null,
      notes: insertContact.notes || null,
      createdAt: new Date(),
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    const updated = { ...contact, ...contactUpdate };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  // Radio Stations
  async getRadioStations(userId: string): Promise<RadioStation[]> {
    return Array.from(this.radioStations.values()).filter(station => station.userId === userId);
  }

  async getRadioStation(id: string): Promise<RadioStation | undefined> {
    return this.radioStations.get(id);
  }

  async createRadioStation(insertStation: InsertRadioStation): Promise<RadioStation> {
    const id = randomUUID();
    const station: RadioStation = {
      ...insertStation,
      id,
      frequency: insertStation.frequency || null,
      location: insertStation.location || null,
      genre: insertStation.genre || null,
      contactEmail: insertStation.contactEmail || null,
      contactName: insertStation.contactName || null,
      website: insertStation.website || null,
      status: insertStation.status || "pending",
      lastContacted: insertStation.lastContacted || null,
      notes: insertStation.notes || null,
      createdAt: new Date(),
    };
    this.radioStations.set(id, station);
    return station;
  }

  async updateRadioStation(id: string, stationUpdate: Partial<RadioStation>): Promise<RadioStation | undefined> {
    const station = this.radioStations.get(id);
    if (!station) return undefined;
    const updated = { ...station, ...stationUpdate };
    this.radioStations.set(id, updated);
    return updated;
  }

  async deleteRadioStation(id: string): Promise<boolean> {
    return this.radioStations.delete(id);
  }

  // Grants
  async getGrants(userId: string): Promise<Grant[]> {
    return Array.from(this.grants.values()).filter(grant => grant.userId === userId);
  }

  async getGrant(id: string): Promise<Grant | undefined> {
    return this.grants.get(id);
  }

  async createGrant(insertGrant: InsertGrant): Promise<Grant> {
    const id = randomUUID();
    const grant: Grant = {
      ...insertGrant,
      id,
      amount: insertGrant.amount || null,
      deadline: insertGrant.deadline || null,
      status: insertGrant.status || "discovered",
      description: insertGrant.description || null,
      requirements: insertGrant.requirements || null,
      applicationUrl: insertGrant.applicationUrl || null,
      notes: insertGrant.notes || null,
      createdAt: new Date(),
    };
    this.grants.set(id, grant);
    return grant;
  }

  async updateGrant(id: string, grantUpdate: Partial<Grant>): Promise<Grant | undefined> {
    const grant = this.grants.get(id);
    if (!grant) return undefined;
    const updated = { ...grant, ...grantUpdate };
    this.grants.set(id, updated);
    return updated;
  }

  async deleteGrant(id: string): Promise<boolean> {
    return this.grants.delete(id);
  }

  // Invoices
  async getInvoices(userId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.userId === userId);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const invoice: Invoice = {
      ...insertInvoice,
      id,
      status: insertInvoice.status || "draft",
      dueDate: insertInvoice.dueDate || null,
      paidDate: insertInvoice.paidDate || null,
      stripePaymentLink: insertInvoice.stripePaymentLink || null,
      createdAt: new Date(),
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: string, invoiceUpdate: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    const updated = { ...invoice, ...invoiceUpdate };
    this.invoices.set(id, updated);
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    return this.invoices.delete(id);
  }

  // Tasks
  async getTasks(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      description: insertTask.description || null,
      dueDate: insertTask.dueDate || null,
      priority: insertTask.priority || "medium",
      status: insertTask.status || "pending",
      category: insertTask.category || null,
      relatedId: insertTask.relatedId || null,
      createdAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, taskUpdate: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    const updated = { ...task, ...taskUpdate };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Email Campaigns
  async getEmailCampaigns(userId: string): Promise<EmailCampaign[]> {
    return Array.from(this.emailCampaigns.values()).filter(campaign => campaign.userId === userId);
  }

  async getEmailCampaign(id: string): Promise<EmailCampaign | undefined> {
    return this.emailCampaigns.get(id);
  }

  async createEmailCampaign(insertCampaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const id = randomUUID();
    const campaign: EmailCampaign = {
      ...insertCampaign,
      id,
      status: insertCampaign.status || "draft",
      sentCount: 0,
      totalRecipients: 0,
      createdAt: new Date(),
    };
    this.emailCampaigns.set(id, campaign);
    return campaign;
  }

  async updateEmailCampaign(id: string, campaignUpdate: Partial<EmailCampaign>): Promise<EmailCampaign | undefined> {
    const campaign = this.emailCampaigns.get(id);
    if (!campaign) return undefined;
    const updated = { ...campaign, ...campaignUpdate };
    this.emailCampaigns.set(id, updated);
    return updated;
  }

  async deleteEmailCampaign(id: string): Promise<boolean> {
    return this.emailCampaigns.delete(id);
  }

  // Knowledge Docs
  async getKnowledgeDocs(userId: string): Promise<KnowledgeDoc[]> {
    return Array.from(this.knowledgeDocs.values()).filter(doc => doc.userId === userId);
  }

  async getKnowledgeDoc(id: string): Promise<KnowledgeDoc | undefined> {
    return this.knowledgeDocs.get(id);
  }

  async createKnowledgeDoc(insertDoc: InsertKnowledgeDoc): Promise<KnowledgeDoc> {
    const id = randomUUID();
    const doc: KnowledgeDoc = {
      ...insertDoc,
      id,
      tags: insertDoc.tags || null,
      source: insertDoc.source || null,
      citation: insertDoc.citation || null,
      createdAt: new Date(),
    };
    this.knowledgeDocs.set(id, doc);
    return doc;
  }

  async updateKnowledgeDoc(id: string, docUpdate: Partial<KnowledgeDoc>): Promise<KnowledgeDoc | undefined> {
    const doc = this.knowledgeDocs.get(id);
    if (!doc) return undefined;
    const updated = { ...doc, ...docUpdate };
    this.knowledgeDocs.set(id, updated);
    return updated;
  }

  async deleteKnowledgeDoc(id: string): Promise<boolean> {
    return this.knowledgeDocs.delete(id);
  }

  // Chat Messages
  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(msg => msg.userId === userId);
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    return this.chatMessages.get(id);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      response: insertMessage.response || null,
      context: insertMessage.context || null,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  // Audit Logs
  async getAuditLogs(userId: string): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values()).filter(log => log.userId === userId);
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const log: AuditLog = {
      ...insertLog,
      id,
      userId: insertLog.userId || null,
      resourceId: insertLog.resourceId || null,
      details: insertLog.details || null,
      createdAt: new Date(),
    };
    this.auditLogs.set(id, log);
    return log;
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    emailsSent: number;
    radioStations: number;
    grantOpportunities: number;
    revenue: number;
  }> {
    const campaigns = await this.getEmailCampaigns(userId);
    const stations = await this.getRadioStations(userId);
    const grants = await this.getGrants(userId);
    const invoices = await this.getInvoices(userId);

    const emailsSent = campaigns.reduce((sum, campaign) => sum + (campaign.sentCount || 0), 0);
    const radioStations = stations.length;
    const grantOpportunities = grants.filter(g => g.status === 'discovered').length;
    const revenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    return {
      emailsSent,
      radioStations,
      grantOpportunities,
      revenue,
    };
  }
}

export const storage = new MemStorage();
