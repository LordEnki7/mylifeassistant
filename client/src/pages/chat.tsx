import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/lib/icons";
import { useAuth } from "@/hooks/useAuth";
import { Mic, MicOff, Volume2, VolumeX, Zap, Brain } from "lucide-react";
import type { ChatMessage } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const QUICK_PROMPTS = [
  "What's on my task list?",
  "Research grants for C.A.R.E.N.",
  "Help me write an investor pitch",
  "Schedule a follow-up reminder",
  "Analyze my music licensing strategy",
];

interface StreamingMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  model?: string;
}

export default function Chat() {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [streamingMessages, setStreamingMessages] = useState<StreamingMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: savedMessages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat-messages"],
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamingMessages, savedMessages]);

  // Build display list from saved messages + any in-progress streaming
  const displayMessages: StreamingMessage[] = [
    ...savedMessages.map((m) => ([
      { id: `user-${m.id}`, role: "user" as const, content: m.message },
      ...(m.response ? [{ id: `ai-${m.id}`, role: "assistant" as const, content: m.response, model: (m.context as any)?.model }] : [])
    ])).flat(),
    ...streamingMessages
  ];

  // Init speech recognition + synthesis
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
        // Auto-submit after voice
        setTimeout(() => {
          sendMessage(transcript);
        }, 300);
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Voice event listener from other parts of the app
  useEffect(() => {
    const handleVoiceAI = (event: CustomEvent) => {
      const { action, command } = event.detail;
      if (action === "process" || action === "create-task") {
        sendMessage(command);
      }
    };
    window.addEventListener("voice-ai", handleVoiceAI as EventListener);
    return () => window.removeEventListener("voice-ai", handleVoiceAI as EventListener);
  }, []);

  const speakText = useCallback((text: string) => {
    if (!synthRef.current || isSpeaking || !speechEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, ""));
    const voices = synthRef.current.getVoices();
    const voice = voices.find(v =>
      ["samantha", "allison", "ava", "emma", "aria"].some(n => v.name.toLowerCase().includes(n))
    ) || voices.find(v => v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.3;
    utterance.volume = 0.8;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [isSpeaking, speechEnabled]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || message).trim();
    if (!msg || isStreaming) return;

    setMessage("");
    setIsStreaming(true);

    const userMsgId = `user-stream-${Date.now()}`;
    const aiMsgId = `ai-stream-${Date.now()}`;

    setStreamingMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: msg }
    ]);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
        signal: abortRef.current.signal,
        credentials: "include"
      });

      if (!response.ok) throw new Error("Stream request failed");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedContent = "";
      let detectedModel = "";

      setStreamingMessages(prev => [
        ...prev,
        { id: aiMsgId, role: "assistant", content: "", isStreaming: true }
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "model") {
              detectedModel = event.model;
            } else if (event.type === "chunk") {
              accumulatedContent += event.content;
              setStreamingMessages(prev =>
                prev.map(m =>
                  m.id === aiMsgId
                    ? { ...m, content: accumulatedContent, model: detectedModel }
                    : m
                )
              );
            } else if (event.type === "done") {
              setStreamingMessages(prev =>
                prev.map(m =>
                  m.id === aiMsgId
                    ? { ...m, content: event.fullContent || accumulatedContent, isStreaming: false, model: detectedModel }
                    : m
                )
              );
              // Refresh saved message list after stream completes
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/chat-messages"] });
                queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                // Clear streaming messages now that they're saved
                setStreamingMessages([]);
              }, 500);
              if (speechEnabled) speakText(event.fullContent || accumulatedContent);
            } else if (event.type === "error") {
              setStreamingMessages(prev =>
                prev.map(m =>
                  m.id === aiMsgId
                    ? { ...m, content: "Sorry, I ran into an issue. Please try again.", isStreaming: false }
                    : m
                )
              );
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setStreamingMessages(prev =>
          prev.filter(m => m.id !== aiMsgId).concat({
            id: aiMsgId,
            role: "assistant",
            content: "Connection error — please try again.",
            isStreaming: false
          })
        );
      }
    } finally {
      setIsStreaming(false);
    }
  }, [message, isStreaming, speechEnabled, speakText, queryClient]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  const stopStream = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] max-w-4xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">☀️ Sunshine</h1>
          <p className="text-sm text-gray-500">Your AI Life Assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
            {user?.name || "Owner"}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs flex items-center gap-1">
            <Zap className="h-3 w-3" /> Streaming
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1 bg-gray-200 rounded-lg h-14 animate-pulse" />
                </div>
              ))}
            </div>
          ) : displayMessages.length === 0 ? (
            <WelcomeMessage userName={user?.name} onPrompt={(p) => sendMessage(p)} />
          ) : (
            displayMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Quick prompts — only when idle and no messages yet */}
        {displayMessages.length === 0 && !isStreaming && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-gray-600"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="border-t p-4">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              placeholder="Ask Sunshine anything… (Enter to send, Shift+Enter for new line)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isStreaming}
              className="min-h-[60px] max-h-[160px] resize-none flex-1 text-sm"
              rows={2}
            />
            <div className="flex flex-col gap-1">
              {/* Mic */}
              {recognitionRef.current && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isStreaming}
                  className={isListening ? "bg-red-100 text-red-600 border-red-300 animate-pulse" : ""}
                  title={isListening ? "Stop recording" : "Voice input (auto-sends)"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}

              {/* Speech toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => { if (isSpeaking) stopSpeaking(); else setSpeechEnabled(e => !e); }}
                className={isSpeaking ? "text-red-600" : speechEnabled ? "text-blue-600" : "text-gray-400"}
                title={isSpeaking ? "Stop speaking" : speechEnabled ? "Disable voice" : "Enable voice"}
              >
                {isSpeaking || speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>

              {/* Send / Stop */}
              {isStreaming ? (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={stopStream}
                  title="Stop response"
                >
                  <Icons.close className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={() => sendMessage()}
                  disabled={!message.trim()}
                  className="bg-primary hover:bg-primary/90"
                  title="Send message"
                >
                  <Icons.send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {!recognitionRef.current && (
            <p className="text-xs text-orange-500 mt-1">Voice input unavailable in this browser</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function WelcomeMessage({ userName, onPrompt }: { userName?: string; onPrompt: (p: string) => void }) {
  return (
    <div className="flex items-start space-x-3">
      <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white text-base flex-shrink-0">
        ☀️
      </div>
      <div className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-100">
        <p className="text-sm font-medium text-gray-900 mb-2">
          Hey{userName ? ` ${userName}` : ""}! I'm Sunshine, your AI Life Assistant. ✨
        </p>
        <p className="text-sm text-gray-600 mb-3">
          I can help you manage tasks, research grants for C.A.R.E.N., handle music industry ops, draft emails, and much more. I now respond in real-time as I think — no more waiting!
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => onPrompt(p)}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-gray-600 shadow-sm"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: StreamingMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex items-start space-x-3 justify-end">
        <div className="bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
          U
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${message.isStreaming ? "bg-primary animate-pulse" : "bg-primary"}`}>
        ☀️
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
          {message.isStreaming && !message.content ? (
            <div className="flex space-x-1 items-center py-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-gray-900">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5 text-sm">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5 text-sm">{children}</ol>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>,
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    return isBlock
                      ? <code className="block bg-gray-100 rounded p-2 text-xs font-mono my-2 whitespace-pre-wrap">{children}</code>
                      : <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono">{children}</code>;
                  },
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-3 italic text-gray-600 my-2 text-sm">{children}</blockquote>,
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{children}</a>,
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </div>
        {message.model && !message.isStreaming && (
          <div className="flex items-center gap-1 mt-1 ml-1">
            <Brain className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-400">{message.model}</span>
          </div>
        )}
      </div>
    </div>
  );
}
