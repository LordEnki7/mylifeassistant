import { ReactNode } from "react";
import MobileHeader from "./mobile-header";
import DesktopSidebar from "./desktop-sidebar";
import MobileSidebar from "./mobile-sidebar";
import MobileBottomNav from "./mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { Icons } from "@/lib/icons";
import { useNavigation } from "@/hooks/use-navigation";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { isMobileMenuOpen, toggleMobileMenu } = useNavigation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <DesktopSidebar />

        {/* Mobile Sidebar Overlay */}
        <MobileSidebar />

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating Action Button (Mobile) */}
      <Button
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg z-40 p-0"
        onClick={toggleMobileMenu}
      >
        <Icons.plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
