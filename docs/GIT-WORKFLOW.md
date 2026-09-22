# Git workflow

Your commit history and version-control practice are directly assessed in DV300,
so the workflow is part of the deliverable, not an afterthought. This is a solo
project, so the model is deliberately light: `main` plus short-lived feature
branches, merged through Pull Requests.

## The model

```
main ─────●────────●───────────●───────────●─────▶  always working, always demo-able
           \        \           \
            \        \           feat/verdict-engine
             \        feat/scanner
              feat/onboarding
```

- **`main`** always holds the latest working code. Never commit half-finished work
  straight to `main`. If `main` is broken during a live review, that is visible.
- **One branch per feature or screen.** A branch is short-lived: it exists for one
  screen or one fix, then it is merged and deleted.
- **Merge through a Pull Request**, even though you are the only author. The PR is
  where you write down what changed and why. It is a natural place for the marker
  to see your reasoning, and for Claude Code to review a change before it lands.

## Branch names

Prefix by type, then a short kebab-case description:

| Prefix     | For                                   | Example                   |
| ---------- | ------------------------------------- | ------------------------- |
| `feat/`    | a new screen or capability            | `feat/scanner`            |
| `fix/`     | a bug fix                             | `fix/verdict-safe-cap`    |
| `refactor/`| restructuring without behaviour change| `refactor/tokens-quotes`  |
| `chore/`   | tooling, config, dependencies         | `chore/supabase-cli`      |
| `docs/`    | documentation only                    | `docs/readme`             |

## Everyday commands

Start a feature:

```bash
git switch main
git pull origin main
git switch -c feat/scanner
```

Work in small commits (see below), then push and open a PR:

```bash
git push -u origin feat/scanner
# open the Pull Request on GitHub, target: main
```

After the PR is merged, clean up:

```bash
git switch main
git pull origin main
git branch -d feat/scanner
```

## Commits

Small, frequent, present tense, prefixed by type. Commit frequency and quality
are assessed, so commit at each real step, not once at the end.

```
feat:     a new capability            feat: add scan frame with scope pill
fix:      a bug fix                   fix: cap unverified reads at caution
chore:    tooling or config           chore: add supabase cli config
refactor: no behaviour change         refactor: split verdict reasons builder
docs:     documentation               docs: explain design-system linking
style:    formatting only             style: apply project quote formatting
test:     tests                       test: add false-safe regression cases
```

Write the subject in the imperative present: "add", not "added" or "adds". Keep
it under about 70 characters. If a commit needs explaining, add a blank line and
a short body.

## What not to do

- Do not force-push `main`.
- Do not commit `.env` or any secret. `.env` is git-ignored; keep it that way.
- Do not batch a whole screen into one giant commit. The history is the story of
  how you built it, and that story is marked.
