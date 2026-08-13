# Engineering Decisions

Decision records explain durable choices whose rationale is not recoverable from code. They are not task
status or a replacement for GitHub Issues and PRs.

Create `NNNN-short-title.md` only when a decision constrains future alternatives across files or modules.
Use this template:

```markdown
# NNNN — Title

Status: accepted | superseded by NNNN
Date: YYYY-MM-DD

## Context

What forces a choice?

## Decision

What boundary or approach is adopted?

## Consequences

What becomes easier, harder, or deliberately unsupported?

## Verification

Which mechanical checks or tests keep the decision true?
```

Do not record temporary implementation plans, copied chat discussion, or facts already enforced and
explained at the relevant code boundary.

## Accepted decisions

- [0001 — Practice Decisions and Runtime Effects](0001-practice-reducer-effects.md)
- [0002 — Capability Modules and Functional Core](0002-capability-modules-and-functional-core.md)
- [0003 — Transactional Account and Credential Identity](0003-transactional-identity-model.md)
- [0004 — Isolate Identity PPE in a Separate Pages Project](0004-isolated-ppe-project.md)
