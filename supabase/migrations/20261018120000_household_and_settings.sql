-- Njam: who can change what in a household, invite codes, and your own settings
--
-- Backs the Household and Settings tabs on Profile (18 Oct 2026):
--
--   1. Five switches on households, set by the owner: may people edit their
--      own rules, each other's rules, invite people, save products, and see
--      each other's scans. RLS reads them, so the rules hold even if someone
--      skips the app and calls the API directly.
--   2. household_invites: an eight-character code an owner shares, and
--      join_household(), which moves you into the household it belongs to.
--   3. Functions for the buttons that move people between households:
--      leave, remove someone, hand over ownership, delete the household.
--      They change users.household_id and users.role, which the app itself
--      may not (see 20261013063914_lock_user_role_and_household.sql), so they
--      are SECURITY DEFINER and check every condition themselves.
--   4. user_settings: your notification and privacy choices, one row each.
--
-- Settings that only change how this phone behaves (flashlight, vibration)
-- are not here. They live on the phone, in src/lib/device-settings.ts.

-- ---------------------------------------------------------------------------
-- 1. Who can change what
-- ---------------------------------------------------------------------------

alter table public.households
  add column members_edit_own_rules boolean not null default true,
  add column members_edit_others    boolean not null default false,
  add column only_owner_invites     boolean not null default true,
  add column members_save_products  boolean not null default true,
  add column share_scan_history     boolean not null default true;

-- Is the caller the one who runs their household? An admin is granted from
-- the dashboard and keeps their household, so they count as its owner too.
create or replace function public.is_household_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role in ('owner', 'admin') from public.users where id = auth.uid()), false);
$$;

-- May the caller change this diet profile and its rules? Only inside their
-- own household, and then: the owner always; anyone else for their own
-- profile if the owner allows it, or for any profile if the owner allows that.
create or replace function public.can_edit_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.diet_profiles p
    join public.households h on h.id = p.household_id
    where p.id = target
      and p.household_id = public.current_household_id()
      and (
        public.is_household_owner()
        or (p.user_id = auth.uid() and h.members_edit_own_rules)
        or h.members_edit_others
      )
  );
$$;

-- May the caller make or cancel an invite code for their household?
create or replace function public.can_invite()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_household_owner()
      or coalesce((select not only_owner_invites from public.households where id = public.current_household_id()), false);
$$;

revoke execute on function public.is_household_owner() from public, anon;
revoke execute on function public.can_edit_profile(uuid) from public, anon;
revoke execute on function public.can_invite() from public, anon;

-- Only the owner changes the household itself: its name and the switches.
alter policy households_update on public.households
  using (id = public.current_household_id() and public.is_household_owner())
  with check (id = public.current_household_id() and public.is_household_owner());

-- Diet profiles: everyone in the household still sees all of them and may add
-- one (someone without a phone). Changing or deleting one now asks
-- can_edit_profile.
drop policy diet_profiles_all on public.diet_profiles;

create policy diet_profiles_select on public.diet_profiles
  for select to authenticated
  using (household_id = public.current_household_id());

create policy diet_profiles_insert on public.diet_profiles
  for insert to authenticated
  with check (household_id = public.current_household_id());

create policy diet_profiles_update on public.diet_profiles
  for update to authenticated
  using (public.can_edit_profile(id))
  with check (household_id = public.current_household_id());

create policy diet_profiles_delete on public.diet_profiles
  for delete to authenticated
  using (public.can_edit_profile(id));

-- Profile rules: read through the profile as before; written only where
-- can_edit_profile says yes.
drop policy profile_rules_all on public.profile_rules;

create policy profile_rules_select on public.profile_rules
  for select to authenticated
  using (
    exists (
      select 1 from public.diet_profiles p
      where p.id = profile_rules.diet_profile_id
        and p.household_id = public.current_household_id()
    )
  );

create policy profile_rules_insert on public.profile_rules
  for insert to authenticated
  with check (public.can_edit_profile(diet_profile_id));

create policy profile_rules_update on public.profile_rules
  for update to authenticated
  using (public.can_edit_profile(diet_profile_id))
  with check (public.can_edit_profile(diet_profile_id));

create policy profile_rules_delete on public.profile_rules
  for delete to authenticated
  using (public.can_edit_profile(diet_profile_id));

-- Scans: you always see your own. Other people's only while the household
-- shares its scan history.
alter policy scans_select on public.scans
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.users u
      join public.households h on h.id = u.household_id
      where u.id = scans.user_id
        and u.household_id = public.current_household_id()
        and h.share_scan_history
    )
  );

-- Saved products: anyone may still remove a save, but adding one needs the
-- owner, or the owner's go-ahead for everyone.
alter policy saved_products_insert on public.saved_products
  with check (
    household_id = (select public.current_household_id())
    and saved_by = (select auth.uid())
    and (
      public.is_household_owner()
      or coalesce((select members_save_products from public.households where id = public.current_household_id()), false)
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Invite codes
-- ---------------------------------------------------------------------------

-- One live code per household. Stored without spaces, in capitals; the app
-- shows it as two groups of four ("4F8A 21C9") and accepts it typed any way.
create table public.household_invites (
  code          text primary key,
  household_id  uuid not null unique references public.households (id) on delete cascade,
  created_by    uuid not null default auth.uid() references public.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- A code shared by mistake stops working on its own.
  expires_at    timestamptz not null default now() + interval '7 days'
);

alter table public.household_invites enable row level security;

create policy household_invites_select on public.household_invites
  for select to authenticated
  using (household_id = public.current_household_id());

create policy household_invites_insert on public.household_invites
  for insert to authenticated
  with check (household_id = public.current_household_id() and public.can_invite());

create policy household_invites_delete on public.household_invites
  for delete to authenticated
  using (household_id = public.current_household_id() and public.can_invite());

-- Makes a new code for your household, replacing the old one. Runs as the
-- caller, so the policies above decide whether they may. The 32 bits come
-- from gen_random_uuid(), which uses a cryptographic random source, so a code
-- cannot be guessed from the last one.
create or replace function public.create_household_invite()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  fresh text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
begin
  delete from public.household_invites where household_id = public.current_household_id();
  insert into public.household_invites (code, household_id)
  values (fresh, public.current_household_id());
  return fresh;
end;
$$;

revoke execute on function public.create_household_invite() from public, anon;
grant execute on function public.create_household_invite() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Moving people between households
-- ---------------------------------------------------------------------------

-- Gives one person a household of their own again, as its owner, and takes
-- their own diet profiles (and so their rules) with them. Used by leave,
-- remove and delete below. Never callable from the app on its own.
create or replace function public.move_to_new_household(person uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fresh uuid := gen_random_uuid();
  who text;
begin
  select display_name into who from public.users where id = person;
  insert into public.households (id, name) values (fresh, who || '''s household');
  update public.users
    set household_id = fresh,
        role = case when role = 'admin' then 'admin' else 'owner' end
    where id = person;
  update public.diet_profiles set household_id = fresh, is_default = true where user_id = person;
end;
$$;

revoke execute on function public.move_to_new_household(uuid) from public, anon, authenticated;

-- A household nobody belongs to any more is deleted, with its profiles for
-- people without a phone, its invite code and its saved products.
create or replace function public.delete_household_if_empty(target uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.households h
  where h.id = target
    and not exists (select 1 from public.users u where u.household_id = target);
$$;

revoke execute on function public.delete_household_if_empty(uuid) from public, anon, authenticated;

-- Join the household an invite code belongs to. You keep your own rules; they
-- move with you. An owner who still has other people in their household has
-- to hand it over first, so nobody is left in a household without an owner.
create or replace function public.join_household(invite_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  target uuid;
  old_household uuid;
  my_role text;
begin
  select household_id into target
  from public.household_invites
  where code = upper(regexp_replace(invite_code, '\s', '', 'g'))
    and expires_at > now();
  if target is null then
    raise exception 'That code did not work. Check it, or ask for a new one.';
  end if;

  select household_id, role into old_household, my_role from public.users where id = me;
  if old_household = target then
    return;
  end if;
  if my_role = 'owner' and exists (
    select 1 from public.users where household_id = old_household and id <> me
  ) then
    raise exception 'Hand over your household before you join another one.';
  end if;

  update public.users
    set household_id = target,
        role = case when role = 'admin' then 'admin' else 'standard' end
    where id = me;
  -- The household you join already has a default profile.
  update public.diet_profiles set household_id = target, is_default = false where user_id = me;
  perform public.delete_household_if_empty(old_household);
end;
$$;

revoke execute on function public.join_household(text) from public, anon;
grant execute on function public.join_household(text) to authenticated;

-- Leave your household and start your own again. The owner cannot leave
-- while others are still in it; they hand it over or delete it.
create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  old_household uuid := public.current_household_id();
begin
  if public.is_household_owner() and exists (
    select 1 from public.users where household_id = old_household and id <> me
  ) then
    raise exception 'Hand over your household before you leave it.';
  end if;
  perform public.move_to_new_household(me);
  perform public.delete_household_if_empty(old_household);
end;
$$;

revoke execute on function public.leave_household() from public, anon;
grant execute on function public.leave_household() to authenticated;

-- The owner takes someone with an account out of the household. They keep
-- their rules, in a household of their own.
create or replace function public.remove_member(person uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_household_owner() then
    raise exception 'Only the owner can remove someone.';
  end if;
  if person = auth.uid() or not exists (
    select 1 from public.users where id = person and household_id = public.current_household_id()
  ) then
    raise exception 'That person is not in your household.';
  end if;
  perform public.move_to_new_household(person);
end;
$$;

revoke execute on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;

-- The owner makes someone else the owner and becomes a standard member.
create or replace function public.hand_over_ownership(new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if not public.is_household_owner() then
    raise exception 'Only the owner can hand the household over.';
  end if;
  if new_owner = me or not exists (
    select 1 from public.users where id = new_owner and household_id = public.current_household_id()
  ) then
    raise exception 'That person is not in your household.';
  end if;
  update public.users set role = 'owner' where id = new_owner and role <> 'admin';
  update public.users set role = 'standard' where id = me and role = 'owner';
end;
$$;

revoke execute on function public.hand_over_ownership(uuid) from public, anon;
grant execute on function public.hand_over_ownership(uuid) to authenticated;

-- The owner ends the household. Everyone with an account, the owner too, gets
-- a household of their own and keeps their rules. Profiles for people without
-- a phone, the invite code and the saved products are deleted with it.
create or replace function public.delete_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_household uuid := public.current_household_id();
  person uuid;
begin
  if not public.is_household_owner() then
    raise exception 'Only the owner can delete the household.';
  end if;
  for person in select id from public.users where household_id = old_household loop
    perform public.move_to_new_household(person);
  end loop;
  perform public.delete_household_if_empty(old_household);
end;
$$;

revoke execute on function public.delete_household() from public, anon;
grant execute on function public.delete_household() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Your own settings
-- ---------------------------------------------------------------------------

-- One row per person, made the first time they change a setting. Until then
-- the app uses the same defaults as these columns.
create table public.user_settings (
  user_id                uuid primary key default auth.uid() references public.users (id) on delete cascade,
  notify_recalls         boolean not null default true,
  notify_label_changes   boolean not null default true,
  notify_household       boolean not null default true,
  notify_weekly_summary  boolean not null default false,
  -- No notifications between these times. Both null means quiet hours are off.
  quiet_from             time default '21:00',
  quiet_until            time default '07:00',
  -- Off: your scans are not written to the scans table at all.
  keep_scan_history      boolean not null default true,
  help_improve           boolean not null default false,
  updated_at             timestamptz not null default now(),
  constraint user_settings_quiet_hours_both_or_neither
    check ((quiet_from is null) = (quiet_until is null))
);

alter table public.user_settings enable row level security;

create policy user_settings_select on public.user_settings
  for select to authenticated
  using (user_id = auth.uid());

create policy user_settings_insert on public.user_settings
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_settings_update on public.user_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
