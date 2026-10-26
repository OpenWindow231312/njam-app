# Home / Search

The landing screen after auth, laid out as "Home 1 · Shelves" in Figma
(18 Oct 2026, after Sixty60's deal shelves): "Hi Anika, check your food",
"Checking for Anika · 4 rules" (`HomeScope`, opens Profile), a search with a
scan button, the aisle bubbles, a tip card that opens the scanner
(`ScanTipCard`), then shelves that scroll sideways (`ProductShelf` of
`ProductTile`s): Safe for you, Saved by your household, Recently scanned.
Each shelf's See all opens the aisle page or History. Typing in the search
swaps the shelves for the matching products in the two-column grid.

- Loads the catalogue once (`fetchCatalogue`) with each product's
  ingredients, aisle and stores, and searches and filters on the phone. The
  catalogue is the verified products plus the complete Open Food Facts ones
  (a real name and at least three ingredients), about a thousand; thin Open
  Food Facts records are hidden.
  A product a shopper just scanned in is not here until an admin adds it to
  the feed from the review queue.
- Each card's verdict comes from the verdict engine with the household's
  default profile, the one a scan is recorded against. `HomeScope` names it.
  The card shows the verdict as its mark; tapping opens the full verdict.
- Filters (Search and the aisle page): the filter button opens `FilterSheet`: the
  verdict as one segmented control (All, Safe only, Hide Not safe) and the
  stores as pills with their logos (`StoreLogo`), ending with Other. While a
  filter is on, a line under the search bar names it, with "Clear filters".
  The aisle bubbles (`CategoryBubble`: All, Saved, then the `categories`
  rows, each with its icon from `AISLE_ICONS` in `categories.ts`) open that
  aisle's page from Home.
- Saved products live in `saved_products`, shared by the household. The
  bookmark on a card saves at once on screen and puts it back if the save
  fails.
- Stores come from `stores` and `product_stores`.
- Search (`SearchScreen`) is laid out like Checkers Sixty60's Discover page:
  with the box empty it lists the aisles as white rows (bubble, name, product
  count, chevron), saved products first. Typing swaps the list for matching
  products from every aisle, in the same grid as Home.
- An aisle row opens `AisleScreen` (route `/aisle`), that aisle's products in
  the grid, starting with the filters Search had on.
- Home, Search and the aisle page share `useCatalogue` (loading, verdicts,
  saving), `ProductGrid` and `FilteredBy`.
- The centre Scan tab is the way into the scanner. When nothing matches, the
  empty state offers "Scan a barcode".
