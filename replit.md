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

# Recent Changes

- **Logo Integration (Today)**: Added custom logo to all layout components (desktop sidebar, mobile header, mobile sidebar, and loading screen)
- **App Branding Update**: Changed from "MusicBiz Pro" to "My Life Assistant" throughout the application
- **Hardwired Authentication**: Implemented automatic user identification with hardwired email (user@mylifeassistant.com)
- **AI Task Management**: Enhanced AI assistant with task creation, scheduling, and monitoring capabilities
- **Advanced AI Training (Today)**: Integrated comprehensive training material including:
  * **Legal & Commercial Law**: Title 15 US Code (Commerce & Trade), UCC Article 3 (Negotiable Instruments), debt settlement strategies, payment tender laws
  * **Consumer Protection Law Expertise**: FDCPA (Fair Debt Collection Practices Act), FCRA (Fair Credit Reporting Act), HJR 192 (House Joint Resolution 192), debt validation procedures, credit dispute processes, consumer remedies and protections
  * **Wealth Building Mastery**: "Money Does Grow on Trees" principles, rich vs. wealthy concepts, spiritual + physical money approaches, generational wealth building
  * **Practical Financial Tools**: Payment refusal letters, promissory note creation, debt discharge methods, commercial remedies, validation letters, cease and desist templates
  * **Enhanced Topic Recognition**: AI now recognizes and provides expert guidance on commercial law, consumer protection, debt collection defense, credit law, wealth building, and financial strategy topics
- **C.A.R.E.N Project Integration (Today)**: 
  * **Logo Integration**: Added C.A.R.E.N "Roadside Rights Protection Platform" logo as front page header on grants page
  * **AI Grant Search**: Implemented "☀️ Find Grants with Sunshine" functionality that intelligently searches for funding opportunities specifically for C.A.R.E.N
  * **Smart Grant Matching**: Sunshine can analyze C.A.R.E.N's focus areas (legal technology, roadside assistance, AI safety platforms, consumer protection) and automatically discover relevant federal grants, state grants, foundation grants, and private funding opportunities
  * **Automated Grant Addition**: Found grants are automatically added to the grants database with comprehensive details including organization, amount, requirements, deadlines, and application URLs
- **OpenAI API Resolution (Today)**: 
  * **Service Account Key Integration**: Successfully updated to working service account API key (sk-svcacct-MYNX-SOB1esi...)
  * **Quota Issues Resolved**: All AI features now fully operational after resolving persistent 429 quota errors
  * **Sunshine AI Restored**: AI assistant capabilities fully restored and testing confirmed working
- **Backup System Fixed (Today)**:
  * **Authentication Bug Fixed**: Resolved backup download failures caused by invalid token authentication
  * **Proper Auth Integration**: Updated backup component to use centralized auth service instead of localStorage tokens
  * **Backup Confirmed Working**: Successfully created backup file `my-life-assistant-backup-2025-08-16T22-32-02-766Z.zip`
- **Sunshine Enhanced with Complete C.A.R.E.N. Knowledge (Today)**:
  * **Comprehensive C.A.R.E.N. Training**: Sunshine now has complete knowledge of C.A.R.E.N. (Citizen Assistance for Roadside Emergencies and Navigation) project from business plan, investor networks, and LegalTech fund documentation
  * **Visual Working Status**: Enhanced chat interface with working status indicators showing "🤔 Thinking..." → "📝 Creating task..." → "✅ Task created!"
  * **Improved Task Detection**: Enhanced task intent recognition with expanded keyword set including "i need", "can you", "help me", "don't forget", "set a reminder"
  * **Actual Task Execution**: Backend now actually creates tasks, contacts, and grants in database when AI determines appropriate action
  * **Intelligent Grant Search**: Added "☀️ Find Grants with Sunshine" functionality that automatically discovers and adds relevant funding opportunities for C.A.R.E.N.
  * **C.A.R.E.N. Expert Knowledge**: Sunshine understands:
    - Mission: Digital witness protection with real-time legal access and smart technology
    - Technology Stack: React + TypeScript + Firebase + BLE hardware integration
    - Business Model: Subscription tiers from $1-$49.99/month, projected $704K Year 3 revenue
    - Team Structure: Shawn Williams (CEO), Erin Biundo (CIO), team of 6 specialists
    - Funding Landscape: $750K seed round targeting LegalTech Fund, Arch Grants, Ohio Angel Collective, federal SBIR programs
    - Social Impact: Addressing systemic inequality, protecting BIPOC/immigrant motorists, multilingual support
    - Current Status: Prototypes complete, seeking hardware development and beta testing