# Overview

"My Life Assistant" is an AI-powered personal application designed to help users manage daily activities and music industry operations. It serves as a comprehensive platform for email outreach, radio station contacts, sync licensing, grant applications, invoicing, calendar management, and knowledge organization. The application features a main dashboard, integrated AI assistant, and specialized modules for radio promotion, licensing scouts, grant tracking (specifically for the C.A.R.E.N. project), and professional invoicing with payment processing. It includes hardwired email identification for automatic user recognition and advanced AI task management capabilities. The project aims to provide an AI assistant with expertise in legal & commercial law, consumer protection, wealth building, and practical financial tools, offering expert guidance and automated actions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React with TypeScript (Vite build tool)
- **UI/UX**: Radix UI components with shadcn/ui for consistent design, Material Design-inspired system, mobile-first responsive design, app shell pattern with desktop sidebar and mobile navigation.
- **Styling**: Tailwind CSS with custom design tokens and CSS variables.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack Query (React Query) for server state.
- **Forms**: React Hook Form with Zod validation.
- **Icon System**: Lucide React icons.

## Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API with structured error handling.
- **Development**: tsx for development, esbuild for production bundling.

## Data Layer
- **Database**: PostgreSQL with Drizzle ORM.
- **Database Provider**: Neon Database (serverless PostgreSQL).
- **Schema Management**: Drizzle Kit for migrations.
- **Validation**: Zod schemas for runtime type validation (drizzle-zod).

## Authentication & Session Management
- **Session Storage**: PostgreSQL-based sessions (connect-pg-simple).
- **Session Security**: Secure session handling.

## Component Architecture
- **Design System**: Consistent spacing and elevation.
- **Layout Structure**: Desktop sidebar and mobile-optimized navigation.

## Development Environment
- **Type Safety**: Comprehensive TypeScript configuration with strict mode.
- **Path Aliases**: Organized import structure with `@` aliases.
- **Error Handling**: Runtime error overlay.

## AI System Architecture
- **Modular Core**: Clean AI system with separated components (server/ai/core.ts, server/ai/dataDiscovery.ts).
- **Intelligent Data Discovery**: Sunshine autonomously finds and connects missing data across all systems to complete tasks.
- **Core Functionality**: AI assistant (Sunshine) for task creation, scheduling, and monitoring.
- **Knowledge Integration**: Comprehensive training on legal, commercial, consumer protection, and financial topics.
- **Task Automation**: Automated creation of tasks, contacts, and grants based on AI determination.
- **Grant Search**: "Find Grants with Sunshine" feature for C.A.R.E.N. project funding opportunities.
- **Communication Adaptation**: AI learns and adjusts communication style based on user preferences and feedback, maintaining natural conversational flow.
- **Result Display**: Detailed display of AI-generated results, including comprehensive grant information with filtering options.
- **Monitoring & Validation**: Advanced AI validation and monitoring systems for reliability.
- **Clean Architecture**: Removed legacy monolithic functions in favor of maintainable modular components.

# External Dependencies

## Database & ORM
- **@neondatabase/serverless**: Serverless PostgreSQL connection.
- **drizzle-orm**: Type-safe ORM.
- **drizzle-kit**: Database migration and schema management.

## UI & Styling
- **@radix-ui/react-***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Variant-based component styles.
- **clsx**: Conditional className utility.

## State Management & Data Fetching
- **@tanstack/react-query**: Server state management.
- **wouter**: Lightweight routing library.

## Form Handling
- **react-hook-form**: Form library.
- **@hookform/resolvers**: Validation library integration.
- **zod**: Schema validation.

## Development & Build Tools
- **vite**: Fast build tool and development server.
- **@vitejs/plugin-react**: React support for Vite.
- **esbuild**: JavaScript bundler.
- **tsx**: TypeScript execution for Node.js.

## Session Management
- **express-session**: Session middleware for Express.
- **connect-pg-simple**: PostgreSQL session store.

## Utilities
- **date-fns**: Date manipulation.
- **nanoid**: URL-safe unique ID generator.
- **embla-carousel-react**: Carousel component library.