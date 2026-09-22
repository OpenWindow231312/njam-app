# Verdict engine

The heart of the app and the part most likely to be wrong in a way that matters.
This module is **deterministic**: given the same product and the same profile, it
returns the same verdict every time. No network calls, no AI, so it can be tested
directly against the regression suite.

The rules:

- **The AI interprets, this code decides.** It reads the interpreted product data
  (from `src/services/ai`) and the active profile rules, and returns one of
  `safe` | `caution` | `unsafe` with the reason lines that produced it.
- **On conflict, the rules engine wins.** Always.
- **An unverified record can never be Safe.** It is capped at Caution.
- **Degrade toward Caution, never toward Safe.** A false Caution is a nuisance; a
  false Safe is a health incident. Zero false Safe verdicts is the project target.
- **Follow the alias chain** (`ingredients.canonical_id`) before checking a rule,
  so "milk solids", "whey powder" and "casein" all resolve to milk.
- Target: a verdict in under 3 seconds.

Output shape mirrors the `scans.verdict` and `scans.reasons` columns, so a past
scan can be reopened and read exactly as it was decided.
