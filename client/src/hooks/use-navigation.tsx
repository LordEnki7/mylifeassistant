import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function useNavigation() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    console.log('Toggle mobile menu clicked, current state:', isMobileMenuOpen);
    const newState = !isMobileMenuOpen;
    console.log('Setting new state to:', newState);
    setIsMobileMenuOpen(newState);
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
