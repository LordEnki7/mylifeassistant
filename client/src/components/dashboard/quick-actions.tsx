import { Button } from "@/components/ui/button";
import { Icons } from "@/lib/icons";
import { useLocation } from "wouter";

const quickActions = [
  {
    name: "Start Email Campaign",
    icon: Icons.email,
    iconColor: "text-primary-500",
    href: "/outreach",
    description: "Create and send outreach emails",
  },
  {
    name: "Find Radio Stations",
    icon: Icons.search,
    iconColor: "text-accent-500",
    href: "/radio",
    description: "Discover new radio opportunities",
  },
  {
    name: "Create Invoice",
    icon: Icons.addCircle,
    iconColor: "text-secondary-500",
    href: "/invoices",
    description: "Generate professional invoices",
  },
  {
    name: "Search Grants",
    icon: Icons.dollar,
    iconColor: "text-purple-500",
    href: "/grants",
    description: "Find funding opportunities",
  },
];

export default function QuickActions() {
  const [, setLocation] = useLocation();

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Button
            key={action.name}
            variant="outline"
            className="material-card bg-white p-6 h-auto flex-col hover:material-card-elevated transition-all-300 group"
            onClick={() => setLocation(action.href)}
          >
            <action.icon className={`h-8 w-8 mb-2 ${action.iconColor} group-hover:scale-110 transition-transform`} />
            <p className="text-sm font-medium text-gray-900 text-center">{action.name}</p>
          </Button>
        ))}
      </div>
    </div>
  );
}
