import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/My_Life_Assistant_Logo_1767679972274.png";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Icons.dashboard },
  { name: "Command Center", href: "/command-center", icon: Icons.command },
  { name: "AI Assistant", href: "/chat", icon: Icons.chat },
  { name: "Email Outreach", href: "/outreach", icon: Icons.email },
  { name: "Radio Stations", href: "/radio", icon: Icons.radio },
  { name: "Sync Licensing", href: "/licensing", icon: Icons.movie },
  { name: "Music Contracts", href: "/contracts", icon: Icons.fileText },
  { name: "My Audiobooks", href: "/audiobooks", icon: Icons.music },
  { name: "Book Promotion", href: "/audiobook-promotion", icon: Icons.trending },
  { name: "Grants (C.A.R.E.N.)", href: "/grants", icon: Icons.building },
  { name: "Crowdfunding", href: "/crowdfunding", icon: Icons.dollar },
  { name: "Calendar", href: "/calendar", icon: Icons.calendar },
  { name: "Invoices", href: "/invoices", icon: Icons.receipt },
  { name: "Knowledge Base", href: "/knowledge", icon: Icons.book },
  { name: "Settings", href: "/settings", icon: Icons.settings },
];

export default function DesktopSidebar() {
  const { isActiveRoute } = useNavigation();

  return (
    <nav className="hidden lg:flex lg:flex-col lg:w-64 bg-sidebar text-sidebar-foreground shadow-xl">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3 mb-2">
          <img src={logoImage} alt="My Life Assistant" className="h-14 w-14 rounded-lg shadow-lg" />
          <div>
            <h1 className="text-xl font-bold text-sidebar-primary">My Life Assistant</h1>
            <p className="text-xs text-sidebar-foreground/70">AI-Powered Life Management</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center p-3 rounded-lg transition-all-300 cursor-pointer",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className={cn("mr-3 h-5 w-5", isActive && "text-sidebar-primary")} />
                    {item.name}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 gold-gradient rounded-full flex items-center justify-center text-[hsl(222,47%,11%)] font-semibold shadow-md">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">User</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">user@mylifeassistant.com</p>
          </div>
          <ThemeSwitcher />
          <Button variant="ghost" size="sm" className="text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent">
            <Icons.more className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
