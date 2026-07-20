import { router } from "../context";
import { goalRouter } from "./goal";
import { profileRouter } from "./profile";
import { taskRouter } from "./task";
import { conversationRouter } from "./conversation";
import { notificationRouter } from "./notification";
import { dailyCheckRouter } from "./dailyCheck";
import { weeklyRoastRouter } from "./weeklyRoast";
import { accountabilityScoreRouter } from "./accountabilityScore";
import { retentionRouter } from "./retention";
import { mcpTokenRouter } from "./mcpToken";

export const appRouter = router({
  goal: goalRouter,
  profile: profileRouter,
  task: taskRouter,
  conversation: conversationRouter,
  notification: notificationRouter,
  dailyCheck: dailyCheckRouter,
  weeklyRoast: weeklyRoastRouter,
  accountabilityScore: accountabilityScoreRouter,
  retention: retentionRouter,
  mcpToken: mcpTokenRouter,
});

export type AppRouter = typeof appRouter;
