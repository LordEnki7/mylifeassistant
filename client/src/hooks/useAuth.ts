// JWT Authentication hook for My Life Assistant
import { useState, useEffect, useCallback } from "react";
import { authService, type User } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const authenticatedUser = await authService.login();
      setUser(authenticatedUser);
      // Clear any cached queries and refetch with new auth
      queryClient.clear();
      return authenticatedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setError(null);
    // Clear all cached queries on logout
    queryClient.clear();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.initialize();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Initialize authentication
    const initAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const authenticatedUser = await authService.initialize();
        setUser(authenticatedUser);
      } catch (error) {
        console.error("Authentication initialization failed:", error);
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        setError(errorMessage);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Listen for unauthorized events (like 401 responses)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If tokens are cleared in another tab, update this tab
      if (e.key === 'mylifeassistant_jwt_token' && !e.newValue) {
        setUser(null);
        queryClient.clear();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: authService.isAuthenticated() && user !== null,
    userId: authService.getUserId(),
    userEmail: authService.getUserEmail(),
    login,
    logout,
    refreshUser
  };
}