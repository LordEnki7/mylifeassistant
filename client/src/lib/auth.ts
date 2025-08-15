// Hardwired authentication system for single-user Life Assistant app
// Automatically identifies the user based on the hardwired email

export interface User {
  id: string;
  email: string;
  name: string;
}

// Hardwired user configuration
const HARDWIRED_USER: User = {
  id: "demo-user",
  email: "user@mylifeassistant.com", 
  name: "User"
};

// User authentication service - automatically identifies the hardwired user
export class AuthService {
  private static instance: AuthService;
  private user: User | null = null;

  private constructor() {
    // Automatically authenticate the hardwired user
    this.user = HARDWIRED_USER;
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Get current authenticated user (always returns hardwired user)
  getCurrentUser(): User {
    return this.user!;
  }

  // Check if user is authenticated (always true for hardwired user)
  isAuthenticated(): boolean {
    return this.user !== null;
  }

  // Get user ID for API calls
  getUserId(): string {
    return this.user!.id;
  }

  // Get user email
  getUserEmail(): string {
    return this.user!.email;
  }

  // Initialize the app - automatically recognizes user
  async initialize(): Promise<User> {
    // In a real app, this would verify the hardwired email
    // For this single-user app, we always return the hardwired user
    return this.user!;
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();