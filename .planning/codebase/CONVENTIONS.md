# Coding Conventions

**Analysis Date:** 2026-01-23

## Naming Patterns

**Files:**
- TypeScript/React files: `camelCase.ts`, `camelCase.tsx` (e.g., `use-permissions.tsx`, `inventory-stock.ts`)
- API routes: Named `route.ts` in directory structure (e.g., `/src/app/api/inventory-items/stock-check/route.ts`)
- Component files: `camelCase.tsx` for React components (e.g., `auth-provider.tsx`, `sidebar.tsx`)
- Utility/service files: `camelCase.ts` for business logic (e.g., `invoice-service.ts`, `permissions.ts`)
- Test files: `*.test.ts` or `*.spec.ts` (e.g., `inventory-items.test.ts`, `handover.test.ts`)

**Functions:**
- Regular functions: `camelCase` (e.g., `hasPermission()`, `checkInventoryItemStock()`)
- React hooks: `useNamePattern` (e.g., `usePermissions()`, `useAutoSync()`)
- Async functions: Same camelCase naming convention (e.g., `fetchPermissions()`, `deductInventoryStock()`)
- Helper/utility functions: `camelCase` with descriptive names (e.g., `getTodayStart()`, `logAuditAction()`)

**Variables:**
- Local variables: `camelCase` (e.g., `currentStock`, `availableQuantity`, `userPermissions`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `PERMISSIONS`, `PERMISSION_CATEGORIES`, `DEFAULT_ROLES`)
- Boolean variables: Prefix with `is` or `has` or `can` (e.g., `isSuperAdmin`, `hasRecipe`, `canFulfill`)
- React state variables: `camelCase` via `useState()` (e.g., `const [permissions, setPermissions]`)

**Types:**
- Interfaces: `PascalCase` (e.g., `PermissionDefinition`, `StockCheckResult`, `AuthProviderProps`)
- Type aliases: `PascalCase` (e.g., `PermissionsContextType`)
- Generic parameters: Single letter or `PascalCase` (e.g., `T`, `ReactNode`)
- Enum-like objects: Keys as `UPPER_SNAKE_CASE` (e.g., `status === "OPEN" || status === "CLOSED"`)

**Routes and Paths:**
- API route prefixes: Lower-case kebab-case (e.g., `/api/inventory-items`, `/api/stock-check`)
- Page routes: Lower-case kebab-case with dynamic segments in brackets (e.g., `/dashboard`, `/orders/[id]`)
- URL parameters: Snake case in environment/configuration (e.g., `?callbackUrl=`, `?expired=true`)

## Code Style

**Formatting:**
- No explicit formatter configuration detected (.prettierrc not present)
- Indentation: 2 spaces (observed throughout codebase)
- String quotes: Double quotes preferred in most files, single quotes in JSX (e.g., `"use client"`)
- Line length: No explicit limit detected, but generally kept reasonable

**Linting:**
- Next.js default ESLint configuration (no custom .eslintrc found)
- TypeScript strict mode is OFF: `"strict": false` in `tsconfig.json` (line 7)
- Build-time TypeScript errors are ignored: `typescript.ignoreBuildErrors: true` in `next.config.js`
- Note: This permissive TypeScript setup should be monitored for type safety issues

## Import Organization

**Order:**
1. External packages (e.g., `next-auth`, `@prisma/client`, `react`)
2. Next.js modules (e.g., `next/server`, `next/navigation`)
3. Absolute imports using `@/` path alias (e.g., `@/lib/db`, `@/lib/permissions`)
4. Type imports for interfaces (implicit in same file or from explicit type files)

**Path Aliases:**
- `@/` maps to `./src/` (configured in `tsconfig.json` line 23)
- Used consistently throughout: `@/lib/`, `@/components/`, `@/hooks/`, `@/app/`, etc.

**Example import structure:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
```

## Error Handling

**Patterns:**
- Try-catch blocks for async operations in API routes and services
- NextResponse.json() with status codes for HTTP errors (e.g., `401`, `403`)
- Error messages in Romanian for user-facing errors (e.g., "Neautorizat", "Nu ai permisiunea necesară")
- Validation errors return structured response with error field: `{ error: "message" }`
- Success responses wrapped in `{ success: true, data: {...} }` or `{ success: true, message: "..." }`

**Example from `src/app/api/inventory-items/stock-check/route.ts`:**
```typescript
try {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const canView = await hasPermission(session.user.id, "inventory.view");
  if (!canView) {
    return NextResponse.json({ error: "Nu ai permisiunea necesară" }, { status: 403 });
  }

  // Process business logic
  return NextResponse.json({ success: true, data: {...} });
} catch (error) {
  // Handle error
}
```

**Failure scenarios:**
- Non-existent resources: Return structured error with `success: false` or return error message
- Business logic failures: Return `{ success: false, error: "descriptive message" }`
- Database operations: Wrap in try-catch, log to console with `console.error()`

## Logging

**Framework:** `console` (no dedicated logging library detected)

**Patterns:**
- Info/debug: `console.log()` with descriptive messages
- Errors: `console.error()` when catching exceptions
- Comments indicate logging intent in Romanian (e.g., "// Loghează o acțiune în audit log")

**Example from `src/lib/permissions.ts`:**
```typescript
// Function has JSDoc describing logging behavior:
/**
 * Loghează o acțiune în audit log
 */
export async function logAuditAction(params: {...}): Promise<void> {
  await prisma.auditLog.create({...});
}
```

## Comments

**When to Comment:**
- JSDoc blocks for exported functions and interfaces (used extensively)
- Inline comments for complex business logic (Romanian language used)
- Section separators for logical grouping (e.g., `// ==========================================`)
- Comments explain "why", not "what" (code should be self-documenting)

**JSDoc/TSDoc:**
- All exported functions include JSDoc blocks with description
- Function parameters may include brief descriptions
- Return types documented implicitly through TypeScript types
- Example from `src/lib/permissions.ts`:
```typescript
/**
 * Verifică dacă un utilizator are o permisiune specifică
 */
export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  // Implementation
}
```

**Romanian Language:**
- Comments and documentation in Romanian (user-facing strings, permission descriptions, business logic)
- Code identifiers remain in English

## Function Design

**Size:** Functions range from 5 lines (simple checks) to 50+ lines (complex business logic)
- Prefer extraction of sub-logic into separate helper functions
- Async functions typically contain setup, validation, and database queries

**Parameters:**
- Single objects for multiple related parameters (destructuring preferred)
- Optional parameters use TypeScript `?` syntax
- No use of `any` type when possible (though strict mode is off)

**Return Values:**
- Async functions return `Promise<T>` with explicit types
- Database queries return Prisma types or custom interfaces
- API routes return `NextResponse` with status codes
- Business logic functions return structured objects: `{ success: boolean, data?: T, error?: string }`

**Example structure:**
```typescript
export async function checkInventoryItemStock(
  itemId: string,
  quantity: number
): Promise<StockCheckResult> {
  // Validation
  // Database query
  // Processing
  // Return structured result
}
```

## Module Design

**Exports:**
- Named exports for functions and interfaces: `export function ...`, `export interface ...`
- Default exports rare; typically used for configuration objects
- Constants exported as named exports

**Barrel Files:**
- Not heavily used; direct imports from specific files preferred
- Example: Import directly from `@/lib/permissions.ts`, not through a barrel

**Module Organization:**
- Each module has single responsibility (utility, service, component, hook, etc.)
- Related constants and types co-located with primary function
- Interfaces/types defined at top of file before implementations

## React Patterns

**Client Components:**
- Marked with `"use client"` directive (e.g., `src/components/auth-provider.tsx`, `src/hooks/use-permissions.tsx`)
- Use React Context for state management (e.g., `PermissionsContext`)
- Hooks follow naming pattern `use*` (e.g., `usePermissions()`, `useAutoSync()`)

**Props Typing:**
- Explicit interface definitions for component props (e.g., `interface AuthProviderProps`)
- Props interfaces include JSDoc for complex props
- React built-in types used (e.g., `ReactNode`)

**State Management:**
- React Context + `useState` for permissions and UI state
- No Redux or other state libraries detected
- Session management via `next-auth` SessionProvider

## Configuration Files

**TypeScript Configuration (`tsconfig.json`):**
- Target: ES2017
- Module: ESNext
- JSX: preserve (Next.js handles JSX)
- Strict mode: OFF (`"strict": false`)
- Path aliases configured for `@/*` -> `./src/*`

**Next.js Configuration (`next.config.js`):**
- Prisma client externalized for server components
- TypeScript build errors ignored (temporary, marked for removal)
- Remote image patterns configured for Shopify CDN and Trendyol CDN

---

*Convention analysis: 2026-01-23*
