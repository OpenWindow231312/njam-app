# Linking the design system to the app

You have a Njam Design System **artifact** on Claude, and you have mirrored its
values into `src/theme/tokens.ts`. This file explains how those two things are
linked, what "linked" can and cannot mean, and how to keep them in step.

## The honest answer first

There is **no automatic, live binding** between a Claude artifact and a code
repository. An artifact is a rendered page; it does not publish a machine-readable
token file that your app can import at runtime, and this repo cannot open the
artifact (it is private to your Claude account). So "linking" is not a switch you
flip. It is a **workflow**: the artifact is the source of truth for design, and
its values are copied into `tokens.ts`, which is the source of truth for code.

```
Njam Design System artifact   ──mirror──▶   src/theme/tokens.ts   ──import──▶   screens & components
(design source of truth)      (by hand)     (code source of truth)              (never raw values)
```

That is the link, and it is already in place:

- `tokens.ts` names the artifact in its header comment and records which version
  it was generated from.
- The `README.md` links the artifact.
- Every screen and component imports from `tokens.ts`, so the whole app traces
  back to the artifact through one file.

For an assessed project this is the right answer: it is explainable, it is under
version control, and a marker can follow the trail from a screen to the artifact.

## How to keep them in step

When you change a value in the artifact:

1. Change it in the **artifact first**. The artifact stays the source of truth.
2. Mirror the changed value into `src/theme/tokens.ts`. Change nothing else.
3. Bump the version note in the `tokens.ts` header comment so it is obvious which
   artifact version the code reflects.
4. Commit on a branch: `refactor: mirror <token> from design system v<n>`.

Because everything imports from `tokens.ts`, one edit there updates every screen.
That is the payoff of never typing a raw value into a screen.

> Changing the system itself (a colour, the type scale, spacing, radius, a
> component's behaviour) needs approval before it goes in, per `CLAUDE.md`. This
> workflow is for mirroring an approved change, not for inventing one.

## Stronger links, if you want them later

These are optional. The mirror above is enough to pass and to defend. Consider
these only if the extra machinery earns its place.

- **Verify the mirror with Claude.** Claude can read your artifact (it is yours)
  and diff it against `tokens.ts` to confirm nothing has drifted. This is an
  on-demand check you run when you want reassurance, not a live link. Ask for it
  in a Claude Code session.

- **A `tokens.json` intermediate.** If the artifact ever exports a JSON block of
  raw values, you could commit that `tokens.json` and generate `tokens.ts` from
  it with a small script. That makes the mirror a copy-paste of one file instead
  of value-by-value. Only worth it if the artifact actually produces such a block.

- **Claude design-system project sync (`/design-sync`).** Claude has a
  `/design-sync` workflow that keeps a **local component library** in step with a
  **design-system project** on claude.ai/design. Note two things: it syncs built
  UI components, not a token file, and it targets a design-*system project*, not a
  plain artifact. It is heavier than this project needs, and it would mean turning
  your artifact into a design-system project first. Reach for it only if you grow
  a large component library and want its preview cards to live on claude.ai.

## What not to do

- Do not type a raw hex code, size, spacing or radius into a screen to "match" the
  artifact. Add the value to the artifact, mirror it into `tokens.ts`, import it.
- Do not treat `constants/theme.ts` as the design system. That is leftover Expo
  starter code with a generic black/white palette. The design system is
  `theme/tokens.ts`.
- Do not let `tokens.ts` and the artifact drift silently. If you change one,
  change the other in the same session.
