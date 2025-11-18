import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TermsOfUsePage from "@/app/terms/page";

describe("Terms of Use Page", () => {
  it("should render the page with title and last updated date", () => {
    render(<TermsOfUsePage />);

    expect(screen.getByText("Terms of Use")).toBeInTheDocument();
    expect(screen.getByText(/Last Updated:/)).toBeInTheDocument();
  });

  it("should render table of contents with all sections", () => {
    render(<TermsOfUsePage />);

    expect(screen.getByText("Table of Contents")).toBeInTheDocument();
    expect(screen.getAllByText("1. Acceptance of Terms")).toHaveLength(2); // TOC + Section
    expect(screen.getAllByText("2. Description of Service")).toHaveLength(2);
    expect(screen.getAllByText("3. Eligibility")).toHaveLength(2);
    expect(screen.getAllByText("4. Account Registration and Security")).toHaveLength(2);
    expect(screen.getAllByText("5. Acceptable Use Policy")).toHaveLength(2);
    expect(screen.getAllByText("6. User Content")).toHaveLength(2);
    expect(screen.getAllByText("7. Intellectual Property Rights")).toHaveLength(2);
    expect(screen.getAllByText("8. Third-Party Integrations")).toHaveLength(2);
    expect(screen.getAllByText("9. Termination")).toHaveLength(2);
    expect(screen.getAllByText("10. Disclaimers")).toHaveLength(2);
    expect(screen.getAllByText("11. Limitation of Liability")).toHaveLength(2);
  });

  it("should have working anchor links in table of contents", () => {
    render(<TermsOfUsePage />);

    const acceptanceLink = screen.getByRole("link", { name: "1. Acceptance of Terms" });
    expect(acceptanceLink).toHaveAttribute("href", "#acceptance");

    const contactLink = screen.getByRole("link", { name: "17. Contact Information" });
    expect(contactLink).toHaveAttribute("href", "#contact");
  });

  it("should link to Privacy Policy", () => {
    render(<TermsOfUsePage />);

    const privacyLinks = screen.getAllByRole("link", { name: /Privacy Policy/ });
    expect(privacyLinks.length).toBeGreaterThan(0);
    expect(privacyLinks[0]).toHaveAttribute("href", "/privacy");
  });

  it("should display service description with key features", () => {
    render(<TermsOfUsePage />);

    expect(screen.getByText(/Track daily tasks, goals, and routines/)).toBeInTheDocument();
    expect(screen.getByText(/Integrate with GitHub/)).toBeInTheDocument();
    expect(screen.getByText(/Integrate with Google Calendar/)).toBeInTheDocument();
    expect(screen.getByText(/Progressive Web App/)).toBeInTheDocument();
  });

  it("should state age requirement (13+)", () => {
    render(<TermsOfUsePage />);

    expect(screen.getByText(/Be at least 13 years of age/)).toBeInTheDocument();
  });

  it("should display acceptable use policy", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("5. Acceptable Use Policy")).toHaveLength(2);
    expect(screen.getByText(/Violate any applicable laws/)).toBeInTheDocument();
    expect(screen.getByText(/Interfere with or disrupt the Service/)).toBeInTheDocument();
  });

  it("should display disclaimers in prominent format", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("10. Disclaimers")).toHaveLength(2);
    expect(screen.getByText(/AS IS/)).toBeInTheDocument();
    expect(screen.getByText(/AS AVAILABLE/)).toBeInTheDocument();
  });

  it("should display limitation of liability", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("11. Limitation of Liability")).toHaveLength(2);
    expect(screen.getByText(/INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL/)).toBeInTheDocument();
  });

  it("should mention termination conditions", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("9. Termination")).toHaveLength(2);
    expect(screen.getByText(/9.1 Termination by You/)).toBeInTheDocument();
    expect(screen.getByText(/9.2 Termination by Us/)).toBeInTheDocument();
  });

  it("should display intellectual property section", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("7. Intellectual Property Rights")).toHaveLength(2);
    expect(screen.getAllByText(/GrindProof/).length).toBeGreaterThan(0);
  });

  it("should mention third-party integrations", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("8. Third-Party Integrations")).toHaveLength(2);
    expect(screen.getByText(/GitHub and Google Calendar/)).toBeInTheDocument();
  });

  it("should have contact email", () => {
    render(<TermsOfUsePage />);

    const contactLinks = screen.getAllByRole("link", { name: /support@grindproof.co/ });
    expect(contactLinks.length).toBeGreaterThan(0);
    expect(contactLinks[0]).toHaveAttribute("href", "mailto:support@grindproof.co");
  });

  it("should have navigation links", () => {
    render(<TermsOfUsePage />);

    const privacyLink = screen.getByRole("link", { name: /← Privacy Policy/ });
    expect(privacyLink).toHaveAttribute("href", "/privacy");

    const homeLink = screen.getByRole("link", { name: /Back to Home →/ });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("should mention dispute resolution", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("15. Dispute Resolution")).toHaveLength(2);
    expect(screen.getByText(/15.1 Informal Resolution/)).toBeInTheDocument();
    expect(screen.getByText(/15.2 Binding Arbitration/)).toBeInTheDocument();
  });

  it("should have user content section", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("6. User Content")).toHaveLength(2);
    expect(screen.getByText(/6.1 Your Content/)).toBeInTheDocument();
    expect(screen.getByText(/You retain all ownership rights/)).toBeInTheDocument();
  });

  it("should have proper section IDs for anchor navigation", () => {
    const { container } = render(<TermsOfUsePage />);

    expect(container.querySelector("#acceptance")).toBeInTheDocument();
    expect(container.querySelector("#description")).toBeInTheDocument();
    expect(container.querySelector("#eligibility")).toBeInTheDocument();
    expect(container.querySelector("#contact")).toBeInTheDocument();
  });

  it("should display acknowledgment box", () => {
    render(<TermsOfUsePage />);

    expect(screen.getByText("Acknowledgment")).toBeInTheDocument();
    expect(screen.getByText(/BY USING THE SERVICE/)).toBeInTheDocument();
  });

  it("should mention governing law", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("14. Governing Law")).toHaveLength(2);
    expect(screen.getByText(/United States/)).toBeInTheDocument();
  });

  it("should have indemnification clause", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("12. Indemnification")).toHaveLength(2);
    expect(screen.getByText(/defend, indemnify, and hold harmless/)).toBeInTheDocument();
  });

  it("should be accessible with proper heading hierarchy", () => {
    const { container } = render(<TermsOfUsePage />);

    const h1 = container.querySelector("h1");
    expect(h1).toHaveTextContent("Terms of Use");

    const h2Elements = container.querySelectorAll("h2");
    expect(h2Elements.length).toBeGreaterThan(0);
  });

  it("should display general provisions", () => {
    render(<TermsOfUsePage />);

    expect(screen.getAllByText("16. General Provisions")).toHaveLength(2);
    expect(screen.getByText(/16.1 Entire Agreement/)).toBeInTheDocument();
    expect(screen.getByText(/16.2 Severability/)).toBeInTheDocument();
  });
});

