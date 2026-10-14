# Testing

How Njam's core flow is tested, what has gone wrong, and what people
outside the project made of it.

Test on a physical phone through Expo Go (`npx expo start`): the scanner
needs a real camera. Two test accounts exist (passwords shared privately):

| Account | Role | Rules |
| --- | --- | --- |
| owner@njam.test | Household Owner | milk (severe), peanut (moderate), E621 |
| admin@njam.test | Admin/Moderator | gluten (severe) |

## Core flow checklist

Run before every merge into `main`. Mark each with the date and pass or fail.

| # | Step | Expected | Last run |
| --- | --- | --- | --- |
| 1 | Sign up with a new email | Lands on Home; Profile shows you as Household owner | 13 Oct, fail (bug 10). Rerun after the fix |
| 2 | Log out, log in as owner@njam.test | Home, with your name on Profile | 13 Oct, pass |
| 3 | Search "rusk", open Ouma Buttermilk Rusks | Not safe: contains buttermilk powder, you marked milk as severe | 13 Oct, pass |
| 4 | Open one of the 3 unverified seed products | Caution at best, with "Our team has not checked this ingredient list yet" | |
| 5 | Scan a real barcode not in the catalogue | Open Food Facts verdict marked "not yet verified", or a request for a label photo | 13 Oct, pass (label photo asked for) |
| 6 | Photograph a clear label | Ingredient list read; verdict capped at Caution | 13 Oct, pass |
| 7 | Photograph a blurry label | "We could not read this label", never a guessed list | |
| 8 | History tab | The scans above, newest first, reopen as decided | 13 Oct, pass, but the label-photo scan has no product name (bug 12) |
| 9 | Ask Njam: "What can I make with oats?" | A recipe; catalogue items carry chips, others say "Not checked against your rules" | 13 Oct, fail (bug 11) |
| 10 | Ask Njam: "Is it safe for me?" about a product | No sentence calls it safe; any chip comes from the engine | |
| 11 | Ask Njam with airplane mode on | Failure snackbar with Retry | |
| 12 | Type 3+ characters in Ask Njam and pause | Ghost text appears after the typing; the check button accepts it | |
| 13 | Ask Njam "Ask Njam" title, then "+" | Conversation list opens; "+" starts a fresh chat | |
| 14 | Log in as owner: Profile | No "Review queue" row | |
| 15 | Log in as admin: Profile, Review queue | 3 unverified products; Verify asks first | |

Database checks (run in the Supabase SQL editor, impersonating a user, in a
transaction that is rolled back) proved on 13 Oct 2026:

- An owner cannot set their own role to admin, or move to another household.
- An owner verifying a product changes 0 rows; an admin changes 3.
- A person sees only their own Ask Njam conversations.
- Sign-up as the owner of a new household still works.

## Bug log

| # | Found | What happened | Severity | Status | Fix |
| --- | --- | --- | --- | --- | --- |
| 1 | 12 Oct | Any signed-in person could make themselves admin, or join another household, by updating their own `users` row | High (security) | Fixed 13 Oct | Migration `20261013063914`: update limited to display name; insert limited to owner of a new household |
| 2 | 12 Oct | First deploy of `ask-njam` went up with an incomplete file | High (broken) | Fixed 12 Oct | Redeployed within minutes; live files checked against the repo |
| 3 | 12 Oct | Ask Njam suggestion chips sat far above the composer, leaving a large empty band | Medium (layout) | Fixed 12 Oct | A horizontal ScrollView grows by default; set `flexGrow: 0` |
| 4 | 12 Oct | Extra gap above the keyboard in Ask Njam | Low (layout) | Fixed 12 Oct | Drop the home-indicator padding while the keyboard is open |
| 5 | 12 Oct | Nutrient limit rules always come back as Caution | Medium | Partly fixed 13 Oct | 20 seeded products now have nutrition facts from Open Food Facts; the rest still come back Caution |
| 6 | 12 Oct | Seed barcodes are placeholders (prefix 200), so real packs do not match | Medium (demo) | Open | Replace with real barcodes before the final demo |
| 7 | 13 Oct | A new person cannot add or edit their rules in the app | High (MVP gap) | Fixed 13 Oct, to recheck on the phone | Branch `anika/onboarding`: onboarding for new accounts, and Edit rules from Profile |
| 8 | 12 Oct | If your rules fail to load, Ask Njam draws product chips against no rules (Caution, never Safe) | Low | Open | Hide product chips until the rules have loaded |
| 9 | 12 Oct | Ghost text alignment not yet checked on Android | Low | Open | Test on an Android phone |
| 10 | 13 Oct | Sign-up with a new email showed "We could not reach Njam". Supabase had refused the address (`email_address_invalid`), then blocked the retries because its built-in email sender only sends a few emails an hour (`over_email_send_rate_limit`) | High (blocks new people) | Fixed 13 Oct | Branch `anika/sign-up-errors`: the app names both errors. Turn off "Confirm email" in Supabase Auth while testing |
| 11 | 13 Oct | Ask Njam "What can I make with oats?" promised a recipe but showed only the Jungle Oats card | Medium | Fixed 13 Oct, to recheck on the phone | Branch `anika/ask-njam-recipe`: the prompt asks for a full recipe block, and a dropped recipe is logged |
| 12 | 13 Oct | A scan read from a label photo shows as "Product from a label photo" in History, not the product's name | Medium | Fixed in code 13 Oct, to recheck on the phone | The scanner asks for a front photo and `scan-label` reads the name from it (`mode: "front"`) |

Add a row for anything that goes wrong, even if you fix it straight away.
The log is evidence of testing.

## Usability tests (people outside the project)

At least one person who has not seen Njam tries the core flow without help.
Give them the phone signed in as owner@njam.test and one task at a time:

1. "Find out whether these rusks are OK for this person."
2. "Scan something from the cupboard."
3. "Ask the app for a breakfast idea."

Watch, do not explain. Write down where they hesitate, what they tap that
does nothing, and anything they say out loud.

| Date | Who (first name, relation) | Task | What happened | What to change |
| --- | --- | --- | --- | --- |
| 13 Oct | Nicolene Smit, on an iPhone | Sign up | Sign-up with her own email failed with "We could not reach Njam. Try again in a moment." She signed in as owner@njam.test instead | Say what went wrong (bug 10) |
| 13 Oct | Nicolene Smit | Find out whether these rusks are OK | Searched "Ouma rusks": found, Not safe for this person. Searching "milk" brought up the buttermilk rusks and fresh full cream milk | Nothing |
| 13 Oct | Nicolene Smit | Scan something from the cupboard | A real barcode not in the catalogue sat on "Looking up" with the number, then asked for a label photo. The whole ingredient list fitted in the frame; "Reading the label" worked and gave a verdict | Also ask for a photo of the front of the pack, and save the product so the next person can scan it |
| 13 Oct | Nicolene Smit | History | The scans were there, but the label-photo product was called "Product from a label photo" | Show the product's name (bug 12) |
| 13 Oct | Nicolene Smit | Ask the app for a breakfast idea | Asked "What can I make with oats?". The reply said "Here is a simple recipe" but showed only the Jungle Oats product card | The recipe has to come from Gemini (bug 11) |
