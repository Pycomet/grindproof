import "@testing-library/jest-dom";

// Mock server-only package (no-op in tests)
vi.mock("server-only", () => ({}));

// Suppress console.error output in tests unless explicitly needed.
// Individual tests can spy on console.error to assert it was called.
vi.spyOn(console, "error").mockImplementation(() => {});
