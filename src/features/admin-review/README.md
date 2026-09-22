# Admin review queue

Where an Admin/Moderator verifies user-added products. This screen is the human
half of "no false Safe": until a product is verified here, the engine caps it at
Caution.

- Lists `products` where `verified = false`, with their `product_ingredients` and
  `nutrition_facts`.
- Only an admin (`users.role = 'admin'`) can set `verified = true`; RLS enforces
  it, this screen just exposes the action.
- Verifying a product is what lets it produce a Safe verdict for anyone.
