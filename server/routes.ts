import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { generateAIResponse, generateNotes, generateQuiz } from "./services/openai";
import { extractTextFromFile, validateFileType, validateFileSize } from "./services/fileProcessor";
import { insertChatSchema, insertMessageSchema, insertFileSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";
import { promises as fs } from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (validateFileType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please use PDF, DOC, DOCX, or TXT files.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all chats
  app.get("/api/chats", async (req, res) => {
    try {
      const chats = await storage.getAllChats();
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new chat
  app.post("/api/chats", async (req, res) => {
    try {
      const validatedData = insertChatSchema.parse(req.body);
      const chat = await storage.createChat(validatedData);
      res.json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid chat data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // Get chat by ID
  app.get("/api/chats/:id", async (req, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json(chat);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete chat
  app.delete("/api/chats/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteChat(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Chat not found" });
      }
      res.json({ message: "Chat deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get messages for a chat
  app.get("/api/chats/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesByChat(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send message and get AI response
  app.post("/api/chats/:id/messages", async (req, res) => {
    try {
      const chatId = req.params.id;
      const { content, role } = req.body;

      // Validate message data
      const messageData = insertMessageSchema.parse({
        chatId,
        content,
        role,
        metadata: null,
      });

      // Create user message
      const userMessage = await storage.createMessage(messageData);

      // If this is a user message, generate AI response
      if (role === "user") {
        // Get chat context
        const chat = await storage.getChat(chatId);
        if (!chat) {
          return res.status(404).json({ message: "Chat not found" });
        }

        // Get previous messages for context
        const previousMessages = await storage.getMessagesByChat(chatId);
        const messageHistory = previousMessages
          .slice(-6) // Last 6 messages
          .map(msg => ({ role: msg.role, content: msg.content }));

        // Get file context if any files are uploaded
        const files = await storage.getFilesByChat(chatId);
        const fileContext = files
          .filter(file => file.extractedText)
          .map(file => `${file.originalName}: ${file.extractedText}`)
          .join('\n\n');

        // Generate AI response
        const aiResponse = await generateAIResponse(content, {
          curriculum: chat.curriculum,
          language: chat.language,
          fileContext: fileContext || undefined,
          previousMessages: messageHistory,
        });

        // Create AI message
        const aiMessage = await storage.createMessage({
          chatId,
          content: aiResponse.content,
          role: "assistant",
          metadata: {
            hasNotes: aiResponse.hasNotes,
            notes: aiResponse.notes,
            hasQuestions: aiResponse.hasQuestions,
            questions: aiResponse.questions,
            followUpActions: aiResponse.followUpActions,
          },
        });

        res.json({
          userMessage,
          aiMessage,
        });
      } else {
        res.json({ message: userMessage });
      }
    } catch (error) {
      console.error("Message creation error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // Upload files
  app.post("/api/chats/:id/upload", upload.array('files', 5), async (req, res) => {
    try {
      const chatId = req.params.id;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = [];

      for (const file of files) {
        // Validate file size
        if (!validateFileSize(file.size)) {
          await fs.unlink(file.path); // Clean up
          return res.status(400).json({ 
            message: `File ${file.originalname} is too large. Maximum size is 10MB.` 
          });
        }

        try {
          // Extract text from file
          const extractedText = await extractTextFromFile(file.path, file.mimetype);

          // Save file info to storage
          const fileData = await storage.createFile({
            chatId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size.toString(),
            extractedText,
          });

          uploadedFiles.push(fileData);

          // Clean up uploaded file
          await fs.unlink(file.path);
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          await fs.unlink(file.path); // Clean up
          return res.status(500).json({ 
            message: `Failed to process file ${file.originalname}: ${error.message}` 
          });
        }
      }

      res.json({
        message: "Files uploaded successfully",
        files: uploadedFiles,
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate notes endpoint
  app.post("/api/generate-notes", async (req, res) => {
    try {
      const { topic, curriculum, language } = req.body;
      
      if (!topic || !curriculum || !language) {
        return res.status(400).json({ 
          message: "Topic, curriculum, and language are required" 
        });
      }

      const notes = await generateNotes(topic, curriculum, language);
      res.json(notes);
    } catch (error) {
      console.error("Notes generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate quiz endpoint
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { topic, questionCount = 5, curriculum, language } = req.body;
      
      if (!topic || !curriculum || !language) {
        return res.status(400).json({ 
          message: "Topic, curriculum, and language are required" 
        });
      }

      const quiz = await generateQuiz(topic, questionCount, curriculum, language);
      res.json(quiz);
    } catch (error) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get files for a chat
  app.get("/api/chats/:id/files", async (req, res) => {
    try {
      const files = await storage.getFilesByChat(req.params.id);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
