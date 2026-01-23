# Testing Patterns

**Analysis Date:** 2026-01-23

## Test Framework

**Runner:**
- Vitest 4.0.17
- Config: `vitest.config.ts` at project root
- Environment: jsdom (browser-like DOM environment)
- Globals enabled (describe, it, expect available without imports)

**Assertion Library:**
- Vitest built-in expect() API (compatible with Jest)

**Run Commands:**
```bash
npm test                  # Run all tests in watch mode
npm run test:run         # Run all tests once (CI mode)
npm run test:coverage    # Run tests with coverage report
```

**Coverage Reports:**
- Output formats: text (console), json (machine-readable), html (browser view)
- Excludes: node_modules/, src/test/, **/*.d.ts, **/*.config.*, **/types/**
- View coverage: Open generated HTML report in `coverage/` directory

## Test File Organization

**Location:**
- Unit tests co-located with implementation: `src/lib/inventory-stock.test.ts` next to `src/lib/inventory-stock.ts`
- API tests: `src/test/api/inventory-items.test.ts` for API route testing
- Integration tests: `src/tests/` directory (uses real database, excluded from Vitest unit test runs)

**Naming:**
- Unit test files: `*.test.ts` or `*.test.tsx`
- Integration test files: Same pattern but in `src/tests/` directory
- Test suites within files: Grouped by `describe()` blocks

**Structure:**
```
src/
├── lib/
│   ├── inventory-stock.ts         # Implementation
│   └── inventory-stock.test.ts    # Unit tests
├── test/
│   ├── setup.ts                   # Global test setup
│   └── api/
│       └── inventory-items.test.ts # API route tests
└── tests/
    └── handover.test.ts           # Integration tests (real DB)
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/db', () => ({
  default: {
    inventoryItem: { /* ... */ },
  },
}))

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Specific Behavior', () => {
    it('should behave in specific way', async () => {
      // Arrange
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({/* data */})

      // Act
      const result = await checkInventoryItemStock('item-1', 50)

      // Assert
      expect(result.canFulfill).toBe(true)
      expect(result.availableQuantity).toBe(100)
    })
  })
})
```

**Patterns:**
- Setup phase: `beforeEach(() => { vi.clearAllMocks() })` - reset mocks before each test
- Teardown: Automatic via `vi.clearAllMocks()`
- Assertion pattern: Explicit `expect()` calls with clear test names
- Async handling: All async tests use `async () => { await ... }` syntax

**Test naming:**
- Test names describe expected behavior: "should calculate available stock for composite items correctly"
- Names are business-oriented, not technical: Not "should call findMany", but "should calculate..."
- Use "should" prefix for clarity

## Mocking

**Framework:** Vitest `vi` object (similar to Jest)

**Patterns:**
Mocks defined at file top before imports:
```typescript
vi.mock('@/lib/db', () => ({
  default: {
    inventoryItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    // ...
  },
}))

// Import after mocking
import prisma from '@/lib/db'
const mockPrisma = prisma as any
```

From `src/lib/inventory-stock.test.ts`:
```typescript
mockPrisma.inventoryItem.findUnique.mockResolvedValue({
  id: 'item-1',
  sku: 'SKU001',
  name: 'Test Item',
  currentStock: 100,
  isComposite: false,
  recipeComponents: [],
})

const result = await checkInventoryItemStock('item-1', 50)
expect(result.canFulfill).toBe(true)
```

**Sequential mocking:**
```typescript
mockPrisma.inventoryItem.findUnique
  .mockResolvedValueOnce({ /* first call */ })
  .mockResolvedValueOnce({ /* second call */ })
```

**What to Mock:**
- Database access (Prisma client)
- External API calls
- Authentication system (`next-auth`)
- Permission checks (`@/lib/permissions`)
- File system operations (if any)

**What NOT to Mock:**
- Pure business logic functions (calculate, validate, transform)
- Core language features (Array methods, Math, etc.)
- Constants and enums
- Type definitions

**Mock Setup Pattern:**
All test files follow this pattern from `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})
```

## Fixtures and Factories

**Test Data:**
Mock data created inline in tests using object literals:
```typescript
it('should check component stock for composite items', async () => {
  mockPrisma.inventoryItem.findUnique.mockResolvedValue({
    id: 'composite-1',
    sku: 'COMP001',
    name: 'Composite Product',
    currentStock: 0,
    isComposite: true,
    recipeComponents: [
      {
        id: 'rc-1',
        quantity: 2,
        componentItem: {
          id: 'comp-a',
          sku: 'COMP-A',
          name: 'Component A',
          currentStock: 100,
          unit: 'buc',
        },
      },
      // ...
    ],
  })

  const result = await checkInventoryItemStock('composite-1', 10)
  expect(result.availableQuantity).toBe(50)
})
```

**Location:**
- Inline within test files (no separate fixture files currently)
- Data structures mirror Prisma model shapes
- Reusable mock templates created at describe-block scope if needed

**Database seeding:**
- No seeding fixtures in unit tests
- Integration tests in `src/tests/` may use real database (excluded from vitest runs)
- Manual test runs: Use `npm run db:seed` via `prisma/seed.ts`

## Coverage

**Requirements:** Not enforced (no threshold configuration in vitest.config.ts)

**View Coverage:**
```bash
npm run test:coverage
# Generates coverage/ directory with HTML report
# Open coverage/index.html in browser
```

**Current State:**
- Limited coverage observed (3 test files, primarily business logic tests)
- API endpoints and React components largely uncovered
- Integration tests in separate directory (`src/tests/`)

## Test Types

**Unit Tests:**
- **Scope:** Individual functions and modules in isolation
- **Location:** `src/lib/inventory-stock.test.ts`, `src/test/api/inventory-items.test.ts`
- **Approach:** Mock all external dependencies, test pure logic
- **Example:** Testing inventory calculation functions with mocked database

**Integration Tests:**
- **Scope:** Workflow testing with real database
- **Location:** `src/tests/handover.test.ts`
- **Approach:** Real async operations, actual data persistence
- **Note:** Excluded from vitest unit runs (see vitest.config.ts line 12)
- **Execution:** Manual via `npx ts-node src/tests/handover.test.ts`

**E2E Tests:**
- **Framework:** Not detected
- **Status:** Not currently implemented
- **Recommendation:** Consider adding for critical user workflows (order processing, invoice generation)

## Common Patterns

**Async Testing:**
```typescript
it('should deduct stock for individual item', async () => {
  mockPrisma.inventoryItem.findUnique.mockResolvedValue({
    id: 'item-1',
    sku: 'SKU001',
    name: 'Test Item',
    currentStock: 100,
    isComposite: false,
    recipeComponents: [],
  })
  mockPrisma.inventoryItem.update.mockResolvedValue({})
  mockPrisma.inventoryStockMovement.create.mockResolvedValue({})

  const result = await deductInventoryStock('item-1', 30, {
    orderId: 'order-1',
    invoiceId: 'invoice-1',
  })

  expect(result.success).toBe(true)
  expect(result.movements).toHaveLength(1)
  expect(result.movements[0].previousStock).toBe(100)
})
```

**Error Testing:**
```typescript
it('should handle non-existent item', async () => {
  mockPrisma.inventoryItem.findUnique.mockResolvedValue(null)

  const result = await checkInventoryItemStock('non-existent', 1)

  expect(result.canFulfill).toBe(false)
  expect(result.name).toBe('Articol negăsit')
})
```

**Business Logic Testing:**
```typescript
it('should calculate available stock for composite items correctly', () => {
  // No async/mocking needed for pure calculation
  const recipeComponents = [
    { quantity: 2, componentItem: { currentStock: 100 } }, // Can make 50
    { quantity: 3, componentItem: { currentStock: 60 } },  // Can make 20
    { quantity: 1, componentItem: { currentStock: 15 } },  // Can make 15
  ]

  const stockPerComponent = recipeComponents.map(rc => {
    const componentStock = Number(rc.componentItem.currentStock)
    const requiredQty = Number(rc.quantity)
    return Math.floor(componentStock / requiredQty)
  })
  const availableStock = Math.min(...stockPerComponent)

  expect(availableStock).toBe(15)
})
```

**Setup and Teardown:**
All files use explicit beforeEach for mock reset:
```typescript
describe('inventory-stock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Tests here can rely on clean state
})
```

## Manual/Integration Test Pattern

From `src/tests/handover.test.ts`, manual test execution pattern:
```typescript
interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

const results: TestResult[] = []

async function runTest(name: string, testFn: () => Promise<void>) {
  const startTime = Date.now()
  try {
    await testFn()
    results.push({ name, passed: true, duration: Date.now() - startTime })
    console.log(`✅ PASS: ${name}`)
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      error: error.message,
      duration: Date.now() - startTime,
    })
    console.log(`❌ FAIL: ${name}`)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

// Run manual tests
async function runAllTests() {
  await testDateUtilities()
  await testSessionManagement()
  // ... more test categories

  // Print summary
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`)
}
```

## Test Execution Environment

**Vitest Configuration** (`vitest.config.ts`):
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',     // Browser-like DOM
    globals: true,            // Global test functions
    setupFiles: ['./src/test/setup.ts'],  // Shared setup
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'src/tests/**'],  // Integration tests excluded
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', '**/types/**'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

**Global Setup** (`src/test/setup.ts`):
- Imports @testing-library/jest-dom
- Mocks Next.js modules (router, navigation)
- Mocks next-auth
- Mocks global fetch
- Clears mocks before each test

---

*Testing analysis: 2026-01-23*
