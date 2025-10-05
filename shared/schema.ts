import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  curriculum: text("curriculum").notNull().default("CBSE"),
  language: text("language").notNull().default("English"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  metadata: json("metadata"), // For storing additional data like file info, note sections, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: text("size").notNull(),
  extractedText: text("extracted_text"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  uploadedAt: true,
});

export type InsertChat = z.infer<typeof insertChatSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type UploadedFile = typeof uploadedFiles.$inferSelect;

// AI Response types
export const aiResponseSchema = z.object({
  content: z.string(),
  hasNotes: z.boolean().optional(),
  notes: z.array(z.string()).optional(),
  hasQuestions: z.boolean().optional(),
  questions: z.array(z.object({
    type: z.enum(["mcq", "short", "true_false"]),
    question: z.string(),
    options: z.array(z.string()).optional(),
    answer: z.string(),
  })).optional(),
  followUpActions: z.array(z.string()).optional(),
});

export type AIResponse = z.infer<typeof aiResponseSchema>;
