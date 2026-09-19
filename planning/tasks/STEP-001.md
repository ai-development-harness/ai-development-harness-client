# STEP-001 — Bootstrap Nx workspace и границ приложения

**Статус:** Запланировано
**Type:** IMPLEMENTATION
**Приоритет:** Критический
**Фаза:** MVP foundation
**Depends on:** —

## Requirements

- REQ-011

## ADR

- ADR-002

## Risk flags

- architecture

## Goal

Создать минимальный Nx/TypeScript/React/Node workspace без product features.

## Context

Репозиторий содержит только Harness; tooling нельзя придумывать до выбора реальной foundation.

## Scope

- Workspace manifests, приложения/библиотеки и базовые targets.
- Проверяемая граница frontend и local service.

## Mutation policy

### Allowed

- Создание исходной application foundation и её tests/configuration.

### Conditional

- Уточнить package/tool versions по доступным authoritative источникам.

### Forbidden

- Реализация repository/runtime commands и экранов продукта.

## Out of scope

- ClientApi semantics, transport choice, live execution.

## Acceptance criteria

- Есть Nx workspace с TypeScript React UI и local Node service.
- Реальные build/typecheck/test targets документированы фактической конфигурацией.

## Verification

- Запустить targets, созданные этим STEP.

## Deliverables

- Workspace configuration, initial apps/libs и development documentation.

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
