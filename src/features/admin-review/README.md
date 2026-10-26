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
