# Project structure

This is the folder layout for Njam and, more importantly, the reasoning behind
it. In the live code review you have to defend why each folder exists, so this
file is written to be read out loud, not skimmed.

## The whole tree

```
njam-app/
  app.json                 Expo app config
  package.json             Dependencies and scripts
  .env.example             Template for local secrets (never commit the real .env)
  README.md                Project overview and how to run it

  docs/
    STRUCTURE.md           This file
    GIT-WORKFLOW.md        Branching model and commit conventions
    DESIGN-SYSTEM.md       How the design artifact links to the code

  supabase/
    config.toml            Local Supabase CLI config
    migrations/            SQL, applied in order. RLS is on from the first one.

  src/
    app/                   Expo Router routes. File-based navigation lives here.
    components/
      design-system/       Reusable UI built only from tokens.
      (existing files)     Starter helpers, kept until replaced.
    features/              One folder per screen area. Screen logic lives here.
      auth/
      onboarding/
      home/
      scanner/
      verdict/
      alternatives/
      add-product/
      profile/
      household/
      admin-review/
    services/
      ai/                  The single Gemini provider module.
      verdict/             The deterministic rules engine.
    theme/
      tokens.ts            The local source of truth for every design value.
    lib/
      supabase.ts          The single Supabase client.
    hooks/                 Shared hooks (colour scheme, theme).
    constants/             Starter constants, kept until replaced.
```

## Why it is split this way

**`app/` holds routes, `features/` holds screens.** Expo Router turns every file
in `src/app/` into a navigable route, so those files stay thin: they wire up the
route and render a screen. The actual screen (its state, its layout, its local
pieces) lives in `src/features/<name>/`. This keeps routing separate from screen
logic, so a screen can be read and tested without the router in the way.

> If you prefer your brief's own word, `features/` can be renamed to `screens/`.
> The split between routes and screen logic is the point; the folder name is not.

**`services/ai/` is one file the provider hides behind.** The brief commits to
Google Gemini but wants the provider swappable in one place. Everything that
needs the AI imports from `services/ai`, never from a Gemini SDK directly. Swap
the provider by editing this one module.

**`services/verdict/` is deterministic and separate from the AI.** The verdict
engine is hybrid: the AI interprets, this code decides. Keeping the decision
logic in its own module, with no network calls, is what makes "zero false Safe"
testable against the regression suite.

**`components/design-system/` never invents a value.** Every reusable component
imports from `theme/tokens.ts`. If a component needs a value `tokens.ts` does not
have, that is a signal to add it to the design system first, not to type a raw
number.

**`lib/` is for shared clients, not features.** The Supabase client is the clear
example: one client, imported everywhere, so there is only ever one auth session.

## What is still starter code

The repo began from `create-expo-app`, so a few files are Expo's demo scaffolding
rather than Njam code: `components/themed-text.tsx`, `components/animated-icon.*`,
`components/external-link.tsx`, `app/explore.tsx`, and `constants/theme.ts` (a
generic black/white palette, not to be confused with `theme/tokens.ts`). They are
left in place so the app keeps running, and are replaced screen by screen as real
Njam screens land. They are not part of the design system.
