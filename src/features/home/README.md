# Home / Search

The landing screen after auth: "Hi Anika, check your food", a search over the
product catalogue, and a two-column grid of products, each with its verdict.

- Loads the whole catalogue once (`fetchCatalogue`) with each product's
  ingredients, aisle and stores, and searches and filters on the phone. The
  catalogue holds a few dozen products; past a few hundred this needs paging.
- Each card's verdict comes from the verdict engine with the household's
  default profile, the one a scan is recorded against. The deck names it.
  The card shows the verdict as its mark; tapping opens the full verdict.
- Filters: the filter button beside the search bar opens `FilterSheet`: the
  verdict as one segmented control (All, Safe only, Hide Not safe) and the
  stores as pills with their logos (`StoreLogo`), ending with Other. While a
  filter is on, a line under the search bar names it, with "Clear filters".
  The aisle bubbles (`CategoryBubble`: All, Saved, then the `categories`
  rows, each with its icon from `AISLE_ICONS` in `categories.ts`) switch
  straight away.
- Saved products live in `saved_products`, shared by the household. The
  bookmark on a card saves at once on screen and puts it back if the save
  fails.
- Stores come from `stores` and `product_stores`.
- The Search tab still uses `ProductSearch`, a plain list of `ProductCard`s.
- The centre Scan tab is the way into the scanner. When nothing matches, the
  empty state offers "Scan a barcode".
