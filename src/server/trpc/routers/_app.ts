import { router } from "../context";
import { goalRouter } from "./goal";
import { routineRouter } from "./routine";
import { profileRouter } from "./profile";
import { integrationRouter } from "./integration";
import { taskRouter } from "./task";

/**
 * Main application router
 * Add all your routers here
 */
export const appRouter = router({
  goal: goalRouter,
  routine: routineRouter,
  profile: profileRouter,
  integration: integrationRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;

