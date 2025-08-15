import { useQuery } from "@tanstack/react-query";
import { Icons } from "@/lib/icons";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardStats {
  emailsSent: number;
  radioStations: number;
  grantOpportunities: number;
  revenue: number;
}

export default function StatsGrid() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: "Emails Sent",
      value: stats?.emailsSent || 0,
      change: "+12%",
      icon: Icons.email,
      iconColor: "text-primary-500",
    },
    {
      label: "Radio Stations",
      value: stats?.radioStations || 0,
      change: "+5 new this week",
      icon: Icons.radio,
      iconColor: "text-accent-500",
    },
    {
      label: "Grant Opportunities",
      value: stats?.grantOpportunities || 0,
      change: "3 deadlines soon",
      icon: Icons.building,
      iconColor: "text-secondary-500",
    },
    {
      label: "Revenue",
      value: `$${(stats?.revenue || 0).toLocaleString()}`,
      change: "+18%",
      icon: Icons.dollar,
      iconColor: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statItems.map((item, index) => (
        <Card key={index} className="material-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{item.label}</p>
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              </div>
              <item.icon className={`h-8 w-8 ${item.iconColor}`} />
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-secondary-500 font-medium">{item.change}</span>
              {item.change.includes("%") && (
                <span className="text-sm text-gray-500 ml-2">vs last month</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
