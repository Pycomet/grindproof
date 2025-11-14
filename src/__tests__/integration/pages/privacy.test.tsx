import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPolicyPage from "@/app/privacy/page";

describe("Privacy Policy Page", () => {
  it("should render the page with title and last updated date", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText(/Last Updated:/)).toBeInTheDocument();
  });

  it("should render table of contents with all sections", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText("Table of Contents")).toBeInTheDocument();
    expect(screen.getAllByText("1. Introduction")).toHaveLength(2); // TOC + Section
    expect(screen.getAllByText("2. Information We Collect")).toHaveLength(2);
    expect(screen.getAllByText("3. How We Use Your Information")).toHaveLength(2);
    expect(screen.getAllByText("4. Data Storage and Security")).toHaveLength(2);
    expect(screen.getAllByText("5. Third-Party Services")).toHaveLength(2);
    expect(screen.getAllByText("6. Your Rights")).toHaveLength(2);
    expect(screen.getAllByText("7. Cookies and Local Storage")).toHaveLength(2);
    expect(screen.getAllByText("8. Children's Privacy")).toHaveLength(2);
    expect(screen.getAllByText("9. Changes to This Policy")).toHaveLength(2);
    expect(screen.getAllByText("10. Contact Us")).toHaveLength(2);
  });

  it("should have working anchor links in table of contents", () => {
    render(<PrivacyPolicyPage />);

    const introductionLink = screen.getByRole("link", { name: "1. Introduction" });
    expect(introductionLink).toHaveAttribute("href", "#introduction");

    const contactLink = screen.getByRole("link", { name: "10. Contact Us" });
    expect(contactLink).toHaveAttribute("href", "#contact");
  });

  it("should display all main sections", () => {
    render(<PrivacyPolicyPage />);

    // Check for section headers (appear in both TOC and content)
    expect(screen.getAllByText("1. Introduction")).toHaveLength(2);
    expect(screen.getAllByText("2. Information We Collect")).toHaveLength(2);
    expect(screen.getAllByText("3. How We Use Your Information")).toHaveLength(2);
    expect(screen.getAllByText("10. Contact Us")).toHaveLength(2);
  });

  it("should mention key data collection types", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText(/Account Information/)).toBeInTheDocument();
    expect(screen.getByText(/Task and Goal Data/)).toBeInTheDocument();
    expect(screen.getByText(/GitHub Integration/)).toBeInTheDocument();
    expect(screen.getByText(/Google Calendar Integration/)).toBeInTheDocument();
  });

  it("should mention third-party services", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getAllByText(/Supabase/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GitHub/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Google Calendar/).length).toBeGreaterThan(0);
  });

  it("should display user rights information", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText(/6.1 General Rights/)).toBeInTheDocument();
    expect(screen.getByText(/Access:/)).toBeInTheDocument();
    expect(screen.getByText(/Correction:/)).toBeInTheDocument();
    expect(screen.getByText(/Deletion:/)).toBeInTheDocument();
    expect(screen.getByText(/Data Portability:/)).toBeInTheDocument();
  });

  it("should mention GDPR and CCPA rights", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText(/6.2 GDPR Rights/)).toBeInTheDocument();
    expect(screen.getByText(/6.3 CCPA Rights/)).toBeInTheDocument();
  });

  it("should display children's privacy policy (13+)", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getAllByText(/8. Children's Privacy/)).toHaveLength(2);
    expect(screen.getByText(/13 years old/)).toBeInTheDocument();
  });

  it("should have contact email", () => {
    render(<PrivacyPolicyPage />);

    const contactLinks = screen.getAllByRole("link", { name: /support@grindproof.com/ });
    expect(contactLinks.length).toBeGreaterThan(0);
    expect(contactLinks[0]).toHaveAttribute("href", "mailto:support@grindproof.com");
  });

  it("should have navigation links", () => {
    render(<PrivacyPolicyPage />);

    const backToHomeLinks = screen.getAllByRole("link", { name: /Back to Home/ });
    expect(backToHomeLinks.length).toBeGreaterThan(0);
    expect(backToHomeLinks[0]).toHaveAttribute("href", "/");

    const termsLink = screen.getByRole("link", { name: /Terms of Use →/ });
    expect(termsLink).toHaveAttribute("href", "/terms");
  });

  it("should have external links with proper attributes", () => {
    render(<PrivacyPolicyPage />);

    // Check Supabase privacy link
    const supabaseLink = screen.getByRole("link", { name: /https:\/\/supabase.com\/privacy/ });
    expect(supabaseLink).toHaveAttribute("target", "_blank");
    expect(supabaseLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should mention cookies and local storage", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getAllByText(/7. Cookies and Local Storage/)).toHaveLength(2);
    expect(screen.getByText(/Essential Cookies:/)).toBeInTheDocument();
    expect(screen.getByText(/Local Storage:/)).toBeInTheDocument();
  });

  it("should have proper section IDs for anchor navigation", () => {
    const { container } = render(<PrivacyPolicyPage />);

    expect(container.querySelector("#introduction")).toBeInTheDocument();
    expect(container.querySelector("#information-we-collect")).toBeInTheDocument();
    expect(container.querySelector("#how-we-use")).toBeInTheDocument();
    expect(container.querySelector("#contact")).toBeInTheDocument();
  });

  it("should be accessible with proper heading hierarchy", () => {
    const { container } = render(<PrivacyPolicyPage />);

    const h1 = container.querySelector("h1");
    expect(h1).toHaveTextContent("Privacy Policy");

    const h2Elements = container.querySelectorAll("h2");
    expect(h2Elements.length).toBeGreaterThan(0);
  });

  it("should mention data security measures", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText(/Encryption of data in transit/)).toBeInTheDocument();
    expect(screen.getByText(/Encryption of sensitive data at rest/)).toBeInTheDocument();
  });
});

