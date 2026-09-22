# Add a product

When a scanned barcode is not in the catalogue, a person adds it. This is how the
shared catalogue grows.

- Writes to `products` with `verified = false` and `source = 'ai_label_read'` or
  `'user'`. RLS forbids a normal user from marking a product verified.
- May capture a label photo for `src/services/ai` to read into ingredients and
  nutrition (`product_ingredients`, `nutrition_facts`).
- An unverified product can never produce a Safe verdict; it is capped at Caution
  until the admin review queue verifies it.
