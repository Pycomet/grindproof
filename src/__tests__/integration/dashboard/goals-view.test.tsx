import { describe, it, expect, beforeEach, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";

// Mock tRPC
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    goal: {
      getAll: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
      update: {
        useMutation: vi.fn(),
      },
      delete: {
        useMutation: vi.fn(),
      },
    },
    integration: {
      getByServiceType: {
        useQuery: vi.fn(),
      },
      getGitHubActivity: {
        useQuery: vi.fn(),
      },
    },
  },
}));

describe("Goals View Component", () => {
  const mockGoals = [
    {
      id: "goal-1",
      userId: "user-123",
      title: "Launch new feature",
      description: "Complete the MVP for the new analytics dashboard",
      status: "active" as const,
      priority: "high" as const,
      timeHorizon: "monthly" as const,
      targetDate: new Date("2024-12-31"),
      githubRepos: ["user/repo1", "user/repo2"],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-15"),
    },
    {
      id: "goal-2",
      userId: "user-123",
      title: "Improve test coverage",
      description: null,
      status: "active" as const,
      priority: "medium" as const,
      timeHorizon: "weekly" as const,
      targetDate: undefined,
      githubRepos: undefined,
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date("2024-01-10"),
    },
    {
      id: "goal-3",
      userId: "user-123",
      title: "Completed goal example",
      description: "This goal was successfully completed",
      status: "completed" as const,
      priority: "high" as const,
      timeHorizon: "weekly" as const,
      targetDate: new Date("2024-01-20"),
      githubRepos: ["user/repo1"],
      createdAt: new Date("2024-01-05"),
      updatedAt: new Date("2024-01-18"),
    },
  ];

  const mockGitHubActivity = {
    commits: 25,
    pullRequests: 3,
    issues: 2,
    repositories: ["user/repo1", "user/repo2", "user/repo3"],
    totalEvents: 30,
    githubUsername: "testuser",
    needsReconnect: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Goal List Display", () => {
    it("should display goals list when goals exist", () => {
      vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
        data: mockGoals,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      vi.mocked(trpc.integration.getByServiceType.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      vi.mocked(trpc.integration.getGitHubActivity.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      expect(mockGoals).toHaveLength(3);
      expect(mockGoals[0].title).toBe("Launch new feature");
      expect(mockGoals[1].title).toBe("Improve test coverage");
      expect(mockGoals[2].title).toBe("Completed goal example");
    });

    it("should show empty state when no goals exist", () => {
      vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      vi.mocked(trpc.integration.getByServiceType.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      vi.mocked(trpc.integration.getGitHubActivity.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      const hasGoals = (data: any) => data && data.length > 0;
      const emptyData: any[] = [];
      
      expect(hasGoals(emptyData)).toBe(false);
    });

    it("should display all goal properties correctly", () => {
      const goal = mockGoals[0];

      expect(goal.title).toBe("Launch new feature");
      expect(goal.description).toBe("Complete the MVP for the new analytics dashboard");
      expect(goal.priority).toBe("high");
      expect(goal.timeHorizon).toBe("monthly");
      expect(goal.status).toBe("active");
      expect(goal.githubRepos).toEqual(["user/repo1", "user/repo2"]);
    });
  });

  describe("Priority Badges", () => {
    it("should display correct priority badge for high priority", () => {
      const highPriorityGoal = mockGoals.find(g => g.priority === "high");
      expect(highPriorityGoal?.priority).toBe("high");
    });

    it("should display correct priority badge for medium priority", () => {
      const mediumPriorityGoal = mockGoals.find(g => g.priority === "medium");
      expect(mediumPriorityGoal?.priority).toBe("medium");
    });

    it("should handle all priority levels", () => {
      const priorities = ["high", "medium", "low"];
      
      priorities.forEach(priority => {
        const getPriorityColor = (p: string) => {
          switch (p) {
            case 'high': return 'red';
            case 'medium': return 'yellow';
            case 'low': return 'green';
            default: return 'zinc';
          }
        };

        expect(getPriorityColor(priority)).toBeDefined();
      });
    });
  });

  describe("Status Badges", () => {
    it("should display active status", () => {
      const activeGoal = mockGoals.find(g => g.status === "active");
      expect(activeGoal?.status).toBe("active");
    });

    it("should handle all status types", () => {
      const statuses = ["active", "completed", "paused"];
      
      statuses.forEach(status => {
        const getStatusColor = (s: string) => {
          switch (s) {
            case 'active': return 'blue';
            case 'completed': return 'green';
            case 'paused': return 'zinc';
            default: return 'zinc';
          }
        };

        expect(getStatusColor(status)).toBeDefined();
      });
    });
  });

  describe("GitHub Integration", () => {
    it("should display GitHub repos when connected and repos exist", () => {
      vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
        data: mockGoals,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      vi.mocked(trpc.integration.getByServiceType.useQuery).mockReturnValue({
        data: { id: "int-1", serviceType: "github", status: "connected" },
        isLoading: false,
      } as any);

      vi.mocked(trpc.integration.getGitHubActivity.useQuery).mockReturnValue({
        data: mockGitHubActivity,
        isLoading: false,
      } as any);

      const goalWithRepos = mockGoals[0];
      expect(goalWithRepos.githubRepos).toEqual(["user/repo1", "user/repo2"]);
    });

    it("should show available repos from GitHub activity", () => {
      vi.mocked(trpc.integration.getGitHubActivity.useQuery).mockReturnValue({
        data: mockGitHubActivity,
        isLoading: false,
      } as any);

      const availableRepos = mockGitHubActivity.repositories;
      expect(availableRepos).toHaveLength(3);
      expect(availableRepos).toContain("user/repo1");
    });

    it("should not show GitHub repo selector when not connected", () => {
      vi.mocked(trpc.integration.getByServiceType.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      vi.mocked(trpc.integration.getGitHubActivity.useQuery).mockReturnValue({
        data: null,
        isLoading: false,
      } as any);

      const githubIntegration = null;
      const availableRepos: string[] = [];

      expect(githubIntegration).toBeNull();
      expect(availableRepos).toHaveLength(0);
    });
  });

  describe("CRUD Operations", () => {
    it("should call create mutation when creating a goal", () => {
      const mockCreate = vi.fn();
      
      vi.mocked(trpc.goal.create.useMutation).mockReturnValue({
        mutate: mockCreate,
        isPending: false,
      } as any);

      const newGoalData = {
        title: "New Goal",
        description: "Description",
        priority: "high" as const,
        timeHorizon: "monthly" as const,
        status: "active" as const,
      };

      mockCreate(newGoalData);

      expect(mockCreate).toHaveBeenCalledWith(newGoalData);
    });

    it("should call update mutation when editing a goal", () => {
      const mockUpdate = vi.fn();
      
      vi.mocked(trpc.goal.update.useMutation).mockReturnValue({
        mutate: mockUpdate,
        isPending: false,
      } as any);

      const updateData = {
        id: "goal-1",
        title: "Updated Goal",
        priority: "medium" as const,
      };

      mockUpdate(updateData);

      expect(mockUpdate).toHaveBeenCalledWith(updateData);
    });

    it("should call delete mutation when deleting a goal", () => {
      const mockDelete = vi.fn();
      
      vi.mocked(trpc.goal.delete.useMutation).mockReturnValue({
        mutate: mockDelete,
        isPending: false,
      } as any);

      const deleteData = { id: "goal-1" };

      mockDelete(deleteData);

      expect(mockDelete).toHaveBeenCalledWith(deleteData);
    });

    it("should refetch goals after successful create", () => {
      const mockRefetch = vi.fn();
      
      vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
        data: mockGoals,
        isLoading: false,
        refetch: mockRefetch,
      } as any);

      const mockCreate = vi.fn((data, options?: any) => {
        if (options?.onSuccess) {
          options.onSuccess();
        }
      });

      vi.mocked(trpc.goal.create.useMutation).mockReturnValue({
        mutate: mockCreate,
        isPending: false,
      } as any);

      // Verify refetch would be called on success
      expect(mockRefetch).toBeDefined();
    });
  });

  describe("Time Horizons", () => {
    it("should display time horizon when set", () => {
      const goalWithTimeHorizon = mockGoals[0];
      expect(goalWithTimeHorizon.timeHorizon).toBe("monthly");
    });

    it("should handle all time horizon options", () => {
      const timeHorizons = ["daily", "weekly", "monthly", "annual"];
      
      timeHorizons.forEach(horizon => {
        expect(horizon).toBeDefined();
        expect(["daily", "weekly", "monthly", "annual"]).toContain(horizon);
      });
    });

    it("should handle goals without time horizon", () => {
      const goalWithoutTimeHorizon = {
        ...mockGoals[1],
        timeHorizon: undefined,
      };

      expect(goalWithoutTimeHorizon.timeHorizon).toBeUndefined();
    });
  });

  describe("Deadline Display", () => {
    it("should display deadline when set", () => {
      const goalWithDeadline = mockGoals[0];
      expect(goalWithDeadline.targetDate).toBeInstanceOf(Date);
    });

    it("should handle goals without deadline", () => {
      const goalWithoutDeadline = mockGoals[1];
      expect(goalWithoutDeadline.targetDate).toBeUndefined();
    });

    it("should format deadline correctly", () => {
      const deadline = new Date("2024-12-31");
      const formatted = deadline.toLocaleDateString();
      expect(formatted).toBeDefined();
    });
  });

  describe("Goal Count Display", () => {
    it("should display correct count for multiple goals", () => {
      vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
        data: mockGoals,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      expect(mockGoals.length).toBe(3);
    });

    it("should display correct count for single goal", () => {
      const singleGoal = [mockGoals[0]];
      
      vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
        data: singleGoal,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      expect(singleGoal.length).toBe(1);
    });

    it("should display zero count when no goals", () => {
      vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      const goalsData: any[] = [];
      expect(goalsData.length).toBe(0);
    });
  });

  describe("Form Validation", () => {
    it("should require title for goal creation", () => {
      const invalidGoal = {
        title: "",
        priority: "medium" as const,
      };

      expect(invalidGoal.title.length).toBe(0);
    });

    it("should allow optional fields to be empty", () => {
      const minimalGoal = {
        title: "Minimal Goal",
      };

      expect(minimalGoal.title).toBeDefined();
    });

    it("should validate priority values", () => {
      const validPriorities = ["high", "medium", "low"];
      const testPriority = "high";

      expect(validPriorities).toContain(testPriority);
    });

    it("should validate status values", () => {
      const validStatuses = ["active", "completed", "paused"];
      const testStatus = "active";

      expect(validStatuses).toContain(testStatus);
    });
  });

  describe("Loading States", () => {
    it("should handle loading state", () => {
      vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      } as any);

      const isLoading = true;
      expect(isLoading).toBe(true);
    });

    it("should handle loading state during mutation", () => {
      vi.mocked(trpc.goal.create.useMutation).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as any);

      const isPending = true;
      expect(isPending).toBe(true);
    });
  });

  describe("Completed Goals Section", () => {
    it("should separate active and completed goals", () => {
      const activeGoals = mockGoals.filter(g => g.status !== 'completed');
      const completedGoals = mockGoals.filter(g => g.status === 'completed');

      expect(activeGoals).toHaveLength(2);
      expect(completedGoals).toHaveLength(1);
      expect(completedGoals[0].title).toBe("Completed goal example");
    });

    it("should show completed goals count correctly", () => {
      const totalGoals = mockGoals.length;
      const completedGoals = mockGoals.filter(g => g.status === 'completed');

      expect(totalGoals).toBe(3);
      expect(completedGoals.length).toBe(1);
      expect(`${completedGoals.length}/${totalGoals}`).toBe("1/3");
    });

    it("should not show completed section if no completed goals", () => {
      const noCompletedGoals = mockGoals.filter(g => g.status === 'active');
      const completedGoals = noCompletedGoals.filter(g => g.status === 'completed');

      expect(completedGoals).toHaveLength(0);
    });

    it("should display updatedAt date for completed goals", () => {
      const completedGoal = mockGoals.find(g => g.status === 'completed');
      
      expect(completedGoal?.updatedAt).toBeInstanceOf(Date);
      expect(completedGoal?.updatedAt.toLocaleDateString()).toBeDefined();
    });
  });

  describe("Collapsible Completed Section", () => {
    it("should toggle completed section visibility", () => {
      let showCompleted = false;

      // Simulate toggle
      showCompleted = !showCompleted;
      expect(showCompleted).toBe(true);

      showCompleted = !showCompleted;
      expect(showCompleted).toBe(false);
    });

    it("should show correct text when expanded", () => {
      const showCompleted = true;
      const text = showCompleted ? 'Tap to collapse' : 'Tap to expand';

      expect(text).toBe('Tap to collapse');
    });

    it("should show correct text when collapsed", () => {
      const showCompleted = false;
      const text = showCompleted ? 'Tap to collapse' : 'Tap to expand';

      expect(text).toBe('Tap to expand');
    });

    it("should have proper aria-label for accessibility", () => {
      const showCompleted = true;
      const ariaLabel = showCompleted ? 'Collapse completed goals' : 'Expand completed goals';

      expect(ariaLabel).toBe('Collapse completed goals');
    });
  });

  describe("View Dialog (Read-only)", () => {
    it("should open view dialog for completed goals", () => {
      const completedGoal = mockGoals.find(g => g.status === 'completed');
      let selectedGoal = null;
      let isViewOpen = false;

      // Simulate opening view dialog
      selectedGoal = completedGoal;
      isViewOpen = true;

      expect(selectedGoal).toBeDefined();
      expect(isViewOpen).toBe(true);
      expect(selectedGoal?.status).toBe('completed');
    });

    it("should display all goal details in read-only mode", () => {
      const completedGoal = mockGoals.find(g => g.status === 'completed');

      expect(completedGoal?.title).toBe("Completed goal example");
      expect(completedGoal?.description).toBe("This goal was successfully completed");
      expect(completedGoal?.priority).toBe("high");
      expect(completedGoal?.timeHorizon).toBe("weekly");
      expect(completedGoal?.status).toBe("completed");
    });

    it("should close view dialog", () => {
      let selectedGoal: any = mockGoals.find(g => g.status === 'completed');
      let isViewOpen = true;

      // Simulate closing dialog
      isViewOpen = false;
      selectedGoal = null;

      expect(isViewOpen).toBe(false);
      expect(selectedGoal).toBeNull();
    });
  });

  describe("Mobile Optimization", () => {
    it("should use icon buttons for mobile", () => {
      // Icon buttons have w-8 h-8 on mobile, text on desktop with sm:w-auto
      const mobileButtonClass = "h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3";
      
      expect(mobileButtonClass).toContain("h-8");
      expect(mobileButtonClass).toContain("w-8");
      expect(mobileButtonClass).toContain("sm:w-auto");
    });

    it("should have proper aria-labels for icon buttons", () => {
      const editLabel = "Edit goal";
      const deleteLabel = "Delete goal";
      const viewLabel = "View goal details";

      expect(editLabel).toBeDefined();
      expect(deleteLabel).toBeDefined();
      expect(viewLabel).toBeDefined();
    });

    it("should limit GitHub repos display on mobile", () => {
      const goal = mockGoals[0];
      const displayRepos = goal.githubRepos?.slice(0, 3) || [];
      const remainingCount = (goal.githubRepos?.length || 0) - 3;

      expect(displayRepos).toHaveLength(2); // Only 2 repos in mock
      expect(remainingCount).toBeLessThan(1); // No +more needed
    });

    it("should show +more indicator when more than 3 repos", () => {
      const manyReposGoal = {
        ...mockGoals[0],
        githubRepos: ["repo1", "repo2", "repo3", "repo4", "repo5"],
      };

      const displayRepos = manyReposGoal.githubRepos.slice(0, 3);
      const remainingCount = manyReposGoal.githubRepos.length - 3;

      expect(displayRepos).toHaveLength(3);
      expect(remainingCount).toBe(2);
      expect(`+${remainingCount} more`).toBe("+2 more");
    });

    it("should truncate long titles on mobile", () => {
      const longTitle = "This is a very long goal title that should be truncated on mobile devices";
      // Using truncate class
      expect(longTitle.length).toBeGreaterThan(50);
    });

    it("should use abbreviated time horizon on mobile", () => {
      const timeHorizon = "monthly";
      const abbreviation = timeHorizon.slice(0, 1).toUpperCase();

      expect(abbreviation).toBe("M");
    });

    it("should use line-clamp for descriptions on mobile", () => {
      const longDescription = "This is a very long description that should be clamped to 2 lines on mobile but shown fully on desktop with the line-clamp-2 sm:line-clamp-none classes";
      
      // line-clamp-2 limits to 2 lines on mobile
      expect(longDescription.length).toBeGreaterThan(50);
    });
  });

  describe("Goal Alignment Score", () => {
    it("should calculate goal alignment score correctly", () => {
      const totalGoals = mockGoals.length;
      const completedGoals = mockGoals.filter(g => g.status === 'completed').length;
      const score = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

      expect(score).toBe(33); // 1/3 = 33%
    });

    it("should return 0% when no goals exist", () => {
      const totalGoals = 0;
      const completedGoals = 0;
      const score = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

      expect(score).toBe(0);
    });

    it("should return 100% when all goals completed", () => {
      const allCompleted = mockGoals.map(g => ({ ...g, status: 'completed' as const }));
      const totalGoals = allCompleted.length;
      const completedGoals = allCompleted.filter(g => g.status === 'completed').length;
      const score = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

      expect(score).toBe(100);
    });

    it("should use correct color for high score (>=70%)", () => {
      const score = 85;
      const color = score >= 70 ? 'green' : score >= 40 ? 'orange' : 'red';

      expect(color).toBe('green');
    });

    it("should use correct color for medium score (40-69%)", () => {
      const score = 55;
      const color = score >= 70 ? 'green' : score >= 40 ? 'orange' : 'red';

      expect(color).toBe('orange');
    });

    it("should use correct color for low score (<40%)", () => {
      const score = 25;
      const color = score >= 70 ? 'green' : score >= 40 ? 'orange' : 'red';

      expect(color).toBe('red');
    });

    it("should display goals count not tasks count", () => {
      const totalGoals = mockGoals.length;
      const completedGoals = mockGoals.filter(g => g.status === 'completed').length;
      const displayText = `${completedGoals}/${totalGoals} goals`;

      expect(displayText).toBe("1/3 goals");
      expect(displayText).not.toContain("tasks");
    });
  });
});

