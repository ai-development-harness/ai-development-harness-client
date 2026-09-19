# STEP-008 — Pre-INIT и PROJECT INIT UI flow

**Статус:** Запланировано
**Type:** IMPLEMENTATION
**Приоритет:** Критический
**Фаза:** MVP lifecycle
**Depends on:** STEP-003, STEP-004, STEP-005, STEP-007
## Requirements

- REQ-002
## ADR

- ADR-001
- ADR-003
## Risk flags

- external-integration
## Goal

Провести brief → runtime → PROJECT INIT → refresh через UI.
## Context

Это первый обязательный end-to-end path.
## Scope

- Brief editor/local-only notice, INIT surface, success refresh/redirect.
## Mutation policy

### Allowed

- UI/service changes and tests.
### Conditional

- Command only through STEP-005 executor.
### Forbidden

- UI-generated REQ/ADR/STEP.
## Out of scope

- Existing initialized project workflow.
## Acceptance criteria

- Flow meets REQ-002 acceptance including repeat INIT guidance.
## Verification

- End-to-end fixture flow.
## Deliverables

- Pre-INIT surface and E2E tests.
## Implementation plan

**Plan status:** Not planned
**Plan revision:** —
**Plan basis:** —
**Planned at:** —
## Evidence

Заполняется по факту реализации и verification.
## Review status

**Latest verdict:** NOT REVIEWED
**Latest report:** —
## Blocker / Failure reason

—
