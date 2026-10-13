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

Layout (13 Oct 2026): the product photo on top (`layout.productPhotoHeight`),
the name with the brand and barcode smaller underneath, a compact verdict
(mark, word, headline, reason lines) composed on this screen rather than the
`VerdictBanner` card, then the ingredients. "Scan another product" is pinned
to the bottom.

"Viewing for" (top right) opens `ProfilePicker`, which lists everyone in the
household with their own verdict for this product. Switching decides again
with that person's rules and saves nothing; the scan is recorded once, against
the default profile. A past scan from History has no switch.

Product page additions (13 Oct 2026): the verdict chip sits beside the name,
where a shop shows the quantity counter, and the brand has its own line under
the name. A catalogue product also shows a save button on its photo (the same
`saved_products` as Home), a Nutrition table from `nutrition_facts`, and
"Where to buy it" from `stores` and `product_stores`; each store opens its
website in the in-app browser. Ask Njam sits at the top right beside
"Viewing for". A label read or a past scan has no product id, so none of
these extras show for it.
