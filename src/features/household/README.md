# Household

Manage the household: who is in it, and which profiles it keeps. A household
shares a product catalogue and can scan on each other's behalf.

- Reads and writes `households`, `users` (household members), and the
  household's `diet_profiles`.
- The Household Owner role can manage members; a Standard User sees the household
  but has limited control (see roles in `CLAUDE.md`).
- The active profile chosen here is what the scanner's scope pill reflects.
