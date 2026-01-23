# Technology Stack

**Analysis Date:** 2026-01-23

## Languages

**Primary:**
- TypeScript 5.3.3 - Full application codebase (`src/`)
- JavaScript - Configuration files and scripts

**Secondary:**
- PostgreSQL - Database queries through Prisma

## Runtime

**Environment:**
- Node.js (version not explicitly pinned in package.json)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 14.1.3 - Full-stack application framework (React + Node.js backend)
- React 18.2.0 - UI component library
- React DOM 18.2.0 - DOM rendering

**Database & ORM:**
- Prisma 5.10.2 - Database ORM and schema management
- @prisma/client 5.10.2 - Prisma database client
- PostgreSQL (pg 8.17.1) - Direct PostgreSQL driver

**Authentication & Authorization:**
- next-auth 4.24.7 - Session management and OAuth
- @auth/prisma-adapter 1.4.0 - Prisma adapter for NextAuth
- bcryptjs 2.4.3 - Password hashing
- CredentialsProvider - Custom email/password authentication
- GoogleProvider - Google OAuth integration

**UI Components & Styling:**
- @radix-ui/* (v1.0.x - v2.0.x) - Headless component library for:
  - Accordion, Alert Dialog, Avatar, Checkbox, Collapsible, Dialog
  - Dropdown Menu, Label, Popover, Progress, Scroll Area, Select
  - Separator, Slot, Switch, Tabs, Toast, Tooltip
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- tailwindcss-animate 1.0.7 - Animation utilities
- tailwind-merge 2.2.1 - Utility class merging
- class-variance-authority 0.7.0 - CSS-in-JS variant system
- Lucide React 0.344.0 - Icon library

**Form Handling:**
- React Hook Form 7.51.0 - Form state and validation
- @hookform/resolvers 3.3.4 - Validation schema resolvers
- Zod 3.22.4 - TypeScript-first schema validation

**Data Fetching & State:**
- @tanstack/react-query 5.28.0 - Server state management and caching
- @tanstack/react-table 8.13.2 - Headless table library
- Axios 1.6.7 - HTTP client

**Charts & Visualization:**
- Recharts 2.12.0 - React charting library
- Mermaid 11.4.0 - Diagram rendering (Markdown-based)

**AI Integration:**
- @anthropic-ai/sdk 0.30.1 - Anthropic Claude API client

**File & Document Processing:**
- ExcelJS 4.4.0 - Excel file reading/writing
- xlsx 0.18.5 - Spreadsheet manipulation
- pdf-lib 1.17.1 - PDF manipulation
- pdfkit 0.14.0 - PDF generation
- iconv-lite 0.6.3 - Character encoding conversion

**External APIs:**
- googleapis 137.0.0 - Google Drive, Google Sheets API client
- libphonenumber-js 1.10.57 - Phone number validation and formatting

**Utilities:**
- date-fns 3.3.1 - Date manipulation
- uuid 9.0.0 - UUID generation
- clsx 2.1.0 - Conditional className builder
- framer-motion 11.0.8 - Animation library
- cmdk 0.2.1 - Command palette component
- geist 1.2.2 - Font family
- next-themes 0.2.1 - Dark mode theme management

## Testing

**Test Runner:**
- Vitest 4.0.17 - Fast unit test framework
- Config: `vitest.config.ts`

**Assertion & Utilities:**
- @testing-library/react 16.3.1 - React component testing
- @testing-library/jest-dom 6.9.1 - Custom DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation
- jsdom 27.4.0 - DOM implementation for Node.js

## Build & Dev Tools

**Build:**
- Next.js Build System (integrated)
- TypeScript compilation

**Dev Server:**
- Next.js Dev Server - `npm run dev`

**Linting:**
- next lint - ESLint configuration via Next.js

**Code Generation:**
- Prisma CLI - Database client generation

**Styling:**
- PostCSS 8.4.35 - CSS processing
- autoprefixer 10.4.18 - CSS vendor prefixing
- Tailwind CSS Build

## Configuration

**Environment:**
- Next.js loads from `.env.local`, `.env.development`, `.env.production`
- Railway deployment via `railway.toml`

**Build Configuration:**
- `next.config.js` - Next.js configuration:
  - Experimental server components with Prisma
  - TypeScript error suppression during build
  - Remote image patterns for Shopify CDN and Trendyol CDN
- `tsconfig.json` - TypeScript configuration with path alias `@/*` → `./src/*`
- `tailwind.config.ts` - Tailwind customization
- `vitest.config.ts` - Vitest test configuration with jsdom environment
- `postcss.config.js` - PostCSS configuration for Tailwind

**Key Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXTAUTH_URL` - NextAuth callback URL
- `NEXTAUTH_SECRET` - NextAuth session secret (auto-generated if missing)
- `CRON_SECRET` - Secret for cron job routes
- `UPLOAD_DIR` - Directory for file uploads (default: `./uploads`)
- `NODE_ENV` - Environment (development/production)
- `NEXT_PUBLIC_APP_URL` - Public application URL
- `SESSION_TIMEOUT_MINUTES` - Session timeout in minutes (default: 30)
- `ALLOWED_EMAILS` - Comma-separated list of allowed emails (optional)

## Platform Requirements

**Development:**
- Node.js 18+ (recommended)
- npm or yarn
- PostgreSQL database (local or remote)
- Git

**Production:**
- Node.js 18+
- PostgreSQL database
- 512MB+ RAM minimum
- Railway deployment platform (current setup)

## Deployment

**Current:**
- Railway.app - Platform-as-a-Service deployment
- Configuration: `railway.toml`
  - Build: NIXPACKS builder
  - Dependencies: npm with legacy peer deps
  - Build command: Prisma generate + Next.js build
  - Start command: Force migration script + Next.js start
  - Auto-restart on failure (max 10 retries)

**Build Output:**
- `.next/` directory (generated, not committed)

---

*Stack analysis: 2026-01-23*
