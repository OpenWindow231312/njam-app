-- Test data for the demo: a second profile in owner@njam.test's household,
-- a child with no account of their own, so "Viewing for" on the Verdict
-- screen has someone to switch to before the Household screen exists.
--
-- The household is found by the test account's email rather than a fixed id,
-- so on a database without that account this inserts nothing.
with owner_household as (
  select u.household_id
  from public.users u
  join auth.users a on a.id = u.id
  where a.email = 'owner@njam.test'
),
child as (
  insert into public.diet_profiles (household_id, user_id, name, is_default)
  select household_id, null, 'Thabo', false from owner_household
  returning id
)
insert into public.profile_rules (diet_profile_id, type, target, operator, severity)
select id, 'allergen', 'gluten', 'excludes', 'severe' from child;
