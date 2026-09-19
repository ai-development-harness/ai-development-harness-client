# STEP-002 — ClientApi и repository projections

**Статус:** Запланировано
**Type:** IMPLEMENTATION
**Приоритет:** Критический
**Фаза:** MVP foundation
**Depends on:** STEP-001

## Requirements

- REQ-001
- REQ-011

## ADR

- ADR-001
- ADR-002

## Risk flags

- architecture

## Goal

Определить typed ClientApi, local service boundary и read-only repository/Git projections.

## Context

UI не должен получать filesystem/process access или владеть protocol semantics.

## Scope

- Domain contracts, repository inspection и projection loading.
- Контракт ошибок/validity без command dispatch.

## Mutation policy

### Allowed

- Исходный код foundation и focused tests.

### Conditional

- Дополнять ADR только при изменении устойчивой границы.

### Forbidden

- Копирование CTS, UI state machine, runtime integration.

## Out of scope

- PROJECT INIT UI, command palette и recovery.

## Acceptance criteria

- UI обращается к typed ClientApi, а service читает project artifacts/Git.
- Projection различает минимум pre-INIT/initialized/invalid repository facts.

## Verification

- Contract/unit tests и реальные targets STEP-001.

## Deliverables

- ClientApi contracts, local service implementation и tests.

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
