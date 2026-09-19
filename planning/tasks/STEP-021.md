# STEP-021 — Typed fail-closed enforcement repository projection

**Статус:** Выполнено
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

**Plan status:** Ready
**Plan revision:** 1
**Plan basis:** sha256:bfe268b462f42fee0109d8e9859b8f76d7d793fade73a8a5e571d14421ca7cb7
**Planned at:** 2026-09-19T20:30:34+00:00

1. В `packages/client-api/index.d.ts` добавить `PLATFORM_UNSUPPORTED` в union `ProjectionError.code`. Это сохраняет единственный публичный typed contract: transport и UI продолжают получать обычный `RepositoryLoadResult`, но могут отличить отсутствие принятого containment profile от `IO_ERROR`, invalid repository и resource limit.
2. В `apps/local-service/src/repository-projection.ts` заменить тело `loadRepository` на постоянный fail-closed путь. Он должен вернуть `{ ok: false, error: { code: 'PLATFORM_UNSUPPORTED', ... } }` до обращения к `projectRoot`, до `beforeLoad`, admission/capacity accounting и любого helper, выполняющего filesystem I/O. Удалить из runtime path устаревшие success-path primitives и imports, если после изменения они больше недостижимы; не добавлять substitute transport, Git capability или containment implementation.
3. В `apps/local-service/src/repository-projection.spec.ts` заменить success-path assertions, несовместимые с ADR-006, на focused regression. Instrumentation через spies/mocks докажет отсутствие `realpath`, `open`, `stat`, `opendir`, `beforeLoad` и любых available capacity/lease mutations для нескольких selected roots; отдельно проверить exact typed result. Устаревшие fixture и Git/descriptor cases удалить или сузить только когда они тестируют удалённый success path, не ослабляя проверку public contract.
4. Проверить все consumers `ClientApi`: `apps/web/src/main.tsx` и `apps/web/src/app/app.tsx` должны компилироваться без special-case fallback. Добавить узкий web test лишь если typechecking или user-visible output не доказывает отображение нового typed code; не менять transport selection или UI semantics без необходимости.
5. При первой production mutation перевести STEP в `В работе`, затем выполнить targeted local-service/web tests и affected Nx `typecheck`/`lint`. После этого выполнить полный набор task verification: `python3 tools/harness/validate.py --mode commit` и `git diff --check`. Зафиксировать literal command, exit code и observed facts в Evidence, но не ставить `Выполнено` до independent security-aware review.

Совместимость и rollback: изменение backward-compatible, поскольку расширяет union error code и не меняет success payload; фактический selected-root success path намеренно прекращается до принятия отдельного supported-profile ADR. Откат возможен только возвратом затронутых исходников и tests вместе: частичный возврат parent I/O, capacity admission или прежней ошибки нарушит ADR-006.

## Evidence

- Реализация: `packages/client-api/index.d.ts` расширен typed code `PLATFORM_UNSUPPORTED`; `createRepositoryClientApi` возвращает его до обращения к selected root, `beforeLoad`, admission/capacity и process primitives. Legacy in-process success path удалён.
- Focused regression: `apps/local-service/src/repository-projection.spec.ts` инструментирует `realpath`, `open`, `stat`, `opendir`, `execFile`, `spawn` и `beforeLoad`; для нескольких roots все spies подтверждают zero calls и typed result.
- `yarn nx test local-service` — exit code 0; 2 test files, 3 tests passed.
- `yarn nx typecheck local-service` — exit code 0.
- `yarn nx lint local-service` — exit code 0.
- `yarn nx test web` — exit code 0; 1 test file, 6 tests passed.
- `yarn nx typecheck web` — exit code 0.
- `yarn nx lint web` — exit code 0.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS`.
- `git diff --check` — exit code 0; whitespace errors не обнаружены.
- Первая попытка `yarn nx test local-service --runInBand` завершилась exit code 1, потому что Vitest не поддерживает переданный flag; это не product failure. Корректный повторный target выше прошёл.
- Primary review `planning/reviews/STEP-021/REVIEW-2026-09-19T20-38-04Z.md` — FAIL: F-001/F-002 выявили удаление независимых ESLint/type-level contract probes; runtime fail-closed implementation подтверждён корректным.
- STEP FIX: в owning local-service test восстановлены реальные ESLint negative probes для `require('node:fs')`, `globalThis.process` и `window.process` в web domain, а также compile-time `@ts-expect-error` proof запрета Git metadata при `available: false`.
- После FIX: `yarn nx test local-service --skip-nx-cache` — exit code 0; 2 test files, 6 tests passed. `yarn nx typecheck local-service --skip-nx-cache`, `yarn nx lint local-service --skip-nx-cache`, `yarn nx test web --skip-nx-cache`, `yarn nx typecheck web --skip-nx-cache`, `yarn nx lint web --skip-nx-cache` — каждый exit code 0. `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS`. `git diff --check` — exit code 0.
- Final primary review: `planning/reviews/STEP-021/REVIEW-2026-09-19T20-43-31Z.md` — PASS; findings не обнаружены, remediation F-001/F-002 подтверждён.
- Final security review: `planning/reviews/STEP-021/SECURITY-REVIEW-2026-09-19T20-42-06Z.md` — PASS; security findings не обнаружены.

## Review status

**Latest verdict:** PASS
**Latest report:** `planning/reviews/STEP-021/REVIEW-2026-09-19T20-43-31Z.md`

## Blocker / Failure reason

Нет. Independent primary и security reviews подтвердили fail-closed policy ADR-006. Поддерживаемый containment primitive остаётся отдельным архитектурным решением STEP-022.
