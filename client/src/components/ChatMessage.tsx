import { Bot, User, Download, FileText, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Message } from "@shared/schema";
import { useState } from "react";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const isUser = message.role === "user";
  const metadata = message.metadata as any;

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };

  const checkAnswers = () => {
    setShowResults(true);
  };

  const NotesSection = ({ notes }: { notes: string[] }) => (
    <div className="note-section p-4 rounded-lg mb-4" data-testid="notes-section">
      <div className="flex items-center mb-3">
        <FileText className="text-accent mr-2 h-4 w-4" />
        <h3 className="font-semibold text-foreground">Study Notes</h3>
      </div>
      <ul className="space-y-2 text-sm text-foreground">
        {notes.map((note, index) => (
          <li key={index} className="flex items-start">
            <span className="text-accent mr-2 mt-1">•</span>
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const QuestionsSection = ({ questions }: { questions: any[] }) => (
    <div className="question-section p-4 rounded-lg" data-testid="questions-section">
      <div className="flex items-center mb-3">
        <HelpCircle className="text-yellow-600 mr-2 h-4 w-4" />
        <h3 className="font-semibold text-foreground">Practice Questions</h3>
      </div>
      
      <div className="space-y-4">
        {questions.map((question, index) => (
          <div key={index} className="mb-4">
            <p className="font-medium text-foreground mb-2">
              {index + 1}. {question.question}
            </p>
            
            {question.type === "mcq" && question.options && (
              <RadioGroup
                value={quizAnswers[index] || ""}
                onValueChange={(value) => handleAnswerChange(index, value)}
                className="ml-4"
              >
                {question.options.map((option: string, optionIndex: number) => (
                  <div key={optionIndex} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`q${index}-${optionIndex}`} />
                    <Label htmlFor={`q${index}-${optionIndex}`} className="text-sm">
                      {option}
                    </Label>
                    {showResults && (
                      <span className={`text-xs ml-2 ${
                        option === question.answer 
                          ? "text-green-600 font-semibold" 
                          : quizAnswers[index] === option 
                            ? "text-red-600" 
                            : ""
                      }`}>
                        {option === question.answer && "✓ Correct"}
                        {option !== question.answer && quizAnswers[index] === option && "✗ Wrong"}
                      </span>
                    )}
                  </div>
                ))}
              </RadioGroup>
            )}
            
            {question.type === "short" && (
              <div className="ml-4">
                <Input
                  placeholder="Enter your answer..."
                  value={quizAnswers[index] || ""}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  data-testid={`input-answer-${index}`}
                />
                {showResults && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Expected answer:</strong> {question.answer}
                  </p>
                )}
              </div>
            )}
            
            {question.type === "true_false" && (
              <RadioGroup
                value={quizAnswers[index] || ""}
                onValueChange={(value) => handleAnswerChange(index, value)}
                className="ml-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="True" id={`q${index}-true`} />
                  <Label htmlFor={`q${index}-true`} className="text-sm">True</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="False" id={`q${index}-false`} />
                  <Label htmlFor={`q${index}-false`} className="text-sm">False</Label>
                </div>
                {showResults && (
                  <p className={`text-sm mt-1 ${
                    quizAnswers[index] === question.answer ? "text-green-600" : "text-red-600"
                  }`}>
                    Correct answer: {question.answer}
                  </p>
                )}
              </RadioGroup>
            )}
          </div>
        ))}
        
        {!showResults && (
          <Button
            onClick={checkAnswers}
            className="mt-4"
            data-testid="button-check-answers"
          >
            Check Answers
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex items-start space-x-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="text-accent-foreground h-4 w-4" />
        </div>
      )}
      
      <div className={`max-w-2xl ${isUser ? "chat-bubble-user" : "chat-bubble-ai"} p-4 rounded-lg ${
        isUser ? "rounded-tr-none text-primary-foreground" : "rounded-tl-none"
      }`}>
        <p className={isUser ? "text-primary-foreground" : "text-foreground"}>
          {message.content}
        </p>
        
        {/* Render notes if present */}
        {!isUser && metadata?.hasNotes && metadata.notes && (
          <div className="mt-4">
            <NotesSection notes={metadata.notes} />
          </div>
        )}
        
        {/* Render questions if present */}
        {!isUser && metadata?.hasQuestions && metadata.questions && (
          <div className="mt-4">
            <QuestionsSection questions={metadata.questions} />
          </div>
        )}
        
        {/* Follow-up actions */}
        {!isUser && metadata?.followUpActions && (
          <div className="flex space-x-2 mt-4">
            {metadata.followUpActions.map((action: string, index: number) => (
              <Button
                key={index}
                size="sm"
                variant={action.includes("Quiz") ? "default" : "secondary"}
                data-testid={`button-followup-${index}`}
              >
                {action.includes("Quiz") && <HelpCircle className="h-3 w-3 mr-1" />}
                {action.includes("Download") && <Download className="h-3 w-3 mr-1" />}
                {action}
              </Button>
            ))}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
          <User className="text-primary-foreground h-4 w-4" />
        </div>
      )}
    </div>
  );
}
