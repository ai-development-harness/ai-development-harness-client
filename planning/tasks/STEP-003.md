# STEP-003 — Открытие и валидация repository

**Статус:** Запланировано
**Type:** IMPLEMENTATION
**Приоритет:** Критический
**Фаза:** MVP lifecycle
**Depends on:** STEP-002

## Requirements

- REQ-002

## ADR

- ADR-001

## Risk flags

- none

## Goal

Реализовать launcher/project switcher и объяснимую валидацию local Harness repository.

## Context

Пользователь должен отличать valid initialized, valid pre-INIT, ordinary Git и damaged state.

## Scope

- Path input/selection, validation result, recent/current project model.
- Сброс selected runtime при project switch.

## Mutation policy

### Allowed

- Код открытия проекта и tests.

### Conditional

- Local recent-project persistence только вне canonical artifacts.

### Forbidden

- Создание brief/INIT command и automatic runtime selection.

## Out of scope

- Full pre-INIT UI.

## Acceptance criteria

- Каждое repository state имеет concrete human-readable blocker/reason.
- Переключение не меняет immutable context существующего run.

## Verification

- Tests на все четыре validation states и switch behavior.

## Deliverables

- Open Project surface, service validation и tests.

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
