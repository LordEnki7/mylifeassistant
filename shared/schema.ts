import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  company: text("company"),
  type: text("type").notNull(), // radio, licensing, grant, general
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const radioStations = pgTable("radio_stations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  frequency: text("frequency"),
  location: text("location"),
  genre: text("genre"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  website: text("website"),
  status: text("status").default("pending"), // pending, contacted, responded, rejected
  lastContacted: timestamp("last_contacted"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const grants = pgTable("grants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  organization: text("organization").notNull(),
  amount: decimal("amount"),
  deadline: timestamp("deadline"),
  status: text("status").default("discovered"), // discovered, applied, awarded, rejected
  description: text("description"),
  requirements: text("requirements"),
  applicationUrl: text("application_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  amount: decimal("amount").notNull(),
  description: text("description").notNull(),
  status: text("status").default("draft"), // draft, sent, paid, overdue
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  stripePaymentLink: text("stripe_payment_link"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("pending"), // pending, completed
  category: text("category"), // email, grant, radio, licensing, general
  relatedId: varchar("related_id"), // ID of related entity
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  template: text("template").notNull(),
  recipientType: text("recipient_type").notNull(), // radio, licensing, custom
  status: text("status").default("draft"), // draft, sending, sent, completed
  sentCount: integer("sent_count").default(0),
  totalRecipients: integer("total_recipients").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const knowledgeDocs = pgTable("knowledge_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // legal, finance, business, general
  tags: text("tags").array(),
  source: text("source"),
  citation: text("citation"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  response: text("response"),
  context: jsonb("context"), // RAG context and citations
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: varchar("resource_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const legalDocumentTemplates = pgTable("legal_document_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // credit_dispute, debt_validation, cease_desist, etc.
  documentType: text("document_type").notNull(), // letter, notice, demand, settlement_offer
  recipient: text("recipient"), // equifax, experian, transunion, debt_collector, etc.
  template: text("template").notNull(), // The actual letter template with placeholders
  variables: jsonb("variables"), // JSON object defining template variables
  legalBasis: text("legal_basis").array(), // Array of legal statutes/sections referenced
  escalationLevel: integer("escalation_level").default(1), // 1=initial, 2=second, 3=final, 4=settlement
  instructions: text("instructions"), // Special instructions for using this template
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertRadioStationSchema = createInsertSchema(radioStations).omit({
  id: true,
  createdAt: true,
});

export const insertGrantSchema = createInsertSchema(grants).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  createdAt: true,
  sentCount: true,
  totalRecipients: true,
});

export const insertKnowledgeDocSchema = createInsertSchema(knowledgeDocs).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertLegalDocumentTemplateSchema = createInsertSchema(legalDocumentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type RadioStation = typeof radioStations.$inferSelect;
export type InsertRadioStation = z.infer<typeof insertRadioStationSchema>;

export type Grant = typeof grants.$inferSelect;
export type InsertGrant = z.infer<typeof insertGrantSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;

export type KnowledgeDoc = typeof knowledgeDocs.$inferSelect;
export type InsertKnowledgeDoc = z.infer<typeof insertKnowledgeDocSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type LegalDocumentTemplate = typeof legalDocumentTemplates.$inferSelect;
export type InsertLegalDocumentTemplate = z.infer<typeof insertLegalDocumentTemplateSchema>;
