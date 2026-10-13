# Add a product

When a scanned barcode is not in the catalogue, a person adds it. This is how the
shared catalogue grows. Anyone signed in can add one, whatever their role.

How it runs (from the Scanner):

1. The barcode is not in the catalogue or Open Food Facts, so you photograph
   the ingredient list. `scan-label` reads it.
2. The Scanner asks for the front of the pack. `scan-label` in front mode reads
   the name and brand. You can skip this and see the verdict from the label
   alone; then nothing is saved.
3. `add-product.ts` uploads both photos to the `product-photos` bucket (only
   into a folder named after you), then calls the `add_product` database
   function, which saves the product, its ingredients and their order in one
   transaction.
4. The Verdict screen opens for the new product, and the scan is saved against
   it, so History shows its name.

Rules it keeps:

- Saved with `verified = false` and `source = 'ai_label_read'`. RLS refuses
  anything else, so it is capped at Caution until an admin verifies it.
- The label's "may contain" line is saved (`products.may_contain`), so the saved
  product is never less strict than the scan that created it.
- An ingredient already in the catalogue is reused only if the catalogue tags it
  at least as strictly as the label read did. Otherwise nothing is saved and
  the person is told an admin needs to check it.
- The barcode is unique, so the same product cannot be saved twice. If two
  people save it at the same moment, the second opens the first one's product.
  The same product under another barcode (another pack size) is flagged as a
  possible duplicate in the review queue.
