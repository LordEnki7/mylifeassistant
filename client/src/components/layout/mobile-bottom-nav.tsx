import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";

const bottomNavigation = [
  { name: "Home", href: "/dashboard", icon: Icons.dashboard },
  { name: "AI Chat", href: "/chat", icon: Icons.chat },
  { name: "Audiobooks", href: "/audiobooks", icon: Icons.music },
  { name: "Promotion", href: "/audiobook-promotion", icon: Icons.trending },
  { name: "More", href: "#", icon: Icons.more, action: "menu" },
];

export default function MobileBottomNav() {
  const { isActiveRoute, toggleMobileMenu } = useNavigation();

  return (
    <nav className="lg:hidden bg-card border-t border-border shadow-lg">
      <div className="grid grid-cols-5 h-16">
        {bottomNavigation.map((item) => {
          const isActive = item.href ? isActiveRoute(item.href) : false;
          
          if (item.action === "menu") {
            return (
              <div
                key={item.name}
                className={cn(
                  "flex flex-col items-center justify-center transition-all cursor-pointer h-full",
                  "text-muted-foreground hover:text-accent"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  console.log('More button clicked, opening mobile menu');
                  toggleMobileMenu();
                }}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </div>
            );
          }
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center transition-all cursor-pointer h-full",
                  isActive
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground hover:text-accent"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-accent")} />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
