# Git workflow

Your commit history and version-control practice are directly assessed in DV300,
so the workflow is part of the deliverable, not an afterthought. This is a solo
project, so the model is deliberately light: small commits straight to `main`.

## The model

This is a solo project, so all work is committed straight to **`main`** in
small steps. There are no feature branches or Pull Requests.

```
main ──●──●──●──●──●──●──●──▶  one small, working step per commit
```

- **`main` must always run.** Commit a step only once the app still starts.
  If `main` is broken during a live review, that is visible.
- **Small commits carry the story.** Because there are no branches to group
  work, each commit message has to say clearly what changed and why.
- **Pull before you start.** Work may have been pushed from another machine
  or session.

## Everyday commands

```bash
git pull origin main
# make one small change
git add <files>
git commit -m "feat: add scan frame with scope pill"
git push origin main
```

If a pull brings in a changed `package.json`, run `npm install` before
`npx expo start`.

> Earlier in the project (up to PR #3) work went through feature branches and
> Pull Requests. The switch to committing on `main` was a deliberate choice to
> keep a solo workflow simple.

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
- Do not commit code that stops the app from starting.
- Do not commit `.env` or any secret. `.env` is git-ignored; keep it that way.
- Do not batch a whole screen into one giant commit. The history is the story of
  how you built it, and that story is marked.
