# Find AI - Educational Chatbot

## Overview

Find AI is an educational chatbot application designed to serve as a smart study companion for students and a teaching assistant for teachers. The application supports curriculum-aligned learning (defaulting to CBSE), multi-language support, file uploads for study materials, AI-powered responses with note generation and quiz creation capabilities.

**Core Purpose**: Provide an interactive learning platform where students can ask questions, upload study materials, receive AI-generated explanations, study notes, and practice quizzes tailored to their curriculum and language preferences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Library**: Radix UI primitives with shadcn/ui styling system
- Extensive component library including dialogs, dropdowns, forms, tooltips, etc.
- Tailwind CSS for styling with CSS variables for theming
- Support for light/dark mode theming
- Custom styling configuration via `components.json`

**State Management & Data Fetching**:
- TanStack React Query (v5) for server state management
- Custom API client in `/client/src/lib/queryClient.ts` for handling HTTP requests
- Query invalidation strategy for real-time data updates

**Routing**: Wouter for lightweight client-side routing
- Main chat interface at `/`
- Individual chat sessions at `/chat/:id`
- 404 handling for unmatched routes

**Key Features**:
- Real-time chat interface with message history
- File upload with drag-and-drop support (PDF, DOC, DOCX, TXT up to 10MB)
- AI-generated study notes display
- Interactive quiz/practice questions with answer validation
- Sidebar navigation for chat history and settings
- Curriculum and language selection (CBSE, English as defaults)

### Backend Architecture

**Runtime Environment**: Hybrid Node.js/Python architecture
- Node.js server (`server/index.ts`) acts as a process manager
- Python FastAPI application (`main.py`) handles the actual API endpoints
- Node spawns Python process for request handling

**API Framework**: FastAPI (Python)
- CORS enabled for cross-origin requests
- RESTful API design pattern
- Pydantic models for request/response validation

**Data Storage Strategy**:
- In-memory storage for development (dictionaries in Python: `memory_chats`, `memory_messages`, `memory_files`)
- PostgreSQL schema defined via Drizzle ORM for production readiness
- Database configuration in `drizzle.config.ts` pointing to `DATABASE_URL`
- Three main entities: Chats, Messages, and UploadedFiles with UUID primary keys

**Database Schema** (PostgreSQL via Drizzle):
```typescript
// Chats table
- id: UUID primary key
- title: text
- curriculum: text (default: "CBSE")
- language: text (default: "English")
- createdAt, updatedAt: timestamps

// Messages table
- id: UUID primary key
- chatId: foreign key to chats
- role: text ("user" | "assistant")
- content: text
- metadata: JSON (for notes, file info, etc.)
- createdAt: timestamp

// UploadedFiles table
- id: UUID primary key
- chatId: foreign key to chats
- filename, originalName, mimeType, size: text fields
- extractedText: text (processed content)
- uploadedAt: timestamp
```

**File Processing**:
- File validation for type (PDF, DOC, DOCX, TXT) and size (10MB max)
- Text extraction service in `server/services/fileProcessor.ts`
- Plain text files directly read, PDF/DOC require additional library setup (placeholder implementation)

### External Dependencies

**AI Services**:
- **Google Generative AI** (Gemini): Primary AI provider for chat responses, note generation, and quiz creation
  - API key required via `GOOGLE_API_KEY` environment variable
  - Fallback handling if library not installed
  - Context-aware responses using curriculum and language preferences
  
- **OpenAI** (Alternative/Planned): Service structure exists in `server/services/openai.ts`
  - Configured for GPT-5 model
  - Requires `OPENAI_API_KEY` environment variable
  - Structured JSON responses with notes and questions support

**Database**:
- **Neon Database** (Serverless PostgreSQL): Via `@neondatabase/serverless` package
- Connection via `DATABASE_URL` environment variable
- Drizzle ORM for schema management and migrations
- Migration files stored in `/migrations` directory

**Third-Party Libraries**:
- **File Upload**: Multer for Express (multipart/form-data handling)
- **File Processing**: react-dropzone on frontend, server-side text extraction utilities
- **UI Components**: Complete Radix UI suite (@radix-ui/react-*)
- **Form Validation**: React Hook Form with Zod resolvers
- **Date Handling**: date-fns library
- **Styling**: Tailwind CSS with autoprefixer, class-variance-authority for component variants

**Session Management**:
- connect-pg-simple for PostgreSQL session store (configured but implementation varies)
- Express session middleware ready for authentication

**Development Tools**:
- Vite plugins: React, runtime error overlay, Replit-specific cartographer and dev banner
- TypeScript with strict mode enabled
- ESBuild for server bundle creation in production

**Asset Management**:
- Static file serving from `/static` directory
- Client assets built to `/dist/public`
- Path aliases: `@/` for client src, `@shared/` for shared types, `@assets/` for attached assets