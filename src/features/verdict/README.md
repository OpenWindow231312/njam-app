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
