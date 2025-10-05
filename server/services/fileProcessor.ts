import { promises as fs } from 'fs';
import path from 'path';

export async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'text/plain') {
      return await fs.readFile(filePath, 'utf-8');
    }
    
    if (mimeType === 'application/pdf') {
      // For PDF processing, we would typically use a library like pdf-parse
      // For now, return a placeholder that explains PDF processing isn't implemented
      return "PDF text extraction requires additional setup. Please convert to text format or use the chat to describe your PDF content.";
    }
    
    if (mimeType.includes('application/msword') || mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      // For DOC/DOCX processing, we would use libraries like mammoth or docx-parser
      return "DOC/DOCX text extraction requires additional setup. Please convert to text format or use the chat to describe your document content.";
    }
    
    // Fallback for other text-based files
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return "Unable to extract text from this file type. Please use text files or describe your content in the chat.";
    }
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error(`Failed to process file: ${error.message}`);
  }
}

export function validateFileType(mimeType: string): boolean {
  const allowedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  return allowedTypes.includes(mimeType);
}

export function validateFileSize(size: number): boolean {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return size <= maxSize;
}
