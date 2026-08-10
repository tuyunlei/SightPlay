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
