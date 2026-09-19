# STEP-006 — Execution recovery и resolver projections

**Статус:** Запланировано
**Type:** IMPLEMENTATION
**Приоритет:** Критический
**Фаза:** MVP execution
**Depends on:** STEP-002, STEP-005

## Requirements

- REQ-001
- REQ-013
## ADR

- ADR-001
- ADR-003
## Risk flags

- concurrency
- architecture
## Goal

Спроецировать Execution Status/resolver без альтернативного execution store.
## Context

Recovery должен переживать UI/service interruption.
## Scope

- Unresolved executions, resolver statuses и local runtime binding.
## Mutation policy

### Allowed

- Read models, local-only binding и tests.
### Conditional

- Reattach только при достоверной binding.
### Forbidden

- Automatic runtime fallback.
## Out of scope

- Activity analytics.
## Acceptance criteria

- Несколько unresolved records не скрываются; missing binding требует explicit runtime.
## Verification

- Fixture tests for RESUME/NEXT/DONE/BLOCKED/NOT_FOUND.
## Deliverables

- Recovery projections и tests.
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
