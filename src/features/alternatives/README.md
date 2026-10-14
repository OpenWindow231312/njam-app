# Alternatives

After a Caution or Not safe verdict, suggest products that would pass the same
profile. Reached from "See alternatives" on the verdict screen.

- `alternatives.ts` decides which products qualify: Safe for the profile (the
  verdict engine decided it), not the product itself, and the same kind of
  product, told from words in the name ("Smooth Peanut Butter" is a nut
  butter). A product whose kind we cannot tell falls back to its aisle.
- When nothing qualifies, the screen says so. It never pads the list with
  unrelated products: in a user test (14 Oct 2026) the old aisle view offered
  tomato sauce instead of peanut butter.
- Tests: `alternatives.test.ts`, against the seeded catalogue (`npm test`).
