import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Landing Page Footer", () => {
  it("should render footer with legal links", () => {
    render(<Home />);

    // Check for footer element
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
  });

  it("should display copyright notice with current year", () => {
    render(<Home />);

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} GrindProof. All rights reserved.`)).toBeInTheDocument();
  });

  it("should have Privacy Policy link", () => {
    render(<Home />);

    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });

  it("should have Terms of Use link", () => {
    render(<Home />);

    const termsLink = screen.getByRole("link", { name: "Terms of Use" });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", "/terms");
  });

  it("should have contact email link", () => {
    render(<Home />);

    const contactLink = screen.getByRole("link", { name: "Contact" });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute("href", "mailto:support@grindproof.co");
  });

  it("should have proper link styling classes", () => {
    render(<Home />);

    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
    expect(privacyLink).toHaveClass("text-zinc-600");
    expect(privacyLink).toHaveClass("hover:text-zinc-900");
  });

  it("should display bullet separators between links", () => {
    const { container } = render(<Home />);

    const footer = container.querySelector("footer");
    expect(footer?.textContent).toContain("•");
  });

  it("should be responsive with proper flexbox layout", () => {
    const { container } = render(<Home />);

    const footer = container.querySelector("footer");
    const footerContent = footer?.querySelector(".flex");
    expect(footerContent).toHaveClass("flex-col");
    expect(footerContent).toHaveClass("sm:flex-row");
  });

  it("should have all legal links in correct order", () => {
    render(<Home />);

    const links = screen.getAllByRole("link");
    const legalLinks = links.filter(link => 
      link.textContent === "Privacy Policy" || 
      link.textContent === "Terms of Use" || 
      link.textContent === "Contact"
    );

    expect(legalLinks.length).toBe(3);
    expect(legalLinks[0]).toHaveTextContent("Privacy Policy");
    expect(legalLinks[1]).toHaveTextContent("Terms of Use");
    expect(legalLinks[2]).toHaveTextContent("Contact");
  });

  it("should have backdrop blur styling", () => {
    const { container } = render(<Home />);

    const footer = container.querySelector("footer");
    expect(footer).toHaveClass("backdrop-blur-sm");
  });

  it("should have proper border styling", () => {
    const { container } = render(<Home />);

    const footer = container.querySelector("footer");
    expect(footer).toHaveClass("border-t");
    expect(footer).toHaveClass("border-zinc-200");
    expect(footer).toHaveClass("dark:border-zinc-800");
  });
});

