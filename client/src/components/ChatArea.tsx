import { Bot, FileText, HelpCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ChatMessage from "./ChatMessage";
import MessageInput from "./MessageInput";
import FileUpload from "./FileUpload";
import type { Message } from "@shared/schema";

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  onUploadFiles: (files: FileList) => void;
  curriculum: string;
  language: string;
}

export default function ChatArea({
  messages,
  isLoading,
  isTyping,
  onSendMessage,
  onUploadFiles,
  curriculum,
  language,
}: ChatAreaProps) {
  const handleQuickAction = (action: string) => {
    const quickActions = {
      "📚 Explain a concept": "Can you explain a concept? Please specify which topic you'd like me to explain.",
      "📝 Generate notes": "I'd like you to generate study notes. Please tell me the topic you want notes for.",
      "❓ Practice questions": "Can you create practice questions for me? Please specify the topic.",
      "🧪 Solve problems": "I need help solving a problem. Please describe the problem you're working on.",
    };
    
    const message = quickActions[action as keyof typeof quickActions];
    if (message) {
      onSendMessage(message);
    }
  };

  const WelcomeMessage = () => (
    <div className="flex items-start space-x-3" data-testid="welcome-message">
      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="text-accent-foreground h-4 w-4" />
      </div>
      <div className="chat-bubble-ai p-4 rounded-lg rounded-tl-none max-w-2xl">
        <p className="text-foreground mb-3">
          👋 Hi there! I'm Find AI, your smart study companion. I'm here to help you with:
        </p>
        <ul className="text-foreground space-y-2 text-sm">
          <li className="flex items-center">
            <span className="text-accent mr-2">✓</span> Instant doubt resolution
          </li>
          <li className="flex items-center">
            <span className="text-accent mr-2">✓</span> Syllabus-aligned notes generation
          </li>
          <li className="flex items-center">
            <span className="text-accent mr-2">✓</span> Practice questions & quizzes
          </li>
          <li className="flex items-center">
            <span className="text-accent mr-2">✓</span> File-based learning support
          </li>
        </ul>
        <p className="text-muted-foreground mt-3 text-sm">
          What would you like to study today?
        </p>
      </div>
    </div>
  );

  const TypingIndicator = () => (
    <div className="flex items-start space-x-3" data-testid="typing-indicator">
      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="text-accent-foreground h-4 w-4" />
      </div>
      <div className="chat-bubble-ai p-4 rounded-lg rounded-tl-none">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <Bot className="text-accent-foreground h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Find AI Assistant</h2>
              <p className="text-sm text-muted-foreground">Ready to help with your studies</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              title="Generate Notes"
              data-testid="button-generate-notes"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title="Create Quiz"
              data-testid="button-create-quiz"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title="Clear Chat"
              data-testid="button-clear-chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading && messages.length === 0 ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.length === 0 && <WelcomeMessage />}
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
          </>
        )}
      </div>

      {/* File Upload Area */}
      <div className="p-4 border-t border-border">
        <FileUpload onUpload={onUploadFiles} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <MessageInput onSendMessage={onSendMessage} isDisabled={isTyping} />
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "📚 Explain a concept",
            "📝 Generate notes", 
            "❓ Practice questions",
            "🧪 Solve problems"
          ].map((action) => (
            <Button
              key={action}
              size="sm"
              variant="secondary"
              onClick={() => handleQuickAction(action)}
              className="text-xs"
              data-testid={`button-quick-action-${action.split(' ')[1]}`}
            >
              {action}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
