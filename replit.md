# Overview

This is a personal Life Assistant application called "My Life Assistant" that helps the user manage their daily activities and music industry work. The application serves as an AI-powered platform for managing email outreach, radio station contacts, sync licensing opportunities, grant applications, invoicing, calendar events, and knowledge management. It features a comprehensive dashboard, AI assistant integration, and specialized modules for different aspects of the music business including radio promotion, licensing scouts, grant tracking for a project called C.A.R.E.N., and professional invoicing with payment processing. The app includes hardwired email identification for automatic user recognition and AI task management capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui component system for consistent design
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation through @hookform/resolvers

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints with structured error handling
- **Development**: tsx for TypeScript execution in development
- **Build**: esbuild for production bundling with external package handling

## Data Layer
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database serverless PostgreSQL
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Validation**: Zod schemas for runtime type validation with drizzle-zod integration

## Authentication & Session Management
- **Session Storage**: PostgreSQL-based sessions using connect-pg-simple
- **Session Security**: Secure session handling with proper configuration for production

## Component Architecture
- **Design System**: Material Design-inspired component system with consistent spacing and elevation
- **Responsive Design**: Mobile-first approach with dedicated mobile navigation (bottom nav + sidebar)
- **Layout Structure**: App shell pattern with desktop sidebar and mobile-optimized navigation
- **Icon System**: Lucide React icons with centralized icon management

## Development Environment
- **Type Safety**: Comprehensive TypeScript configuration with strict mode enabled
- **Path Aliases**: Organized import structure with @ aliases for components, shared code, and utilities
- **Development Tools**: Replit-specific plugins for development environment integration
- **Error Handling**: Runtime error overlay for development debugging

# External Dependencies

## Database & ORM
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect
- **drizzle-kit**: Database migration and schema management tools

## UI & Styling
- **@radix-ui/react-***: Comprehensive set of unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework with custom configuration
- **class-variance-authority**: Utility for creating variant-based component styles
- **clsx**: Conditional className utility

## State Management & Data Fetching
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight routing library for React

## Form Handling
- **react-hook-form**: Performant form library with minimal re-renders
- **@hookform/resolvers**: Integration with validation libraries
- **zod**: Schema validation and TypeScript type inference

## Development & Build Tools
- **vite**: Fast build tool and development server
- **@vitejs/plugin-react**: React support for Vite
- **esbuild**: Fast JavaScript bundler for production builds
- **tsx**: TypeScript execution for Node.js

## Session Management
- **express-session**: Session middleware for Express
- **connect-pg-simple**: PostgreSQL session store

## Utilities
- **date-fns**: Date manipulation and formatting
- **nanoid**: URL-safe unique ID generator
- **embla-carousel-react**: Carousel component library