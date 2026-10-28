# Add a product

When a scanned barcode is not in the catalogue, a person adds it. This is how the
shared catalogue grows. Anyone signed in can add one, whatever their role.

How it runs (from the Scanner):

1. The barcode is not in the catalogue, and not in Open Food Facts either (a
   product Open Food Facts has is saved by the `import-open-food-facts`
   function, without this flow). You photograph the ingredient list and
   `scan-label` reads it.
2. The Scanner asks for the front of the pack. `scan-label` in front mode reads
   the name and brand. This step cannot be skipped: every scan with a barcode
   adds its product, so History can show its ingredients and nutrition again.
3. `add-product.ts` uploads the photos to the `product-photos` bucket (only
   into a folder named after you), then calls the `add_product` database
   function, which saves the product, its ingredients and their order in one
   transaction.
4. The Verdict screen opens for the new product, with its front photo, laid
   out like any other product. The scan is saved against it, so History shows
   its name, ingredients and nutrition.

Rules it keeps:

- Saved with `verified = false`, and `source` is `ai_label_read`. RLS refuses
  a verified insert, so it stays out of the feed until an admin adds it from
  the review queue. For now its verdict is decided like a verified one
  (`TRUST_SHOPPER_LISTS` in the verdict engine), so it can be Safe and does
  not say our team has not checked it.
  Nothing waits for the admin: the product saves straight away.
- The label's "may contain" line is saved (`products.may_contain`), so the saved
  product is never less strict than the scan that created it.
- An ingredient already in the catalogue is always reused. If the label tags it
  differently (another allergen, another E-number), the label's tags are kept
  on this product's link (`product_ingredients.label_allergen_id`,
  `label_e_number`), and `catalogue.ts` hands the engine both, so the stricter
  one counts. The catalogue row itself is left for an admin.
- The barcode is unique, so the same product cannot be saved twice. If two
  people save it at the same moment, the second opens the first one's product.
  The same product under another barcode (another pack size) is flagged as a
  possible duplicate in the review queue.
