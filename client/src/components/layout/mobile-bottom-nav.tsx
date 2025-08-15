import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";

const bottomNavigation = [
  { name: "Home", href: "/dashboard", icon: Icons.dashboard },
  { name: "AI Chat", href: "/chat", icon: Icons.chat },
  { name: "Contracts", href: "/contracts", icon: Icons.fileText },
  { name: "Calendar", href: "/calendar", icon: Icons.calendar },
  { name: "More", href: "/more", icon: Icons.more },
];

export default function MobileBottomNav() {
  const { isActiveRoute } = useNavigation();

  return (
    <nav className="lg:hidden bg-white border-t border-gray-200">
      <div className="grid grid-cols-5 h-16">
        {bottomNavigation.map((item) => {
          const isActive = isActiveRoute(item.href);
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
