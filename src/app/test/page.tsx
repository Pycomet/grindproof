"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

/**
 * Test page for tRPC endpoints
 * Visit /test to see this page
 */
export default function TestPage() {
  const [goalTitle, setGoalTitle] = useState("");
  const [routineName, setRoutineName] = useState("");

  // Queries
  const { data: goals, isLoading: goalsLoading, refetch: refetchGoals } =
    trpc.goal.getAll.useQuery();
  const { data: routines, isLoading: routinesLoading, refetch: refetchRoutines } =
    trpc.routine.getAll.useQuery();

  // Mutations
  const createGoal = trpc.goal.create.useMutation({
    onSuccess: () => {
      refetchGoals();
      setGoalTitle("");
    },
  });

  const createRoutine = trpc.routine.create.useMutation({
    onSuccess: () => {
      refetchRoutines();
      setRoutineName("");
    },
  });

  return (
    <div className="min-h-screen p-8 bg-zinc-50 dark:bg-black">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">tRPC Test Page</h1>

        {/* Goals Section */}
        <section className="mb-8 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Goals</h2>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="Goal title"
              className="flex-1 px-4 py-2 border rounded dark:bg-zinc-800 dark:border-zinc-700"
            />
            <button
              onClick={() => {
                if (goalTitle.trim()) {
                  createGoal.mutate({
                    title: goalTitle,
                    status: "active",
                  });
                }
              }}
              disabled={createGoal.isPending || !goalTitle.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {createGoal.isPending ? "Creating..." : "Create Goal"}
            </button>
          </div>

          {goalsLoading ? (
            <p>Loading goals...</p>
          ) : (
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Total: {goals?.length || 0}
              </p>
              {goals && goals.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {goals.map((goal: { id: string; title: string; status: string }) => (
                    <li key={goal.id}>
                      {goal.title} - {goal.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500">No goals yet. Create one above!</p>
              )}
            </div>
          )}
        </section>

        {/* Routines Section */}
        <section className="mb-8 p-6 bg-white dark:bg-zinc-900 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Routines</h2>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="Routine name"
              className="flex-1 px-4 py-2 border rounded dark:bg-zinc-800 dark:border-zinc-700"
            />
            <button
              onClick={() => {
                if (routineName.trim()) {
                  createRoutine.mutate({
                    name: routineName,
                    frequency: "daily",
                    isActive: true,
                  });
                }
              }}
              disabled={createRoutine.isPending || !routineName.trim()}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {createRoutine.isPending ? "Creating..." : "Create Routine"}
            </button>
          </div>

          {routinesLoading ? (
            <p>Loading routines...</p>
          ) : (
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Total: {routines?.length || 0}
              </p>
              {routines && routines.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {routines.map((routine: { id: string; name: string; frequency: string; isActive: boolean }) => (
                    <li key={routine.id}>
                      {routine.name} - {routine.frequency} -{" "}
                      {routine.isActive ? "Active" : "Inactive"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500">
                  No routines yet. Create one above!
                </p>
              )}
            </div>
          )}
        </section>

        {/* API Info */}
        <section className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Available Endpoints</h2>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <strong>GET:</strong> /api/trpc/goal.getAll
            </div>
            <div>
              <strong>POST:</strong> /api/trpc/goal.create
            </div>
            <div>
              <strong>GET:</strong> /api/trpc/routine.getAll
            </div>
            <div>
              <strong>POST:</strong> /api/trpc/routine.create
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

