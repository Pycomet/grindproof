export interface ReengagementCopy {
  subject: string;
  title: string;
  body: string;
  cta: string;
}

export const SAFE_REENTRY_THRESHOLD_DAYS = 3;

function standardNudge(daysMissed: number): ReengagementCopy {
  return {
    subject:
      daysMissed === 1
        ? "Yesterday disappeared. Today is still yours."
        : `${daysMissed} missed days logged. Time to reset.`,
    title:
      daysMissed === 1
        ? "Yesterday got logged as missed."
        : `${daysMissed} missed days logged.`,
    body:
      daysMissed === 1
        ? "That wasn't a missed task. It was a missed day. Logged. Plan today before this week gets away from you."
        : "Silence is now part of the record. No spin. No blanks. Plan today and stop the slide.",
    cta: "Plan today",
  };
}

function safeReentryNudge(daysMissed: number): ReengagementCopy {
  return {
    subject: "Brutal week. Don't disappear now.",
    title: `Brutal stretch: ${daysMissed} missed days.`,
    body: "Most people quit right here. Keep the standard high, keep the door open. One move: plan tomorrow.",
    cta: "Plan tomorrow",
  };
}

export function getReengagementCopy(daysMissed: number): ReengagementCopy {
  if (daysMissed >= SAFE_REENTRY_THRESHOLD_DAYS) {
    return safeReentryNudge(daysMissed);
  }
  return standardNudge(daysMissed);
}
