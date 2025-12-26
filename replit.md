# Purchase Order Register Application

## Overview

This is a **Purchase Order Register** system built for Iqbal Electronics Co. WLL to track and manage supplier invoices, purchase orders, and multi-currency transactions. The application enables users to:

- Dashboard with real-time KPIs (Stock Available, Total Cash, Monthly Sales, Monthly Purchases), global search across all entities, and low stock alerts
- Create and manage parties (suppliers, customers, and salesmen) and inventory items via Party Master with dropdown for type selection
- Salesman tracking with settlement status and credit limit management
- Record purchase orders with line items
- Track invoice numbers, delivery notes, and TT (Telegraphic Transfer) copies
- Upload supporting documents (invoices, delivery notes, payment proofs)
- Support multi-currency transactions (KWD, AED, USD) with foreign exchange rates
- View monthly purchase statistics and reports
- Filter and search historical purchase orders
- Sales module with IMEI tracking and customer management
- IMEI History module for complete device lifecycle tracking (purchase → stock → sale → return → warranty → transfer)
- Payment module with IN/OUT direction tracking for cash flow
- Returns module with toggle switch between Sale Returns (from customers) and Purchase Returns (to suppliers), including IMEI tracking
- Reports module with Available Stock, Daily Cash Flow, Customer Reports, and Customer Aging Report (0-30, 31-60, 61-90, 90+ day buckets)
- Expenses module with category management and expense tracking
- Accounts module with 5 predefined accounts (Cash, NBK Bank, CBK Bank, Knet, Wamd), account statements, and inter-account transfer functionality
- Automatic daily database backups with 30-day retention and admin-only backup management

The system is designed as an enterprise productivity tool with a focus on efficient data entry workflows and comprehensive purchase tracking.

## Future Enhancements (Phase 2)

### Customer Portal (Planned for Post-Launch)
**Status**: Deferred until after January 2026 go-live
**Reason**: Adding external customer access requires:
- Separate authentication system (current Replit Auth is for staff only)
- Read-only API endpoints with dedicated rate limiting
- Database query optimizations and caching layer (Redis)
- Row-level security or tenant views for data isolation
- Connection pool monitoring and read replicas for high traffic

**Recommendation**: Evaluate 3-6 months after launch once baseline performance is established.

## User Preferences

Preferred communication style: Simple, everyday language.
Always publish the app after any core change.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool

**UI Component System**: 
- **shadcn/ui** components built on Radix UI primitives for accessible, composable UI elements
- **Tailwind CSS** for utility-first styling with a custom design system based on Material Design principles
- **Inter font family** for typography with consistent sizing scale
- Custom CSS variables for theming support (light/dark mode)

**State Management**:
- **TanStack Query (React Query)** for server state management with aggressive caching (`staleTime: Infinity`)
- Local component state using React hooks for form inputs and UI interactions
- No global client-side state management (Redux, Zustand, etc.) - relies on server as source of truth

**Routing**: 
- **Wouter** - lightweight client-side routing library
- Single-page application with minimal routes (home page and 404)

**Form Handling**:
- React Hook Form with Zod schema validation
- Custom form components for line items, file uploads, and currency toggles
- Real-time calculations for totals and foreign exchange conversions

**Key Design Patterns**:
- Component composition with shadcn/ui primitives
- Controlled components for all form inputs
- Optimistic UI updates with React Query mutations
- Toast notifications for user feedback

### Backend Architecture

**Framework**: Express.js on Node.js with TypeScript

**API Design**: 
- RESTful JSON API at `/api/*` endpoints
- CRUD operations for suppliers, items, and purchase orders
- Statistical endpoints for monthly aggregations
- Standard HTTP methods (GET, POST, PUT, DELETE)

**Database Layer**:
- **Drizzle ORM** for type-safe database queries and schema management
- PostgreSQL as the database (configured via `DATABASE_URL` environment variable)
- Schema-first approach with TypeScript type inference from Drizzle schemas
- Migration support via `drizzle-kit`

**Data Models**:
1. **Users** - User accounts with role-based permissions (admin/viewer)
2. **Sessions** - PostgreSQL-backed session storage for authentication
3. **Suppliers** - Simple name-based supplier registry
4. **Items** - Product/inventory items with unique names
5. **Purchase Orders** - Main transaction records with:
   - Purchase date, invoice number, GRN date
   - Supplier relationship (foreign key)
   - Currency fields (KWD totals, FX currency/rate/totals)
   - File paths for document attachments
   - createdBy field for audit trail
6. **Line Items** - Individual purchase items with quantities and prices

**Authentication & Authorization**:
- **Replit Auth (OIDC)** - OpenID Connect integration for user authentication
- **Role-based access control (RBAC)**:
  - Admin role: Can manage suppliers, items, and delete purchase orders
  - Viewer role: Can create purchase orders and view all data
- **First-admin logic**: If no admin users exist, the next new user automatically becomes admin
- **Session management**: PostgreSQL-backed sessions via connect-pg-simple

**File Storage Strategy**:
- Object storage using Google Cloud Storage via `@google-cloud/storage`
- Replit-specific authentication via sidecar endpoint (`http://127.0.0.1:1106`)
- Custom ACL (Access Control List) system for file permissions
- Support for public and private object visibility
- Uppy.js integration for frontend file uploads with direct-to-storage uploads

**Business Logic**:
- Purchase order creation bundles main order + line items in single transaction
- Automatic calculation validation on server side
- File upload handling with path persistence in database
- Monthly statistics aggregation for reporting

**Build & Deployment**:
- esbuild for server-side bundling with selective dependency bundling (allowlist pattern)
- Vite for client-side bundling
- Production mode serves static assets from Express
- Development mode uses Vite middleware with HMR

### External Dependencies

**Cloud Storage**:
- **Google Cloud Storage** - Document storage for invoices, delivery notes, and TT copies
- Uses Replit's sidecar authentication mechanism for GCP credentials
- Requires `REPLIT_SIDECAR_ENDPOINT` environment variable

**Database**:
- **PostgreSQL** - Primary data store
- Requires `DATABASE_URL` environment variable
- Managed via Drizzle ORM with schema migrations

**Third-Party UI Libraries**:
- **Radix UI** - Headless UI component primitives (dialogs, dropdowns, tooltips, etc.)
- **Recharts** - Charting library for monthly statistics visualization
- **Uppy** - File upload library with AWS S3-compatible storage integration
- **Lucide React** - Icon library

**Utilities**:
- **Zod** - Schema validation for API requests and form data
- **date-fns** - Date manipulation (likely used for date formatting)
- **nanoid** - Unique ID generation
- **clsx & tailwind-merge** - Conditional className utilities

**Development Tools**:
- **TypeScript** - Type safety across frontend and backend
- **Vite** - Frontend dev server and build tool
- **tsx** - TypeScript execution for development
- **drizzle-kit** - Database schema management CLI

**Notable Integrations**:
- Replit-specific plugins for development (`@replit/vite-plugin-*`)
- Session management capability (connect-pg-simple for PostgreSQL sessions)
- Multi-file upload support with progress tracking

**Environment Requirements**:
- `DATABASE_URL` - PostgreSQL connection string (required)
- `SESSION_SECRET` - Secret key for session encryption (required for authentication)
- `PUBLIC_OBJECT_SEARCH_PATHS` - Comma-separated paths for public object access (optional)
- Node.js environment with ESM module support