# STEP-001 — Bootstrap Nx workspace и границ приложения

**Статус:** Выполнено
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

**Plan status:** Ready
**Plan revision:** 1
**Plan basis:** sha256:06ce28d4770fdb7f42601b648851802b1cc186b6224621a7aa42b33f8bf3a371
**Planned at:** 2026-09-19T10:33:44+00:00

1. До установки сверить поддерживаемые Node.js, Nx, React и TypeScript версии с их официальной документацией; зафиксировать выбранный package manager, manifests и lockfile в корне. Создать минимальный Nx workspace без UI продукта и без повторного Harness tooling.
2. Создать отдельные приложения: React UI и local Node service. Оставить оба приложения функционально пустыми, но с самостоятельными build, typecheck и test targets; UI не получает filesystem, process или localhost transport dependency.
3. Добавить только базовую конфигурацию TypeScript, test runner и target-ы, необходимые для воспроизводимой сборки двух приложений. Не вводить ClientApi, repository projections, runtime adapters, canonical command execution или продуктовые экраны: они принадлежат последующим STEP.
4. Добавить сфокусированные тесты foundation: React application рендерит нейтральный bootstrap shell, Node application поднимает/проверяет минимальный service boundary, а workspace targets доступны через Nx. Тесты не должны задавать семантику будущего transport.
5. Обновить `docs/development.md` только фактическими prerequisites, setup и командами build/typecheck/test, созданными в workspace. Выполнить эти команды последовательно и занести в Evidence точные команды, exit code и наблюдаемый результат.

### Совместимость, риски и rollback

- Выбор версий ограничивается актуальной совместимостью Nx/Node/React; lockfile фиксирует воспроизводимый набор зависимостей.
- Главный архитектурный риск — преждевременно связать React с privileged service или HTTP endpoint. Его предотвращает отсутствие такого импорта и transport-кода в STEP-001; контракт `ClientApi` остаётся для STEP-002 согласно ADR-002.
- При неуспешном bootstrap откатываются только новые workspace-файлы текущего STEP; Harness artifacts и принятые ADR не изменяются.

## Evidence

- `node --version` — exit code 0; использован Node.js `v22.16.0`.
- `npx nx show projects` — exit code 0; обнаружены `web` и `local-service`.
- `npx nx run-many --target=typecheck --projects=web,local-service --parallel=1` — exit code 0; typecheck обоих приложений прошёл.
- `npx nx run-many --target=test --projects=web,local-service --parallel=1` — exit code 0; прошли тесты React shell и local service boundary.
- `npx nx run-many --target=lint --projects=web,local-service --parallel=1` — exit code 0; lint обоих приложений прошёл.
- `npx nx run-many --target=build --projects=web,local-service --parallel=1` — exit code 0; собраны `web` и production build `local-service`.
- `npm audit --omit=dev --json` — exit code 0; production dependency tree не содержит известных vulnerabilities.

## Review status

**Latest verdict:** PASS
**Latest report:** `planning/reviews/STEP-001/REVIEW-2026-09-19T10-46-20Z.md`

## Blocker / Failure reason

—
