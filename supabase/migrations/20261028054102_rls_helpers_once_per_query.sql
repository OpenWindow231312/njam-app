-- Row Level Security: call the sign-in helpers once per query, not once per row.
--
-- A policy is checked against every row a query touches. Written as
-- auth.uid() or public.current_household_id(), the helper runs again for each
-- of those rows, and current_household_id() is itself a lookup in users.
-- Written as (select auth.uid()), Postgres runs it once, keeps the answer and
-- compares every row with it. The answer cannot change partway through a
-- query, so who can see and change what stays exactly as it was.
--
-- This is the fix Supabase's performance advisor asks for ("Auth RLS
-- Initialization Plan"). The rule here: a helper that takes no argument is
-- wrapped in (select ...). can_edit_profile(id) takes the row's own id, so it
-- has to run per row and is left alone.
--
-- alter policy keeps each policy's name, command and role, and only replaces
-- the expressions given.

-- Users ---------------------------------------------------------------------

alter policy users_select on public.users
  using (
    id = (select auth.uid())
    or household_id = (select public.current_household_id())
    or (select public.is_admin())
  );

alter policy users_insert on public.users
  with check (
    id = (select auth.uid())
    and (
      (role = 'owner' and household_id is not null and public.household_is_empty(household_id))
      or (role = 'standard' and household_id is null)
    )
  );

alter policy users_update on public.users
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Households ----------------------------------------------------------------

alter policy households_select on public.households
  using (id = (select public.current_household_id()) or (select public.is_admin()));

alter policy households_update on public.households
  using (id = (select public.current_household_id()) and (select public.is_household_owner()))
  with check (id = (select public.current_household_id()) and (select public.is_household_owner()));

-- Diet profiles and their rules ---------------------------------------------

alter policy diet_profiles_select on public.diet_profiles
  using (household_id = (select public.current_household_id()));

alter policy diet_profiles_insert on public.diet_profiles
  with check (household_id = (select public.current_household_id()));

-- Its using clause, can_edit_profile(id), stays as it is.
alter policy diet_profiles_update on public.diet_profiles
  with check (household_id = (select public.current_household_id()));

alter policy profile_rules_select on public.profile_rules
  using (
    exists (
      select 1 from public.diet_profiles p
      where p.id = profile_rules.diet_profile_id
        and p.household_id = (select public.current_household_id())
    )
  );

-- Scans ---------------------------------------------------------------------

alter policy scans_select on public.scans
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.users u
      join public.households h on h.id = u.household_id
      where u.id = scans.user_id
        and u.household_id = (select public.current_household_id())
        and h.share_scan_history
    )
  );

alter policy scans_insert on public.scans
  with check (user_id = (select auth.uid()));

alter policy scans_delete on public.scans
  using (user_id = (select auth.uid()));

-- Saved products ------------------------------------------------------------

alter policy saved_products_insert on public.saved_products
  with check (
    household_id = (select public.current_household_id())
    and saved_by = (select auth.uid())
    and (
      (select public.is_household_owner())
      or coalesce(
        (select h.members_save_products from public.households h
         where h.id = (select public.current_household_id())),
        false
      )
    )
  );

-- Household invites ---------------------------------------------------------

alter policy household_invites_select on public.household_invites
  using (household_id = (select public.current_household_id()));

alter policy household_invites_insert on public.household_invites
  with check (household_id = (select public.current_household_id()) and (select public.can_invite()));

alter policy household_invites_delete on public.household_invites
  using (household_id = (select public.current_household_id()) and (select public.can_invite()));

-- User settings -------------------------------------------------------------

alter policy user_settings_select on public.user_settings
  using (user_id = (select auth.uid()));

alter policy user_settings_insert on public.user_settings
  with check (user_id = (select auth.uid()));

alter policy user_settings_update on public.user_settings
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Catalogue: adding a product -----------------------------------------------

alter policy products_insert on public.products
  with check (created_by = (select auth.uid()) and verified = false);

alter policy product_ingredients_insert on public.product_ingredients
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_ingredients.product_id and p.created_by = (select auth.uid())
    )
    or (select public.is_admin())
  );

alter policy nutrition_facts_insert on public.nutrition_facts
  with check (
    exists (
      select 1 from public.products p
      where p.id = nutrition_facts.product_id and p.created_by = (select auth.uid())
    )
    or (select public.is_admin())
  );

-- Catalogue: admin-only edits -----------------------------------------------
-- The *_write policies are "for all", so they are also checked on every read
-- of categories and allergens, next to the policy that lets everyone read.

alter policy categories_write on public.categories
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter policy allergens_write on public.allergens
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter policy ingredients_update on public.ingredients
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter policy ingredients_delete on public.ingredients
  using ((select public.is_admin()));

alter policy products_update on public.products
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter policy products_delete on public.products
  using ((select public.is_admin()));

alter policy product_ingredients_write on public.product_ingredients
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter policy product_ingredients_delete on public.product_ingredients
  using ((select public.is_admin()));

alter policy nutrition_facts_update on public.nutrition_facts
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter policy nutrition_facts_delete on public.nutrition_facts
  using ((select public.is_admin()));
