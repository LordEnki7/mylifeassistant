import StatsGrid from "@/components/dashboard/stats-grid";
import AIChatWidget from "@/components/dashboard/ai-chat-widget";
import RecentActivity from "@/components/dashboard/recent-activity";
import UpcomingTasks from "@/components/dashboard/upcoming-tasks";
import QuickActions from "@/components/dashboard/quick-actions";
import BackupExport from "@/components/dashboard/backup-export";
import AIMarketingCommandCenter from "@/components/dashboard/ai-marketing-command-center";

export default function Dashboard() {
  return (
    <div className="p-4 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your music business.</p>
      </div>

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
    </div>
  );
}
