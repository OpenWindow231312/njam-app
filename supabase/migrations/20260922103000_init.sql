-- Njam: initial schema
--
-- Eleven tables, Row Level Security on every one of them from this first
-- migration. The shape follows the pitch: a household owns people, a person
-- owns diet profiles, a diet profile owns rules, and a scan records what the
-- engine decided and why.
--
-- Catalogue tables (products, ingredients, allergens, categories, and the two
-- that hang off products) are shared by everyone. Personal tables are scoped
-- to one household and never leak across households.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Households and people
-- ---------------------------------------------------------------------------

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

comment on table public.households is
  'A group of people who share a product catalogue and can scan on each other''s behalf.';

-- One row per signed-in person. Mirrors auth.users, which Supabase owns and we
-- cannot add columns to. The id is the same id, so a join is never needed.
create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  household_id  uuid references public.households (id) on delete set null,
  display_name  text not null,
  role          text not null default 'standard'
                check (role in ('owner', 'standard', 'admin')),
  created_at    timestamptz not null default now()
);

create index users_household_id_idx on public.users (household_id);

-- ---------------------------------------------------------------------------
-- Diet profiles and rules
-- ---------------------------------------------------------------------------

-- A profile is the thing a scan is checked against. It usually belongs to a
-- person, but user_id is nullable on purpose: a household keeps a profile for a
-- child or a guest who has no login of their own.
create table public.diet_profiles (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  user_id       uuid references public.users (id) on delete set null,
  name          text not null,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index diet_profiles_household_id_idx on public.diet_profiles (household_id);

-- Deliberately generic, so a new rule category needs no migration.
--
--   type       what kind of rule this is. Currently one of:
--              'allergen', 'ingredient', 'e_number', 'nutrient', 'diet', 'preset'.
--              Left unconstrained on purpose. A CHECK here would mean a
--              migration every time a category is added, which is exactly what
--              this table exists to avoid.
--   target     what the rule is about: an allergen slug, an ingredient name,
--              'E220', 'carbohydrate'.
--   operator   how target and threshold are compared. This IS constrained,
--              because the engine implements a fixed set of comparisons.
--   threshold  the number, for numeric rules. Null for exclusions.
--   unit       the unit that threshold is in: 'g', 'mg', 'kJ'.
--   severity   for allergens: 'mild', 'moderate', 'severe'. Null otherwise.
create table public.profile_rules (
  id               uuid primary key default gen_random_uuid(),
  diet_profile_id  uuid not null references public.diet_profiles (id) on delete cascade,
  type             text not null,
  target           text not null,
  operator         text not null
                   check (operator in ('excludes', 'requires', 'lte', 'gte', 'equals')),
  threshold        numeric,
  unit             text,
  severity         text check (severity in ('mild', 'moderate', 'severe')),
  created_at       timestamptz not null default now()
);

create index profile_rules_diet_profile_id_idx on public.profile_rules (diet_profile_id);

-- A numeric rule is meaningless without a number, and an exclusion is
-- meaningless with one. Catch both at the database rather than in the engine.
alter table public.profile_rules
  add constraint profile_rules_threshold_matches_operator
  check (
    (operator in ('lte', 'gte', 'equals') and threshold is not null)
    or
    (operator in ('excludes', 'requires') and threshold is null)
  );

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  parent_id  uuid references public.categories (id) on delete set null
);

-- The eight allergens R146 requires to be declared, plus any others worth
-- tracking.
create table public.allergens (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  slug  text not null unique
);

-- canonical_id lets an alias point at the real ingredient: 'milk solids',
-- 'whey powder' and 'casein' all resolve to 'milk'. The verdict engine follows
-- this chain before it checks a rule.
create table public.ingredients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  canonical_id  uuid references public.ingredients (id) on delete set null,
  allergen_id   uuid references public.allergens (id) on delete set null,
  e_number      text,
  created_at    timestamptz not null default now()
);

create index ingredients_canonical_id_idx on public.ingredients (canonical_id);
create index ingredients_allergen_id_idx on public.ingredients (allergen_id);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  barcode      text not null unique,
  name         text not null,
  brand        text,
  category_id  uuid references public.categories (id) on delete set null,
  image_url    text,
  serving_size numeric,
  serving_unit text,
  -- False means the record came from an AI label read and nobody has checked it.
  -- The engine caps an unverified product at Caution. It can never be Safe.
  verified     boolean not null default false,
  source       text not null default 'user'
               check (source in ('user', 'ai_label_read', 'seed', 'admin')),
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_verified_idx on public.products (verified);

-- Ordered, because an ingredient list is ordered by quantity and that order is
-- information a person uses.
create table public.product_ingredients (
  product_id     uuid not null references public.products (id) on delete cascade,
  ingredient_id  uuid not null references public.ingredients (id) on delete cascade,
  position       integer not null,
  primary key (product_id, ingredient_id)
);

create index product_ingredients_ingredient_id_idx
  on public.product_ingredients (ingredient_id);

-- One row per product. Values are per the basis named in per_basis, which is
-- what the label itself states.
create table public.nutrition_facts (
  product_id    uuid primary key references public.products (id) on delete cascade,
  per_basis     text not null default '100g'
                check (per_basis in ('100g', '100ml', 'serving')),
  energy_kj     numeric,
  protein_g     numeric,
  carbs_g       numeric,
  sugar_g       numeric,
  fat_g         numeric,
  sat_fat_g     numeric,
  fibre_g       numeric,
  sodium_mg     numeric
);

-- ---------------------------------------------------------------------------
-- Scans
-- ---------------------------------------------------------------------------

-- product_id is nullable: a scan of a barcode that is not in the catalogue yet
-- is still a scan worth recording, and it is what feeds "Add a product".
-- reasons holds the lines the verdict screen shows, so a past scan can be
-- reopened and read exactly as it was, even if the rules have changed since.
create table public.scans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  diet_profile_id  uuid not null references public.diet_profiles (id) on delete cascade,
  product_id       uuid references public.products (id) on delete set null,
  barcode          text not null,
  verdict          text not null check (verdict in ('safe', 'caution', 'unsafe')),
  reasons          jsonb not null default '[]'::jsonb,
  scanned_at       timestamptz not null default now()
);

create index scans_user_id_scanned_at_idx on public.scans (user_id, scanned_at desc);
create index scans_diet_profile_id_idx on public.scans (diet_profile_id);

-- ---------------------------------------------------------------------------
-- Helpers used by the policies below
-- ---------------------------------------------------------------------------

-- These read public.users, which itself has RLS. A policy that queries the same
-- table it protects recurses forever, so both are SECURITY DEFINER: they run as
-- the function owner and skip RLS. They take no arguments and expose nothing
-- beyond the caller's own household and role, so this is safe.

create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.households          enable row level security;
alter table public.users               enable row level security;
alter table public.diet_profiles       enable row level security;
alter table public.profile_rules       enable row level security;
alter table public.scans               enable row level security;
alter table public.categories          enable row level security;
alter table public.allergens           enable row level security;
alter table public.ingredients         enable row level security;
alter table public.products            enable row level security;
alter table public.product_ingredients enable row level security;
alter table public.nutrition_facts     enable row level security;

-- Households: you see and change your own.
create policy households_select on public.households
  for select to authenticated
  using (id = public.current_household_id() or public.is_admin());

create policy households_insert on public.households
  for insert to authenticated
  with check (true);  -- creating a household is how a new person gets started

create policy households_update on public.households
  for update to authenticated
  using (id = public.current_household_id())
  with check (id = public.current_household_id());

-- Users: you see everyone in your household, you change only yourself.
create policy users_select on public.users
  for select to authenticated
  using (id = auth.uid() or household_id = public.current_household_id() or public.is_admin());

create policy users_insert on public.users
  for insert to authenticated
  with check (id = auth.uid());

create policy users_update on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Diet profiles: household-scoped, all four verbs.
create policy diet_profiles_all on public.diet_profiles
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- Profile rules: reached through their profile, so the household check follows
-- the foreign key.
create policy profile_rules_all on public.profile_rules
  for all to authenticated
  using (
    exists (
      select 1 from public.diet_profiles p
      where p.id = profile_rules.diet_profile_id
        and p.household_id = public.current_household_id()
    )
  )
  with check (
    exists (
      select 1 from public.diet_profiles p
      where p.id = profile_rules.diet_profile_id
        and p.household_id = public.current_household_id()
    )
  );

-- Scans: you read your household's scan history, you write only your own scans.
create policy scans_select on public.scans
  for select to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = scans.user_id
        and u.household_id = public.current_household_id()
    )
  );

create policy scans_insert on public.scans
  for insert to authenticated
  with check (user_id = auth.uid());

create policy scans_delete on public.scans
  for delete to authenticated
  using (user_id = auth.uid());

-- Catalogue: every signed-in person reads it. Anyone may add a product they
-- scanned, because that is the "Add a product" flow. Only an admin may edit or
-- remove one, because an edit to a shared record affects every household.

create policy categories_select on public.categories
  for select to authenticated using (true);
create policy categories_write on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy allergens_select on public.allergens
  for select to authenticated using (true);
create policy allergens_write on public.allergens
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy ingredients_select on public.ingredients
  for select to authenticated using (true);
create policy ingredients_insert on public.ingredients
  for insert to authenticated with check (true);
create policy ingredients_update on public.ingredients
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ingredients_delete on public.ingredients
  for delete to authenticated using (public.is_admin());

create policy products_select on public.products
  for select to authenticated using (true);

-- A person may add a product, but may not declare it verified. Only the admin
-- review queue does that. This is the database half of "no false Safe".
create policy products_insert on public.products
  for insert to authenticated
  with check (created_by = auth.uid() and verified = false);

create policy products_update on public.products
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy products_delete on public.products
  for delete to authenticated using (public.is_admin());

create policy product_ingredients_select on public.product_ingredients
  for select to authenticated using (true);
create policy product_ingredients_insert on public.product_ingredients
  for insert to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_ingredients.product_id and p.created_by = auth.uid()
    )
    or public.is_admin()
  );
create policy product_ingredients_write on public.product_ingredients
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy product_ingredients_delete on public.product_ingredients
  for delete to authenticated using (public.is_admin());

create policy nutrition_facts_select on public.nutrition_facts
  for select to authenticated using (true);
create policy nutrition_facts_insert on public.nutrition_facts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = nutrition_facts.product_id and p.created_by = auth.uid()
    )
    or public.is_admin()
  );
create policy nutrition_facts_update on public.nutrition_facts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy nutrition_facts_delete on public.nutrition_facts
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed: the eight allergens R146 requires to be declared on a label
-- ---------------------------------------------------------------------------

insert into public.allergens (name, slug) values
  ('Cow''s milk',            'milk'),
  ('Eggs',                   'egg'),
  ('Fish',                   'fish'),
  ('Crustaceans and molluscs', 'crustacean-mollusc'),
  ('Peanuts',                'peanut'),
  ('Soybeans',               'soy'),
  ('Tree nuts',              'tree-nut'),
  ('Gluten-containing cereals', 'gluten')
on conflict (slug) do nothing;
