# Admin review queue

Where an Admin/Moderator adds the products shoppers scanned in to the feed. A
scanned product saves straight away, with its photo, and its scanner sees it.
It is not sent anywhere to wait: it just stays out of Home and Search until an
admin adds it here. This screen is also the human half of "no false Safe":
until a product is added, the engine caps it at Caution.

- Lists `products` where `verified = false`, with their `product_ingredients` and
  `nutrition_facts`. Products from Open Food Facts are left out: there are about
  a thousand, and the engine already decides them by how complete their list
  is (see `src/services/verdict`).
- "Add to feed" sets `verified = true`, which does both: the product shows on
  Home and in Search (`fetchCatalogue` reads verified and Open Food Facts
  products), and it can produce a Safe verdict for anyone.
- Only an admin (`users.role = 'admin'`) can set `verified = true`; RLS enforces
  it, this screen just exposes the action.

## Edit and delete

An admin can also fix or remove any product, from its review queue card or
from its Verdict screen (`AdminProductActions.tsx`, used by both).

- **Edit** changes the name, brand, barcode and ingredient list. The
  `update_product` database function saves it all in one transaction and
  refuses anyone who is not an admin. An ingredient already in the catalogue
  keeps its allergen and E-number tags; a new one is checked by name against
  the alias lists, so it can still break a rule.
- **Delete** asks first, then removes the product for every household, with
  its ingredient links, nutrition, saved rows and store links. Past scans of
  it stay in history. `products_delete` (RLS) only allows it for an admin.
