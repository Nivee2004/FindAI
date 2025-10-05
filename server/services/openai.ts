import OpenAI from "openai";
import { AIResponse, aiResponseSchema } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatContext {
  curriculum: string;
  language: string;
  fileContext?: string;
  previousMessages?: { role: string; content: string }[];
}

export async function generateAIResponse(
  userMessage: string,
  context: ChatContext
): Promise<AIResponse> {
  try {
    const systemPrompt = `You are Find AI, an intelligent educational chatbot that acts as a virtual study companion for students and a teaching assistant for teachers.

Rules:
1. Always explain concepts in simple, clear language suitable for students.
2. Align answers with ${context.curriculum} curriculum when specified.
3. Generate notes in bullet points when asked for summaries.
4. Support ${context.language} language responses.
5. Be polite, encouraging, and motivating like a helpful teacher.
6. If a question is unclear, ask for clarification instead of guessing.
7. Always give examples when possible to make learning practical.
8. For teachers, support quiz/test generation (MCQs, short answers, true/false).

${context.fileContext ? `File context available: ${context.fileContext}` : ''}

Respond with JSON in this exact format:
{
  "content": "Your main response text",
  "hasNotes": true/false,
  "notes": ["bullet point 1", "bullet point 2"] (if hasNotes is true),
  "hasQuestions": true/false,
  "questions": [
    {
      "type": "mcq|short|true_false",
      "question": "Question text",
      "options": ["option1", "option2", "option3", "option4"] (for mcq only),
      "answer": "correct answer"
    }
  ] (if hasQuestions is true),
  "followUpActions": ["Generate practice quiz", "Download notes"] (optional)
}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add previous messages for context
    if (context.previousMessages) {
      messages.push(...context.previousMessages.slice(-6)); // Last 6 messages for context
    }

    messages.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages,
      response_format: { type: "json_object" },
    });

    const aiResponseText = response.choices[0].message.content;
    if (!aiResponseText) {
      throw new Error("No response from AI");
    }

    const parsedResponse = JSON.parse(aiResponseText);
    return aiResponseSchema.parse(parsedResponse);
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
}

export async function generateNotes(
  topic: string,
  curriculum: string,
  language: string
): Promise<{ title: string; notes: string[] }> {
  try {
    const prompt = `Generate comprehensive study notes for the topic "${topic}" aligned with ${curriculum} curriculum in ${language}. 

Respond with JSON in this format:
{
  "title": "Study Notes: Topic Name",
  "notes": ["detailed bullet point 1", "detailed bullet point 2", ...]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error("Notes generation error:", error);
    throw new Error(`Failed to generate notes: ${error.message}`);
  }
}

export async function generateQuiz(
  topic: string,
  questionCount: number,
  curriculum: string,
  language: string
): Promise<{
  title: string;
  questions: Array<{
    type: "mcq" | "short" | "true_false";
    question: string;
    options?: string[];
    answer: string;
  }>;
}> {
  try {
    const prompt = `Generate ${questionCount} practice questions for "${topic}" aligned with ${curriculum} curriculum in ${language}. 
    
Include a mix of MCQs, short answer questions, and true/false questions.

Respond with JSON in this format:
{
  "title": "Practice Quiz: Topic Name",
  "questions": [
    {
      "type": "mcq",
      "question": "Question text",
      "options": ["option1", "option2", "option3", "option4"],
      "answer": "correct option"
    },
    {
      "type": "short",
      "question": "Question text",
      "answer": "expected answer"
    },
    {
      "type": "true_false", 
      "question": "Statement to evaluate",
      "answer": "True" or "False"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error("Quiz generation error:", error);
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
}
