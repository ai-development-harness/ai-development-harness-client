# SECURITY REVIEW STEP-021 — 2026-09-19 20:42 UTC

**Reviewer role:** независимый adversarial security reviewer после STEP FIX
**Verdict:** PASS
**Reviewed revision:** HEAD `eb24b9d3404b57c2f45ff7a875077b658c3c4426` + working tree: `repository-projection.ts` `sha256:0c05beeb5dba914d88b87f58ac2d4dd524b6a7cd711e8caab73418f60b7594b9`; `repository-projection.spec.ts` `sha256:02068a906efefa4b03110ba1fd44723547d7283ca68823e86f248247de603dda`; `packages/client-api/index.d.ts` `sha256:89a6170a6ccccee3f8c0b8fb2a044d28122974fda184f635bf2728d339bcde7e`; STEP-021 `sha256:e2d3828615ebc240b4b588102d4be09f1253f00be57daeeed9239e9c308f5699`; ADR-006 `sha256:cd1da8a2930c0f038609ddd40d5cef385c5ae9553ee29ad87a88573319551375`

## Проверенный scope

- Фактический working-tree diff STEP-021 после FIX относительно Accepted ADR-004/ADR-006 и task contract.
- Fail-closed ordering относительно attacker-controlled selected root, filesystem I/O, `beforeLoad`, admission/capacity, child process и unit/lease primitives.
- Public typed seam `ClientApi`, отсутствие утечки selected-root facts и сохранение unavailable Git contract.
- Восстановленные regression probes для web privilege boundary: `require('node:fs')`, `globalThis.process` и `window.process`.
- Отсутствие fallback, Git capability, transport/command dispatch, unsafe deserialization и скрытого success path.

## Findings

Security findings не обнаружены.

## Подтверждённые security properties

- `loadRepository` не читает и не преобразует `_projectRoot`: значение не проходит через filesystem syscall, `cwd`, shell, child process, unit supervisor, interpolation или diagnostic payload. Каждый вызов возвращает постоянный typed `PLATFORM_UNSUPPORTED`.
- Отказ формируется без чтения полей `_options`: side-effectful `beforeLoad` и `procFdPath`, а также `maxInFlightLoads` не участвуют в admission/capacity path. В production module отсутствуют filesystem/process imports, unit/lease integration и mutable shared state.
- Success payload и in-process fallback недостижимы до отдельного supported-profile ADR. Selected repository не получает code execution, Git/config/helper, network, dynamic import или disclosure capability через этот path.
- Публичный `ProjectionError.code` содержит `PLATFORM_UNSUPPORTED`; статичное сообщение не раскрывает selected root, PID, OS handle, raw error или platform diagnostic.
- Восстановленный `@ts-expect-error` proof закрепляет запрет `branch` для `GitProjection` с `available: false`, поэтому ослабление ADR-004 ломает typecheck.
- Восстановленные ESLint negative probes используют реальную workspace-конфигурацию и отвергают три проверенных обхода UI privilege boundary. Это устраняет F-001/F-002 предыдущего primary review без расширения runtime capability.

## Adversarial scenarios

1. **Malicious selected root:** caller передаёт symlink, FIFO, device, network mount, недоступный либо чрезмерно длинный path. Preconditions ограничены доступом к `ClientApi.loadRepository`; implementation не разыменовывает и не читает path. Impact path traversal, hang, data exposure или device interaction не достигается.
2. **Side-effectful legacy options:** caller передаёт `beforeLoad`, `procFdPath` и `maxInFlightLoads: 0`, рассчитывая запустить hook либо изменить admission state до platform check. Options не читаются; hook и capacity mutation недостижимы.
3. **Concurrent cross-root requests:** caller параллельно отправляет разные roots, пытаясь получить shared-state leak или reuse lease. Все results одинаково fail-closed; production path не создаёт lease/unit/process и не хранит repository facts.
4. **UI privilege-boundary regression:** будущая правка разрешает web source обращаться к Node filesystem/process через CommonJS require, `globalThis` или `window`. Восстановленные negative probes воспроизводят эти preconditions на реальной ESLint-конфигурации и делают local-service security suite красной до попадания privileged access в UI.
5. **Unavailable Git metadata widening:** будущая правка добавляет `branch` в `available: false`. Compile-time negative proof перестаёт соответствовать ожидаемой ошибке и ломает typecheck, не позволяя незаметно раскрыть selected-repository metadata.

## Evidence и verification

- Static inspection `apps/local-service/src/repository-projection.ts`, `packages/client-api/index.d.ts`, web consumers и production-wide `rg` подтвердила отсутствие filesystem/process/admission/unit primitive в selected-root runtime path.
- `yarn nx test local-service --skip-nx-cache` — exit code 0; 2 test files, 6 tests passed, включая fail-closed instrumentation и три реальные ESLint negative probes; Nx cache skipped.
- `yarn nx typecheck local-service --skip-nx-cache` — exit code 0; compile-time Git unavailable negative proof проверен; Nx cache skipped.
- `yarn nx lint local-service --skip-nx-cache` — exit code 0; Nx cache skipped.
- `yarn nx typecheck web --skip-nx-cache` — exit code 0; расширенный public error union совместим с web consumer; Nx cache skipped.
- `git diff --check` — exit code 0 до добавления этого report; whitespace errors в implementation diff не обнаружены.

## Verdict rationale

После FIX runtime по-прежнему возвращает typed `PLATFORM_UNSUPPORTED` до использования attacker-controlled root, hooks, admission/capacity и filesystem/process/unit primitives. Восстановлены обе независимые security contract probes, отсутствие которых вызвало F-001/F-002 предыдущего review: реальный ESLint enforcement UI privilege boundary и compile-time запрет Git metadata для unavailable branch. Конкретного attack scenario, позволяющего I/O, execution, information disclosure, fallback, privilege escalation либо capacity mutation через текущий path, не найдено. Verdict `PASS` относится только к указанным hashes; supported profile, transport или изменение fail-closed ordering требует нового security review.
