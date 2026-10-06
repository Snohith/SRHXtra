-- SRHXtra poll: make the aggregated tally publicly readable.
--
-- Background: supabase/player-season-poll.sql revokes every privilege on the
-- `poll_results` view from anon/authenticated, so the view is dashboard-only.
-- Individual votes stay private (a voter can only select their own row in
-- `poll_votes`), but the player-poll page needs the *counts* to render a
-- real live standings table instead of hardcoded numbers.
--
-- Run this once in the Supabase SQL editor AFTER player-season-poll.sql:
--
--   * anon/authenticated gain SELECT on the aggregate view only.
--   * No access to individual voter rows is granted.
--   * Voters still cannot update or delete votes (unchanged).
--
-- The frontend reads this view when it can and otherwise states honestly
-- that the live tally is unavailable — never invent vote shares.

grant select on public.poll_results to anon, authenticated;
