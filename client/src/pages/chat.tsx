import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useAI } from "@/hooks/useAI";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { chat, isProcessing } = useAI();

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat-messages"],
  });

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(prev => prev + transcript);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
    
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      // Use enhanced AI service for processing
      const aiResponse = await chat(messageText);
      
      // Also store in chat history
      const response = await apiRequest("POST", "/api/chat-messages", {
        message: messageText,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setMessage("");
      
      // Speak the AI response if speech is enabled
      if (speechEnabled && data.response && synthRef.current) {
        speakText(data.response);
      }
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

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakText = (text: string) => {
    if (synthRef.current && !isSpeaking) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set up female voice
      const voices = synthRef.current.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('susan') ||
        voice.name.toLowerCase().includes('allison') ||
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('hazel') ||
        voice.name.toLowerCase().includes('tessa') ||
        voice.name.toLowerCase().includes('english')
      ) || voices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Female'));
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1.1; // Slightly higher pitch for more feminine sound
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled);
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">☀️ Sunshine - Your AI Assistant</h1>
            <p className="text-gray-600">Get help with your music business tasks and questions.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Icons.user className="h-3 w-3 mr-1" />
              {user?.name || 'User'}
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Auto-identified
            </Badge>
          </div>
        </div>
      </div>

      <Card className="material-card">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center">
            <Icons.chat className="mr-2 h-5 w-5 text-primary-500" />
            Chat with Sunshine
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
                  ☀️
                </div>
                <div className="flex-1 bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-900">
                    Hey there, sunshine! ☀️ I'm Sunshine, your witty and warm AI Life Assistant! I've already spotted you through your hardwired email ({user?.email}) - no sneaking past me! 😉 I can help you with:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-gray-700 space-y-1">
                    <li>🎯 **Creating and managing tasks** - Just tell me what you need to do</li>
                    <li>📧 **Email outreach strategies** and templates</li>
                    <li>📻 **Radio station submissions** and follow-ups</li>
                    <li>💰 **C.A.R.E.N. grant research** and applications</li>
                    <li>🎬 **Sync licensing opportunities** for movies, TV, games</li>
                    <li>📊 **Invoice management** and payment tracking</li>
                    <li>📅 **Scheduling and reminders** - I'll monitor your tasks</li>
                  </ul>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900 font-medium">💡 Try saying:</p>
                    <ul className="text-xs text-blue-800 mt-1 space-y-1">
                      <li>• "Hey Sunshine, remind me to submit my track to KQED tomorrow"</li>
                      <li>• "Sunshine, I need to research grants for C.A.R.E.N."</li>
                      <li>• "Sunshine, create an invoice for my recent gig"</li>
                      <li>• "Sunshine, schedule a follow-up with that music supervisor"</li>
                    </ul>
                  </div>
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
                        ☀️
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-lg p-4">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.response}</p>
                        {msg.context && (msg.context as any).actions && (msg.context as any).actions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-600 font-medium mb-2">Actions taken:</p>
                            <div className="flex flex-wrap gap-2">
                              {(msg.context as any).actions.map((action: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {action.type.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {(sendMessageMutation.isPending || isProcessing) && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  ☀️
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
                disabled={sendMessageMutation.isPending || isProcessing}
                className="min-h-[100px] resize-none"
              />
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-gray-500">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                  {!recognitionRef.current && (
                    <p className="text-xs text-orange-500">
                      Voice chat unavailable in this browser
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {/* Speech toggle button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSpeech}
                    className={speechEnabled ? "text-blue-600" : "text-gray-400"}
                    title={speechEnabled ? "Disable voice responses" : "Enable voice responses"}
                  >
                    {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                  
                  {/* Stop speaking button */}
                  {isSpeaking && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopSpeaking}
                      className="text-red-600"
                      title="Stop speaking"
                    >
                      <VolumeX className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Microphone button */}
                  {recognitionRef.current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isListening ? stopListening : startListening}
                      disabled={sendMessageMutation.isPending || isProcessing}
                      className={isListening ? "bg-red-100 text-red-600 border-red-300 animate-pulse" : ""}
                      title={isListening ? "Stop recording" : "Start voice input"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                  
                  {/* Send button */}
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending || isProcessing}
                    className="px-8"
                  >
                    <Icons.send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
