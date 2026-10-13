# Git workflow

Your commit history and version-control practice are directly assessed in DV300,
so the workflow is part of the deliverable, not an afterthought. This is a solo
project, so the model is deliberately light: one short branch per feature,
merged into `main` when it works.

## The model

`main` always holds the latest working code. Each feature is built on its own
branch, named `anika/<feature>` in lower-case kebab case (`anika/scanner`,
`anika/ask-njam`). A feature that spans several days keeps adding commits to
the same branch. There are no Pull Requests.

```
main ──●────────────●──────────────●──▶
        \          /  \            /
         ●──●──●──●    ●──●──●──●──●      anika/<feature>
```

- **`main` must always run.** Merge a branch only once the feature works on the
  phone. Never commit half-finished work to `main`.
- **The merge commit groups the feature.** Merging with `--no-ff` keeps a merge
  commit even when Git could fast-forward, so the history shows which commits
  made up each feature.
- **Pull before you start.** Work may have been pushed from another machine
  or session.

## Everyday commands

```bash
git checkout main && git pull origin main
git checkout -b anika/<feature>
# make one small change
git add <files>
git commit -m "feat: add scan frame with scope pill"
git push -u origin anika/<feature>

# when the feature works on the phone
git checkout main && git pull origin main
git merge --no-ff anika/<feature>
git push origin main
git branch -d anika/<feature>
git push origin --delete anika/<feature>
```

If a pull brings in a changed `package.json`, run `npm install` before
`npx expo start`.

> How this changed: up to PR #3 work went through `feat/` and `fix/` branches
> and Pull Requests. For a while after that, commits went straight to `main`.
> Since 12 Oct 2026 each feature has its own `anika/` branch and a `--no-ff`
> merge, which keeps `main` working and groups each feature in the history.

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
