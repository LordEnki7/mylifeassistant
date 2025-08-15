import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";

export default function AIChatWidget() {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat-messages"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiRequest("POST", "/api/chat-messages", {
        message: messageText,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-messages"] });
      setMessage("");
    },
  });

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="material-card mb-8">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center">
          <Icons.chat className="mr-2 h-5 w-5 text-primary-500" />
          AI Assistant
        </CardTitle>
        <p className="text-gray-600 text-sm">Ask me anything about your music business</p>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Chat Messages */}
        <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1 bg-gray-200 rounded-lg h-12 animate-pulse" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                AI
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg p-3">
                <p className="text-sm text-gray-900">
                  Hello! I can help you with email outreach, finding radio stations, grant research, and more. What would you like to work on today?
                </p>
              </div>
            </div>
          ) : (
            messages.slice(-5).map((msg) => (
              <div key={msg.id} className="space-y-2">
                {/* User Message */}
                <div className="flex items-start space-x-3 justify-end">
                  <div className="bg-primary-500 text-white rounded-lg p-3 max-w-xs">
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                    U
                  </div>
                </div>
                
                {/* AI Response */}
                {msg.response && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      AI
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-lg p-3">
                      <p className="text-sm text-gray-900">{msg.response}</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <div className="flex space-x-3">
          <Input
            type="text"
            placeholder="Type your question here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="px-6"
          >
            <Icons.send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
