# STEP-004 — Runtime adapters и explicit selection

**Статус:** Запланировано
**Type:** IMPLEMENTATION
**Приоритет:** Критический
**Фаза:** MVP runtime
**Depends on:** STEP-002

## Requirements

- REQ-003

## ADR

- ADR-003

## Risk flags

- external-integration
- architecture

## Goal

Определить runtime-neutral adapter contract и поддержать explicit selection Codex/Claude Code.

## Context

MVP требует official APIs, capability model и отсутствие fallback.

## Scope

- Adapter registry/capabilities, selected runtime state и configuration read views.
- Immutable run-context contract.

## Mutation policy

### Allowed

- Adapter contracts, безопасные availability checks и tests.

### Conditional

- Реальные SDK integration после подтверждения API/version.

### Forbidden

- PTY scraping и automatic fallback.

## Out of scope

- Command dispatch и UI execution stream.

## Acceptance criteria

- Runtime starts as none; unsupported capability/blocker is explicit.
- Codex и Claude Code остаются adapters за общим contract.

## Verification

- Contract tests, mocks official runtime surfaces, negative fallback tests.

## Deliverables

- Runtime contracts, selection surface и tests.

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
