# AGENTS.md Governance

`AGENTS.md` supplies judgment that a capable agent will not reliably derive from the code it is about
to change. It is not a project overview, command reference, directory inventory, or status report.

## Admission test

Add a rule only when all of these are true:

1. A cold agent is likely to make one identifiable wrong move because its normal habit is wrong here,
   or because a required cross-file or cross-system fact is outside its likely context.
2. The mistake has meaningful cost: broken behavior, security exposure, architectural decay, lost
   evidence, or repeated review/rework.
3. A more durable mechanism cannot prevent it.

Name the wrong move and its consequence. Generic advice, current filenames, changing signatures, task
status, and restatements of parent instructions do not qualify.

## Choose the most durable home

Use the first applicable location:

1. Type system, module ownership, or dependency graph.
2. A code comment when the warning and mistake occur at the same line.
3. Lint, CI, or another deterministic check.
4. The nearest `AGENTS.md` ancestor shared by everyone who could make the mistake.
5. A guide for procedures, a decision record for rationale, or a commit/PR for one-time history.

A scoped `AGENTS.md` may add or tighten a parent rule, never relax or duplicate it. Do not create one
pre-emptively; add it after a real repeated mistake or when a settled module boundary contains a
non-obvious constraint.

## Maintenance

- Change instructions in the same PR as the code or architecture they govern.
- Review instruction changes against current code, not against an older document's authority.
- Periodically audit with deletion as the default. Remove rules whose wrong move is no longer possible,
  whose fact is now obvious, or whose constraint moved into a mechanical guard.
- Keep examples only when they materially change the reader's judgment.
