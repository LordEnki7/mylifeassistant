import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { Icons } from "@/lib/icons";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: "active" | "standby" | "busy";
  icon: React.ElementType;
  color: string;
  href?: string;
  capabilities: string[];
}

const agents: Agent[] = [
  {
    id: "sunshine",
    name: "Sunshine",
    role: "Core AI Assistant",
    description: "Primary orchestrator — handles chat, task creation, scheduling, grant discovery, and legal guidance.",
    status: "active",
    icon: Icons.sparkles,
    color: "text-yellow-500",
    href: "/chat",
    capabilities: ["Task Automation", "Grant Search", "Legal Guidance", "Data Discovery", "Scheduling"],
  },
  {
    id: "music-agent",
    name: "Music Ops Agent",
    role: "Music Industry Operations",
    description: "Manages radio outreach, sync licensing, contracts, and music promotion campaigns.",
    status: "active",
    icon: Icons.music,
    color: "text-purple-500",
    href: "/outreach",
    capabilities: ["Radio Outreach", "Sync Licensing", "Contract Drafting", "Book Promotion"],
  },
  {
    id: "legal-agent",
    name: "Legal & Finance Agent",
    role: "Legal & Financial Advisor",
    description: "Expert in consumer protection, commercial law, UCC codes, credit disputes, and wealth building strategies.",
    status: "active",
    icon: Icons.shield,
    color: "text-blue-500",
    href: "/knowledge",
    capabilities: ["UCC Law", "Credit Disputes", "Consumer Protection", "Debt Validation", "Wealth Building"],
  },
  {
    id: "caren-agent",
    name: "C.A.R.E.N. Agent",
    role: "Project & Investor Relations",
    description: "Dedicated to C.A.R.E.N. app development tracking, grant applications, and investor outreach management.",
    status: "active",
    icon: Icons.building,
    color: "text-green-500",
    href: "/grants",
    capabilities: ["Grant Applications", "Investor Outreach", "Milestone Tracking", "Crowdfunding", "Pitch Deck"],
  },
  {
    id: "finance-agent",
    name: "Revenue Agent",
    role: "Invoicing & Payments",
    description: "Handles invoice creation, payment tracking, Stripe links, and financial reporting.",
    status: "standby",
    icon: Icons.dollar,
    color: "text-emerald-500",
    href: "/invoices",
    capabilities: ["Invoice Generation", "Stripe Payments", "Revenue Tracking", "Financial Reports"],
  },
  {
    id: "calendar-agent",
    name: "Schedule Agent",
    role: "Calendar & Reminders",
    description: "Manages deadlines, milestone reminders, meetings, and automated scheduling across all projects.",
    status: "standby",
    icon: Icons.calendar,
    color: "text-orange-500",
    href: "/calendar",
    capabilities: ["Event Management", "Milestone Reminders", "Deadline Tracking", "iCal Export"],
  },
];

const statusColors = {
  active: "bg-green-500",
  standby: "bg-yellow-400",
  busy: "bg-blue-500",
};

const statusLabels = {
  active: "Active",
  standby: "Standby",
  busy: "Processing",
};

export default function CommandCenter() {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const { data: health } = useQuery({
    queryKey: ["/api/ai/monitoring/status"],
    refetchInterval: 30000,
  });

  const { data: nigStatus } = useQuery({
    queryKey: ["/api/nig-status"],
    refetchInterval: 60000,
  });

  const activeAgents = agents.filter((a) => a.status === "active").length;
  const systemHealth = (nigStatus as any)?.health ?? 98;

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[hsl(222,47%,11%)] flex items-center justify-center shadow-lg">
            <Icons.command className="w-6 h-6 text-[hsl(43,67%,51%)]" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Command Center</h1>
            <p className="text-muted-foreground text-sm">Master Ecosystem Orchestrator — All AI Agents</p>
          </div>
        </div>
      </div>

      {/* System Status Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <Icons.activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">System Health</p>
              <p className="text-xl font-bold text-green-600">{systemHealth}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(222,47%,11%)] flex items-center justify-center">
              <Icons.bot className="w-5 h-5 text-[hsl(43,67%,51%)]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Agents</p>
              <p className="text-xl font-bold">{activeAgents} / {agents.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Icons.network className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">NIG Status</p>
              <p className="text-sm font-bold text-purple-600">
                {(nigStatus as any)?.status === "live" ? "Connected" : "Offline"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(43,67%,51%)]/20 flex items-center justify-center">
              <Icons.zap className="w-5 h-5 text-[hsl(43,67%,51%)]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="text-xl font-bold">{(nigStatus as any)?.uptime ?? 99.9}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Agent Grid */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icons.cpu className="w-5 h-5 text-[hsl(43,67%,51%)]" />
            AI Agent Fleet
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  selectedAgent?.id === agent.id ? "ring-2 ring-[hsl(43,67%,51%)]" : ""
                }`}
                onClick={() => setSelectedAgent(agent.id === selectedAgent?.id ? null : agent)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <agent.icon className={`w-5 h-5 ${agent.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{agent.name}</CardTitle>
                        <CardDescription className="text-xs">{agent.role}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]} animate-pulse`} />
                      <span className="text-xs text-muted-foreground">{statusLabels[agent.status]}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-3">{agent.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.slice(0, 3).map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs px-1.5 py-0">
                        {cap}
                      </Badge>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        +{agent.capabilities.length - 3}
                      </Badge>
                    )}
                  </div>
                  {agent.href && (
                    <div className="mt-3">
                      <Link href={agent.href}>
                        <Button size="sm" variant="outline" className="w-full text-xs h-7">
                          <Icons.zap className="w-3 h-3 mr-1" />
                          Open Module
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Agent Detail */}
          {selectedAgent ? (
            <Card className="border-[hsl(43,67%,51%)]/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <selectedAgent.icon className={`w-5 h-5 ${selectedAgent.color}`} />
                  {selectedAgent.name}
                </CardTitle>
                <CardDescription>{selectedAgent.role}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    All Capabilities
                  </p>
                  <div className="space-y-1.5">
                    {selectedAgent.capabilities.map((cap) => (
                      <div key={cap} className="flex items-center gap-2 text-sm">
                        <Icons.checkCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {cap}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${statusColors[selectedAgent.status]} animate-pulse`}
                  />
                  <span className="text-sm capitalize">{statusLabels[selectedAgent.status]}</span>
                </div>
                {selectedAgent.href && (
                  <Link href={selectedAgent.href}>
                    <Button className="w-full btn-gold">
                      <Icons.zap className="w-4 h-4 mr-2" />
                      Launch {selectedAgent.name}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                <Icons.bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Click any agent card to see details
              </CardContent>
            </Card>
          )}

          {/* NIG Connection Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icons.network className="w-4 h-4 text-[hsl(43,67%,51%)]" />
                NIG Command Center
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time division reporting status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Division</span>
                <span className="font-mono text-xs">
                  {(nigStatus as any)?.division || "My Life Assistant"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  className={
                    (nigStatus as any)?.status === "live"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-700"
                  }
                  variant="outline"
                >
                  {(nigStatus as any)?.status || "live"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Health</span>
                <span className="font-bold text-green-600">{systemHealth}%</span>
              </div>
              <Progress value={systemHealth} className="h-1.5" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Endpoint</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/api/nig-status</code>
              </div>
              <Separator />
              <Link href="/settings">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <Icons.settings className="w-3 h-3 mr-1" />
                  Configure NIG Link
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Universal Orchestrator Info */}
          <Card className="bg-[hsl(222,47%,11%)] text-white border-0">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Icons.globe className="w-5 h-5 text-[hsl(43,67%,51%)]" />
                <p className="font-semibold text-sm">Universal Business Orchestrator</p>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                All agents operate under the Master Ecosystem framework — autonomously discovering
                data, executing tasks, and reporting back through the NIG Command Center for
                unified oversight.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Autonomous", "Multi-Agent", "Real-Time", "NIG-Linked"].map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
