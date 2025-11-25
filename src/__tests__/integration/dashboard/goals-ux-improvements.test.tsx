import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Dashboard from "@/app/dashboard/page";
import { useApp } from "@/contexts/AppContext";

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "123", email: "test@test.com" } },
        error: null,
      }),
      signOut: vi.fn(),
    },
  },
}));

vi.mock("@/contexts/AppContext", () => ({
  useApp: vi.fn(),
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useOfflineSync", () => ({
  useOfflineSync: () => ({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    queueMutation: vi.fn(),
    syncPendingMutations: vi.fn(),
  }),
}));

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    task: {
      search: { useQuery: vi.fn(() => ({ data: [] })) },
      create: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      update: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      complete: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      skip: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      reschedule: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      delete: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      syncFromCalendar: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    goal: {
      search: { useQuery: vi.fn(() => ({ data: [] })) },
      create: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      update: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      delete: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    integration: {
      getAll: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getByServiceType: { useQuery: vi.fn(() => ({ data: null })) },
      getGitHubActivity: { useQuery: vi.fn(() => ({ data: null })) },
      getGoogleCalendarActivity: { useQuery: vi.fn(() => ({ data: null })) },
    },
    evidence: {
      getByTaskId: { useQuery: vi.fn(() => ({ data: [], refetch: vi.fn() })) },
      create: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
      validateEvidence: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
    },
    conversation: {
      getAll: { useQuery: vi.fn(() => ({ data: [] })) },
      create: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
      update: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
    },
    accountabilityScore: {
      getAll: { useQuery: vi.fn(() => ({ data: [] })) },
    },
    pattern: {
      getAll: { useQuery: vi.fn(() => ({ data: [] })) },
    },
    dailyCheck: {
      getMorningSchedule: {
        useQuery: vi.fn(() => ({
          data: { tasks: [], calendarEvents: [], hasCalendarIntegration: false },
        })),
      },
      getEveningComparison: {
        useQuery: vi.fn(() => ({
          data: {
            tasks: [],
            stats: { total: 0, completed: 0, pending: 0, skipped: 0, alignmentScore: 0 },
            integrations: { hasGitHub: false, hasCalendar: false },
            existingReflection: null,
          },
        })),
      },
      saveMorningPlan: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ success: true }) })),
      },
      saveEveningReflection: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ success: true }) })),
      },
      refineTasks: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ tasks: [] }) })),
      },
    },
    notification: {
      getPublicKey: { useQuery: vi.fn(() => ({ data: { publicKey: "test-key" } })) },
      getSettings: {
        useQuery: vi.fn(() => ({
          data: {
            morningCheckEnabled: true,
            morningCheckTime: "09:00",
            eveningCheckEnabled: true,
            eveningCheckTime: "18:00",
            timezone: "UTC",
          },
        })),
      },
      getSubscriptions: { useQuery: vi.fn(() => ({ data: [] })) },
      subscribe: { useMutation: vi.fn() },
      unsubscribe: { useMutation: vi.fn() },
      updateSettings: { useMutation: vi.fn() },
      sendTest: { useMutation: vi.fn() },
    },
  },
}));

// Helper to create mock goals
const createGoal = (
  title: string,
  priority: "high" | "medium" | "low",
  status: "active" | "completed" | "paused",
  timeHorizon?: "daily" | "weekly" | "monthly" | "annual",
  targetDate?: Date
) => ({
  id: `goal-${Math.random()}`,
  userId: "user-123",
  title,
  priority,
  status,
  timeHorizon,
  targetDate,
  createdAt: new Date(),
  updatedAt: new Date(),
  description: null,
  githubRepos: undefined,
});

// Helper to create mock context
const mockAppContext = (overrides: any = {}) => ({
  user: { id: "user-123", email: "test@example.com" },
  goals: [],
  tasks: [],
  integrations: [],
  refreshGoals: vi.fn(),
  refreshTasks: vi.fn(),
  refreshIntegrations: vi.fn(),
  isGoogleCalendarConnected: () => false,
  ...overrides,
});

// Helper to switch to goals view
const switchToGoalsView = async () => {
  const goalsTab = screen.getByRole("button", { name: /goals/i });
  fireEvent.click(goalsTab);
  await waitFor(() => {
    expect(screen.getByText(/goals tracked/i)).toBeInTheDocument();
  });
};

describe("Goals View UX Improvements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Stats Summary Cards", () => {
    it("displays stats cards when goals exist", async () => {
      const mockGoals = [
        createGoal("Goal 1", "high", "active"),
        createGoal("Goal 2", "medium", "active"),
        createGoal("Goal 3", "low", "completed"),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByText(/^Active$/)).toBeInTheDocument();
        expect(screen.getByText(/^Completed$/)).toBeInTheDocument();
        expect(screen.getByText(/^On Track$/)).toBeInTheDocument();
        expect(screen.getByText(/^No Tasks$/)).toBeInTheDocument();
      });
    });

    it("shows correct active goals count", async () => {
      const mockGoals = [
        createGoal("Active 1", "high", "active"),
        createGoal("Active 2", "medium", "active"),
        createGoal("Completed", "low", "completed"),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const statCards = screen.getAllByText("2");
        expect(statCards.length).toBeGreaterThan(0);
      });
    });

    it("shows correct completed goals count", async () => {
      const mockGoals = [
        createGoal("Active", "high", "active"),
        createGoal("Completed 1", "medium", "completed"),
        createGoal("Completed 2", "low", "completed"),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const statCards = screen.getAllByText("2");
        expect(statCards.length).toBeGreaterThan(0);
      });
    });

    it("does not show stats when no goals exist", async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: [] }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.queryByText(/^Active$/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Filter Dropdown", () => {
    it("displays filter dropdown with all options", async () => {
      const mockGoals = [
        createGoal("High Priority", "high", "active", "daily"),
        createGoal("Medium Priority", "medium", "active", "weekly"),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      const filterButton = await screen.findByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/All Goals/)).toBeInTheDocument();
        expect(screen.getByLabelText(/🔴 High/)).toBeInTheDocument();
        expect(screen.getByLabelText(/🟡 Medium/)).toBeInTheDocument();
        expect(screen.getByLabelText(/🟢 Low/)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Active$/)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Paused$/)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Completed$/)).toBeInTheDocument();
      });
    });

    it("shows correct counts for each filter", async () => {
      const mockGoals = [
        createGoal("High 1", "high", "active"),
        createGoal("High 2", "high", "active"),
        createGoal("Medium", "medium", "active"),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      const filterButton = await screen.findByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        const highLabel = screen.getByLabelText(/🔴 High/);
        const labelParent = highLabel.closest('label');
        expect(labelParent?.textContent).toContain('2');
      });
    });

    it("filters goals by priority when selected", async () => {
      const mockGoals = [
        createGoal("High Priority Goal", "high", "active"),
        createGoal("Medium Priority Goal", "medium", "active"),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      // Open filter dropdown
      const filterButton = await screen.findByText(/Filters:/);
      fireEvent.click(filterButton);

      // Uncheck "All Goals"
      const allGoalsCheckbox = screen.getByLabelText(/All Goals/);
      fireEvent.click(allGoalsCheckbox);

      // Check "High Priority"
      const highCheckbox = screen.getByLabelText(/🔴 High/);
      fireEvent.click(highCheckbox);

      // Close dropdown
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.getByText("High Priority Goal")).toBeInTheDocument();
        expect(screen.queryByText("Medium Priority Goal")).not.toBeInTheDocument();
      });
    });

    it("supports multi-select filtering", async () => {
      const mockGoals = [
        createGoal("High Active", "high", "active"),
        createGoal("Medium Active", "medium", "active"),
        createGoal("Low Completed", "low", "completed"),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      // Open filter
      const filterButton = await screen.findByText(/Filters:/);
      fireEvent.click(filterButton);

      // Uncheck "All"
      const allCheckbox = screen.getByLabelText(/All Goals/);
      fireEvent.click(allCheckbox);

      // Select high and medium
      const highCheckbox = screen.getByLabelText(/🔴 High/);
      const mediumCheckbox = screen.getByLabelText(/🟡 Medium/);
      fireEvent.click(highCheckbox);
      fireEvent.click(mediumCheckbox);

      // Close dropdown
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.getByText("High Active")).toBeInTheDocument();
        expect(screen.getByText("Medium Active")).toBeInTheDocument();
        expect(screen.queryByText("Low Completed")).not.toBeInTheDocument();
      });
    });
  });

  describe("Smart Sorting", () => {
    it("sorts goals by priority (high > medium > low)", async () => {
      const mockGoals = [
        createGoal("Low Priority", "low", "active"),
        createGoal("High Priority", "high", "active"),
        createGoal("Medium Priority", "medium", "active"),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const goalCards = screen.getAllByText(/Priority/);
        expect(goalCards[0].textContent).toContain("High");
        expect(goalCards[1].textContent).toContain("Medium");
        expect(goalCards[2].textContent).toContain("Low");
      });
    });

    it("sorts by deadline urgency within same priority", async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const mockGoals = [
        createGoal("Due Next Week", "high", "active", "weekly", nextWeek),
        createGoal("Due Tomorrow", "high", "active", "daily", tomorrow),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const goalCards = screen.getAllByText(/Due/);
        expect(goalCards[0].textContent).toContain("Tomorrow");
        expect(goalCards[1].textContent).toContain("Next Week");
      });
    });
  });

  describe("Priority Visual Indicators", () => {
    it("displays colored left border for high priority", async () => {
      const mockGoals = [createGoal("High Priority", "high", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const goalCard = screen.getByText("High Priority").closest("div");
        expect(goalCard?.className).toContain("border-l-red-500");
      });
    });

    it("displays colored left border for medium priority", async () => {
      const mockGoals = [createGoal("Medium Priority", "medium", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const goalCard = screen.getByText("Medium Priority").closest("div");
        expect(goalCard?.className).toContain("border-l-yellow-500");
      });
    });

    it("displays colored left border for low priority", async () => {
      const mockGoals = [createGoal("Low Priority", "low", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const goalCard = screen.getByText("Low Priority").closest("div");
        expect(goalCard?.className).toContain("border-l-green-500");
      });
    });
  });

  describe("Deadline Urgency Indicators", () => {
    it("shows 'overdue' badge for past deadlines", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockGoals = [
        createGoal("Overdue Goal", "high", "active", "daily", yesterday),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByText(/overdue/i)).toBeInTheDocument();
      });
    });

    it("shows 'days left' badge for future deadlines", async () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);

      const mockGoals = [
        createGoal("Future Goal", "high", "active", "weekly", future),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByText(/5d left/i)).toBeInTheDocument();
      });
    });

    it("shows 'Due today' for goals due today", async () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const mockGoals = [
        createGoal("Today Goal", "high", "active", "daily", today),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByText(/Due today/i)).toBeInTheDocument();
      });
    });
  });

  describe("Mark as Complete Button", () => {
    it("displays 'Complete' button on active goals", async () => {
      const mockGoals = [createGoal("Active Goal", "high", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const completeButtons = screen.getAllByLabelText(/Mark as complete/i);
        expect(completeButtons.length).toBeGreaterThan(0);
      });
    });

    it("calls update mutation when marking goal as complete", async () => {
      const mockUpdate = vi.fn();
      const mockGoals = [createGoal("Active Goal", "high", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      vi.mocked(trpc.goal.update.useMutation).mockReturnValue({
        mutate: mockUpdate,
        isPending: false,
      } as any);

      render(<Dashboard />);
      await switchToGoalsView();

      const completeButton = await screen.findByLabelText(/Mark as complete/i);
      fireEvent.click(completeButton);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("Reopen Completed Goals", () => {
    it("displays 'Reopen' button on completed goals", async () => {
      const mockGoals = [createGoal("Completed Goal", "high", "completed")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      // Expand completed section
      const completedButton = await screen.findByText(/Completed Goals/);
      fireEvent.click(completedButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Reopen goal/i)).toBeInTheDocument();
      });
    });

    it("calls update mutation when reopening goal", async () => {
      const mockUpdate = vi.fn();
      const mockGoals = [createGoal("Completed Goal", "high", "completed")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      vi.mocked(trpc.goal.update.useMutation).mockReturnValue({
        mutate: mockUpdate,
        isPending: false,
      } as any);

      render(<Dashboard />);
      await switchToGoalsView();

      // Expand completed section
      const completedButton = await screen.findByText(/Completed Goals/);
      fireEvent.click(completedButton);

      const reopenButton = await screen.findByLabelText(/Reopen goal/i);
      fireEvent.click(reopenButton);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("Enhanced Progress Bars", () => {
    it("displays progress percentage when goal has tasks", async () => {
      const mockGoals = [createGoal("Goal with Tasks", "high", "active")];
      const mockTasks = [
        { id: "task-1", goalId: mockGoals[0].id, status: "completed" },
        { id: "task-2", goalId: mockGoals[0].id, status: "completed" },
        { id: "task-3", goalId: mockGoals[0].id, status: "pending" },
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals, tasks: mockTasks }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByText(/67%/)).toBeInTheDocument();
        expect(screen.getByText(/2\/3 tasks/)).toBeInTheDocument();
      });
    });

    it("shows warning message for goals with no tasks", async () => {
      const mockGoals = [createGoal("Goal No Tasks", "high", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals, tasks: [] }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByText(/No tasks yet/i)).toBeInTheDocument();
      });
    });

    it("provides quick link to add first task", async () => {
      const mockGoals = [createGoal("Goal No Tasks", "high", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals, tasks: [] }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByText(/Add first task/i)).toBeInTheDocument();
      });
    });
  });

  describe("Quick Add Task Button", () => {
    it("displays 'Add Task' button on each goal", async () => {
      const mockGoals = [createGoal("Goal", "high", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByLabelText(/Add task/i)).toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    it("shows enhanced empty state when no goals exist", async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: [] }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByText(/Set Your First Goal/i)).toBeInTheDocument();
        expect(screen.getByText(/Create Your First Goal/i)).toBeInTheDocument();
      });
    });

    it("shows celebration state when all goals are completed", async () => {
      const mockGoals = [
        createGoal("Completed 1", "high", "completed"),
        createGoal("Completed 2", "medium", "completed"),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        expect(screen.getByText(/All Goals Completed!/i)).toBeInTheDocument();
        expect(screen.getByText(/Create New Goal/i)).toBeInTheDocument();
      });
    });
  });

  describe("Mobile Responsiveness", () => {
    it("uses icon-only buttons on mobile breakpoint", async () => {
      const mockGoals = [createGoal("Goal", "high", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const button = screen.getByLabelText(/Mark as complete/i);
        expect(button.className).toContain("lg:inline");
      });
    });

    it("displays 2 columns on mobile for stats cards", async () => {
      const mockGoals = [createGoal("Goal", "high", "active")];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ goals: mockGoals }),
      });

      render(<Dashboard />);
      await switchToGoalsView();

      await waitFor(() => {
        const statsContainer = screen.getByText(/Active/).closest("div")?.parentElement;
        expect(statsContainer?.className).toContain("grid-cols-2");
        expect(statsContainer?.className).toContain("sm:grid-cols-4");
      });
    });
  });
});

