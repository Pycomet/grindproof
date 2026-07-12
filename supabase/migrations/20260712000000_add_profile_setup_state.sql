-- supabase/migrations/20260712000000_add_profile_setup_state.sql
alter table public.profiles
  add column if not exists setup_state text not null default 'pending'
  constraint profiles_setup_state_check
  check (setup_state in ('pending', 'completed', 'dismissed'));
