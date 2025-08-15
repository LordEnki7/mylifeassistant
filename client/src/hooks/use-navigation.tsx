import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function useNavigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const isActiveRoute = (path: string) => {
    if (path === "/" || path === "/dashboard") {
      return location === "/" || location === "/dashboard";
    }
    return location === path;
  };

  return {
    location,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
    isActiveRoute,
  };
}
