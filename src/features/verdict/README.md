# Verdict

Shows the result of a scan: Safe, Caution, or Not safe, with the reasons that
produced it. Presented in the verdict bottom sheet (one of the three places
elevation is allowed).

- The verdict comes from `src/services/verdict`. This screen renders it; it does
  not decide it.
- **A verdict is never carried by colour alone.** The `VerdictMark` silhouette
  (circle / triangle / octagon), the word, and the reason line all carry it.
- A verdict line is a fact plus a reason. A caution line always says what is
  unknown.
- When the AI read the label, say so in words: "Read from the label photo, not yet
  verified."
- Writes the result to `scans` (`verdict` + `reasons`) so it can be reopened.

Layout (14 Oct 2026, the Results screens in Figma): back, "For Thabo" and
Ask Njam at the top, then `VerdictTab` ("Not safe for Thabo", mark and
word) with a paper drawer over it. The drawer holds `ProductHeading` (brand,
name, size and barcode chips, verdict mark), the packshot
(`layout.productPhotoHeight`) with its save button, `RulesCard`, Nutrition,
"Available at" and `IngredientsCard`. Caution and Not safe put the rules
first, then "See alternatives" (the product's aisle, Safe only, offered
while viewing the default profile); Safe puts the stores first.

Scrolling: the drawer slides up over the tab's label and stops with a strip
of the verdict colour still showing; the content then scrolls inside it.
It is a plain scroll view inside a clipped window, with no animation code.

The rules card lists one row per rule from the engine's `checks`: broken
and unchecked rules always show, kept rules show when the card is opened.
A past scan only stored its reason lines, so it lists those instead.

"Viewing for" (top right) opens `ProfilePicker`, which lists everyone in the
household with their own verdict for this product. Switching decides again
with that person's rules and saves nothing; the scan is recorded once, against
the default profile. A past scan from History has no switch.

A catalogue product also shows a save button on its photo (the same
`saved_products` as Home), a Nutrition card from `nutrition_facts`, and
"Available at" from `stores` and `product_stores`; each store opens its
website in the in-app browser. A label read or a past scan has no product
id, so none of these extras show for it.
