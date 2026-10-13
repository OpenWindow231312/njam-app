# Plan: weeks 3 and 4, to the final hand-in

Final hand-in: **Wednesday 28 Oct 2026, 14:00.** Public GitHub repo, full
README, and a 5 to 8 minute demonstration video.

Priorities come from `SCOPE.md`: every Must before any Nice. Each item is one
`anika/<feature>` branch, merged into `main` with `--no-ff` once it works on
the phone. The board mirrors this list.

## Sprint 3: 14 to 20 Oct (finish the MVP)

| Priority | Item | Done when |
| --- | --- | --- |
| 1 | **Set and edit your rules**: onboarding for allergies with severity, and editing on Profile | A new account can add milk (severe) and get a Not safe on Ouma rusks |
| 2 | Regression suite: the verdict engine against known products | Runs with one command; zero false Safe |
| 3 | Real barcodes for the products used in the demo | Scanning the real pack opens the right product |
| 4 | Ask Njam: hide product chips until your rules have loaded (bug 8) | No chip appears before the rules |
| 5 | Usability test with two more people; log what they found | Rows in `TESTING.md` |
| 6 | Fix whatever the milestone review and the usability tests turn up | Bug log rows closed |

## Sprint 4: 21 to 28 Oct (refine, deploy, hand in)

| Priority | Item | Done when |
| --- | --- | --- |
| 1 | Nice to have, if sprint 3 is done: Alternatives, then Add a product | Works on the phone |
| 2 | Accessibility pass: screen reader labels, touch targets, contrast | Checked against the design system rules |
| 3 | Measure verdict times on the phone; improve the slowest step | Times recorded in `TESTING.md` |
| 4 | Deployment: publish the app so a marker can open it (an Expo Go link through EAS Update, or a web build on a static host) | A link that opens Njam |
| 5 | README: screenshots, how to run, test accounts, architecture | A stranger can run it |
| 6 | Record and edit the 5 to 8 minute demo video | Uploaded and linked in the README |
| 7 | Final check: `main` runs, every feature branch merged and deleted | Ready by Tue 27 Oct, a day early |
