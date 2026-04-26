-- DESTRUCTIVE: drops four tables that are no longer referenced by application code.
-- Audit (2026-04-26):
--   accountability_scores — scores are computed on-the-fly in accountabilityScoreRouter
--                           from tasks + daily_checks; never read or written.
--   evidence              — no .from('evidence') anywhere; feature removed.
--   patterns              — pattern engine writes to coach_memory now, not patterns.
--   user_feedback         — no .from('user_feedback') anywhere; feature removed.
--
-- Any rows currently in these tables will be permanently lost. Export first if
-- you might want them. Run only after profile.ts has stopped referencing them
-- in its delete sweep.

DROP TABLE IF EXISTS accountability_scores CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS patterns CASCADE;
DROP TABLE IF EXISTS user_feedback CASCADE;
