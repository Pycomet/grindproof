# Testing Guide

This directory contains all tests for the Grindproof project.

## Test Structure

```
src/__tests__/
├── setup.ts                    # Global test setup
├── unit/                       # Unit tests
│   └── schemas/               # Zod schema validation tests
├── integration/               # Integration tests
│   └── routers/               # tRPC router tests
└── utils/                     # Test utilities
    ├── test-utils.tsx         # React testing utilities
    └── trpc-test-utils.ts     # tRPC testing utilities
```

## Running Tests

```bash
# Run tests in watch mode (development)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Types

### Unit Tests
- **Location**: `src/__tests__/unit/`
- **Purpose**: Test individual functions, schemas, and utilities in isolation
- **Examples**: Zod schema validation, utility functions

### Integration Tests
- **Location**: `src/__tests__/integration/`
- **Purpose**: Test how different parts work together
- **Examples**: tRPC router procedures with mocked database

## Writing Tests

### Testing tRPC Routers

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

describe("My Router", () => {
  let mockDb: any;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(() => {
    // Setup mocks
    mockDb = createMockSupabaseClient();
    caller = createTestCaller({ db: mockDb });
  });

  it("should do something", async () => {
    // Mock database response
    mockDb.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const result = await caller.myRouter.myProcedure();
    expect(result).toBeDefined();
  });
});
```

### Testing React Components

```typescript
import { render, screen } from "@/__tests__/utils/test-utils";
import MyComponent from "@/components/MyComponent";

describe("MyComponent", () => {
  it("should render", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

## Mocking

### Supabase Client
The Supabase client is automatically mocked in router tests. Use `createMockSupabaseClient()` or mock `@/lib/supabase/server` directly.

### tRPC Context
Use `createTestCaller()` with a custom context to inject mocked dependencies.

### Dashboard Component Mocks
For tests that render the Dashboard component, use the shared dashboard mocks to avoid duplication:

```typescript
import { useNotificationsMock, useOfflineSyncMock } from '@/__tests__/helpers/dashboard-mocks';

// At the top level of your test file
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => useNotificationsMock,
}));

vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => useOfflineSyncMock,
}));
```

For tests that need isolated mock instances (to avoid state leakage), use the factory functions:

```typescript
import { createUseNotificationsMock, createUseOfflineSyncMock } from '@/__tests__/helpers/dashboard-mocks';

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => createUseNotificationsMock(),
}));
```

See `src/__tests__/helpers/dashboard-mocks.ts` for more details.

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Use descriptive names**: Test names should clearly describe what they test
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock external dependencies**: Don't hit real databases or APIs
5. **Test edge cases**: Include error cases and boundary conditions
6. **Keep tests fast**: Unit tests should run quickly

## Coverage Goals

- **Unit tests**: 80%+ coverage for schemas and utilities
- **Integration tests**: Cover all router procedures
- **Component tests**: Test user interactions and rendering

## Troubleshooting

### Tests not finding modules
- Check `vitest.config.ts` path aliases match `tsconfig.json`
- Ensure `@/` alias is properly configured

### Mock not working
- Verify mocks are set up in `beforeEach`
- Check that mocks are imported before the module being tested

### Type errors
- Ensure test files use `.test.ts` or `.spec.ts` extension
- Check that TypeScript can resolve path aliases

