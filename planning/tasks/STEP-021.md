# STEP-021 — Typed fail-closed enforcement repository projection

**Статус:** Запланировано
**Type:** BUGFIX
**Приоритет:** Критический
**Фаза:** MVP foundation
**Depends on:** STEP-001, STEP-017

## Requirements

- REQ-001
- REQ-011

## ADR

- ADR-004
- ADR-006

## Risk flags

- security-sensitive
- public-api

## Goal

Устранить implementation drift относительно ADR-006: до принятого supported containment profile local-service fail-closed возвращает typed `PLATFORM_UNSUPPORTED` и не делает selected-root I/O, unit create/attach или spawn.

## Context

STEP-020 подтвердил NO-GO для candidate `systemd user manager + D-Bus transient units + cgroup v2`. Independent review обнаружил, что существующий `createRepositoryClientApi` всё ещё вызывает parent `realpath` и читает selected-root artifacts in-process, хотя ADR-006 требует unavailable path до supported profile. Public `ClientApi` пока не содержит error code `PLATFORM_UNSUPPORTED`.

## Scope

- Добавить typed `PLATFORM_UNSUPPORTED` в owning public `ClientApi` error union и сохранить его обработку на всех local-service/web seams.
- Заменить текущий success path repository projection на fail-closed return до любого selected-root filesystem I/O, process execution, unit create, attach или spawn.
- Добавить focused regression tests, доказывающие typed result и отсутствие вызовов selected-root I/O/capability primitives.
- Синхронизировать только фактические evidence и traceability, относящиеся к исправлению.

## Mutation policy

### Allowed

- `packages/client-api`, owning local-service adapter/tests, минимальные web type-handling changes и task evidence.

### Conditional

- Узкая совместимая UI-подача unavailable state, если typecheck требует обработать новый error variant.

### Forbidden

- systemd/D-Bus/cgroup integration, containment supervisor, durable lifecycle store и supported profile implementation.
- Git capability, selected-root fallback, transport, command dispatch и изменение ADR-006/ADR-007.

## Out of scope

- Выбор Linux primitive, принятие profile ADR или возобновление success path.
- Реализация requirements STEP-002, не необходимая для typed fail-closed correction.

## Acceptance criteria

- `ClientApi` выражает `PLATFORM_UNSUPPORTED` как typed error; local-service возвращает его до selected-root I/O и не может вернуть successful repository projection до принятого profile.
- Focused tests instrumentation-ом доказывают zero `realpath`, `open`, `stat`, `opendir`, child-process, unit create/attach/spawn и lease/capacity mutation для unavailable path.
- Existing Git unavailable policy ADR-004 и public boundary не расширяются; нет in-process fallback.

## Verification

- Focused local-service tests и affected typecheck/lint targets из workspace.
- `python3 tools/harness/validate.py --mode commit` и `git diff --check`.
- Independent security-aware review before task completion.

## Deliverables

- Typed public error contract, fail-closed local-service adapter и focused regressions.

## Implementation plan

**Plan status:** Not planned
**Plan revision:** —
**Plan basis:** —
**Planned at:** —

Заполняется командой `STEP PLAN STEP-021`.

## Evidence

Создан corrective task по F-A22 review STEP-020; implementation и verification ещё не выполнялись.

## Review status

**Latest verdict:** NOT REVIEWED
**Latest report:** —

## Blocker / Failure reason

Ожидает `STEP PLAN STEP-021`. До independent review PASS current runtime не считается соответствующим fail-closed policy ADR-006.
