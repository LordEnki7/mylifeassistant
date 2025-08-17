import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/My Life Assistant_1755255862503.png";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Icons.dashboard },
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
];

export default function MobileSidebar() {
  const { isMobileMenuOpen, closeMobileMenu, isActiveRoute } = useNavigation();

  console.log('MobileSidebar render, isMobileMenuOpen:', isMobileMenuOpen);

  if (!isMobileMenuOpen) {
    console.log('Mobile sidebar not showing because isMobileMenuOpen is false');
    return null;
  }

  console.log('Mobile sidebar should be visible now!');

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={closeMobileMenu}
      />
      <nav 
        className={cn(
          "fixed left-0 top-0 bottom-0 w-80 max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 bg-primary-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={logoImage} alt="My Life Assistant" className="h-10 w-10" />
              <div>
                <h2 className="text-lg font-semibold">My Life Assistant</h2>
                <p className="text-primary-100 text-xs">AI-Powered Life Management</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-primary-600"
              onClick={closeMobileMenu}
            >
              <Icons.close className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="py-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = isActiveRoute(item.href);
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <a
                      className={cn(
                        "flex items-center px-6 py-3",
                        isActive
                          ? "text-primary-600 bg-primary-50 border-r-2 border-primary-500"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                      onClick={closeMobileMenu}
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
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">User</p>
              <p className="text-xs text-gray-500 truncate">user@mylifeassistant.com</p>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
