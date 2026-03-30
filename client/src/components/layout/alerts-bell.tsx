import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { HeartbeatAlert } from "@shared/schema";

export function AlertsBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/heartbeat/unread-count"],
    refetchInterval: 30000,
  });

  const { data: alerts = [] } = useQuery<HeartbeatAlert[]>({
    queryKey: ["/api/heartbeat/alerts"],
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/heartbeat/alerts/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/heartbeat/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/heartbeat/unread-count"] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/heartbeat/alerts/read-all", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/heartbeat/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/heartbeat/unread-count"] });
    }
  });

  const unreadCount = countData?.count || 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-white/10 p-2 relative"
        onClick={() => setOpen(!open)}
        title="Sunshine alerts"
      >
        {unreadCount > 0 ? <BellRing className="h-5 w-5 animate-pulse" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-amber-400 text-gray-900 text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-navy-900 to-blue-900 rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="text-base">☀️</span>
                <span className="text-white font-semibold text-sm">Sunshine Alerts</span>
                {unreadCount > 0 && (
                  <Badge className="bg-amber-400 text-gray-900 text-xs">{unreadCount} new</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 text-xs px-2 py-1 h-auto"
                    onClick={() => markAllReadMutation.mutate()}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" /> All read
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-1 h-auto" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No alerts yet.</p>
                  <p className="text-xs mt-1">Sunshine will send daily briefings and deadline reminders here.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${!alert.read ? "bg-amber-50/60" : ""}`}
                    onClick={() => !alert.read && markReadMutation.mutate(alert.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{alertIcon(alert.alertType)}</span>
                        <span className="text-sm font-semibold text-gray-900 leading-snug">{alert.title}</span>
                      </div>
                      {!alert.read && <span className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                    <div className="text-xs text-gray-600 prose prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-1 last:mb-0 text-xs leading-relaxed">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc list-inside text-xs space-y-0.5">{children}</ul>,
                          li: ({ children }) => <li className="text-xs">{children}</li>,
                        }}
                      >
                        {alert.message}
                      </ReactMarkdown>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function alertIcon(type: string | null): string {
  switch (type) {
    case "briefing": return "📋";
    case "deadline": return "⏰";
    case "reminder": return "🔔";
    case "milestone": return "🏆";
    default: return "☀️";
  }
}
