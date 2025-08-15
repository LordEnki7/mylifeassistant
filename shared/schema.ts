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

export const songs = pgTable("songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  genre: text("genre"),
  duration: integer("duration"), // Duration in seconds
  isrc: text("isrc"), // International Standard Recording Code
  filePath: text("file_path"), // Path to audio file
  fileFormat: text("file_format"), // mp3, wav, etc.
  description: text("description"),
  promotionStatus: text("promotion_status").default("active"), // active, paused, completed
  targetLicenseTypes: text("target_license_types").array(), // film, tv, commercial, game, etc.
  website: text("website"), // Artist website
  rightsStatus: text("rights_status").default("100_clear"), // 100_clear, pending, issues
  createdAt: timestamp("created_at").defaultNow(),
});

export const songVersions = pgTable("song_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songId: varchar("song_id").references(() => songs.id).notNull(),
  versionType: text("version_type").notNull(), // full, instrumental, stems, 30sec, 60sec, etc.
  filePath: text("file_path").notNull(),
  fileFormat: text("file_format").notNull(),
  duration: integer("duration"), // Duration in seconds
  status: text("status").default("created"), // created, optimized, ready
  createdAt: timestamp("created_at").defaultNow(),
});

export const musicSupervisors = pgTable("music_supervisors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  company: text("company"),
  position: text("position"),
  projects: text("projects").array(), // Past/current projects
  genres: text("genres").array(), // Preferred music genres
  contactStatus: text("contact_status").default("not_contacted"), // not_contacted, contacted, responded, relationship
  lastContacted: timestamp("last_contacted"),
  responseRate: integer("response_rate").default(0), // Percentage 0-100
  notes: text("notes"),
  website: text("website"),
  linkedIn: text("linkedin"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const syncCampaigns = pgTable("sync_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  songId: varchar("song_id").references(() => songs.id).notNull(),
  targetType: text("target_type").notNull(), // film, tv, commercial, game, etc.
  status: text("status").default("planning"), // planning, active, paused, completed
  supervisorsTargeted: integer("supervisors_targeted").default(0),
  responsesReceived: integer("responses_received").default(0),
  placementsAchieved: integer("placements_achieved").default(0),
  totalRevenue: decimal("total_revenue").default("0"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformSubmissions = pgTable("platform_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  songId: varchar("song_id").references(() => songs.id).notNull(),
  platform: text("platform").notNull(), // BeatStars, Songtradr, Epidemic Sound, etc.
  submissionDate: timestamp("submission_date").defaultNow(),
  status: text("status").default("submitted"), // submitted, accepted, rejected, live
  platformUrl: text("platform_url"), // URL on the platform
  revenue: decimal("revenue").default("0"),
  downloads: integer("downloads").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const actionItems = pgTable("action_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  category: text("category").notNull(), // sync_optimization, rights_documentation, professional_materials, platform_presence, networking
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("high"), // low, medium, high, critical
  status: text("status").default("pending"), // pending, in_progress, completed, blocked
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  relatedId: varchar("related_id"), // Related song, campaign, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const musicContracts = pgTable("music_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // artist_producer, booking, sync_licensing, distribution, etc.
  description: text("description"),
  template: text("template").notNull(), // The contract template content
  variables: jsonb("variables"), // Placeholder variables for the contract
  status: text("status").default("template"), // template, draft, completed, signed
  parties: jsonb("parties"), // Array of contract parties with their details
  terms: jsonb("terms"), // Key contract terms (payment, rights, duration, etc.)
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

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
});

export const insertSongVersionSchema = createInsertSchema(songVersions).omit({
  id: true,
  createdAt: true,
});

export const insertMusicSupervisorSchema = createInsertSchema(musicSupervisors).omit({
  id: true,
  createdAt: true,
});

export const insertSyncCampaignSchema = createInsertSchema(syncCampaigns).omit({
  id: true,
  createdAt: true,
});

export const insertPlatformSubmissionSchema = createInsertSchema(platformSubmissions).omit({
  id: true,
  createdAt: true,
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
});

export const insertMusicContractSchema = createInsertSchema(musicContracts).omit({
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

export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;

export type SongVersion = typeof songVersions.$inferSelect;
export type InsertSongVersion = z.infer<typeof insertSongVersionSchema>;

export type MusicSupervisor = typeof musicSupervisors.$inferSelect;
export type InsertMusicSupervisor = z.infer<typeof insertMusicSupervisorSchema>;

export type SyncCampaign = typeof syncCampaigns.$inferSelect;
export type InsertSyncCampaign = z.infer<typeof insertSyncCampaignSchema>;

export type PlatformSubmission = typeof platformSubmissions.$inferSelect;
export type InsertPlatformSubmission = z.infer<typeof insertPlatformSubmissionSchema>;

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;

export type MusicContract = typeof musicContracts.$inferSelect;
export type InsertMusicContract = z.infer<typeof insertMusicContractSchema>;
