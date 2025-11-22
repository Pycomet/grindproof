import { router } from "../context";
import { goalRouter } from "./goal";
import { routineRouter } from "./routine";
import { profileRouter } from "./profile";
import { integrationRouter } from "./integration";
import { taskRouter } from "./task";
import { evidenceRouter } from "./evidence";
import { patternRouter } from "./pattern";
import { conversationRouter } from "./conversation";
import { accountabilityScoreRouter } from "./accountabilityScore";
import { uploadRouter } from "./upload";

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
  evidence: evidenceRouter,
  pattern: patternRouter,
  conversation: conversationRouter,
  accountabilityScore: accountabilityScoreRouter,
  upload: uploadRouter,
});

export type AppRouter = typeof appRouter;

