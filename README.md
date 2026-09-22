# Njam

An AI-driven grocery scanner for South Africa. You set your dietary rules once,
point the camera at a barcode, and get one of three answers in under three
seconds: **Safe**, **Caution**, or **Not safe**, with the reasons that produced
it.

Built for Interactive Development 300 (DV300) Theme 4 at Open Window. This is
assessed university work: the repository, the commit history and the author's
ability to explain every line are all marked.

---

## What it does

- **Set a profile once.** Allergies with severity, diet and faith, banned
  ingredients, E-numbers, nutrient limits, and health presets.
- **Scan a barcode.** The scanner always shows a scope pill so you know which
  household profile the scan runs against.
- **Get a verdict with reasons.** A verdict is a fact plus a reason: "Not safe.
  Contains milk solids, which you marked severe."

The engine is **hybrid**: the AI interprets (ingredient to category, aliases,
E-numbers, plain language) and deterministic code decides (numeric limits, hard
allergen blocks). On conflict, the rules engine wins. An unverified AI-read
record is capped at Caution and can never be Safe. **Zero false Safe verdicts**
is a stated project target.

---

## Stack

| Layer   | Choice                                                              |
| ------- | ------------------------------------------------------------------ |
| App     | React Native via Expo, TypeScript, Expo Router                     |
| Camera  | `expo-camera`                                                      |
| AI      | Google Gemini, behind a single service module (`src/services/ai`)  |
| Backend | Supabase: PostgreSQL, Auth, Storage, Edge Functions                |
| State   | React Context + AsyncStorage                                       |
| Fonts   | Bricolage Grotesque (display), Figtree (text)                      |
| Icons   | Material Symbols Rounded                                           |

---

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables. Copy the example and fill in your Supabase
   values. `.env` is git-ignored and must never be committed.

   ```bash
   cp .env.example .env
   ```

   Only the publishable (anon) key belongs in the app. The Supabase secret key
   and the Gemini key live in Edge Function secrets, never in app code.

3. Start the app:

   ```bash
   npx expo start
   ```

   Test on a **physical phone** through Expo Go. The core feature is the camera,
   and a simulator cannot scan a barcode.

---

## Project structure

The short version:

```
src/
  app/                 Expo Router routes (file-based navigation)
  components/
    design-system/     Reusable UI built from tokens (Button, Chip, VerdictMark, ...)
  features/            One folder per screen area (auth, scanner, verdict, ...)
  services/
    ai/                The single Gemini provider module (swap provider here)
    verdict/           The deterministic rules engine
  theme/
    tokens.ts          The local source of truth for every design value
  lib/                 Shared clients, e.g. the Supabase client
supabase/
  migrations/          SQL schema, Row Level Security on from the first migration
docs/                  Structure, Git workflow, and design-system notes
```

Full explanation and the reasoning behind it: [`docs/STRUCTURE.md`](docs/STRUCTURE.md).

---

## Design system

The source of truth is the Njam Design System artifact:
<https://claude.ai/artifact/3gFmougXCaYTd2YWEP8VYy>

The artifact is private to the author's Claude account and cannot be opened from
this repo. Its values are mirrored into
[`src/theme/tokens.ts`](src/theme/tokens.ts), which is the source of truth for
code. Screens and components import from `tokens.ts` and never type a raw hex
code, size, spacing or radius. How the artifact and the code stay linked:
[`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).

---

## Git workflow

`main` always holds the latest working code. Each feature or screen is built on a
short-lived branch (`feat/scanner`, `fix/verdict-cap`, ...) and merged into `main`
through a Pull Request. Commit history frequency and quality are directly
assessed. Conventions and the full workflow: [`docs/GIT-WORKFLOW.md`](docs/GIT-WORKFLOW.md).

---

## Screens (10)

Auth · Onboarding · Home/Search · Scanner · Verdict · Alternatives · Add a
product · Profile & filters · Household · Admin review queue. The brief requires
a minimum of five; ten are planned.

## Roles

Household Owner · Standard User · Admin/Moderator.

## Database (11 tables)

`households` · `users` · `diet_profiles` · `profile_rules` · `scans` ·
`categories` · `products` · `nutrition_facts` · `product_ingredients` ·
`ingredients` · `allergens`. Row Level Security is on for every table from the
first migration.

---

## Deadlines

- Progress Milestone (30%): weeks 12–14, live code review.
- Final application (60%): Wed 28 Oct 2026, 14:00. Public GitHub repo, full
  README, and a 5–8 minute demonstration video.

## License

See [`LICENSE`](LICENSE).
