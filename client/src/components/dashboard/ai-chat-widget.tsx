import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/lib/icons";
import { apiRequest } from "@/lib/queryClient";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

export default function AIChatWidget() {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const queryClient = useQueryClient();

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
      const response = await apiRequest("POST", "/api/chat-messages", {
        message: messageText,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grants"] }); // Refresh grants if any were created
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); // Refresh tasks if any were created
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] }); // Refresh contacts if any were created
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
      
      // Set up young female voice - prioritize voices that sound like a 23-year-old girl
      const voices = synthRef.current.getVoices();
      const youngFemaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('allison') ||
        voice.name.toLowerCase().includes('ava') ||
        voice.name.toLowerCase().includes('emma') ||
        voice.name.toLowerCase().includes('olivia') ||
        voice.name.toLowerCase().includes('sophia') ||
        voice.name.toLowerCase().includes('zoe') ||
        voice.name.toLowerCase().includes('chloe') ||
        voice.name.toLowerCase().includes('aria') ||
        voice.name.toLowerCase().includes('female')
      ) || voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Female') || voice.name.includes('Woman'))
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (youngFemaleVoice) {
        utterance.voice = youngFemaleVoice;
      }
      
      utterance.rate = 1.0; // Slightly faster for youthful energy
      utterance.pitch = 1.3; // Higher pitch for young female voice
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
    <Card className="material-card mb-8">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center">
          <Icons.chat className="mr-2 h-5 w-5 text-primary-500" />
          ☀️ Sunshine
        </CardTitle>
        <p className="text-gray-600 text-sm">Ask Sunshine anything about your music business</p>
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
                ☀️
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg p-3">
                <p className="text-sm text-gray-900">
                  Hey there! ☀️ I'm Sunshine - your witty, warm, and wonderfully helpful AI companion! Ready to tackle some email outreach, hunt down radio stations, dig up grants, or just chat about life? What's on your mind today?
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
                      ☀️
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-lg p-3">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.response}</p>
                      
                      {/* Show AI Actions and Search Results */}
                      {msg.context && typeof msg.context === 'object' && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          {/* Grant Search Results */}
                          {(msg.context as any).grantResults && (msg.context as any).grantResults.length > 0 && (
                            <div className="mb-3">
                              <h4 className="text-xs font-semibold text-gray-600 mb-2">
                                📋 Found {(msg.context as any).grantResults.length} Grants:
                              </h4>
                              <div className="space-y-2">
                                {(msg.context as any).grantResults.slice(0, 3).map((grant: any, index: number) => (
                                  <div key={index} className="bg-white rounded p-2 border border-gray-200">
                                    <div className="text-xs font-medium text-gray-800">{grant.title}</div>
                                    <div className="text-xs text-gray-600">{grant.organization} • {grant.amount}</div>
                                    {grant.deadline && (
                                      <div className="text-xs text-red-600">Deadline: {grant.deadline}</div>
                                    )}
                                  </div>
                                ))}
                                {(msg.context as any).grantResults.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    ...and {(msg.context as any).grantResults.length - 3} more grants found
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Actions Taken */}
                          {(msg.context as any).actions && (msg.context as any).actions.length > 0 && (
                            <div className="mb-2">
                              <h4 className="text-xs font-semibold text-gray-600 mb-1">
                                ⚡ Actions Completed:
                              </h4>
                              <div className="space-y-1">
                                {(msg.context as any).actions.map((action: any, index: number) => (
                                  <div key={index} className="text-xs text-green-600">
                                    ✅ {action.type === 'search_grants' ? 
                                      `Found and saved ${action.data.addedCount || action.data.count} grants` :
                                      action.type === 'create_task' ? 
                                      `Created task: ${action.data.title}` :
                                      action.type === 'create_contact' ?
                                      `Added contact: ${action.data.name}` :
                                      `Completed: ${action.type}`
                                    }
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Discovered Data */}
                          {(msg.context as any).discoveredData && (msg.context as any).discoveredData.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-600 mb-1">
                                🔍 Used Existing Data:
                              </h4>
                              <div className="text-xs text-gray-500">
                                Found {(msg.context as any).discoveredData.length} relevant items in your database
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Type your question here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            
            {/* Voice controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSpeech}
              className={speechEnabled ? "text-blue-600" : "text-gray-400"}
              title={speechEnabled ? "Disable voice responses" : "Enable voice responses"}
            >
              {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            
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
            
            {recognitionRef.current && (
              <Button
                variant="outline"
                size="sm"
                onClick={isListening ? stopListening : startListening}
                disabled={sendMessageMutation.isPending}
                className={isListening ? "bg-red-100 text-red-600 border-red-300 animate-pulse" : ""}
                title={isListening ? "Stop recording" : "Start voice input"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="px-6"
            >
              <Icons.send className="h-4 w-4" />
            </Button>
          </div>
          
          {isListening && (
            <div className="text-xs text-red-600 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Listening... Speak now</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
