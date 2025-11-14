import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "@/app/auth/signup/page";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}));

describe("Signup Page - Terms Consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render signup form with consent checkbox", () => {
    render(<SignupPage />);

    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /I agree to the/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  it("should have consent checkbox unchecked by default", () => {
    render(<SignupPage />);

    const checkbox = screen.getByRole("checkbox", { name: /I agree to the/i });
    expect(checkbox).not.toBeChecked();
  });

  it("should have required attribute on consent checkbox", () => {
    render(<SignupPage />);

    const checkbox = screen.getByRole("checkbox", { name: /I agree to the/i });
    expect(checkbox).toBeRequired();
  });

  it("should display links to Terms of Use and Privacy Policy in consent text", () => {
    render(<SignupPage />);

    const termsLink = screen.getByRole("link", { name: /Terms of Use/i });
    const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i });

    expect(termsLink).toBeInTheDocument();
    expect(privacyLink).toBeInTheDocument();
  });

  it("should have correct hrefs for legal document links", () => {
    render(<SignupPage />);

    const termsLink = screen.getByRole("link", { name: /Terms of Use/i });
    const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i });

    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });

  it("should open legal links in new tab", () => {
    render(<SignupPage />);

    const termsLink = screen.getByRole("link", { name: /Terms of Use/i });
    const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i });

    expect(termsLink).toHaveAttribute("target", "_blank");
    expect(termsLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(privacyLink).toHaveAttribute("target", "_blank");
    expect(privacyLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should disable submit button when consent is not given", () => {
    render(<SignupPage />);

    const submitButton = screen.getByRole("button", { name: /sign up/i });
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button when consent checkbox is checked", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const checkbox = screen.getByRole("checkbox", { name: /I agree to the/i });
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    expect(submitButton).toBeDisabled();

    await user.click(checkbox);

    expect(submitButton).toBeEnabled();
  });

  it("should disable submit button again when consent is unchecked", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const checkbox = screen.getByRole("checkbox", { name: /I agree to the/i });
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    await user.click(checkbox);
    expect(submitButton).toBeEnabled();

    await user.click(checkbox);
    expect(submitButton).toBeDisabled();
  });

  it("should have proper styling for consent checkbox section", () => {
    const { container } = render(<SignupPage />);

    const checkboxContainer = container.querySelector('input[type="checkbox"]')?.parentElement;
    expect(checkboxContainer).toHaveClass("flex");
    expect(checkboxContainer).toHaveClass("items-start");
    expect(checkboxContainer).toHaveClass("gap-3");
  });

  it("should have underlined links in consent text", () => {
    render(<SignupPage />);

    const termsLink = screen.getByRole("link", { name: /Terms of Use/i });
    const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i });

    expect(termsLink).toHaveClass("underline");
    expect(privacyLink).toHaveClass("underline");
  });

  it("should display consent text with proper formatting", () => {
    render(<SignupPage />);

    const label = screen.getByText(/I agree to the/i);
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass("text-sm");
  });

  it("should position consent checkbox between password and submit button", () => {
    render(<SignupPage />);

    const passwordInput = screen.getByLabelText(/password/i);
    const checkbox = screen.getByRole("checkbox", { name: /I agree to the/i });
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    // All elements should be present
    expect(passwordInput).toBeInTheDocument();
    expect(checkbox).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
    
    // Check visual order by comparing DOM positions
    const passwordPosition = passwordInput.compareDocumentPosition(checkbox);
    const checkboxPosition = checkbox.compareDocumentPosition(submitButton);
    
    // DOCUMENT_POSITION_FOLLOWING (4) means the other node comes after
    expect(passwordPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(checkboxPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("should maintain checkbox state during form interaction", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const emailInput = screen.getByRole("textbox", { name: /email/i });
    const checkbox = screen.getByRole("checkbox", { name: /I agree to the/i });

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.type(emailInput, "test@example.com");
    expect(checkbox).toBeChecked();
  });

  it("should have accessible label for checkbox", () => {
    render(<SignupPage />);

    const checkbox = screen.getByRole("checkbox", { name: /I agree to the/i });
    const label = checkbox.closest('div')?.querySelector('label');
    
    expect(label).toHaveAttribute("for", "terms");
    expect(checkbox).toHaveAttribute("id", "terms");
  });
});

