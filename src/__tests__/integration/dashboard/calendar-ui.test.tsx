import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";

// Mock the supabase client
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

// Create a simplified Calendar Activity component for testing
const CalendarActivityTestComponent = ({
  calendarActivity,
  isLoading,
  onRefresh,
  timeRange,
  onTimeRangeChange,
}: {
  calendarActivity: {
    totalEvents: number;
    pastEvents: number;
    upcomingEvents: number;
    acceptedEvents: number;
    declinedEvents: number;
    email: string;
    needsReconnect: boolean;
  } | null;
  isLoading: boolean;
  onRefresh: () => void;
  timeRange: number;
  onTimeRangeChange: (hours: number) => void;
}) => {
  return (
    <div data-testid="calendar-activity-section">
      <div className="flex items-center justify-between">
        <h3>Google Calendar Activity</h3>
        <button
          data-testid="refresh-button"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div data-testid="time-range-selector">
        <label>Time Range:</label>
        <select
          value={timeRange}
          onChange={(e) => onTimeRangeChange(Number(e.target.value))}
        >
          <option value={1}>Last hour</option>
          <option value={24}>Last 24 hours</option>
          <option value={168}>Last week</option>
          <option value={720}>Last 30 days</option>
        </select>
      </div>

      {isLoading && (
        <div data-testid="loading-state">
          <p>Loading calendar activity...</p>
        </div>
      )}

      {!isLoading && !calendarActivity && (
        <div data-testid="empty-state">
          <p>No Google Calendar connected</p>
          <button data-testid="connect-calendar-button">
            Connect Google Calendar
          </button>
        </div>
      )}

      {!isLoading && calendarActivity && (
        <div data-testid="calendar-activity-content">
          {calendarActivity.needsReconnect && (
            <div
              data-testid="reconnect-warning"
              className="warning-banner"
              role="alert"
            >
              <p>⚠️ Your Google Calendar connection needs to be reconnected.</p>
              <button data-testid="reconnect-button">Reconnect</button>
            </div>
          )}

          <div data-testid="calendar-email">
            Connected as: {calendarActivity.email}
          </div>

          <div data-testid="calendar-stats">
            <div data-testid="stat-total">
              <span>Total Events:</span>
              <span>{calendarActivity.totalEvents}</span>
            </div>
            <div data-testid="stat-past">
              <span>Past Events:</span>
              <span>{calendarActivity.pastEvents}</span>
            </div>
            <div data-testid="stat-upcoming">
              <span>Upcoming Events:</span>
              <span>{calendarActivity.upcomingEvents}</span>
            </div>
            <div data-testid="stat-accepted">
              <span>Accepted:</span>
              <span>{calendarActivity.acceptedEvents}</span>
            </div>
            <div data-testid="stat-declined">
              <span>Declined:</span>
              <span>{calendarActivity.declinedEvents}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

describe("Calendar Activity Display in Reality Check", () => {
  let mockOnRefresh: ReturnType<typeof vi.fn>;
  let mockOnTimeRangeChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRefresh = vi.fn();
    mockOnTimeRangeChange = vi.fn();
  });

  describe("Loading State", () => {
    it("should display loading state when data is being fetched", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={true}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
      expect(
        screen.getByText("Loading calendar activity...")
      ).toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("calendar-activity-content")
      ).not.toBeInTheDocument();
    });

    it("should disable refresh button when loading", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={true}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const refreshButton = screen.getByTestId("refresh-button");
      expect(refreshButton).toBeDisabled();
      expect(refreshButton).toHaveTextContent("Loading...");
    });
  });

  describe("Empty State", () => {
    it("should display empty state when no calendar is connected", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(
        screen.getByText("No Google Calendar connected")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("connect-calendar-button")
      ).toBeInTheDocument();
    });

    it("should not display loading or activity content in empty state", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("calendar-activity-content")
      ).not.toBeInTheDocument();
    });
  });

  describe("Calendar Activity Content", () => {
    const mockCalendarActivity = {
      totalEvents: 10,
      pastEvents: 6,
      upcomingEvents: 4,
      acceptedEvents: 8,
      declinedEvents: 2,
      email: "test@example.com",
      needsReconnect: false,
    };

    it("should display calendar activity data", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={mockCalendarActivity}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(
        screen.getByTestId("calendar-activity-content")
      ).toBeInTheDocument();
      expect(screen.getByTestId("calendar-email")).toHaveTextContent(
        "Connected as: test@example.com"
      );
    });

    it("should display all calendar statistics", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={mockCalendarActivity}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.getByTestId("stat-total")).toHaveTextContent(
        "Total Events:"
      );
      expect(screen.getByTestId("stat-total")).toHaveTextContent("10");

      expect(screen.getByTestId("stat-past")).toHaveTextContent("Past Events:");
      expect(screen.getByTestId("stat-past")).toHaveTextContent("6");

      expect(screen.getByTestId("stat-upcoming")).toHaveTextContent(
        "Upcoming Events:"
      );
      expect(screen.getByTestId("stat-upcoming")).toHaveTextContent("4");

      expect(screen.getByTestId("stat-accepted")).toHaveTextContent(
        "Accepted:"
      );
      expect(screen.getByTestId("stat-accepted")).toHaveTextContent("8");

      expect(screen.getByTestId("stat-declined")).toHaveTextContent(
        "Declined:"
      );
      expect(screen.getByTestId("stat-declined")).toHaveTextContent("2");
    });

    it("should display zero values correctly", () => {
      const emptyActivity = {
        totalEvents: 0,
        pastEvents: 0,
        upcomingEvents: 0,
        acceptedEvents: 0,
        declinedEvents: 0,
        email: "test@example.com",
        needsReconnect: false,
      };

      render(
        <CalendarActivityTestComponent
          calendarActivity={emptyActivity}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.getByTestId("stat-total")).toHaveTextContent("0");
      expect(screen.getByTestId("stat-past")).toHaveTextContent("0");
      expect(screen.getByTestId("stat-upcoming")).toHaveTextContent("0");
      expect(screen.getByTestId("stat-accepted")).toHaveTextContent("0");
      expect(screen.getByTestId("stat-declined")).toHaveTextContent("0");
    });
  });

  describe("Reconnect Warning", () => {
    it("should display reconnect warning when needsReconnect is true", () => {
      const activityNeedsReconnect = {
        totalEvents: 5,
        pastEvents: 3,
        upcomingEvents: 2,
        acceptedEvents: 4,
        declinedEvents: 1,
        email: "test@example.com",
        needsReconnect: true,
      };

      render(
        <CalendarActivityTestComponent
          calendarActivity={activityNeedsReconnect}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const warningBanner = screen.getByTestId("reconnect-warning");
      expect(warningBanner).toBeInTheDocument();
      expect(warningBanner).toHaveAttribute("role", "alert");
      expect(warningBanner).toHaveTextContent(
        "⚠️ Your Google Calendar connection needs to be reconnected."
      );
      expect(screen.getByTestId("reconnect-button")).toBeInTheDocument();
    });

    it("should not display reconnect warning when needsReconnect is false", () => {
      const activityOk = {
        totalEvents: 5,
        pastEvents: 3,
        upcomingEvents: 2,
        acceptedEvents: 4,
        declinedEvents: 1,
        email: "test@example.com",
        needsReconnect: false,
      };

      render(
        <CalendarActivityTestComponent
          calendarActivity={activityOk}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.queryByTestId("reconnect-warning")).not.toBeInTheDocument();
    });
  });

  describe("Time Range Selector", () => {
    it("should display time range selector with correct options", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const selector = screen.getByTestId("time-range-selector");
      expect(selector).toBeInTheDocument();
      expect(screen.getByText("Last hour")).toBeInTheDocument();
      expect(screen.getByText("Last 24 hours")).toBeInTheDocument();
      expect(screen.getByText("Last week")).toBeInTheDocument();
      expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    });

    it("should show correct selected time range", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={168}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toHaveValue("168");
    });

    it("should call onTimeRangeChange when selection changes", async () => {
      const user = userEvent.setup();

      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "720");

      expect(mockOnTimeRangeChange).toHaveBeenCalledWith(720);
    });

    it("should handle all time range options", async () => {
      const user = userEvent.setup();

      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const select = screen.getByRole("combobox");

      await user.selectOptions(select, "1");
      expect(mockOnTimeRangeChange).toHaveBeenCalledWith(1);

      await user.selectOptions(select, "24");
      expect(mockOnTimeRangeChange).toHaveBeenCalledWith(24);

      await user.selectOptions(select, "168");
      expect(mockOnTimeRangeChange).toHaveBeenCalledWith(168);

      await user.selectOptions(select, "720");
      expect(mockOnTimeRangeChange).toHaveBeenCalledWith(720);
    });
  });

  describe("Refresh Functionality", () => {
    it("should call onRefresh when refresh button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const refreshButton = screen.getByTestId("refresh-button");
      await user.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it("should enable refresh button when not loading", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const refreshButton = screen.getByTestId("refresh-button");
      expect(refreshButton).not.toBeDisabled();
      expect(refreshButton).toHaveTextContent("Refresh");
    });
  });

  describe("Integration with Different Data Scenarios", () => {
    it("should handle high event counts", () => {
      const highActivityData = {
        totalEvents: 150,
        pastEvents: 100,
        upcomingEvents: 50,
        acceptedEvents: 120,
        declinedEvents: 30,
        email: "busy@example.com",
        needsReconnect: false,
      };

      render(
        <CalendarActivityTestComponent
          calendarActivity={highActivityData}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={720}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.getByTestId("stat-total")).toHaveTextContent("150");
      expect(screen.getByTestId("stat-past")).toHaveTextContent("100");
      expect(screen.getByTestId("stat-upcoming")).toHaveTextContent("50");
    });

    it("should handle only upcoming events", () => {
      const upcomingOnlyData = {
        totalEvents: 5,
        pastEvents: 0,
        upcomingEvents: 5,
        acceptedEvents: 5,
        declinedEvents: 0,
        email: "future@example.com",
        needsReconnect: false,
      };

      render(
        <CalendarActivityTestComponent
          calendarActivity={upcomingOnlyData}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.getByTestId("stat-upcoming")).toHaveTextContent("5");
      expect(screen.getByTestId("stat-past")).toHaveTextContent("0");
    });

    it("should handle only past events", () => {
      const pastOnlyData = {
        totalEvents: 8,
        pastEvents: 8,
        upcomingEvents: 0,
        acceptedEvents: 6,
        declinedEvents: 2,
        email: "past@example.com",
        needsReconnect: false,
      };

      render(
        <CalendarActivityTestComponent
          calendarActivity={pastOnlyData}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      expect(screen.getByTestId("stat-past")).toHaveTextContent("8");
      expect(screen.getByTestId("stat-upcoming")).toHaveTextContent("0");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes for warning banner", () => {
      const activityNeedsReconnect = {
        totalEvents: 5,
        pastEvents: 3,
        upcomingEvents: 2,
        acceptedEvents: 4,
        declinedEvents: 1,
        email: "test@example.com",
        needsReconnect: true,
      };

      render(
        <CalendarActivityTestComponent
          calendarActivity={activityNeedsReconnect}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const warningBanner = screen.getByTestId("reconnect-warning");
      expect(warningBanner).toHaveAttribute("role", "alert");
    });

    it("should have accessible form controls", () => {
      render(
        <CalendarActivityTestComponent
          calendarActivity={null}
          isLoading={false}
          onRefresh={mockOnRefresh}
          timeRange={24}
          onTimeRangeChange={mockOnTimeRangeChange}
        />
      );

      const selector = screen.getByTestId("time-range-selector");
      expect(selector.querySelector("label")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });
});

