"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc/client";
import { useAuth } from "./AuthContext";

interface Task {
  id: string;
  userId: string;
  goalId: string | null;
  title: string;
  description: string | null;
  dueDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed" | "skipped";
  tags: string[] | null;
  reflection: string | null;
  recurrencePattern: any;
  createdAt: Date;
  updatedAt: Date;
}

interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: "active" | "completed";
  priority: "high" | "medium" | "low";
  createdAt: Date;
  updatedAt: Date;
}

interface TaskContextType {
  tasks: Task[];
  goals: Goal[];
  isLoading: boolean;
  refreshTasks: () => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const {
    data: tasks,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = trpc.task.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  const {
    data: goals,
    isLoading: goalsLoading,
    refetch: refetchGoals,
  } = trpc.goal.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  const refreshTasks = useCallback(async () => {
    await refetchTasks();
  }, [refetchTasks]);

  const refreshGoals = useCallback(async () => {
    await refetchGoals();
  }, [refetchGoals]);

  return (
    <TaskContext.Provider
      value={{
        tasks: (tasks as Task[]) || [],
        goals: (goals as Goal[]) || [],
        isLoading: tasksLoading || goalsLoading,
        refreshTasks,
        refreshGoals,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context)
    throw new Error("useTaskContext must be used within TaskProvider");
  return context;
}
