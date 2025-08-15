import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Icons.dashboard },
  { name: "AI Assistant", href: "/chat", icon: Icons.chat },
  { name: "Email Outreach", href: "/outreach", icon: Icons.email },
  { name: "Radio Stations", href: "/radio", icon: Icons.radio },
  { name: "Sync Licensing", href: "/licensing", icon: Icons.movie },
  { name: "Grants (C.A.R.E.N.)", href: "/grants", icon: Icons.building },
  { name: "Calendar", href: "/calendar", icon: Icons.calendar },
  { name: "Invoices", href: "/invoices", icon: Icons.receipt },
  { name: "Knowledge Base", href: "/knowledge", icon: Icons.book },
];

export default function DesktopSidebar() {
  const { isActiveRoute } = useNavigation();

  return (
    <nav className="hidden lg:flex lg:flex-col lg:w-64 bg-white shadow-lg">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary-500">My Life Assistant</h1>
        <p className="text-sm text-gray-600 mt-1">AI-Powered Music Management</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center p-3 rounded-lg transition-all-300",
                      isActive
                        ? "bg-primary-50 text-primary-600"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">John Doe</p>
            <p className="text-xs text-gray-500 truncate">user@mylifeassistant.com</p>
          </div>
          <Button variant="ghost" size="sm">
            <Icons.more className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
