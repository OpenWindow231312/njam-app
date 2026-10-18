# Household

Manage the household: who is in it, and which profiles it keeps. A household
shares a product catalogue and can scan on each other's behalf.

- Reads and writes `households`, `users` (household members), and the
  household's `diet_profiles`.
- The Household Owner role can manage members; a Standard User sees the household
  but has limited control (see roles in `CLAUDE.md`).
- The active profile chosen here is what the scanner's scope pill reflects.

Built so far (18 Oct 2026): the Household tab on Profile (`HouseholdTab`).

- People, with and without a phone. Tap one for their rules; the owner can
  remove someone, and anyone allowed can set the rules of someone without a
  phone.
- Invite codes: eight characters, valid for seven days, shared through the
  phone's share sheet. "I have an invite code" joins another household, and
  your own rules come with you.
- The owner's switches: who may edit rules, invite, add saved products and
  see each other's scans. RLS reads the same switches, so they hold even
  outside the app.
- Hand over ownership, delete the household, or leave it.

Moving people between households and changing roles are database functions
(`join_household`, `leave_household`, `remove_member`, `hand_over_ownership`,
`delete_household`), because the app may not change `users.household_id` or
`users.role` itself. See `supabase/migrations/20261018120000_household_and_settings.sql`.

