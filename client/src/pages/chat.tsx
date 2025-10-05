import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import type { Chat, Message } from "@shared/schema";

export default function ChatPage() {
  const { id: chatId } = useParams();
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId || null);
  const [curriculum, setCurriculum] = useState("CBSE");
  const [language, setLanguage] = useState("English");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all chats
  const { data: chats = [], isLoading: chatsLoading } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
  });

  // Fetch current chat
  const { data: currentChat } = useQuery<Chat>({
    queryKey: ["/api/chats", currentChatId],
    enabled: !!currentChatId,
  });

  // Fetch messages for current chat
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", currentChatId, "messages"],
    enabled: !!currentChatId,
  });

  // Create new chat mutation
  const createChatMutation = useMutation({
    mutationFn: async (data: { title: string; curriculum: string; language: string }) => {
      const response = await apiRequest("POST", "/api/chats", data);
      return await response.json();
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setCurrentChatId(newChat.id);
      window.history.pushState(null, "", `/chat/${newChat.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; role: string }) => {
      if (!currentChatId) throw new Error("No chat selected");
      const response = await apiRequest("POST", `/api/chats/${currentChatId}/messages`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", currentChatId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] }); // Update chat list timestamps
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Upload files mutation
  const uploadFilesMutation = useMutation({
    mutationFn: async (files: FileList) => {
      if (!currentChatId) throw new Error("No chat selected");
      
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`/api/chats/${currentChatId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", currentChatId, "files"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update curriculum and language when current chat changes
  useEffect(() => {
    if (currentChat) {
      setCurriculum(currentChat.curriculum);
      setLanguage(currentChat.language);
    }
  }, [currentChat]);

  const handleNewChat = () => {
    const title = "New Chat";
    createChatMutation.mutate({ title, curriculum, language });
  };

  const handleSendMessage = (content: string) => {
    if (!currentChatId) {
      // Create new chat if none exists
      handleNewChat();
      setTimeout(() => {
        sendMessageMutation.mutate({ content, role: "user" });
      }, 100);
    } else {
      sendMessageMutation.mutate({ content, role: "user" });
    }
  };

  const handleUploadFiles = (files: FileList) => {
    if (!currentChatId) {
      toast({
        title: "No Chat Selected",
        description: "Please start a chat first",
        variant: "destructive",
      });
      return;
    }
    uploadFilesMutation.mutate(files);
  };

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
    window.history.pushState(null, "", `/chat/${chatId}`);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        curriculum={curriculum}
        language={language}
        isLoading={chatsLoading}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onCurriculumChange={setCurriculum}
        onLanguageChange={setLanguage}
      />
      <ChatArea
        messages={messages}
        isLoading={messagesLoading || sendMessageMutation.isPending}
        isTyping={sendMessageMutation.isPending}
        onSendMessage={handleSendMessage}
        onUploadFiles={handleUploadFiles}
        curriculum={curriculum}
        language={language}
      />
    </div>
  );
}
