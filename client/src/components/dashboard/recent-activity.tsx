import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/lib/icons";

const mockActivities = [
  {
    id: 1,
    type: "email",
    title: "Sent outreach email to KQED Radio",
    timestamp: "2 hours ago",
    icon: Icons.email,
    iconColor: "text-primary-500",
    bgColor: "bg-primary-100",
  },
  {
    id: 2,
    type: "grant",
    title: "New grant opportunity found for C.A.R.E.N.",
    timestamp: "5 hours ago",
    icon: Icons.building,
    iconColor: "text-secondary-500",
    bgColor: "bg-secondary-100",
  },
  {
    id: 3,
    type: "invoice",
    title: "Invoice #2024-003 paid",
    timestamp: "1 day ago",
    icon: Icons.receipt,
    iconColor: "text-accent-500",
    bgColor: "bg-accent-100",
  },
];

export default function RecentActivity() {
  return (
    <Card className="material-card">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center">
          <Icons.history className="mr-2 h-5 w-5 text-gray-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {mockActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`w-8 h-8 ${activity.bgColor} rounded-full flex items-center justify-center`}>
                <activity.icon className={`h-4 w-4 ${activity.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
        
        <Button
          variant="ghost"
          className="w-full mt-4 text-primary-500 hover:text-primary-600"
        >
          View all activity
        </Button>
      </CardContent>
    </Card>
  );
}
