import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";

const bottomNavigation = [
  { name: "Home", href: "/dashboard", icon: Icons.dashboard },
  { name: "AI Chat", href: "/chat", icon: Icons.chat },
  { name: "Audiobooks", href: "/audiobooks", icon: Icons.music },
  { name: "Promotion", href: "/audiobook-promotion", icon: Icons.trending },
  { name: "More", href: "#", icon: Icons.more, action: "menu" }, // Special case for More button
];

export default function MobileBottomNav() {
  const { isActiveRoute, toggleMobileMenu } = useNavigation();

  return (
    <nav className="lg:hidden bg-white border-t border-gray-200">
      <div className="grid grid-cols-5 h-16">
        {bottomNavigation.map((item) => {
          const isActive = item.href ? isActiveRoute(item.href) : false;
          
          // Special handling for More button
          if (item.action === "menu") {
            return (
              <div
                key={item.name}
                className={cn(
                  "flex flex-col items-center justify-center transition-all-300 cursor-pointer h-full",
                  "text-gray-500 hover:text-primary-500"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  console.log('More button clicked, opening mobile menu');
                  toggleMobileMenu();
                }}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.name}</span>
              </div>
            );
          }
          
          // Regular navigation items
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center transition-all-300 cursor-pointer h-full",
                  isActive
                    ? "text-primary-500 bg-primary-50"
                    : "text-gray-500 hover:text-primary-500"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
