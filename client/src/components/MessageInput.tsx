import { useState } from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  isDisabled?: boolean;
}

export default function MessageInput({ onSendMessage, isDisabled }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isDisabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-3">
      <div className="flex-1 relative">
        <Input
          type="text"
          placeholder="Ask me anything about your studies..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isDisabled}
          className="pr-12"
          data-testid="input-message"
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={!message.trim() || isDisabled}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <Button
        type="button"
        size="default"
        variant="secondary"
        className="px-4"
        title="Voice Input"
        data-testid="button-voice-input"
      >
        <Mic className="h-4 w-4" />
      </Button>
    </form>
  );
}
