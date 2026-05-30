-- SRHXtra Player of the Season poll schema.
-- Run this in the Supabase SQL editor, then enable Anonymous sign-ins in Auth settings.

create extension if not exists pgcrypto;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  player_slug text not null,
  label text not null,
  role text,
  image_url text,
  image_alt text,
  reason text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, poll_id),
  unique (poll_id, player_slug)
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null,
  voter_id uuid not null,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id),
  foreign key (option_id, poll_id) references public.poll_options(id, poll_id) on delete cascade
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.polls to anon, authenticated;
grant select on public.poll_options to anon, authenticated;
grant select, insert on public.poll_votes to authenticated;
revoke update, delete on public.poll_votes from anon, authenticated;

drop policy if exists "Anyone can read active polls" on public.polls;
create policy "Anyone can read active polls"
on public.polls
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Anyone can read active poll options" on public.poll_options;
create policy "Anyone can read active poll options"
on public.poll_options
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.polls
    where polls.id = poll_options.poll_id
      and polls.is_active = true
  )
);

drop policy if exists "Voters can read their own poll vote" on public.poll_votes;
create policy "Voters can read their own poll vote"
on public.poll_votes
for select
to authenticated
using (auth.uid() = voter_id);

drop policy if exists "Anonymous users can insert their own vote" on public.poll_votes;
create policy "Anonymous users can insert their own vote"
on public.poll_votes
for insert
to authenticated
with check (
  auth.uid() = voter_id
  and exists (
    select 1
    from public.polls
    join public.poll_options on poll_options.poll_id = polls.id
    where polls.id = poll_votes.poll_id
      and poll_options.id = poll_votes.option_id
      and polls.is_active = true
  )
);

create or replace view public.poll_results as
select
  polls.slug as poll_slug,
  polls.title as poll_title,
  poll_options.id as option_id,
  poll_options.player_slug,
  poll_options.label,
  poll_options.sort_order,
  count(poll_votes.id)::integer as vote_count
from public.polls
join public.poll_options on poll_options.poll_id = polls.id
left join public.poll_votes on poll_votes.option_id = poll_options.id
group by
  polls.slug,
  polls.title,
  poll_options.id,
  poll_options.player_slug,
  poll_options.label,
  poll_options.sort_order
order by polls.slug, vote_count desc, poll_options.sort_order asc;

revoke all on public.poll_results from anon, authenticated;

insert into public.polls (slug, title, description, is_active)
values (
  'srh-player-of-the-season-2026',
  'SRH Player of the Season',
  'Pick the player who defined SRH''s IPL 2026 campaign.',
  true
)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

with selected_poll as (
  select id from public.polls where slug = 'srh-player-of-the-season-2026'
)
delete from public.poll_options
where poll_id = (select id from selected_poll)
  and player_slug not in (
    'ishan-kishan',
    'abhishek-sharma',
    'heinrich-klaasen',
    'eshan-malinga',
    'sakib-hussain'
  );

with selected_poll as (
  select id from public.polls where slug = 'srh-player-of-the-season-2026'
)
insert into public.poll_options (
  poll_id,
  player_slug,
  label,
  role,
  image_url,
  image_alt,
  reason,
  sort_order
)
select
  selected_poll.id,
  seed.player_slug,
  seed.label,
  seed.role,
  seed.image_url,
  seed.image_alt,
  seed.reason,
  seed.sort_order
from selected_poll
cross join (
  values
    (
      'ishan-kishan',
      'Ishan Kishan',
      'Wicketkeeper Batter',
      'https://documents.iplt20.com/ipl/IPLHeadshot2026/164.png',
      'Ishan Kishan official SRH headshot',
      'Top-order control, wicketkeeping impact, and Player of the Match turns in the run-in.',
      1
    ),
    (
      'abhishek-sharma',
      'Abhishek Sharma',
      'All-rounder',
      'https://documents.iplt20.com/ipl/IPLHeadshot2026/212.png',
      'Abhishek Sharma official SRH headshot',
      'Powerplay intent that kept SRH''s batting identity aggressive all season.',
      2
    ),
    (
      'heinrich-klaasen',
      'Heinrich Klaasen',
      'Wicketkeeper Batter',
      'https://documents.iplt20.com/ipl/IPLHeadshot2026/202.png',
      'Heinrich Klaasen official SRH headshot',
      'Middle-over force, spin pressure breaker, and one of SRH''s most reliable finishers.',
      3
    ),
    (
      'eshan-malinga',
      'Eshan Malinga',
      'Bowler',
      'https://documents.iplt20.com/ipl/IPLHeadshot2026/3339.png',
      'Eshan Malinga official SRH headshot',
      'SRH''s leading wicket-taker, with control across high-scoring games and repeated middle/death-over impact.',
      4
    ),
    (
      'sakib-hussain',
      'Sakib Hussain',
      'Bowler',
      'https://documents.iplt20.com/ipl/IPLHeadshot2026/3104.png',
      'Sakib Hussain official SRH headshot',
      'High-impact wicket-taking season with the best economy among SRH''s regular pace options.',
      5
    )
) as seed(player_slug, label, role, image_url, image_alt, reason, sort_order)
on conflict (poll_id, player_slug) do update
set
  label = excluded.label,
  role = excluded.role,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  reason = excluded.reason,
  sort_order = excluded.sort_order;
