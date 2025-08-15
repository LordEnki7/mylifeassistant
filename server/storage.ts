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
  type LegalDocumentTemplate, type InsertLegalDocumentTemplate,
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

  // Legal Document Templates
  getLegalDocumentTemplates(userId: string): Promise<LegalDocumentTemplate[]>;
  getLegalDocumentTemplate(id: string): Promise<LegalDocumentTemplate | undefined>;
  createLegalDocumentTemplate(template: InsertLegalDocumentTemplate): Promise<LegalDocumentTemplate>;
  updateLegalDocumentTemplate(id: string, template: Partial<LegalDocumentTemplate>): Promise<LegalDocumentTemplate | undefined>;
  deleteLegalDocumentTemplate(id: string): Promise<boolean>;
  getLegalDocumentTemplatesByCategory(userId: string, category: string): Promise<LegalDocumentTemplate[]>;
  generateDocumentFromTemplate(templateId: string, variables: Record<string, any>): Promise<string>;

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
  private legalDocumentTemplates: Map<string, LegalDocumentTemplate>;

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
    this.legalDocumentTemplates = new Map();

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
    
    // Initialize credit dispute letter templates
    this.initializeCreditDisputeTemplates(userId);
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

  // Legal Document Templates
  async getLegalDocumentTemplates(userId: string): Promise<LegalDocumentTemplate[]> {
    return Array.from(this.legalDocumentTemplates.values()).filter(template => template.userId === userId);
  }

  async getLegalDocumentTemplate(id: string): Promise<LegalDocumentTemplate | undefined> {
    return this.legalDocumentTemplates.get(id);
  }

  async createLegalDocumentTemplate(insertTemplate: InsertLegalDocumentTemplate): Promise<LegalDocumentTemplate> {
    const id = randomUUID();
    const template: LegalDocumentTemplate = {
      ...insertTemplate,
      id,
      description: insertTemplate.description || null,
      recipient: insertTemplate.recipient || null,
      variables: insertTemplate.variables || null,
      legalBasis: insertTemplate.legalBasis || null,
      escalationLevel: insertTemplate.escalationLevel || 1,
      instructions: insertTemplate.instructions || null,
      tags: insertTemplate.tags || null,
      isActive: insertTemplate.isActive !== undefined ? insertTemplate.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.legalDocumentTemplates.set(id, template);
    return template;
  }

  async updateLegalDocumentTemplate(id: string, templateUpdate: Partial<LegalDocumentTemplate>): Promise<LegalDocumentTemplate | undefined> {
    const template = this.legalDocumentTemplates.get(id);
    if (!template) return undefined;
    const updated = { ...template, ...templateUpdate, updatedAt: new Date() };
    this.legalDocumentTemplates.set(id, updated);
    return updated;
  }

  async deleteLegalDocumentTemplate(id: string): Promise<boolean> {
    return this.legalDocumentTemplates.delete(id);
  }

  async getLegalDocumentTemplatesByCategory(userId: string, category: string): Promise<LegalDocumentTemplate[]> {
    return Array.from(this.legalDocumentTemplates.values())
      .filter(template => template.userId === userId && template.category === category && template.isActive);
  }

  async generateDocumentFromTemplate(templateId: string, variables: Record<string, any>): Promise<string> {
    const template = this.legalDocumentTemplates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    let generatedDocument = template.template;
    
    // Replace template variables with actual values
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      generatedDocument = generatedDocument.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return generatedDocument;
  }

  private initializeCreditDisputeTemplates(userId: string) {
    // Credit Dispute Letter Templates based on the provided PDFs
    const creditDisputeTemplates = [
      {
        title: "Credit Dispute Letter 1 - Equifax",
        description: "Initial credit dispute letter requesting verification documents from Equifax",
        category: "credit_dispute",
        documentType: "letter",
        recipient: "equifax",
        escalationLevel: 1,
        legalBasis: ["15 U.S.C. § 1681g", "FCRA Section 611(a)(5)(A)(i)", "15 U.S.C. § 1681i"],
        instructions: "Send via USPS Certified Mail. Attach copies of SSN card and Driver's License.",
        tags: ["fcra", "credit_dispute", "verification", "equifax"],
        template: `{{fullName}}
{{address}}
{{city}}, {{state}} {{zipCode}}
SSN: {{ssn}} | DOB: {{dateOfBirth}}

{{currentDate}}

Equifax
P.O. Box 740256
Atlanta, GA 30374

This letter is to inform you that I recently received a copy of my credit report that your company publishes and after reviewing it I found a number of items on the report that are inaccurate. The accounts in question are listed below.

Please send me copies of the documents that you have in your files as of this date that you used to verify the accuracy of the accounts listed below.

Under the Fair Credit Reporting Act, 15 U.S.C. § 1681g I have the right to demand that you disclose to me all of the documents that you have recorded and retained in your file at the time of this request concerning the accounts that you are reporting in my credit report. Please don't respond to my request by saying that these accounts have been verified. Send me copies of the documents that you have in your files that were used to verify them.

If you do not have any documentation in your files to verify the accuracy of these disputed accounts then please delete them immediately as required under Section 611(a)(5)(A)(i). By publishing these inaccurate and unverified items on my credit report and distributing them to 3rd parties you are damaging my reputation and credit worthiness.

Under the FCRA 15 U.S.C. § 1681i, all unverified accounts must be promptly deleted. Therefore, if you are unable to provide me with a copy of the verifiable proof that you have on file for each of the accounts listed below within 30 days of receipt of this letter then you must remove these accounts from my credit report.

Please provide me with a copy of an updated and corrected credit report showing these items removed.

I demand the following accounts be properly verified or removed immediately.

Name of Account:         Account Number:           Provide Physical Proof of Verification

{{disputedAccounts}}

* NOTE: Please also remove all non-account holding inquiries over 30 days old.

Thank You,

{{signature}}
{{fullName}}

Attached: Copy of my Social Security Card & Drivers License is attached
Sent: USPS Certified Mail`
      },
      {
        title: "Credit Dispute Letter 1 - Experian",
        description: "Initial credit dispute letter requesting verification documents from Experian",
        category: "credit_dispute",
        documentType: "letter",
        recipient: "experian",
        escalationLevel: 1,
        legalBasis: ["15 U.S.C. § 1681g", "FCRA Section 611(a)(5)(A)(i)", "15 U.S.C. § 1681i"],
        instructions: "Send via USPS Certified Mail. Attach copies of SSN card and Driver's License.",
        tags: ["fcra", "credit_dispute", "verification", "experian"],
        template: `{{fullName}}
{{address}}
{{city}}, {{state}} {{zipCode}}
SSN: {{ssn}} | DOB: {{dateOfBirth}}

{{currentDate}}

Experian
P.O. Box 2002
Allen, TX 75013

This letter is to inform you that I recently received a copy of my credit report that your company publishes and after reviewing it I found a number of items on the report that are inaccurate. The accounts in question are listed below.

Please send me copies of the documents that you have in your files as of this date that you used to verify the accuracy of the accounts listed below.

Under the Fair Credit Reporting Act, 15 U.S.C. § 1681g I have the right to demand that you disclose to me all of the documents that you have recorded and retained in your file at the time of this request concerning the accounts that you are reporting in my credit report. Please don't respond to my request by saying that these accounts have been verified. Send me copies of the documents that you have in your files that were used to verify them.

If you do not have any documentation in your files to verify the accuracy of these disputed accounts then please delete them immediately as required under Section 611(a)(5)(A)(i). By publishing these inaccurate and unverified items on my credit report and distributing them to 3rd parties you are damaging my reputation and credit worthiness.

Under the FCRA 15 U.S.C. § 1681i, all unverified accounts must be promptly deleted. Therefore, if you are unable to provide me with a copy of the verifiable proof that you have on file for each of the accounts listed below within 30 days of receipt of this letter then you must remove these accounts from my credit report.

Please provide me with a copy of an updated and corrected credit report showing these items removed.

I demand the following accounts be properly verified or removed immediately.

Name of Account:         Account Number:           Provide Physical Proof of Verification

{{disputedAccounts}}

* NOTE: Please also remove all non-account holding inquiries over 30 days old.

Thank You,

{{signature}}
{{fullName}}

Attached: Copy of my Social Security Card & Drivers License is attached
Sent: USPS Certified Mail`
      },
      {
        title: "Credit Dispute Letter 1 - TransUnion",
        description: "Initial credit dispute letter requesting verification documents from TransUnion",
        category: "credit_dispute",
        documentType: "letter",
        recipient: "transunion",
        escalationLevel: 1,
        legalBasis: ["15 U.S.C. § 1681g", "FCRA Section 611(a)(5)(A)(i)", "15 U.S.C. § 1681i"],
        instructions: "Send via USPS Certified Mail. Attach copies of SSN card and Driver's License.",
        tags: ["fcra", "credit_dispute", "verification", "transunion"],
        template: `{{fullName}}
{{address}}
{{city}}, {{state}} {{zipCode}}
SSN: {{ssn}} | DOB: {{dateOfBirth}}

{{currentDate}}

Trans Union
P.O. Box 2000
Chester, PA 19022

This letter is to inform you that I recently received a copy of my credit report that your company publishes and after reviewing it I found a number of items on the report that are inaccurate. The accounts in question are listed below.

Please send me copies of the documents that you have in your files as of this date that you used to verify the accuracy of the accounts listed below.

Under the Fair Credit Reporting Act, 15 U.S.C. § 1681g I have the right to demand that you disclose to me all of the documents that you have recorded and retained in your file at the time of this request concerning the accounts that you are reporting in my credit report. Please don't respond to my request by saying that these accounts have been verified. Send me copies of the documents that you have in your files that were used to verify them.

If you do not have any documentation in your files to verify the accuracy of these disputed accounts then please delete them immediately as required under Section 611(a)(5)(A)(i). By publishing these inaccurate and unverified items on my credit report and distributing them to 3rd parties you are damaging my reputation and credit worthiness.

Under the FCRA 15 U.S.C. § 1681i, all unverified accounts must be promptly deleted. Therefore, if you are unable to provide me with a copy of the verifiable proof that you have on file for each of the accounts listed below within 30 days of receipt of this letter then you must remove these accounts from my credit report.

Please provide me with a copy of an updated and corrected credit report showing these items removed.

I demand the following accounts be properly verified or removed immediately.

Name of Account:         Account Number:           Provide Physical Proof of Verification

{{disputedAccounts}}

* NOTE: Please also remove all non-account holding inquiries over 30 days old.

Thank You,

{{signature}}
{{fullName}}

Attached: Copy of my Social Security Card & Drivers License is attached
Sent: USPS Certified Mail`
      },
      {
        title: "Credit Dispute Final Warning - Experian",
        description: "Final warning letter to Experian with litigation threat (Level 3 Escalation)",
        category: "credit_dispute",
        documentType: "final_warning",
        recipient: "experian",
        escalationLevel: 3,
        legalBasis: ["FCRA Section 616", "FCRA Section 617", "15 U.S.C. § 1681(a)(4)", "FCRA Section 611(5)(A)", "15 U.S.C. § 1681b", "15 U.S.C. § 6802"],
        instructions: "Use only after previous dispute letters have failed. This is a litigation threat. Send via USPS Certified Mail. Attach copies of SSN card and Driver's License.",
        tags: ["fcra", "credit_dispute", "final_warning", "litigation_threat", "experian"],
        template: `{{currentDate}}

{{fullName}}
{{address}}
{{city}}, {{state}} {{zipCode}}

Experian Dispute Resolution
P.O. Box 4500
Allen TX 75013

       Please be advised that this is my THIRD WRITTEN REQUEST and FINAL WARNING that I
fully intend to pursue litigation in accordance with the FCRA to enforce my rights and seek relief
and recover all monetary damages that I may be entitled to under Section 616 and Section 617
regarding your continued willful and negligent noncompliance.

       Despite my previous 2 written requests, the unverified items listed below still remain on my credit
report in violation of Federal Law. You stated in your responses to my 2 dispute letters that you have
verified that the items listed below are accurate but you failed to send me copies of the documents that
you used to verify these accounts as per my request. The fact that you have ignored my request to
send me copies of the documents that you used to verify the disputed accounts is evidence that you
cannot and did not verify any of the disputed accounts like you said you did. Your failure to delete the
disputed accounts that you cannot verify after two written requests is also evidence of your willful
disregard for Federal Law.

       When we go to litigation and through the discovery process you will be required to produce these
documents along with an affidavit swearing under oath that these are the true and correct documents
that you used to verify the disputed accounts. The fact that you don't have any of the said documents
in your files is proof that you did not properly verify the accounts within 30 days as required by law and
the Court will order you to delete them.

       You say that you have reinvestigated these accounts but you've admitted that all you have done
is parroted information given to you by other sources and shifted the burden back to me to contact the
original creditor to verify these accounts which is clearly in violation of § 1681(a)(4).

      I also asked you to give me the name of the person in your company who verified the accuracy of
these accounts but you ignored this request as well which is another violation of Federal Law and
evidence of your willful disregard of the law.

    Please be advised that under Section 611 (5)(A) of the FCRA – you are required to "…promptly
DELETE all information which cannot be verified." I request that you do this immediately.

      The law is very clear as to the Civil liability and the remedy available to me (Section 616 & 617) if
you fail to comply with Federal Law. I am a litigious consumer and fully intend on pursuing litigation in
this matter to enforce my rights under the FCRA.

I demand that you delete all of the accounts listed below immediately. Please provide me with a
copy of an updated and corrected credit report showing that these items have been deleted.

 Name of Account:

{{disputedAccountsList}}

 On removal of the above-noted accounts please provide me with a copy of an updated and
corrected copy of my credit report showing that these accounts have been removed. Thanking
you in advance for your anticipated quick co-operation on this matter. Under 15

U.S. Code § 1681b, permissible purposes of consumer reports section (2) In accordance with
the written instructions of the consumer to whom it relates. Can you please produce to me
that shows my signature any instructions I asked your company or person to do for me?
Under 15 U.S. Code § 6802 Personal Information section (B) opt-out, the consumer is given
the opportunity before the time that such information is to be disclosed not to disclose. I
was never offered or awarded that opportunity. Your company or person never gave me an
explanation on how I, the consumer, can exercise that non-disclosure action as described in
subsection (C). Under 15 U.S. Code § 1681b, permissible purposes of consumer reports
section (2) In accordance with the written instructions of the consumer to whom it relates.
Can you please produce to me that shows my signature any instructions I asked your
company or person to do for me? Under 15 U.S. Code § 6802 Personal Information section
(B) opt-out, the consumer is given the opportunity before the time that such information is
to be disclosed not to disclose. I was never offered or awarded that opportunity. Your
company or person never gave me an explanation on how I, the consumer, can exercise
that non-disclosure action as described in subsection (C).

Thanking you in advance for your anticipated quick co-operation on this matter.
Thank you,

{{fullName}}

Attached: Copy of my Social Security Card & Drivers License is attached
Sent: USPS Certified Mail`
      },
      {
        title: "Credit Dispute Final Warning - TransUnion",
        description: "Final warning letter to TransUnion with litigation threat (Level 3 Escalation)",
        category: "credit_dispute",
        documentType: "final_warning",
        recipient: "transunion",
        escalationLevel: 3,
        legalBasis: ["FCRA Section 616", "FCRA Section 617", "15 U.S.C. § 1681(a)(4)", "FCRA Section 611(5)(A)", "15 U.S.C. § 1681b", "15 U.S.C. § 6802"],
        instructions: "Use only after previous dispute letters have failed. This is a litigation threat. Send via USPS Certified Mail. Attach copies of SSN card and Driver's License.",
        tags: ["fcra", "credit_dispute", "final_warning", "litigation_threat", "transunion"],
        template: `{{currentDate}}

{{fullName}}
{{address}}
{{city}}, {{state}} {{zipCode}}

TransUnion Dispute Resolution
P.O. Box 2000
Chester PA 19022

       Please be advised that this is my THIRD WRITTEN REQUEST and FINAL WARNING that I
fully intend to pursue litigation in accordance with the FCRA to enforce my rights and seek relief
and recover all monetary damages that I may be entitled to under Section 616 and Section 617
regarding your continued willful and negligent noncompliance.

       Despite my previous 2 written requests, the unverified items listed below still remain on my credit
report in violation of Federal Law. You stated in your responses to my 2 dispute letters that you have
verified that the items listed below are accurate but you failed to send me copies of the documents that
you used to verify these accounts as per my request. The fact that you have ignored my request to
send me copies of the documents that you used to verify the disputed accounts is evidence that you
cannot and did not verify any of the disputed accounts like you said you did. Your failure to delete the
disputed accounts that you cannot verify after two written requests is also evidence of your willful
disregard for Federal Law.

       When we go to litigation and through the discovery process you will be required to produce these
documents along with an affidavit swearing under oath that these are the true and correct documents
that you used to verify the disputed accounts. The fact that you don't have any of the said documents
in your files is proof that you did not properly verify the accounts within 30 days as required by law and
the Court will order you to delete them.

       You say that you have reinvestigated these accounts but you've admitted that all you have done
is parroted information given to you by other sources and shifted the burden back to me to contact the
original creditor to verify these accounts which is clearly in violation of § 1681(a)(4).

      I also asked you to give me the name of the person in your company who verified the accuracy of
these accounts but you ignored this request as well which is another violation of Federal Law and
evidence of your willful disregard of the law.

    Please be advised that under Section 611 (5)(A) of the FCRA – you are required to "…promptly
DELETE all information which cannot be verified." I request that you do this immediately.

      The law is very clear as to the Civil liability and the remedy available to me (Section 616 & 617) if
you fail to comply with Federal Law. I am a litigious consumer and fully intend on pursuing litigation in
this matter to enforce my rights under the FCRA.

I demand that you delete all of the accounts listed below immediately. Please provide me with a
copy of an updated and corrected credit report showing that these items have been deleted.

 Name of Account:

{{disputedAccountsList}}

 On removal of the above-noted accounts please provide me with a copy of an updated and
corrected copy of my credit report showing that these accounts have been removed. Thanking
you in advance for your anticipated quick co-operation on this matter. Under 15

U.S. Code § 1681b, permissible purposes of consumer reports section (2) In accordance with
the written instructions of the consumer to whom it relates. Can you please produce to me
that shows my signature any instructions I asked your company or person to do for me?
Under 15 U.S. Code § 6802 Personal Information section (B) opt-out, the consumer is given
the opportunity before the time that such information is to be disclosed not to disclose. I
was never offered or awarded that opportunity. Your company or person never gave me an
explanation on how I, the consumer, can exercise that non-disclosure action as described in
subsection (C). Under 15 U.S. Code § 1681b, permissible purposes of consumer reports
section (2) In accordance with the written instructions of the consumer to whom it relates.
Can you please produce to me that shows my signature any instructions I asked your
company or person to do for me? Under 15 U.S. Code § 6802 Personal Information section
(B) opt-out, the consumer is given the opportunity before the time that such information is
to be disclosed not to disclose. I was never offered or awarded that opportunity. Your
company or person never gave me an explanation on how I, the consumer, can exercise
that non-disclosure action as described in subsection (C).

Thanking you in advance for your anticipated quick co-operation on this matter.
Thank you,

{{fullName}}

Attached: Copy of my Social Security Card & Drivers License is attached
Sent: USPS Certified Mail`
      },
      {
        title: "Court Case Dismissal Reference - Midland Credit Management",
        description: "Reference document showing successful dismissal without prejudice from Midland Credit Management vs. Consumer",
        category: "credit_dispute",
        documentType: "reference_document",
        recipient: "court_record",
        escalationLevel: 4,
        legalBasis: ["Georgia Civil Procedure", "Dismissal Without Prejudice"],
        instructions: "This is a reference document showing a successful case outcome. Use this as evidence in disputes or litigation. Original case: 20MS139601 in Fulton County Magistrate Court.",
        tags: ["court_record", "dismissal", "midland_credit", "successful_outcome", "reference"],
        template: `REFERENCE DOCUMENT - SUCCESSFUL CASE OUTCOME

Case Information:
Court: Magistrate Court of Fulton County, State of Georgia
Case Number: 20MS139601
Date Filed: September 15, 2021
Authentication Code: N31FC-PYZ5K-ZR1X

Plaintiff: Midland Credit Management, Inc as assignee of CAPITAL ONE BANK (USA), N.A.
Defendant: {{defendantName}}

OUTCOME: DISMISSAL WITHOUT PREJUDICE

The plaintiff, Midland Credit Management, Inc as assignee of CAPITAL ONE BANK (USA), N.A., voluntarily dismissed its Complaint without prejudice on September 15, 2021.

This demonstrates that when consumers properly exercise their rights under the FCRA and challenge inaccurate or unverified accounts, debt collectors often cannot substantiate their claims and are forced to dismiss their lawsuits.

Key Legal Points:
- Dismissal without prejudice means the case was dropped
- This occurred in Fulton County, Georgia
- Represented the consumer's successful defense against debt collection lawsuit
- Shows the effectiveness of proper legal challenges to unverified debts

Authentication Details:
- Document can be verified at: https://ecert.gsccca.org/document/N31FC-PYZ5K-ZR1X
- Certified by Cathelene "Tina" Robinson, Clerk of Magistrate Court
- Official court record with certification date: 01/09/23

This reference document can be used to:
1. Show creditors that you understand the legal process
2. Demonstrate successful outcomes in similar cases
3. Reference in dispute letters as evidence of weak creditor positions
4. Support litigation threats with real case examples

IMPORTANT: This is a reference document only. Consult with a qualified attorney for legal advice specific to your situation.`
      }
    ];

    // Add the initial templates
    creditDisputeTemplates.forEach(templateData => {
      this.createLegalDocumentTemplate({
        userId,
        ...templateData,
        variables: {
          fullName: "Your Full Name",
          address: "Your Address",
          city: "City",
          state: "State",
          zipCode: "Zip Code",
          ssn: "000-00-0000",
          dateOfBirth: "MM/DD/YYYY",
          currentDate: "Current Date",
          disputedAccounts: "List disputed accounts here",
          disputedAccountsList: "1. ACCOUNT NAME\n2. ACCOUNT NAME\n3. ACCOUNT NAME",
          defendantName: "Consumer Name",
          signature: "Your Signature"
        }
      });
    });
  }
}

export const storage = new MemStorage();
