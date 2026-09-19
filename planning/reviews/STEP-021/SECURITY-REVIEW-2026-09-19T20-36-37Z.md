# SECURITY REVIEW STEP-021 — 2026-09-19 20:36 UTC

**Reviewer role:** независимый adversarial security reviewer
**Verdict:** PASS
**Reviewed revisions:** `repository-projection.ts` `sha256:0c05beeb5dba914d88b87f58ac2d4dd524b6a7cd711e8caab73418f60b7594b9`; `repository-projection.spec.ts` `sha256:806bff56c04466f5fb383cb5dfd1d03204dd6bf0328988b6455ad86597dfe907`; `packages/client-api/index.d.ts` `sha256:89a6170a6ccccee3f8c0b8fb2a044d28122974fda184f635bf2728d339bcde7e`; STEP-021 `sha256:c2fbab016fd5ede929d95a40b1944edafbee03e7fda71f44f6a2a094e7a0e891`; ADR-006 `sha256:cd1da8a2930c0f038609ddd40d5cef385c5ae9553ee29ad87a88573319551375`

## Проверенный scope

- Exact working-tree diff STEP-021 против Accepted ADR-006 и task contract.
- Fail-closed ordering относительно selected-root filesystem I/O, `beforeLoad`, admission/capacity и process/unit primitives.
- Public typed seam `ClientApi` и отсутствие утечки selected root через error result/UI projection.
- Regression proof для `realpath`, `open`, `stat`, `opendir`, `execFile`, `spawn`, `beforeLoad` и нескольких attacker-controlled roots.
- Отсутствие fallback, Git capability, transport/command dispatch и скрытого success path.

## Findings

Security findings не обнаружены.

## Подтверждённые security properties

- `loadRepository` не читает и не преобразует `projectRoot`: attacker-controlled path не проходит через `realpath`, `stat`, `open`, `opendir`, `cwd`, строковую интерполяцию, shell или другой filesystem/process boundary. Result является постоянным `PLATFORM_UNSUPPORTED`.
- Отказ формируется до чтения полей `RepositoryProjectionOptions`: `beforeLoad`, `procFdPath` и `maxInFlightLoads` не вызываются и не создают admission/capacity side effect. В текущем production module отсутствуют filesystem, child-process, unit, lease и capacity imports либо mutable state.
- Success payload недостижим до отдельного supported-profile ADR. Нет in-process fallback, unit create/attach/spawn или Git subprocess; поэтому selected repository не получает execution, network, config, dynamic-import или disclosure capability через этот path.
- `PLATFORM_UNSUPPORTED` добавлен в owning public `ProjectionError.code`, а implementation возвращает `RepositoryLoadResult` через `ClientApi`. Error message статичен и не содержит selected root, PID, OS handle или raw diagnostic.
- Web consumer отображает только typed code. Значение selected root не попадает в error payload или пользовательский status, а stale result прежнего root по существующему UI contract игнорируется.
- Focused regression вызывает один client параллельно с двумя различными roots и доказывает zero calls для `beforeLoad`, выбранных filesystem APIs и `execFile`/`spawn`. Отсутствие unit/lease seams дополнительно подтверждено static inspection production module; их нечего вызвать в текущей revision.

## Adversarial scenarios

1. Злоумышленник передаёт symlink, FIFO, network mount, очень длинный либо недоступный selected root. Implementation не разыменовывает и не читает значение, немедленно возвращает typed unavailable result; блокировка event loop и path traversal через selected-root I/O невозможны.
2. Caller передаёт `maxInFlightLoads: 0`, side-effectful `beforeLoad` и `procFdPath`. Implementation не обращается к этим hooks, поэтому нельзя инициировать legacy admission mutation либо selected-root traversal до supported containment profile.
3. Caller запускает несколько конкурентных loads с разными roots. Каждый вызов возвращает одинаковый immutable по смыслу typed отказ; нет общего lease/capacity state, unit mutation, child process или cross-request repository facts.
4. UI получает отказ. Публичный result содержит только общий code/message и не раскрывает attacker-controlled root или operational identity; UI рендерит code, а не raw diagnostic.

## Evidence и verification

- `yarn vitest run --config apps/local-service/vitest.config.mts` — exit code 0; 2 test files, 3 tests passed, включая оба focused STEP-021 cases, без Nx cache.
- `yarn tsc --build apps/local-service/tsconfig.json --emitDeclarationOnly` — exit code 0; production и spec TypeScript references проверены.
- `yarn nx typecheck web --skip-nx-cache` — exit code 0; public error union совместим с web consumer.
- `yarn nx test local-service` — exit code 0, но Nx сообщил cache hit; поэтому security review отдельно выполнил прямой uncached Vitest command выше.
- Попытка повторить несколько uncached Nx targets параллельно не использована как positive evidence: local-service test получил false recursive-invocation diagnostic, один typecheck потерял daemon connection, web typecheck завершился успешно. Прямые Vitest/TypeScript команды устранили неопределённость для owning implementation и tests.
- `git diff --check` — exit code 0 до добавления этого report; whitespace errors в implementation diff не обнаружены.
- `rg` по `apps/local-service/src`, `packages/client-api` и `apps/web/src` подтвердил, что production selected-root path не содержит filesystem/process/admission/unit primitives; найденные imports built-ins находятся только в regression test instrumentation.

## Verdict rationale

Проверенная revision устраняет drift: public contract имеет typed `PLATFORM_UNSUPPORTED`, а production path возвращает его до любого использования attacker-controlled root, hooks, admission/capacity или process primitive. Конкретного attack scenario, позволяющего selected-root I/O, execution, information disclosure, fallback либо capacity mutation через этот path, не найдено. Verdict `PASS` относится только к перечисленным hashes; добавление supported profile, transport либо изменение fail-closed ordering требует нового security review.
