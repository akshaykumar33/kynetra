# Standing rules for every phase prompt

Every phase prompt says "follow docs/roadmap/PROMPT_RULES.md". These rules apply to all of them.

1. **Read first.** Read `CLAUDE.md`, `docs/roadmap/README.md` and the phase file. Use CodeGraph
   (`codegraph_explore`) before grep or reading whole files when `.codegraph/` exists.
2. **Verify the baseline.** Run `npm run build` and the test suite before changing anything and
   record the output. If the baseline is broken, fix or report that first.
3. **Branch.** Create the branch named in the phase file from an up-to-date `main`. Never commit
   on `main`. Never delete branches.
4. **Scope is fixed.** Build only what the phase file lists under "In scope". Anything else goes into
   the phase file's "Follow-ups" section, not into the code.
5. **Commits.** Conventional Commits (`type(scope): lowercase imperative subject`), atomic, no AI
   attribution of any kind, never `--no-verify`.
6. **Quality.** Typecheck, lint, unit tests and e2e tests (once they exist, from Phase 01) must pass.
   New behaviour gets tests at the cheapest level that proves it.
7. **Security and privacy.** No secrets in the repo (use `.env.local`, document keys in
   `.env.example`). Validate all input on the server. No tracking of activity or location unless the
   phase explicitly says so and the user opts in.
8. **Accessibility.** Every HUD control is reachable by keyboard, labelled, and has a visible focus
   state. Respect `prefers-reduced-motion`.
9. **Performance.** Keep per-frame data out of React state. Stay inside the budgets in
   `docs/roadmap/phases/01-foundation.md`.
10. **Exit gate.** Run the phase's exit gate commands and paste the real output into the PR body.
    If any part fails, say so; never report a gate as passed without evidence.
11. **Docs.** Update the phase status table, RAID log and decision log in `docs/roadmap/README.md`,
    and `CLAUDE.md` if structure changed, in the same PR.
12. **PR.** Push the branch and open a PR to `main` with a What / Why / How to verify body.
    Do not merge. Ask the owner "Merge PR #N into main?" and merge only on a clear yes, with a merge
    commit (`gh pr merge N --merge`).
