import { router } from "../context";
import { goalRouter } from "./goal";
import { profileRouter } from "./profile";
import { taskRouter } from "./task";
import { conversationRouter } from "./conversation";
import { notificationRouter } from "./notification";
import { dailyCheckRouter } from "./dailyCheck";
import { weeklyRoastRouter } from "./weeklyRoast";

export const appRouter = router({
  goal: goalRouter,
  profile: profileRouter,
  task: taskRouter,
  conversation: conversationRouter,
  notification: notificationRouter,
  dailyCheck: dailyCheckRouter,
  weeklyRoast: weeklyRoastRouter,
});

export type AppRouter = typeof appRouter;
