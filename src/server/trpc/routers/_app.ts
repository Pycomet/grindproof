import { router } from "../context";
import { goalRouter } from "./goal";
import { routineRouter } from "./routine";

/**
 * Main application router
 * Add all your routers here
 */
export const appRouter = router({
  goal: goalRouter,
  routine: routineRouter,
});

export type AppRouter = typeof appRouter;

