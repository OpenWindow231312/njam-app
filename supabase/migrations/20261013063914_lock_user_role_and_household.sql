-- Njam: stop a person giving themselves a role or a household
--
-- The first migration let a signed-in person update their own row in
-- public.users freely. RLS checks WHICH row you may change, not WHICH
-- columns, so anyone could run
--   update users set role = 'admin' where id = auth.uid()
-- and become an admin, or set household_id to another household's id and
-- read that household's profiles and scans. Insert had the same gap at
-- sign-up. This migration closes both.

-- ---------------------------------------------------------------------------
-- Update: only your own display name
-- ---------------------------------------------------------------------------

-- Column privileges sit underneath RLS. Taking UPDATE away from the whole
-- table and giving it back for display_name alone means role and
-- household_id can no longer be changed from the app at all. An admin role
-- is granted from the Supabase dashboard (or a future Edge Function with
-- the service role), never by the person themselves.
revoke update on public.users from anon, authenticated;
grant update (display_name) on public.users to authenticated;

-- ---------------------------------------------------------------------------
-- Insert: only yourself, as the owner of a brand-new household
-- ---------------------------------------------------------------------------

-- Is anyone already in this household? SECURITY DEFINER for the same reason
-- as current_household_id(): a policy on users that reads users would
-- otherwise recurse. It answers yes or no and exposes nothing else.
create or replace function public.household_is_empty(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.users where household_id = target);
$$;

revoke execute on function public.household_is_empty(uuid) from public, anon;
grant execute on function public.household_is_empty(uuid) to authenticated;

-- Sign-up (AuthProvider.createMember) creates a household and then the
-- person's row as its owner. That is the only shape allowed now:
--   owner    - of a household nobody belongs to yet, i.e. the one just made.
--   standard - with no household. Joining an existing household will need an
--              invite, checked on the server, not a household id typed in.
-- Nobody can insert themselves as admin.
-- ALTER rather than drop and re-create: the policy keeps its name and role,
-- and only its check changes.
alter policy users_insert on public.users
  with check (
    id = auth.uid()
    and (
      (role = 'owner' and household_id is not null and public.household_is_empty(household_id))
      or (role = 'standard' and household_id is null)
    )
  );

-- Anonymous visitors never write to users.
revoke insert on public.users from anon;
