# Supabase Poll Setup

This site remains a static export. The poll uses the browser Supabase client, Supabase anonymous auth, Row Level Security, and a database uniqueness rule to keep one vote per anonymous browser/device identity.

## 1. Create and Configure Supabase

1. Create a Supabase project.
2. In Supabase, open **Authentication > Providers** and enable **Anonymous sign-ins**.
3. Open the SQL editor and run `supabase/player-season-poll.sql`.
4. Run `supabase/poll-results-public.sql` so the page can read the live tally (counts only — individual voter rows stay private).
5. In **Table Editor**, use the `poll_results` view to see admin vote counts.

## 2. Add Environment Variables

Set these in local `.env.local` and in the deployment provider:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If your Supabase dashboard labels the browser-safe key as a publishable key,
you can use this Vercel variable name instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`:

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Only use the anon key in the frontend. Do not expose the service role key.

## 3. Verification

- Fresh browser: poll loads and accepts one vote.
- Refresh same browser: vote stays locked.
- Duplicate insert from the same anonymous user is rejected by `unique (poll_id, voter_id)`.
- Supabase dashboard: `poll_results` shows vote counts by nominee.
- Without step 4 above, the page saves votes but honestly states the live tally is unavailable instead of showing numbers.
