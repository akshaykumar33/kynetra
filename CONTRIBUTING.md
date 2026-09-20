# Contributing to Kynetra

Thank you for your interest in contributing to Kynetra! We are building an Open Digital IT World engineered to last for years.

The full engineering constitution lives in [`prompts/starter_prompt.md`](./prompts/starter_prompt.md). This file is the practical summary — what you actually type.

## Code of Conduct

Please review and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## The three non-negotiables

1. **UI/UX quality is acceptance criteria** (§13). A feature that works but feels unfinished is unfinished.
2. **Functionality must be complete** (§39). The whole round trip, or it goes behind a feature flag defaulted off.
3. **The codebase is protected** (§16–17). Branch → commit → PR → green CI → review → squash merge. Every change.

## Getting set up

```bash
pnpm install     # also installs the git hooks via the `prepare` script
```

If the hooks are not firing, `pnpm install` again — Husky installs them from `prepare`, so a clone that skipped install has no protection.

## Branching

Never commit directly to `main`. Always branch from an up-to-date trunk:

```bash
git switch main
git pull --ff-only
git switch -c feat/world-central-plaza-loader
```

Branch names are `<type>/<short-kebab-description>`. Allowed types:

`feat` · `fix` · `refactor` · `perf` · `design` · `docs` · `test` · `chore` · `infra` · `security` · `ai`

Keep branches under ~3 days and ~400 changed lines. Rebase on `main` daily. Delete after merge; never reuse.

## Committing

**Never blind-stage.** `git add -A`, `git add .` and `git commit -am` are how `.env` files and keys enter history. Stage deliberately and read what you are about to commit:

```bash
git status
git add <specific paths>
git diff --cached          # read this, in full, every time
git commit
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) and are enforced by `commitlint`:

```
feat(world): add central plaza scene loader
fix(auth): prevent expired session reuse
design(hud): implement empty and error states for tower panel
infra(ci): add secret scanning gate
```

### What runs on every commit

The `pre-commit` hook runs four gates in order:

1. **Secret scan** over the staged index — `node packages/secret-scan/src/cli.mjs --staged`
2. **Format and lint** staged files — Prettier, then ESLint with `--max-warnings=0`
3. **Typecheck** — `pnpm run typecheck`
4. **Tests** — `pnpm run test`

`--no-verify` is forbidden. If a gate is wrong, fix the gate in its own PR. The hook is a convenience; CI re-runs all of it on the PR, and that is the gate that actually holds.

## Sensitive data

Never commit `.env` files, private keys, certificates, Terraform state, kubeconfigs, cloud credentials, database dumps, or real user data. `.gitignore` prevents the accident and the scanner catches what slips past — you need both.

Run a full audit any time:

```bash
pnpm run secret-scan
```

If the scanner reports a false positive, append `kynetra-allow-secret` to that line and justify it in the PR.

### If a secret leaks

**Rotate the credential first.** Assume it is compromised the moment it was written to disk here — public repos are scraped in seconds, and the commit may already sit in a fork, a CI log, or GitHub's cache. Scrubbing history is not remediation.

Then contain it, depending on how far it got:

| Where it got to       | What to do                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Staged, not committed | `git restore --staged <file>`, add to `.gitignore`                                                                 |
| Committed, not pushed | `git reset --soft HEAD~1`, remove, recommit                                                                        |
| Pushed                | Rotate (already done), scrub with `git filter-repo`, force-push the branch, tell everyone with a clone to re-clone |

Finally, add the pattern to `packages/secret-scan` and `.gitignore` so it cannot recur.

## Pull requests

Every change reaches `main` through a PR — including docs, chores and hotfixes.

```bash
git push -u origin feat/world-central-plaza-loader
gh pr create --fill --base main
```

Your PR must have:

- A **Conventional Commit title** — it becomes the squash commit on `main`
- The **template filled** — write `N/A — reason` rather than deleting a section
- A **linked issue** (`Closes #123`)
- **Visual evidence for any UI change** — before/after, light and dark, mobile and desktop, the five states, plus a note on the keyboard pass
- **Green CI**
- **Real test output** — never claim a command passed without running it

Before requesting review, read your own diff _on the PR page_. The GitHub diff view surfaces what your editor hides: debug statements, stray `TODO`s, formatting churn, files you did not mean to include.

## Merging

**Squash merge**, with a clean conventional title. Edit the squash message — GitHub's default concatenation of WIP messages is noise.

Never merge when CI is red (fix the flake — a flaky test is a bug), conversations are unresolved, the description is unfilled, or UI changed without evidence.

After merge: delete the branch, confirm `main` is green, then `git switch main && git pull --ff-only`.

### A note on review

This repository currently runs with **one maintainer**, so the required-approval rule cannot be satisfied without blocking all work. Rather than disabling the gate, we keep the _automated_ checks strictly required and the maintainer performs a documented self-review pass on the PR diff page before merging. When a second maintainer joins, turn required approvals back on.

### Branch protection status — read this

`main` is **not** protected server-side, and you should know that rather than assume otherwise.

GitHub does not offer branch protection or repository rulesets for **private repositories on the Free plan**. Both APIs return `403 Upgrade to GitHub Pro or make this repository public`. So the settings in §16.4 — required status checks, required PR, linear history, blocked force-push, include-administrators — are configured nowhere.

What exists instead is a `pre-push` hook that refuses direct pushes to `main`. Be clear about what that is: it is **local, bypassable, and absent on a fresh clone until `pnpm install` runs**. It stops the accident. It does not stop intent, and it protects nobody else's clone.

Closing this properly needs one of:

| Option                     | Effect                                                                            |
| -------------------------- | --------------------------------------------------------------------------------- |
| Make the repository public | Protection and rulesets become available at no cost — but the code becomes public |
| GitHub Pro                 | Protection on private repos, ~$4/month                                            |

Until then, the discipline in this document is what holds, and CI on pull requests is the only automated check that runs somewhere you cannot skip it. When protection is enabled, apply §16.4, keep the hook as a fast local failure, and delete this section.

## Local commands

```bash
pnpm run dev            # all apps in watch mode
pnpm run lint           # ESLint across the monorepo
pnpm run lint:fix       # ...with autofix
pnpm run format         # Prettier write
pnpm run format:check   # Prettier check (what CI runs)
pnpm run typecheck      # tsc --noEmit everywhere
pnpm run test           # full test suite
pnpm run build          # production build
pnpm run secret-scan    # audit every tracked file
```
