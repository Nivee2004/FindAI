from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
import json
import uuid
import re



def split_lines(text):
    # Split by periods, question marks, exclamation marks, or existing newlines
    lines = re.split(r'(?<=[.!?])\s+|\n', text)
    # Remove empty lines
    lines = [line.strip() for line in lines if line.strip()]
    return "\n".join(lines)


try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    print("Warning: google-generativeai not properly installed")

try:
    import pdfplumber
except ImportError:
    print("Warning: pdfplumber not installed, PDF extraction will fail")

load_dotenv()

app = FastAPI(title="Find AI - Educational Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is required")

if GENAI_AVAILABLE:
    genai.configure(api_key=GOOGLE_API_KEY)

# ----------------------
# In-memory storage
# ----------------------
memory_chats: Dict[str, dict] = {}
memory_messages: Dict[str, dict] = {}
memory_files: Dict[str, dict] = {}

# ----------------------
# Pydantic Models
# ----------------------
class ChatCreate(BaseModel):
    title: str
    curriculum: str = "CBSE"
    language: str = "English"

class Chat(BaseModel):
    id: str
    title: str
    curriculum: str
    language: str
    created_at: str
    updated_at: str

class MessageCreate(BaseModel):
    content: str
    role: str

class Message(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    metadata: Optional[dict] = None
    created_at: str

class Question(BaseModel):
    type: str
    question: str
    options: Optional[List[str]] = None
    answer: str

class AIResponse(BaseModel):
    content: str
    has_notes: bool = False
    notes: Optional[List[str]] = None
    has_questions: bool = False
    questions: Optional[List[Question]] = None
    follow_up_actions: Optional[List[str]] = None

# ----------------------
# Utility Functions
# ----------------------
async def extract_text_from_file(file: UploadFile) -> str:
    content = await file.read()
    text = ""

    if file.content_type == "text/plain":
        try:
            text = content.decode('utf-8')
        except:
            text = "Unable to decode file content"

    elif file.content_type == "application/pdf":
        try:
            import io
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text += page_text + "\n"
        except Exception as e:
            text = f"Error extracting PDF text: {str(e)}"

    else:
        text = "File uploaded but text extraction not available for this type. Please describe the content."

    return text

def extract_questions(text: str):
    """Extract numbered questions from text."""
    pattern = r'(\d+\..+?)(?=\n\d+\.|\Z)'
    questions = re.findall(pattern, text, flags=re.DOTALL)
    questions = [q.strip().replace("\n", " ") for q in questions]
    return questions

async def generate_ai_response(user_message: str, curriculum: str, language: str, 
                               file_context: str = "", previous_messages: List = []):
    system_prompt = f"""You are Find AI, an intelligent educational chatbot and teaching assistant.

Rules:
1. Always explain concepts in simple, clear language suitable for students.
2. Align answers with {curriculum} curriculum.
3. Generate notes in bullet points when asked.
4. Support {language} language responses.
5. Be polite, encouraging, and motivating.
6. If unclear, ask for clarification.
7. Give examples when possible.
8. Support quiz/test generation for teachers.
9. If asked for "bookback exercises" or "chapter questions", extract EXACT questions from file content.

{f'File context available: {file_context}' if file_context else ''}

Respond with JSON in this format:
{{
  "content": "Your main response text",
  "has_notes": true/false,
  "notes": ["bullet point 1", "bullet point 2"] (if has_notes is true),
  "has_questions": true/false,
  "questions": [
    {{
      "type": "mcq|short|true_false",
      "question": "Question text",
      "options": ["option1", "option2", "option3", "option4"] (for mcq only),
      "answer": "correct answer"
    }}
  ] (if has_questions is true),
  "follow_up_actions": ["Generate practice quiz", "Download notes"] (optional)
}}"""

    if not GENAI_AVAILABLE:
        return AIResponse(
            content="I'm here to help! Please tell me what topic you'd like to study or what questions you have.",
            has_notes=False,
            has_questions=False
        )

    model = genai.GenerativeModel('gemini-2.0-flash')
    
    messages_context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in previous_messages[-6:]])
    full_prompt = f"{system_prompt}\n\nConversation history:\n{messages_context}\n\nUser: {user_message}"
    
    if file_context:
        full_prompt += f"\n\nPlease answer ONLY based on the above file content. If not found, respond with 'Sorry, I do not have information on that.'"
    
    try:
        response = model.generate_content(full_prompt)
        response_text = response.text

        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        ai_data = json.loads(response_text)
        return AIResponse(**ai_data)
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return AIResponse(content="I'm here to help with your studies! What would you like to learn about?")

# ----------------------
# API Routes
# ----------------------
@app.get("/")
async def read_root():
    index_path = os.path.join(os.path.dirname(__file__), "static", "index.html")
    return FileResponse(index_path)

@app.get("/api/chats")
async def get_chats():
    chats = sorted(memory_chats.values(), key=lambda x: x['updated_at'], reverse=True)
    return chats

@app.post("/api/chats")
async def create_chat(chat: ChatCreate):
    chat_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    chat_doc = {
        "id": chat_id,
        "title": chat.title,
        "curriculum": chat.curriculum,
        "language": chat.language,
        "created_at": now,
        "updated_at": now
    }
    memory_chats[chat_id] = chat_doc
    return chat_doc

@app.get("/api/chats/{chat_id}")
async def get_chat(chat_id: str):
    chat = memory_chats.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str):
    if chat_id not in memory_chats:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Delete related messages and files
    to_delete_msgs = [k for k, v in memory_messages.items() if v['chat_id'] == chat_id]
    for k in to_delete_msgs:
        del memory_messages[k]
    
    to_delete_files = [k for k, v in memory_files.items() if v['chat_id'] == chat_id]
    for k in to_delete_files:
        del memory_files[k]
    
    del memory_chats[chat_id]
    return {"message": "Chat deleted successfully"}

@app.get("/api/chats/{chat_id}/messages")
async def get_messages(chat_id: str):
    messages = [v for v in memory_messages.values() if v['chat_id'] == chat_id]
    messages.sort(key=lambda x: x['created_at'])
    return messages

@app.post("/api/chats/{chat_id}/messages")
async def send_message(chat_id: str, message: MessageCreate):
    chat = memory_chats.get(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    user_msg_id = str(uuid.uuid4())
    user_message_doc = {
        "id": user_msg_id,
        "chat_id": chat_id,
        "role": message.role,
        "content": message.content,
        "metadata": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    memory_messages[user_msg_id] = user_message_doc
    
    if message.role == "user":
        previous_messages = [
            {"role": v["role"], "content": v["content"]} 
            for v in sorted(memory_messages.values(), key=lambda x: x['created_at'])
            if v['chat_id'] == chat_id
        ][-6:]
        
        file_context = ""
        for file in memory_files.values():
            if file['chat_id'] == chat_id:
                file_context += f"{file['original_name']}:\n{file['extracted_text']}\n"
                if file.get('questions'):
                    file_context += "Questions from this book:\n"
                    for q in file['questions']:
                        file_context += q + "\n"
        
        ai_response = await generate_ai_response(
            message.content,
            chat["curriculum"],
            chat["language"],
            file_context,
            previous_messages
        )
        
        ai_msg_id = str(uuid.uuid4())
        ai_message_doc = {
            "id": ai_msg_id,
            "chat_id": chat_id,
            "role": "assistant",
            "content": split_lines(ai_response.content),
            "metadata": {
                "has_notes": ai_response.has_notes,
                "notes": ai_response.notes,
                "has_questions": ai_response.has_questions,
                "questions": [q.dict() for q in ai_response.questions] if ai_response.questions else None,
                "follow_up_actions": ai_response.follow_up_actions
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        memory_messages[ai_msg_id] = ai_message_doc
        
        memory_chats[chat_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        return {
            "user_message": user_message_doc,
            "ai_message": ai_message_doc
        }
    
    return {"message": user_message_doc}

import asyncio

@app.post("/api/chats/{chat_id}/upload")
async def upload_files(chat_id: str, files: List[UploadFile] = File(...)):
    uploaded_files = []

    async def process_file(file):
        extracted_text = await extract_text_from_file(file)
        questions_list = extract_questions(extracted_text)

        file_id = str(uuid.uuid4())
        file_doc = {
            "id": file_id,
            "chat_id": chat_id,
            "filename": file.filename,
            "original_name": file.filename,
            "mime_type": file.content_type or "application/octet-stream",
            "size": str(len(extracted_text)),
            "extracted_text": extracted_text,
            "questions": questions_list,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }

        memory_files[file_id] = file_doc
        return file_doc

    tasks = [process_file(file) for file in files]
    uploaded_files = await asyncio.gather(*tasks)

    return {"message": "Files uploaded successfully", "files": uploaded_files}

@app.get("/api/chats/{chat_id}/files")
async def get_files(chat_id: str):
    files = [v for v in memory_files.values() if v['chat_id'] == chat_id]
    files.sort(key=lambda x: x['uploaded_at'], reverse=True)
    return files

# ----------------------
# Static Files
# ----------------------
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("Starting Find AI - Educational Chatbot")
    print("Using in-memory storage (data will be lost on restart)")
    print(f"Gemini API: {'✓ Configured' if GENAI_AVAILABLE else '✗ Not available'}")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=5002)
