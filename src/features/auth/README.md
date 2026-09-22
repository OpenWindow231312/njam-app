# Auth

Sign up and sign in. The entry point before any household or profile exists.

- Uses the single Supabase client (`src/lib/supabase.ts`); never creates its own.
- On first sign-up a person creates or joins a household (see `household/`).
- Tables: `users` (mirrors `auth.users`), `households`.
- Copy is second person and specific: name the action, not "Continue".
