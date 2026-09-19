# STEP-005 — Canonical command executor и preflight

**Статус:** Запланировано
**Type:** IMPLEMENTATION
**Приоритет:** Критический
**Фаза:** MVP execution
**Depends on:** STEP-002, STEP-004

## Requirements

- REQ-001
- REQ-009
- REQ-012

## ADR

- ADR-001
- ADR-003

## Risk flags

- architecture
- external-integration

## Goal

Запускать commands/chains через Harness preflight и выбранный runtime без client CTS.

## Context

`validate-command.py` и Execution Status принадлежат Harness.

## Scope

- Service invocation preflight/start/complete, command palette contract и chain projection.

## Mutation policy

### Allowed

- Executor, adapters, tests.
### Conditional

- Реальные runtime dispatch после preflight PASS.
### Forbidden

- TypeScript transition matrix и dispatch invalid chain.

## Out of scope

- Полный live UI и recovery views.

## Acceptance criteria

- Invalid command не запускает runtime.
- Valid chain показывает normalized segments и результаты.

## Verification

- Integration tests с real Harness tooling fixtures.

## Deliverables

- Command executor, palette contract и tests.

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
