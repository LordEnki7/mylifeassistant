import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";

export default function Chat() {
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
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">AI Assistant</h1>
        <p className="text-gray-600">Get help with your music business tasks and questions.</p>
      </div>

      <Card className="material-card">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center">
            <Icons.chat className="mr-2 h-5 w-5 text-primary-500" />
            Chat with your AI Assistant
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
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
                <div className="flex-1 bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-900">
                    Hello! I'm your AI assistant for music business management. I can help you with:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-gray-700 space-y-1">
                    <li>Email outreach strategies and templates</li>
                    <li>Finding radio stations and contacts</li>
                    <li>Grant research and applications</li>
                    <li>Music licensing opportunities</li>
                    <li>Business planning and advice</li>
                    <li>Industry insights and trends</li>
                  </ul>
                  <p className="text-sm text-gray-900 mt-2">
                    What would you like to work on today?
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="space-y-4">
                  {/* User Message */}
                  <div className="flex items-start space-x-3 justify-end">
                    <div className="bg-primary-500 text-white rounded-lg p-4 max-w-md">
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
                      <div className="flex-1 bg-gray-100 rounded-lg p-4">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.response}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {sendMessageMutation.isPending && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  AI
                </div>
                <div className="flex-1 bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="border-t p-6">
            <div className="space-y-4">
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sendMessageMutation.isPending}
                className="min-h-[100px] resize-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Press Enter to send, Shift+Enter for new line
                </p>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="px-8"
                >
                  <Icons.send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
