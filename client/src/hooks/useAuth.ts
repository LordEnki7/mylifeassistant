// Authentication hook for the hardwired single-user system
import { useState, useEffect } from "react";
import { authService, type User } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize authentication with hardwired user
    const initAuth = async () => {
      try {
        const authenticatedUser = await authService.initialize();
        setUser(authenticatedUser);
      } catch (error) {
        console.error("Authentication initialization failed:", error);
        // For hardwired system, we still set the user even if there's an error
        setUser(authService.getCurrentUser());
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: authService.isAuthenticated(),
    userId: authService.getUserId(),
    userEmail: authService.getUserEmail()
  };
}