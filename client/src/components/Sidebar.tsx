import { Brain, MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Chat } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  curriculum: string;
  language: string;
  isLoading: boolean;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onCurriculumChange: (curriculum: string) => void;
  onLanguageChange: (language: string) => void;
}

export default function Sidebar({
  chats,
  currentChatId,
  curriculum,
  language,
  isLoading,
  onChatSelect,
  onNewChat,
  onCurriculumChange,
  onLanguageChange,
}: SidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      await apiRequest("DELETE", `/api/chats/${chatId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    },
  });

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChatMutation.mutate(chatId);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return d.toLocaleDateString();
    }
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Brain className="text-primary-foreground h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Find AI</h1>
            <p className="text-sm text-muted-foreground">Smart Study Companion</p>
          </div>
        </div>
        <Button
          onClick={onNewChat}
          className="w-full mt-4"
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Recent Chats
        </h2>
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))
          ) : chats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs">Start a conversation to begin</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat.id)}
                className={`p-3 rounded-lg transition-colors cursor-pointer group relative ${
                  currentChatId === chat.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
                data-testid={`chat-item-${chat.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate group-hover:text-accent-foreground">
                      {chat.title}
                    </h3>
                    <p className="text-xs text-muted-foreground group-hover:text-accent-foreground/70 mt-1">
                      {formatDate(chat.updatedAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    data-testid={`button-delete-chat-${chat.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Curriculum Selection */}
      <div className="p-4 border-t border-border">
        <label className="text-sm font-medium text-foreground mb-2 block">
          Curriculum
        </label>
        <Select value={curriculum} onValueChange={onCurriculumChange}>
          <SelectTrigger data-testid="select-curriculum">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CBSE">CBSE</SelectItem>
            <SelectItem value="TN State Board">TN State Board</SelectItem>
            <SelectItem value="College Level">College Level</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Language Toggle */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Language</span>
          <div className="flex bg-secondary rounded-lg p-1">
            <Button
              size="sm"
              variant={language === "English" ? "default" : "ghost"}
              onClick={() => onLanguageChange("English")}
              className="px-3 py-1 text-xs font-medium rounded-md"
              data-testid="button-language-english"
            >
              EN
            </Button>
            <Button
              size="sm"
              variant={language === "Tamil" ? "default" : "ghost"}
              onClick={() => onLanguageChange("Tamil")}
              className="px-3 py-1 text-xs font-medium rounded-md"
              data-testid="button-language-tamil"
            >
              TA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
