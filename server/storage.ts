import { type Chat, type Message, type UploadedFile, type InsertChat, type InsertMessage, type InsertFile } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Chat operations
  createChat(chat: InsertChat): Promise<Chat>;
  getChat(id: string): Promise<Chat | undefined>;
  getAllChats(): Promise<Chat[]>;
  updateChat(id: string, updates: Partial<Chat>): Promise<Chat | undefined>;
  deleteChat(id: string): Promise<boolean>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByChat(chatId: string): Promise<Message[]>;
  deleteMessagesByChat(chatId: string): Promise<boolean>;

  // File operations
  createFile(file: InsertFile): Promise<UploadedFile>;
  getFilesByChat(chatId: string): Promise<UploadedFile[]>;
  getFile(id: string): Promise<UploadedFile | undefined>;
  deleteFile(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private chats: Map<string, Chat>;
  private messages: Map<string, Message>;
  private files: Map<string, UploadedFile>;

  constructor() {
    this.chats = new Map();
    this.messages = new Map();
    this.files = new Map();
  }

  // Chat operations
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = randomUUID();
    const now = new Date();
    const chat: Chat = { 
      ...insertChat, 
      id, 
      createdAt: now,
      updatedAt: now 
    };
    this.chats.set(id, chat);
    return chat;
  }

  async getChat(id: string): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async getAllChats(): Promise<Chat[]> {
    return Array.from(this.chats.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async updateChat(id: string, updates: Partial<Chat>): Promise<Chat | undefined> {
    const chat = this.chats.get(id);
    if (!chat) return undefined;
    
    const updatedChat = { ...chat, ...updates, updatedAt: new Date() };
    this.chats.set(id, updatedChat);
    return updatedChat;
  }

  async deleteChat(id: string): Promise<boolean> {
    // Also delete related messages and files
    await this.deleteMessagesByChat(id);
    const files = await this.getFilesByChat(id);
    for (const file of files) {
      await this.deleteFile(file.id);
    }
    return this.chats.delete(id);
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id, 
      createdAt: new Date() 
    };
    this.messages.set(id, message);
    
    // Update chat's updatedAt timestamp
    const chat = this.chats.get(insertMessage.chatId);
    if (chat) {
      this.chats.set(chat.id, { ...chat, updatedAt: new Date() });
    }
    
    return message;
  }

  async getMessagesByChat(chatId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.chatId === chatId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async deleteMessagesByChat(chatId: string): Promise<boolean> {
    const chatMessages = Array.from(this.messages.entries())
      .filter(([_, message]) => message.chatId === chatId);
    
    chatMessages.forEach(([id]) => this.messages.delete(id));
    return true;
  }

  // File operations
  async createFile(insertFile: InsertFile): Promise<UploadedFile> {
    const id = randomUUID();
    const file: UploadedFile = { 
      ...insertFile, 
      id, 
      uploadedAt: new Date() 
    };
    this.files.set(id, file);
    return file;
  }

  async getFilesByChat(chatId: string): Promise<UploadedFile[]> {
    return Array.from(this.files.values())
      .filter(file => file.chatId === chatId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  async getFile(id: string): Promise<UploadedFile | undefined> {
    return this.files.get(id);
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }
}

export const storage = new MemStorage();
