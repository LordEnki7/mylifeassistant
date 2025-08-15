// JWT Authentication Middleware
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

// JWT Secret from Replit Secrets only
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: Using default JWT secret. Set JWT_SECRET in Replit Secrets for production.');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// Generate JWT token for authenticated user
export function generateToken(user: { id: string; email: string; name: string }): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    name: user.name
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'my-life-assistant',
    audience: 'my-life-assistant-users'
  } as jwt.SignOptions);
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'my-life-assistant',
      audience: 'my-life-assistant-users'
    }) as jwt.JwtPayload;
    
    return {
      userId: decoded.userId as string,
      email: decoded.email as string,
      name: decoded.name as string,
      iat: decoded.iat,
      exp: decoded.exp
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Authentication middleware - JWT required for all protected routes
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Authentication required', 
        message: 'Please provide a valid JWT token in Authorization header' 
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);
    
    // Verify user still exists in storage
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      res.status(401).json({ 
        error: 'User not found', 
        message: 'The user associated with this token no longer exists' 
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email!,
      name: user.name!
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      error: 'Authentication failed', 
      message: error instanceof Error ? error.message : 'Invalid token' 
    });
  }
}

// Hardwired user login for single-user system
export async function loginHardwiredUser(): Promise<{ token: string; user: any }> {
  // Get the hardwired user
  const user = await storage.getUserByEmail('user@mylifeassistant.com');
  
  if (!user) {
    throw new Error('Hardwired user not found. Please check system configuration.');
  }

  const token = generateToken({
    id: user.id,
    email: user.email!,
    name: user.name!
  });

  return { token, user };
}

// Middleware to extract user ID from JWT (for use in routes)
export function getUserId(req: Request): string {
  if (!req.user) {
    throw new Error('User not authenticated. Use requireAuth middleware first.');
  }
  return req.user.id;
}