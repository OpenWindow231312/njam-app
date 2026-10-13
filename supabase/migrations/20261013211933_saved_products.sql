-- Njam: saved products
--
-- One new table. A product you bookmark on Home or on the product page is
-- saved for your whole household, so a parent who saves the rusks their child
-- can eat sees them on the other parent's phone too.
--
-- A save stores only which product it is, never a verdict. The app runs the
-- verdict engine again when it shows a saved product, so a saved product
-- always shows the verdict for your rules as they are today.

create table public.saved_products (
  -- Filled in from the person saving, so the app never sends a household id.
  household_id  uuid not null default public.current_household_id()
                references public.households (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  saved_by      uuid not null default auth.uid()
                references public.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- A product is saved once per household, however many people tap the bookmark.
  primary key (household_id, product_id)
);

-- The primary key already covers lookups by household. This one is for the
-- foreign key, so deleting a product does not scan the whole table.
create index saved_products_product_id_idx on public.saved_products (product_id);

alter table public.saved_products enable row level security;

-- You see, add and remove saves for your own household only. No update
-- policy: a save is added or removed, never changed.
create policy saved_products_select on public.saved_products
  for select to authenticated
  using (household_id = (select public.current_household_id()));

create policy saved_products_insert on public.saved_products
  for insert to authenticated
  with check (
    household_id = (select public.current_household_id())
    and saved_by = (select auth.uid())
  );

create policy saved_products_delete on public.saved_products
  for delete to authenticated
  using (household_id = (select public.current_household_id()));
