import StatsGrid from "@/components/dashboard/stats-grid";
import AIChatWidget from "@/components/dashboard/ai-chat-widget";
import RecentActivity from "@/components/dashboard/recent-activity";
import UpcomingTasks from "@/components/dashboard/upcoming-tasks";
import QuickActions from "@/components/dashboard/quick-actions";
import BackupExport from "@/components/dashboard/backup-export";
import AIMarketingCommandCenter from "@/components/dashboard/ai-marketing-command-center";
import { PersonalOptimization } from "@/components/PersonalOptimization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase, BarChart3 } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="p-4 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Your AI-powered personal productivity hub</p>
      </div>

      {/* Dashboard Tabs for Personal vs Business Views */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50">
          <TabsTrigger value="personal" className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <User className="w-4 h-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            <Briefcase className="w-4 h-4" />
            Business
          </TabsTrigger>
        </TabsList>

        {/* Personal Dashboard Tab */}
        <TabsContent value="personal" className="space-y-6">
          <PersonalOptimization />
        </TabsContent>

        {/* Business Overview Tab */}
        <TabsContent value="business" className="space-y-6">
          {/* Quick Stats Grid */}
          <StatsGrid />

          {/* AI Marketing Command Center */}
          <AIMarketingCommandCenter />

          {/* AI Chat Widget */}
          <AIChatWidget />

          {/* Recent Activity & Upcoming Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RecentActivity />
            <UpcomingTasks />
          </div>

          {/* Quick Actions */}
          <QuickActions />

          {/* Backup & Export */}
          <div className="mt-8">
            <BackupExport />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
