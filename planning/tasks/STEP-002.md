# STEP-002 — ClientApi и repository projections

**Статус:** Заблокировано
**Type:** IMPLEMENTATION
**Приоритет:** Критический
**Фаза:** MVP foundation
**Depends on:** STEP-001, STEP-017, STEP-019, STEP-021, STEP-022

## Requirements

- REQ-001
- REQ-011

## ADR

- ADR-001
- ADR-002
- ADR-004
- ADR-005 (historical, superseded ADR-006)
- ADR-006
- ADR-007 (Proposed additive lifecycle contract; не current до independent review PASS)

## Risk flags

- architecture
- security-sensitive
- concurrency

## Goal

Определить typed ClientApi, local service boundary и read-only repository projection с безопасной Git unavailable policy.

## Context

UI не должен получать filesystem/process access или владеть protocol semantics.

## Scope

- Domain contracts, data-only repository inspection и process-supervised projection loading.
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

- UI обращается к typed ClientApi, а service читает project artifacts через supervisor-owned containment unit без Git subprocess для selected root; parent до unit выполняет только bounded lexical validation.
- Git projection возвращает `worktree: unavailable` с причиной `SECURITY_POLICY` и не выдаёт branch/upstream/divergence как доступные facts.
- Projection различает минимум pre-INIT/initialized/invalid repository facts.
- До review PASS STEP-021 и accepted supported-profile decision STEP-022 service возвращает `PLATFORM_UNSUPPORTED` до spawn и не имеет success path. Такой profile обязан обеспечить запрет network и child-process capability, hard CPU/memory/PID/tasks limits, private stable handle, generation-bound seal/destroy, kill-all, authoritative empty proof, durable restart-safe reconciliation retained unit/lease и linearizable primitive, который атомарно связывает durable `TEARDOWN` intent/new generation с activation revoke, а `activate` неделимо validate/consume/переводит `inert → running`; отсутствие любой guarantee возвращает `PLATFORM_UNSUPPORTED` без in-process fallback. После появления profile admission атомарно фиксирует `RESERVED` lease и opaque unit key до OS mutation. Inert worker получает generation-bound one-shot token: untrusted I/O запрещены до committed durable `ACTIVE`, release token и выигравшего atomic `activate`. Durable `attachIntent` фиксирует только попытку spawn/attach; отдельный durable outcome либо доказывает `noChildEverAttached`, либо фиксирует identity reaper-observable child, который требует `directChildReaped` в terminal receipt. Любой recovered `ACTIVE` всегда идёт в fenced teardown без replay release. Missing, unknown, unresolvable, corrupt или reconciliation-failed record удерживает budget. Deadline стартует в начале load и покрывает bounded queue; already-aborted signal возвращает `CANCELLED` без spawn, lexical root rejection — `INVALID_PROJECT_ROOT`, а отсутствие capacity — `RESOURCE_LIMIT`. Cancellation/deadline немедленно возвращают immutable typed result, поздний IPC игнорируется, а late teardown failure фиксируется в durable read-only `supervisorOutcome` (`TEARDOWN_FAILED`, opaque unit identity, retained lease) до terminal receipt и confirmed reap.

## Verification

- Contract/unit tests для data-only projection: parameterized crash injection/restart после `RESERVED`, OS unit creation, handle binding, durable `attachIntent`, proven child outcome, inert attach, committed `ACTIVE`, до send release, после send до acknowledgement, после начала I/O, durable `TEARDOWN` intent/atomic revoke до seal, seal до kill/receipt, terminal receipt, во время release/tombstone transaction и после commit до acknowledgement. Deterministic `receiver check passed → pause before atomic activate → teardown intent/revoke → resume`, `ACTIVE committed → release pending → revoke/close/drain → seal → delayed release`, `attach pending → seal → empty proof/release → delayed attach` и `intent → TEARDOWN → delayed child` (включая restart до receipt) доказывают linearization fence, отсутствие untrusted I/O/member после победившего fence и retained lease до valid receipt. Intent-before-child и failed spawn доказывают, что `attachIntent` не подменяет child proof: no-child receipt разрешён только при durable absent outcome, а reaper-observable child требует `directChildReaped` с identity. Cases включают damaged orphan/missing, record-without-unit, unknown, unresolvable, corrupt/truncated и reconciliation-failed record/handle; отсутствие нового admission/spawn и `RESOURCE_LIMIT` до valid receipt, exactly-once ABA-safe lease release; crash `BOUND` с member teardown-ит worker, а любой recovered `ACTIVE` teardown-ится без replay release; adversarial opaque observation с poison path/PID/raw diagnostics до и после restart; required OS limits/fail-closed до spawn, parent без filesystem I/O до child readiness, descriptor-first root identity при race replacement symlink/mount, deadline/cancel/late IPC, immutable result, malformed IPC/crash, invalid artifact, `PLATFORM_UNSUPPORTED`, `RESOURCE_LIMIT`, `SECURITY_POLICY` unavailable и реальные targets STEP-001. Closed six-fixture negative capability-gate matrix: non-Linux; missing cgroup v2; unreachable/unauthorized manager; missing delegated subtree/controller/effective-limit readback mismatch; failed worker restriction/user-bus denial; missing ownership/activation/receipt primitive. Каждый fixture доказывает typed `PLATFORM_UNSUPPORTED`, zero unit create/attach/spawn/selected-root I/O и no lease/capacity mutation. Runtime regression доказывает, что worker не может подключиться к user-bus/control socket или выполнить raw `StartTransientUnit`.

## Deliverables

- ClientApi contracts, containment-supervised local service implementation, tests и typed Git unavailable policy.

## Implementation plan

**Plan status:** Ready
**Plan revision:** 16
**Plan basis:** sha256:d3d2f8d3357df7bf4e1174d67373ac75acbe2ecccbafaa20b73908165542a29e
**Planned at:** 2026-09-19T18:43:20+00:00

1. Выделить минимальный shared `ClientApi` contract в workspace: типы read-only repository/Git projection, validity/error result и async methods загрузки. Контракт не включает command dispatch, CTS matrix, runtime state или transport details; frontend импортирует только этот public contract.
2. Реализовать в `apps/local-service` containment-supervised read-only repository loader с явным `projectRoot`. До принятия ADR-007 и отдельного ADR с проверенным supported platform profile loader fail-closed возвращает `PLATFORM_UNSUPPORTED` до spawn. После них admission атомарно durable фиксирует retained lease и opaque `unitKey`/nonce в `RESERVED` до OS mutation; platform idempotently создаёт discoverable unit, durable `CREATED` фиксируется после пустого unit, `BOUND` — после verified stable handle. Inert attach получает owner generation/token; durable `ACTIVE` с membership proof линейно предшествует one-shot release untrusted I/O. Parent до spawn делает только bounded lexical validation (`INVALID_PROJECT_ROOT`) и получает lease (`RESOURCE_LIMIT` при отсутствии capacity), а deadline покрывает весь lifecycle. Child сначала открывает root descriptor, получает `dev`/`ino` через `fstat` того же descriptor и использует его для всех reads; `canonicalPath` — только optional advisory value из этого descriptor, не security identity. При startup supervisor authoritatively enumerate-ит records/units до любого admission; `BOUND` с member без committed `ACTIVE`, orphan/missing, unknown, unresolvable, corrupt/truncated или unreconciled record seal/teardown-ятся fail-closed и удерживают budget либо возвращают `PLATFORM_UNSUPPORTED`. Read-only observation возвращает только `ACTIVE`/`RECOVERING`/`TEARDOWN_FAILED`, opaque unit identity и retained lease, но не path/PID/raw diagnostics. Перед kill-all `TEARDOWN` отзывает generation, seal-ит unit и ждёт in-flight attach; release допустим только после authoritative empty proof и durable generation-bound receipt: `noChildEverAttached` при proven absent `childOutcome` либо `directChildReaped(identity)` при persisted reaper-observable child identity, через ABA-safe atomарную release/tombstone transaction. Иначе typed `PLATFORM_UNSUPPORTED`. Cancellation/deadline немедленно immutable settle caller, late IPC игнорируется, а late teardown failure записывается в durable `supervisorOutcome` с retained lease до terminal receipt. До settlement spawn/handshake/protocol/teardown дают `IO_ERROR`, malformed artifact — `INVALID_REPOSITORY`, без in-process fallback.
3. До отдельной capability boundary не запускать Git subprocess для selected `projectRoot`: `GitProjection` возвращает typed `worktree: unavailable` с причиной `SECURITY_POLICY`, без branch/upstream/divergence или inference о clean worktree. Не принимать command strings от UI и не выполнять mutation; worktree и metadata facts требуют отдельного sandbox/capability STEP согласно ADR-004.
4. Подключить local-service implementation к `ClientApi` через adapter/factory, сохранив transport незаданным. В web application добавить узкий composition seam и явный unavailable adapter для bootstrap: UI использует typed `ClientApi`, но не получает filesystem/process/localhost access и не утверждает выбранный transport до отдельного решения.
5. Добавить focused tests: contract/type boundary и error union, fixtures для valid initialized/pre-INIT/invalid repository, Git absence/error handling и web usage только через `ClientApi`. До accepted profile tests доказывают `PLATFORM_UNSUPPORTED` до spawn для отсутствия каждого required OS limit. После его появления parameterized crash injection покрывает restart после `RESERVED`, OS unit creation, handle binding, inert attach, committed `ACTIVE`, activation release, `TEARDOWN`/seal, terminal receipt, во время release/tombstone transaction и после commit до acknowledgement; tests доказывают отсутствие нового admission/spawn и `RESOURCE_LIMIT` при retained budget, exactly-once ABA-safe release после reconciliation + valid receipt, а также orphan/missing, record-without-unit, unknown, unresolvable, corrupt/truncated и reconciliation-failed cases. Deterministic delayed-attach test доказывает, что stale generation/token/handle не добавляет member после seal/empty proof/release; crash `BOUND` с member доказывает teardown и отсутствие untrusted I/O до committed `ACTIVE`/one-shot release. Adversarial fixture с poison selected-root path/PID/raw diagnostics доказывает до и после restart отсутствие этих значений в public observation, IPC/loggable response и serialized payload. Дополнительно tests покрывают отсутствие parent `realpath`/`stat`/`access`/`cwd` до readiness, descriptor-first identity при замене symlink/mount между resolution и open, deadline/cancel без await, late IPC, timeout/cancel с late teardown failure без замены caller result и с durable read-only retained lease/outcome, malformed IPC/handshake/crash/teardown error до settlement, invalid artifact, unit-empty accounting, cap/rejection/recovery после normal completion, отсутствие in-process fallback и raw stderr. Fixtures временные, без обращения к текущему repository и копирования Harness semantics.
6. Дополнение additive lifecycle handoff ADR-007: `TEARDOWN` тем же linearizable primitive атомарно durable фиксирует intent/new generation и revoke-ит activation boundary, а `activate` неделимо validate/consume/переводит worker в running. `attachIntent` journal-ится до попытки spawn/attach, но terminal child proof появляется только в отдельном durable outcome: `noChildEverAttached` при доказанном absent child либо reaper identity для `directChildReaped`. Recovered `ACTIVE` всегда teardown-ится без replay release. Deterministic tests покрывают `receiver check passed → pause before atomic activate → teardown intent/revoke → resume`, `ACTIVE committed → release pending → teardown intent/revoke → close/drain → seal → delayed release`, crash до send, после send до acknowledgement, после начала I/O, после intent до seal и после seal до kill/receipt, доказывая отсутствие untrusted I/O/member после fence и retained lease до receipt. Tests дополнительно доказывают denial worker user-bus/control-socket connection и raw `StartTransientUnit`.
7. В parameterized matrix отдельно зафиксировать intent-before-child, failed spawn и `intent → TEARDOWN → delayed child` после teardown/restart, а также pre-spawn variant с durable `childOutcome=absent`. Для каждого варианта restart доказывает отсутствие нового admission/spawn и retained lease до valid receipt; receipt требует `directChildReaped` только с proven reaper-observable child identity и `noChildEverAttached` только с durable absent outcome, но не просто с `attachIntent`. Closed six-fixture capability set состоит из non-Linux, missing cgroup v2, unreachable/unauthorized D-Bus manager, missing delegated subtree/controller/effective-limit readback mismatch, failed worker restriction/user-bus denial и missing ownership/activation/receipt primitive. Каждый fixture возвращает `PLATFORM_UNSUPPORTED` до unit create/attach/spawn/selected-root I/O и без lease/capacity mutation. Delayed-release case запускает `ACTIVE committed → release pending → TEARDOWN intent/new generation + atomic revoke → close/drain → seal → delayed release`, в том числе с crash/restart до kill-all, и доказывает отсутствие untrusted I/O/member после выигравшего fence.
8. Запустить реальные Nx targets для `web` и `local-service` последовательно (`typecheck`, `test`, `lint`, `build`), а также `python3 tools/harness/validate.py --mode commit`; занести command, exit code и observed result в Evidence. Review отдельно проверит отсутствие frontend privileged imports, command dispatch и hardcoded localhost assumptions.

### Совместимость, риски и rollback

- Существующая foundation остаётся совместимой: data-only projection не меняет Harness artifacts и не требует migration. Public boundary ограничена TypeScript contract и typed error union, поэтому будущий transport заменяет adapter, а не UI domain.
- Главный риск — residual child в uninterruptible OS state. Его ограничивают admission control, durable restart-safe lease accounting, supervisor-owned private unit со stable non-reusable handle, kill-all, empty proof и fail-closed `RESOURCE_LIMIT`; repository-controlled execution по-прежнему запрещено ADR-004.
- При откате удаляются только новые ClientApi/projection modules и tests; repository, Git и Execution Status не меняются. Откат не возвращает in-process reading.

## Evidence

- `yarn typecheck` — exit code 0; успешно проверены `web` и `local-service`.
- `yarn test` — exit code 0; прошли web tests и девять local-service tests, включая placeholder/empty-task invalid repository, malformed/incomplete manifest, structural и lossless Execution Status, Git без upstream.
- `yarn lint` — exit code 0; `web` и `local-service` прошли Nx ESLint module-boundary checks.
- `yarn build` — exit code 0; собраны Vite web bundle и production local-service bundle.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS`.
- `git diff --check` — exit code 0; whitespace errors не обнаружены.
- После `STEP FIX STEP-002`: `yarn test`, `yarn typecheck`, `yarn lint`, `yarn build`, `python3 tools/harness/validate.py --mode commit` и `git diff --check` — exit code 0.
- После второго `STEP FIX STEP-002`: повторно пройдены те же команды с exit code 0; Nx dependency tags проверяют, что `web` зависит только от web/shared projects.
- После третьего `STEP FIX STEP-002`: `yarn test`, `yarn typecheck`, `yarn lint`, `yarn build`, Harness validation и `git diff --check` прошли с exit code 0 после проверки stable artifact/task shapes, structured Execution Status и web-scoped restricted imports.
- После четвёртого `STEP FIX STEP-002`: `yarn test`, `yarn typecheck`, `yarn lint`, `yarn build`, `python3 tools/harness/validate.py --mode commit` и `git diff --check` — exit code 0. Repository integrity подтверждает только canonical `validate.py`; projection Execution Status повторяет инварианты `execution_status.py`, включая уникальные непустые IDs и целочисленный `attempt >= 1`.
- После пятого `STEP FIX STEP-002`: `yarn test`, `yarn typecheck`, `yarn lint`, `yarn build`, `python3 tools/harness/validate.py --mode commit`, `python3 tools/harness/validate.py --mode projection --root <workspace>` и `python3 tools/harness/execution-self-test.py` — exit code 0. Local service исполняет только absolute trusted validator path и передаёт selected root через `--root`; regression tests подтверждают отсутствие запуска selected `validate.py` и `core.fsmonitor`, isolated initialized/pre-init/no-Git и Execution Status projections.
- После шестого `STEP FIX STEP-002`: `yarn nx test local-service --skip-nx-cache`, `yarn nx typecheck local-service --skip-nx-cache`, `yarn nx lint local-service --skip-nx-cache`, `yarn test`, `yarn typecheck`, `yarn lint`, `yarn build`, `python3 tools/harness/validate.py --mode commit` и `git diff --check` — exit code 0. Read-only projection не запускает `tools/harness/validate.py` из selected repository; Git invocation фиксирует безопасную конфигурацию и tests с validator/fsmonitor sentinel подтверждают отсутствие выполнения repository-controlled code. Isolated fixtures доказывают initialized/pre-init без Git, invalid manifest и missing/malformed/invalid Execution Status.
- После седьмого `STEP FIX STEP-002`: `yarn nx test local-service --skip-nx-cache`, `yarn nx typecheck local-service --skip-nx-cache`, `yarn nx lint web --skip-nx-cache`, `yarn test`, `yarn typecheck`, `yarn lint`, `yarn build`, `python3 tools/harness/validate.py --mode commit` и `git diff --check` — exit code 0. Projection требует data-only Harness scaffold, различает template pre-INIT и initialized repository, возвращает `IO_ERROR` для operational read failures и ограничивает artifacts по типу/размеру/числу. Git не вызывает worktree commands: фильтры из `.gitattributes` не исполняются, selected root сверяется с Git toplevel, а branch/upstream/divergence читаются с timeout; worktree честно остаётся `unavailable` до отдельной trusted capability.
- Прежнее наблюдение о Git metadata (`toplevel`/`upstream`/`divergence`) superseded ADR-004: актуальная implementation не запускает Git subprocess для selected root и возвращает `SECURITY_POLICY` unavailable; это проверяется focused regression tests STEP-017.
- После восьмого `STEP FIX STEP-002`: `yarn nx test local-service --skip-nx-cache`, `yarn nx typecheck local-service --skip-nx-cache`, `yarn nx lint local-service --skip-nx-cache`, `yarn nx lint web --skip-nx-cache`, `yarn test`, `yarn typecheck`, `yarn lint`, `yarn build`, `python3 tools/harness/validate.py --mode commit` и `git diff --check` — exit code 0. Pre-INIT fixture не содержит STEP artifacts, controlled filesystem denial возвращает `IO_ERROR`, а lint probes подтверждают запрет `require`, `globalThis.process` и `window.process` в web domain.
- После девятого `STEP FIX STEP-002`: `yarn nx test local-service --skip-nx-cache` (34 tests), `yarn nx test web --skip-nx-cache` (4 tests), typecheck/lint/build обоих проектов, `python3 tools/harness/validate.py --mode commit` и `git diff --check` — exit code 0. Projection отклоняет fully-shaped placeholder repository, Git unavailable contract исключает metadata, procfs failure возвращает `IO_ERROR`, а aggregate/in-flight limits дают typed `RESOURCE_LIMIT`; web вызывает `ClientApi` только при явно переданном root.

## Review status

**Latest verdict:** FAIL
**Latest report:** `planning/reviews/STEP-002/REVIEW-2026-09-19T15-47-42Z.md`

## Blocker / Failure reason

STEP-020 выявил NO-GO для candidate `systemd user manager + D-Bus transient units + cgroup v2`: он не доказывает cross-store lifecycle fencing и terminal receipt. STEP-002 остаётся заблокированным до review PASS STEP-021 и completed accepted profile decision STEP-022; ADR-006 сохраняет current fail-closed `PLATFORM_UNSUPPORTED` contract до concrete supported profile и architecture/security decision. См. `docs/research/STEP-020-linux-containment-profile.md`.
