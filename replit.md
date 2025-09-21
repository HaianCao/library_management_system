# Overview

This is a comprehensive library management system built with modern web technologies. The application provides a full-featured digital library platform for managing books, tracking borrowings, user administration, and monitoring activity logs. It features real-time analytics, role-based access control, and a responsive user interface designed for both librarians and library users.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds
- **Form Handling**: React Hook Form with Zod schema validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **Database ORM**: Drizzle ORM for type-safe database interactions
- **Authentication**: Replit's OpenID Connect (OIDC) integration with Passport.js
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with JSON responses
- **Middleware**: CORS, body parsing, and custom logging middleware

## Database Design
- **Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema updates
- **Core Tables**:
  - Users: Authentication profiles with role-based permissions (admin/user)
  - Books: Complete book catalog with metadata and availability tracking
  - Borrowings: Transaction records with due dates and return status
  - Activity Logs: Comprehensive audit trail for all system actions
  - Sessions: Secure session storage for authentication

## Authentication & Authorization
- **Authentication Provider**: Replit OIDC for seamless platform integration
- **Session Security**: HTTP-only cookies with CSRF protection
- **Role-Based Access**: Admin and user roles with feature-level permissions
- **User Management**: Automatic user provisioning on first login

## Key Features
- **Dashboard Analytics**: Real-time statistics and activity monitoring
- **Book Management**: CRUD operations with search and filtering capabilities
- **Borrowing System**: Complete checkout/return workflow with overdue tracking
- **User Administration**: Role management and user activity oversight (admin only)
- **Activity Logging**: Comprehensive audit trail for all system operations
- **Responsive Design**: Mobile-first approach with adaptive layouts

## Development Workflow
- **Hot Reloading**: Vite HMR for instant development feedback
- **Type Safety**: End-to-end TypeScript with shared schemas
- **Code Quality**: ESLint and Prettier for consistent code formatting
- **Database Development**: Push-based schema updates with Drizzle

# External Dependencies

## Core Framework Dependencies
- **React Ecosystem**: React 18+ with modern hooks and concurrent features
- **TanStack Query**: Powerful data fetching and caching library
- **Wouter**: Minimalist router for single-page applications

## UI and Styling
- **Radix UI**: Unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Modern icon library
- **shadcn/ui**: Pre-built component library

## Backend Infrastructure
- **Express.js**: Web application framework for Node.js
- **Drizzle ORM**: TypeScript-first ORM for PostgreSQL
- **Neon Database**: Serverless PostgreSQL hosting
- **Passport.js**: Authentication middleware

## Authentication Services
- **Replit Authentication**: OIDC provider integration
- **OpenID Client**: Standards-compliant authentication flow
- **Session Management**: Secure session storage and management

## Development Tools
- **Vite**: Next-generation frontend build tool
- **TypeScript**: Static type checking and enhanced developer experience
- **Zod**: Schema validation for runtime type safety
- **ESBuild**: Fast JavaScript bundler for production builds

## Replit-Specific Integrations
- **Replit Auth**: Platform-native authentication system
- **Replit Deployment**: Integrated hosting and deployment pipeline
- **Development Plugins**: Enhanced development experience with error overlays and debugging tools