import { router } from "../context";
import { goalRouter } from "./goal";
import { routineRouter } from "./routine";
import { profileRouter } from "./profile";
import { integrationRouter } from "./integration";

/**
 * Main application router
 * Add all your routers here
 */
export const appRouter = router({
  goal: goalRouter,
  routine: routineRouter,
  profile: profileRouter,
  integration: integrationRouter,
});

export type AppRouter = typeof appRouter;

