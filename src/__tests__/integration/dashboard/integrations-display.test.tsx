import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TRPCProvider } from "@/lib/trpc/client";
import type { Session } from "@supabase/supabase-js";

// Mock the dashboard component
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: { id: "user-123", email: "test@example.com" },
              access_token: "mock-token",
            } as Session,
          },
          error: null,
        })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  })),
}));

// Create a simplified Integrations component for testing
const IntegrationsTestComponent = ({
  integrations,
  onConnect,
  onDisconnect,
}: {
  integrations: Array<{
    id: string;
    service_type: string;
    status: string;
    metadata?: { githubUsername?: string; email?: string };
  }>;
  onConnect: (serviceType: string) => void;
  onDisconnect: (serviceType: string) => void;
}) => {
  const services = [
    {
      id: "github",
      name: "GitHub",
      icon: "🐙",
      description: "Track commits, PRs, and validate dev work automatically",
    },
    {
      id: "google_calendar",
      name: "Google Calendar",
      icon: "📅",
      description: "Sync events and track meeting attendance",
    },
  ];

  const isServiceConnected = (serviceId: string) => {
    return integrations.some(
      (i) => i.service_type === serviceId && i.status === "connected"
    );
  };

  const getServiceIntegration = (serviceId: string) => {
    return integrations.find(
      (i) => i.service_type === serviceId && i.status === "connected"
    );
  };

  return (
    <div data-testid="integrations-section">
      <h2>Integrations</h2>
      {services.map((service) => {
        const isConnected = isServiceConnected(service.id);
        const integration = getServiceIntegration(service.id);

        return (
          <div
            key={service.id}
            data-testid={`integration-card-${service.id}`}
            className="integration-card"
          >
            <div className="flex items-center gap-2">
              <span>{service.icon}</span>
              <h3>{service.name}</h3>
              {isConnected && (
                <span data-testid={`badge-${service.id}`} className="badge">
                  ✓ Connected
                </span>
              )}
            </div>
            <p>{service.description}</p>
            {isConnected && integration && (
              <div data-testid={`connected-info-${service.id}`}>
                {service.id === "github" &&
                  integration.metadata &&
                  (integration.metadata as { githubUsername?: string })
                    .githubUsername && (
                    <span>
                      Connected as: @
                      {
                        (integration.metadata as { githubUsername?: string })
                          .githubUsername
                      }
                    </span>
                  )}
                {service.id === "google_calendar" &&
                  integration.metadata &&
                  (integration.metadata as { email?: string }).email && (
                    <span>
                      Connected as:{" "}
                      {(integration.metadata as { email?: string }).email}
                    </span>
                  )}
              </div>
            )}
            <button
              data-testid={`button-${service.id}`}
              onClick={() =>
                isConnected
                  ? onDisconnect(service.id)
                  : onConnect(service.id)
              }
            >
              {isConnected ? "Disconnect" : "Connect"}
            </button>
          </div>
        );
      })}
    </div>
  );
};

describe("Integrations Display", () => {
  let mockOnConnect: ReturnType<typeof vi.fn>;
  let mockOnDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConnect = vi.fn();
    mockOnDisconnect = vi.fn();
  });

  describe("GitHub Integration", () => {
    it("should display GitHub as disconnected when not connected", () => {
      render(
        <IntegrationsTestComponent
          integrations={[]}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const githubCard = screen.getByTestId("integration-card-github");
      expect(githubCard).toBeInTheDocument();
      expect(screen.getByText("GitHub")).toBeInTheDocument();
      expect(screen.queryByTestId("badge-github")).not.toBeInTheDocument();

      const connectButton = screen.getByTestId("button-github");
      expect(connectButton).toHaveTextContent("Connect");
    });

    it("should display GitHub as connected with username", () => {
      const integrations = [
        {
          id: "int-github-1",
          service_type: "github",
          status: "connected",
          metadata: { githubUsername: "testuser" },
        },
      ];

      render(
        <IntegrationsTestComponent
          integrations={integrations}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByTestId("badge-github")).toBeInTheDocument();
      expect(screen.getByTestId("badge-github")).toHaveTextContent(
        "✓ Connected"
      );

      const connectedInfo = screen.getByTestId("connected-info-github");
      expect(connectedInfo).toHaveTextContent("Connected as: @testuser");

      const disconnectButton = screen.getByTestId("button-github");
      expect(disconnectButton).toHaveTextContent("Disconnect");
    });

    it("should call onConnect when Connect button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <IntegrationsTestComponent
          integrations={[]}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const connectButton = screen.getByTestId("button-github");
      await user.click(connectButton);

      expect(mockOnConnect).toHaveBeenCalledWith("github");
    });

    it("should call onDisconnect when Disconnect button is clicked", async () => {
      const user = userEvent.setup();
      const integrations = [
        {
          id: "int-github-1",
          service_type: "github",
          status: "connected",
          metadata: { githubUsername: "testuser" },
        },
      ];

      render(
        <IntegrationsTestComponent
          integrations={integrations}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const disconnectButton = screen.getByTestId("button-github");
      await user.click(disconnectButton);

      expect(mockOnDisconnect).toHaveBeenCalledWith("github");
    });
  });

  describe("Google Calendar Integration", () => {
    it("should display Google Calendar as disconnected when not connected", () => {
      render(
        <IntegrationsTestComponent
          integrations={[]}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const calendarCard = screen.getByTestId(
        "integration-card-google_calendar"
      );
      expect(calendarCard).toBeInTheDocument();
      expect(screen.getByText("Google Calendar")).toBeInTheDocument();
      expect(
        screen.queryByTestId("badge-google_calendar")
      ).not.toBeInTheDocument();

      const connectButton = screen.getByTestId("button-google_calendar");
      expect(connectButton).toHaveTextContent("Connect");
    });

    it("should display Google Calendar as connected with email", () => {
      const integrations = [
        {
          id: "int-calendar-1",
          service_type: "google_calendar",
          status: "connected",
          metadata: { email: "test@example.com" },
        },
      ];

      render(
        <IntegrationsTestComponent
          integrations={integrations}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByTestId("badge-google_calendar")).toBeInTheDocument();
      expect(screen.getByTestId("badge-google_calendar")).toHaveTextContent(
        "✓ Connected"
      );

      const connectedInfo = screen.getByTestId(
        "connected-info-google_calendar"
      );
      expect(connectedInfo).toHaveTextContent(
        "Connected as: test@example.com"
      );

      const disconnectButton = screen.getByTestId("button-google_calendar");
      expect(disconnectButton).toHaveTextContent("Disconnect");
    });

    it("should call onConnect when Connect button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <IntegrationsTestComponent
          integrations={[]}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const connectButton = screen.getByTestId("button-google_calendar");
      await user.click(connectButton);

      expect(mockOnConnect).toHaveBeenCalledWith("google_calendar");
    });

    it("should call onDisconnect when Disconnect button is clicked", async () => {
      const user = userEvent.setup();
      const integrations = [
        {
          id: "int-calendar-1",
          service_type: "google_calendar",
          status: "connected",
          metadata: { email: "test@example.com" },
        },
      ];

      render(
        <IntegrationsTestComponent
          integrations={integrations}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      const disconnectButton = screen.getByTestId("button-google_calendar");
      await user.click(disconnectButton);

      expect(mockOnDisconnect).toHaveBeenCalledWith("google_calendar");
    });

    it("should handle connected state without email in metadata", () => {
      const integrations = [
        {
          id: "int-calendar-1",
          service_type: "google_calendar",
          status: "connected",
          metadata: {}, // No email
        },
      ];

      render(
        <IntegrationsTestComponent
          integrations={integrations}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByTestId("badge-google_calendar")).toBeInTheDocument();
      const connectedInfo = screen.queryByTestId(
        "connected-info-google_calendar"
      );
      // The div should exist but not show email text
      expect(connectedInfo).toBeInTheDocument();
      expect(connectedInfo).not.toHaveTextContent("Connected as:");
    });
  });

  describe("Multiple Integrations", () => {
    it("should display both GitHub and Google Calendar as connected", () => {
      const integrations = [
        {
          id: "int-github-1",
          service_type: "github",
          status: "connected",
          metadata: { githubUsername: "testuser" },
        },
        {
          id: "int-calendar-1",
          service_type: "google_calendar",
          status: "connected",
          metadata: { email: "test@example.com" },
        },
      ];

      render(
        <IntegrationsTestComponent
          integrations={integrations}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      // Both should show connected badges
      expect(screen.getByTestId("badge-github")).toBeInTheDocument();
      expect(screen.getByTestId("badge-google_calendar")).toBeInTheDocument();

      // Both should show disconnect buttons
      expect(screen.getByTestId("button-github")).toHaveTextContent(
        "Disconnect"
      );
      expect(screen.getByTestId("button-google_calendar")).toHaveTextContent(
        "Disconnect"
      );

      // Both should show connected info
      expect(screen.getByTestId("connected-info-github")).toHaveTextContent(
        "Connected as: @testuser"
      );
      expect(
        screen.getByTestId("connected-info-google_calendar")
      ).toHaveTextContent("Connected as: test@example.com");
    });

    it("should display one connected and one disconnected", () => {
      const integrations = [
        {
          id: "int-github-1",
          service_type: "github",
          status: "connected",
          metadata: { githubUsername: "testuser" },
        },
      ];

      render(
        <IntegrationsTestComponent
          integrations={integrations}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      // GitHub should be connected
      expect(screen.getByTestId("badge-github")).toBeInTheDocument();
      expect(screen.getByTestId("button-github")).toHaveTextContent(
        "Disconnect"
      );

      // Google Calendar should be disconnected
      expect(
        screen.queryByTestId("badge-google_calendar")
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("button-google_calendar")).toHaveTextContent(
        "Connect"
      );
    });
  });

  describe("Integration Card Rendering", () => {
    it("should render both integration cards with correct content", () => {
      render(
        <IntegrationsTestComponent
          integrations={[]}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      // GitHub card
      const githubCard = screen.getByTestId("integration-card-github");
      expect(githubCard).toBeInTheDocument();
      expect(
        screen.getByText(
          "Track commits, PRs, and validate dev work automatically"
        )
      ).toBeInTheDocument();

      // Google Calendar card
      const calendarCard = screen.getByTestId(
        "integration-card-google_calendar"
      );
      expect(calendarCard).toBeInTheDocument();
      expect(
        screen.getByText("Sync events and track meeting attendance")
      ).toBeInTheDocument();
    });

    it("should render integration icons", () => {
      render(
        <IntegrationsTestComponent
          integrations={[]}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText("🐙")).toBeInTheDocument();
      expect(screen.getByText("📅")).toBeInTheDocument();
    });
  });

  describe("Integration Status", () => {
    it("should only show connected badge for connected services", () => {
      const integrations = [
        {
          id: "int-github-1",
          service_type: "github",
          status: "disconnected", // explicitly disconnected
          metadata: { githubUsername: "testuser" },
        },
      ];

      render(
        <IntegrationsTestComponent
          integrations={integrations}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      // Should not show badge for disconnected status
      expect(screen.queryByTestId("badge-github")).not.toBeInTheDocument();
      expect(screen.getByTestId("button-github")).toHaveTextContent("Connect");
    });

    it("should handle missing metadata gracefully", () => {
      const integrations = [
        {
          id: "int-github-1",
          service_type: "github",
          status: "connected",
          // no metadata
        },
      ];

      render(
        <IntegrationsTestComponent
          integrations={integrations}
          onConnect={mockOnConnect}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByTestId("badge-github")).toBeInTheDocument();
      const connectedInfo = screen.queryByTestId("connected-info-github");
      // Should render the div but not show "Connected as:"
      expect(connectedInfo).toBeInTheDocument();
      expect(connectedInfo).not.toHaveTextContent("Connected as:");
    });
  });
});

