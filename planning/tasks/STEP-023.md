# STEP-023 — Удаление неиспользуемой direct dependency yaml

**Статус:** Выполнено
**Type:** REFACTOR
**Приоритет:** Низкий
**Фаза:** MVP foundation
**Depends on:** STEP-021

## Requirements

- REQ-011

## ADR

- Не требуется

## Risk flags

- Не требуется

## Goal

Удалить неиспользуемую direct dependency `yaml` из `@org/local-service`, не меняя public `ClientApi`, fail-closed runtime или workspace package-manager contract.

## Context

STEP-021 удалил единственный `parseDocument` import вместе с недопустимым до supported containment profile in-process repository projection. Текущий source `apps/local-service` больше не импортирует `yaml`, однако manifest приложения и workspace lockfile всё ещё объявляют его как direct dependency. `yaml` остаётся транзитивной dependency tooling и не является целью полного удаления из workspace.

## Scope

- Удалить `yaml` из direct dependencies `apps/local-service/package.json`.
- Обновить `yarn.lock` штатной Yarn-командой только в объёме, вызванном изменением manifest.
- Проверить, что `@org/local-service` больше не появляется в пути `yarn why yaml`, а transitive tooling entries остаются допустимыми.
- Выполнить targeted local-service проверки и integrity gates.

## Mutation policy

### Allowed

- `apps/local-service/package.json`, `yarn.lock` и task evidence.

### Forbidden

- Изменение production source, public API, Yarn version/configuration, остальных manifests или транзитивных tooling dependencies.
- Удаление `yaml` из lockfile, если его требуют Nx или другие workspace packages.

## Out of scope

- Повторная реализация repository projection, изменение fail-closed policy ADR-006 или выбор containment primitive.
- Dependency upgrades, audit remediation и перестройка workspace dependency graph.

## Acceptance criteria

- `apps/local-service/package.json` не содержит direct dependency `yaml`; source `apps/local-service` не импортирует её.
- `yarn.lock` согласован с manifest, а `yarn why yaml` не показывает `@org/local-service` как requester.
- Local-service build/typecheck/test не получают новую runtime dependency и не меняют public behaviour.

## Verification

- `yarn install --mode=update-lockfile`.
- `yarn nx test local-service --skip-nx-cache`, `yarn nx typecheck local-service --skip-nx-cache`, `yarn nx build local-service --skip-nx-cache`.
- `yarn why yaml`, `python3 tools/harness/validate.py --mode commit` и `git diff --check`.
- Independent review не требуется при отсутствии production-code/API/security diff; final decision проверяет фактический diff.

## Deliverables

- Согласованные local-service manifest и Yarn lockfile без direct dependency `yaml`.

## Implementation plan

**Plan status:** Ready
**Plan revision:** 1
**Plan basis:** sha256:ad55856926ec14b88ea457ead3cfc650fa3b1b4c669257d2b598766d96a84dc2
**Planned at:** 2026-09-19T20:54:09+00:00

1. Повторно подтвердить отсутствие `yaml` imports в `apps/local-service` и зафиксировать baseline `yarn why yaml`, отделяя direct requester `@org/local-service` от допустимых transitive tooling requesters Nx и cosmiconfig.
2. Удалить только ключ `yaml` и пустой `dependencies` object из `apps/local-service/package.json`; не менять `devDependencies`, Yarn configuration, production source или другие manifests.
3. Запустить `yarn install --mode=update-lockfile`, затем проверить diff `yarn.lock`: workspace entry `@org/local-service` больше не должен request `yaml`; package entries, требуемые Nx/tooling, не удалять вручную.
4. Выполнить target checks local-service (`test`, `typecheck`, `build`) без Nx cache и `yarn why yaml`. Подтвердить отсутствие public/runtime diff, затем запустить Harness validation и whitespace gate.
5. Записать командные результаты в Evidence и передать узкий manifest/lockfile diff на independent review; до PASS STEP не переводить в `Выполнено`.

Совместимость и rollback: изменение не меняет application API или runtime behavior, но изменяет reproducible dependency graph. Откат должен вернуть согласованную пару `apps/local-service/package.json` и `yarn.lock`; ручной частичный откат lockfile запрещён.

## Evidence

- Baseline `yarn why yaml` подтверждал direct requester `@org/local-service`; source search в `apps/local-service` не нашёл imports `yaml`.
- Удалены `dependencies.yaml` и пустой `dependencies` object из `apps/local-service/package.json`. `YARN_CACHE_FOLDER=/tmp/step023-yarn-cache yarn install --mode=update-lockfile` — exit code 0; `yarn.lock` удалил только workspace edge и orphan entry `yaml@npm:^2.9.0`.
- `yarn why yaml` после mutation не содержит `@org/local-service`; остались только transitive requesters `cosmiconfig` и `nx`.
- `yarn nx test local-service --skip-nx-cache` — exit code 0; 2 test files, 6 tests passed.
- `yarn nx typecheck local-service --skip-nx-cache` — exit code 0.
- `yarn nx build local-service --skip-nx-cache` — exit code 0.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS`.
- `git diff --check` — exit code 0; whitespace errors не обнаружены.
- Plain `yarn install --mode=update-lockfile` не смог использовать configured `/yarn-cache`; transient `YARN_CACHE_FOLDER` не меняет project configuration и позволил воспроизводимо обновить lockfile. Yarn сообщил только существующие peer-dependency warnings.
- Независимый review `REVIEW-2026-09-19T20-58-02Z` — PASS: scope ограничен manifest/lockfile и traceability, acceptance criteria и все targeted проверки подтверждены.

## Review status

**Latest verdict:** PASS
**Latest report:** `planning/reviews/STEP-023/REVIEW-2026-09-19T20-58-02Z.md`

## Blocker / Failure reason

Нет.
