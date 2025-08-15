// JWT-based authentication system for My Life Assistant
// Uses hardwired user with secure JWT token authentication

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

const TOKEN_KEY = 'mylifeassistant_jwt_token';
const USER_KEY = 'mylifeassistant_user';

// JWT-based authentication service
export class AuthService {
  private static instance: AuthService;
  private user: User | null = null;
  private token: string | null = null;

  private constructor() {
    // Try to restore authentication from localStorage
    this.restoreAuthFromStorage();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private restoreAuthFromStorage(): void {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      if (storedToken && storedUser) {
        this.token = storedToken;
        this.user = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Failed to restore auth from storage:', error);
      this.clearAuth();
    }
  }

  private saveAuthToStorage(token: string, user: User): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save auth to storage:', error);
    }
  }

  private clearAuth(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Login with hardwired user (gets JWT token from backend)
  async login(): Promise<User> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || 'Authentication failed');
      }

      const loginData: LoginResponse = await response.json();
      
      // Store the JWT token and user data
      this.token = loginData.token;
      this.user = loginData.user;
      this.saveAuthToStorage(loginData.token, loginData.user);
      
      return loginData.user;
    } catch (error) {
      console.error('Login failed:', error);
      this.clearAuth();
      throw error;
    }
  }

  // Logout and clear authentication
  logout(): void {
    this.clearAuth();
    // Optionally notify the backend about logout
    // Note: No need to call /api/logout since we're using stateless JWT
  }

  // Get current authenticated user
  getCurrentUser(): User | null {
    return this.user;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  // Get JWT token for API requests
  getToken(): string | null {
    return this.token;
  }

  // Get authorization header for API requests
  getAuthHeader(): string | null {
    return this.token ? `Bearer ${this.token}` : null;
  }

  // Get user ID for API calls
  getUserId(): string | null {
    return this.user?.id || null;
  }

  // Get user email
  getUserEmail(): string | null {
    return this.user?.email || null;
  }

  // Initialize the app - check if already authenticated or attempt login
  async initialize(): Promise<User | null> {
    // If we already have valid auth, verify it with the backend
    if (this.isAuthenticated()) {
      try {
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': this.getAuthHeader()!
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          this.user = userData;
          this.saveAuthToStorage(this.token!, userData);
          return userData;
        } else {
          // Token is invalid, clear it
          this.clearAuth();
        }
      } catch (error) {
        console.error('Failed to verify existing auth:', error);
        this.clearAuth();
      }
    }

    // Attempt to login with hardwired user
    try {
      return await this.login();
    } catch (error) {
      console.error('Auto-login failed:', error);
      return null;
    }
  }

  // Handle 401 responses by clearing invalid auth
  handleUnauthorized(): void {
    console.warn('Received 401 response, clearing authentication');
    this.clearAuth();
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();