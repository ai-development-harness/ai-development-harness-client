# STEP-019 — Crash-consistent containment lifecycle

**Статус:** Заблокировано
**Type:** ADR
**Приоритет:** Критический
**Фаза:** MVP foundation
**Depends on:** STEP-001, STEP-017, STEP-020, STEP-022

## Requirements

- REQ-001
- REQ-011

## ADR

- ADR-006 (current base security contract)
- ADR-007 (Proposed additive lifecycle contract)

## Risk flags

- security-sensitive
- architecture
- concurrency

## Goal

Принять additive crash-consistent lifecycle contract, который дополняет ADR-006 и закрывает F-S09, F-T07 и F-T08 без переписывания или ослабления Accepted base security contract.

## Context

Независимый review STEP-018 выявил, что steady-state reconciliation известного retained unit недостаточна: между reservation admission lease, созданием private unit и durable binding stable handle остаётся crash window. При restart такой unit может остаться живым без recoverable record и позволить reuse capacity. Одновременно future test handoff не требует regressions для damaged/unknown record и не доказывает, что восстановленная read-only observation не раскрывает selected-root path, PID или diagnostics.

## Scope

- Proposed ADR-007 с явным crash-consistent lifecycle `RESERVED → CREATED → BOUND → ACTIVE → TEARDOWN` как additive handoff к ADR-006.
- Fail-closed startup recovery для incomplete, missing, unknown, unresolvable, corrupt и reconciliation-failed record без reuse admission budget до empty proof и reap.
- Contract typed read-only observation после restart: только lifecycle, opaque unit identity и retained-lease flag, без selected path, PID, raw stderr и diagnostics.
- Корректировка traceability, dependencies и future verification handoff STEP-002 после принятия additive ADR-007 и supported-profile decision STEP-022.
- Безопасный lifecycle ADR: ADR-006 остаётся immutable historical decision; ADR-007 получает `Accepted` только после доказанного independent architecture/security review.

## Mutation policy

### Allowed

- ADR-007, связанные STEP/roadmap/requirements traceability и evidence.
- Минимальная корректировка будущего handoff STEP-002, необходимая для нового contract и regressions.

### Forbidden

- Production implementation containment unit, supervisor, durable store или transport.
- Изменение Decision/Status/истории ADR-006 задним числом.
- Git worktree capability, arbitrary command execution и UI workflow.

## Out of scope

- Выбор и реализация конкретного supported OS primitive/profile.
- Возобновление STEP-002 до принятого ADR-007 и отдельной implementation/review цепочки.
- Исправление unrelated foundation code или existing immutable review reports.

## Acceptance criteria

- ADR-007 однозначно определяет normal и recovery-only transition table, durable teardown intent/new generation перед revoke/seal и recovery каждого прерванного либо corrupt состояния; incomplete state удерживает budget fail-closed, а recovered `ACTIVE` всегда идёт в fenced teardown.
- Contract запрещает untrusted I/O до committed `ACTIVE`, one-shot release и выигравшего atomic `activate`; `TEARDOWN` атомарно с durable intent/new generation revoke-ит ту же activation boundary, поэтому pause между проверкой и running не допускает I/O после победившего fence. Seal предшествует kill-all; `attachIntent` — только marker попытки. ABA-safe exactly-once release разрешён только по durable terminal receipt с empty proof и mutually exclusive child outcome: `noChildEverAttached` лишь при proven durable `childOutcome=absent`, либо `directChildReaped(identity)` лишь для persisted identity reaper-observable child.
- STEP-002 получает обязательные parameterized crash-injection/restart regressions до send release, после send до acknowledgement, после начала I/O, после teardown intent/revoke до seal и после seal до kill/receipt; deterministic pause-after-check/atomic-revoke, delayed release/attach после revoke/seal, `intent-before-child`, failed spawn и `intent → TEARDOWN → delayed child` после restart, terminal release transaction, damaged record и adversarial opaque observation до и после restart.
- ADR-006 остаётся current base security contract; ADR-007 может быть принят только как additive lifecycle contract после independent review PASS и не удаляет surviving clauses ADR-006.

## Verification

- Независимые architecture и security reviews ADR-007.
- Test-handoff review для lifecycle crash injection, fail-closed damaged records и opaque observation.
- Проверка REQ ↔ STEP ↔ ADR traceability, `python3 tools/harness/validate.py --mode commit` и `git diff --check`.

## Deliverables

- Новый additive ADR-007 после independent review PASS и profile decision STEP-022.
- Обновлённые STEP-002/STEP-018, PLAN/STATUS и requirements traceability.
- Evidence architecture, security и test-handoff reviews.

## Implementation plan

**Plan status:** Ready
**Plan revision:** 9
**Plan basis:** sha256:0c4b31abfb0fe42c853a5e4f8ab65ffaeb6bb9fadebbe3de2bd28147720dd5fa
**Planned at:** 2026-09-19T18:43:20+00:00

1. Зафиксировать `docs/adr/ADR-007-crash-consistent-containment-lifecycle.md` в статусе `Proposed`, не меняя ADR-006. В `Context`/`Problem` сослаться на F-S09, F-T07, F-T08 и F-A11; в `Decision` определить crash-consistent state machine `RESERVED → CREATED → BOUND → ACTIVE → TEARDOWN`. До OS mutation durable `RESERVED` atomically резервирует lease и заранее назначенный opaque unit key/nonce; platform profile обязан exclusive/idempotent создать unit, discoverable по этому key.
2. Определить explicit normal/recovery transition table, durable payload, owner и restart recovery: `CREATED` фиксируется после создания empty unit, `BOUND` — после verify stable non-reusable handle, `ACTIVE` — только после atomically journaled `attachIntent`, inert worker attach, durable membership proof и открытого activation channel. `attachIntent` является marker попытки; generation-bound `childOutcome` до него равен `notStarted`, атомарно с ним становится `pending`, затем становится `absent` только после fence, исключившего delayed child той же generation, либо `present(identity)` только для доказанного reaper-observable child. Supported platform обязан дать one linearizable primitive: `activate` неделимо validate/consume/переводит `inert → running`, а `TEARDOWN` тем же primitive атомарно durable фиксирует intent/new generation и revoke-ит activation boundary. Любой recovered `ACTIVE`, `BOUND` с member без committed `ACTIVE` и damaged state идут только в fenced teardown. Перед release durable terminal receipt связывает empty proof с `noChildEverAttached` только при durable absent outcome либо `directChildReaped(identity)` только для persisted child identity; `notStarted` или `pending` удерживают lease. ABA-safe transaction сохраняет tombstone lease identity. Missing record/orphan unit, record без unit, unknown version/state, corrupt/truncated record, unresolvable handle и reconciliation failure удерживают budget fail-closed; если authoritative enumeration ownership невозможна, admission целиком блокируется либо service возвращает `PLATFORM_UNSUPPORTED`.
3. Сформулировать explicit test handoff для STEP-002 без реализации supervisor: parameterized crash injection после durable reservation, OS unit creation, handle binding, atomically journaled `attachIntent`, proven `childOutcome`, inert attach, committed activation, до send release, после send до acknowledgement, после начала I/O, teardown intent/atomic revoke до seal, seal до kill/receipt, terminal receipt, во время release transaction и после commit до acknowledgement. Restart доказывает отсутствие нового admission/spawn, `RESOURCE_LIMIT` при занятом budget, отсутствие half-applied release и exactly-once ABA-safe release после reconciliation + receipt. Обязательны deterministic `receiver check passed → pause before atomic activate → teardown intent/revoke → resume`, `ACTIVE committed → release pending → revoke/close/drain → seal → delayed release`, `attach pending → seal → empty proof/release → delayed attach` и `intent → TEARDOWN → delayed child` с restart до receipt. Intent-before-child и failed spawn доказывают, что intent без outcome не создаёт ни no-child receipt, ни обязательного фиктивного reap; pre-spawn `RESERVED`/`CREATED`/`BOUND` с durable absent outcome доказывают no-child receipt. Отдельно включить missing, unknown, unresolvable, corrupt и reconciliation-failed record/handle cases.
4. Добавить adversarial observation handoff: fixture с poison selected-root path, PID и raw diagnostics; до и после restart public observation, IPC/loggable response и serialized read-only payload не содержат этих значений. Проверить, что permitted payload содержит лишь `ACTIVE`/`RECOVERING`/`TEARDOWN_FAILED`, opaque identity и retained lease, а unknown record не превращается в repository-validity fact.
5. Синхронизировать после Proposed ADR только owning documentation: ADR index указывает additive lifecycle proposal, architecture и STEP-002 отражают pending ADR-007, current ADR-006 и блокировку implementation до STEP-022. Обновить STEP-018 как replaced historical task и PLAN/STATUS/REQ traceability, не переписывая immutable reports или lifecycle REQ.
6. Передать ADR-007 на independent architecture/security и test-handoff reviews с digest Proposed decision body. Только совокупный review `PASS` для неизменённого body и accepted profile decision STEP-022 позволяют отдельной mechanical documentation synchronization пометить ADR-007 `Accepted` как additive lifecycle contract. ADR-006 сохраняет current base security clauses, если новый accepted ADR не переносит их явно и не прошёл отдельный review; изменение body аннулирует review. Затем зафиксировать evidence, выполнить traceability search, `python3 tools/harness/validate.py --mode commit` и `git diff --check`.

### Совместимость, риски и rollback

- До STEP-021 local-service имеет documented implementation drift; после его review PASS он сохраняет fail-closed `PLATFORM_UNSUPPORTED` path. Новый ADR не добавляет runtime, transport, schema или public API.
- Главный risk — неатомарность между durable store и OS primitive. Новый contract обязан сохранять availability degradation через retained budget, а не освобождать capacity по таймауту, PID или отсутствующему record.
- Откат до принятия удаляет только Proposed ADR-007 и согласованные projections; ADR-006, immutable reviews и production baseline не изменяются. После принятия изменение additive lifecycle contract требует нового ADR, а не rewrite истории.

## Evidence

- `python3 tools/harness/execution-state.py stamp-plan STEP-019` — exit code 0; `planStatus: Ready`, `planRevision: 1`, `planBasis: sha256:6386d4cab40f16bf82e93ed4124b6199918cbf2b4f99e6fac0300a0a20f7cdbc`.
- Планирование проверило STEP-019, REQ-001/REQ-011, ADR-006, current architecture, STEP-002 и immutable review `REVIEW-2026-09-19T17-17-22Z.md`; production implementation не входит в scope.
- `python3 tools/harness/execution-state.py stamp-plan STEP-019` — exit code 0; `planStatus: Ready`, `planRevision: 2`, `planBasis: sha256:6386d4cab40f16bf82e93ed4124b6199918cbf2b4f99e6fac0300a0a20f7cdbc`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-002` — exit code 0; containment handoff получил `planStatus: Ready`, `planRevision: 10`, `planBasis: sha256:e4138aac8187549acb347ed92e7f529f03c09243a297c58609606bd082dd47d1`.
- `rg -n -C 2 'ADR-007|RESERVED|CREATED|BOUND|TEARDOWN|authoritative empty proof|exactly-once|corrupt|unresolvable|opaque|STEP-019' docs/adr/ADR-007-crash-consistent-containment-lifecycle.md docs/adr/README.md docs/architecture.md docs/requirements/SPEC.md docs/requirements/STATUS.md planning/tasks/STEP-002.md planning/tasks/STEP-018.md planning/tasks/STEP-019.md planning/PLAN.md planning/STATUS.md` — exit code 0; Proposed ADR, pending projections и STEP-002 handoff содержат lifecycle, fail-closed recovery, opaque observation и review boundary.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`; предупреждение только об отсутствии staged files.
- После remediation F-S11/F-A14/F-A15/F-A16 `ADR-007` фиксирует normal/recovery-only table, durable `TEARDOWN` intent/new generation до revoke/seal, revoke/close/drain activation channel и receiver-side generation fence. Recovered `ACTIVE` всегда проходит fenced teardown без replay release; STEP-002 handoff содержит exact fault points и deterministic delayed-release regression.
- `python3 tools/harness/execution-state.py stamp-plan STEP-019` — exit code 0; `planStatus: Ready`, `planRevision: 5`, `planBasis: sha256:43a2a49f50254006704a6ca727e1ad062c22930022ebebad98cc96ac28d8ca54`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-019` — exit code 0; `planStatus: Ready`, `planRevision: 6`, `planBasis: sha256:43a2a49f50254006704a6ca727e1ad062c22930022ebebad98cc96ac28d8ca54`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-002` — exit code 0; `planStatus: Ready`, `planRevision: 13`, `planBasis: sha256:4661d981f8950cbff95e713cdd5f23ebfda85bb167e419bc84b017a7c93457c6`.
- `git diff --check` — exit code 0; whitespace errors не обнаружены.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`; предупреждение только об отсутствии staged files.
- `git diff --check` — exit code 0; whitespace errors не обнаружены.
- Production tests не запускались: STEP-019 запрещает production implementation containment boundary. Proposed ADR-007 подготовлен к independent architecture/security и test-handoff review; до их PASS он не является current.
- После `STEP FIX STEP-019` Proposed ADR-007 устраняет F-S10/F-A12/F-A13/F-T09: generation-bound seal и token fence запрещают delayed attach; committed `ACTIVE` и one-shot release закрывают activation recovery; terminal receipt и ABA-safe tombstone закрывают crash window release; handoff STEP-002 покрывает activation, seal, receipt и terminal transaction crash points.
- После remediation F-S12/F-A17 Proposed ADR-007 требует единого linearizable primitive для `activate` и durable `TEARDOWN` intent/revoke, а `attachIntent` атомарно отделяет direct-child reap от доказуемого no-child receipt. Handoff STEP-002 включает pause-after-check/atomic-revoke и pre-spawn receipt regressions.
- После remediation F-S11/F-A14/F-A15/F-A16 delivery release определён только как намерение, а `activate`/`revoke` образуют одну неделимую generation fence; `TEARDOWN` до seal закрывает и drain-ит queued/in-flight release. Таблица разрешает recovery-only переход каждого incomplete lifecycle state в `TEARDOWN`, durable intent/new generation предшествует seal, а recovered `ACTIVE` не resume/replay-ится. Handoff STEP-002 называет crash points release/intent/seal, deterministic delayed-release и оба mutually exclusive terminal child proofs.
- `python3 tools/harness/execution-state.py stamp-plan STEP-002` — exit code 0; `planStatus: Ready`, `planRevision: 16`, `planBasis: sha256:d3d2f8d3357df7bf4e1174d67373ac75acbe2ecccbafaa20b73908165542a29e`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-019` — exit code 0; `planStatus: Ready`, `planRevision: 9`, `planBasis: sha256:0c4b31abfb0fe42c853a5e4f8ab65ffaeb6bb9fadebbe3de2bd28147720dd5fa`.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`; предупреждение только об отсутствии staged files.
- `git diff --check` — exit code 0; whitespace errors не обнаружены. Traceability search подтвердил в ADR-007 и STEP-002 drain queued/in-flight release до seal, recovery-only `TEARDOWN`, fenced recovered `ACTIVE`, named `attachIntent` boundary и mutually exclusive terminal child proofs.
- `python3 tools/harness/execution-state.py stamp-plan STEP-019` — exit code 0; `planStatus: Ready`, `planRevision: 4`, `planBasis: sha256:a976b767d44feaee92787c3fbafb22322dfe45990140c34ca78d00b2a012a6d3`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-002` — exit code 0; `planStatus: Ready`, `planRevision: 12`, `planBasis: sha256:2465f18425618b9557e2a6de99b985529e78c33fe27a1a9c13e40a2df966b2f2`.
- `git diff --check` — exit code 0; whitespace errors не обнаружены.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`; предупреждение только об отсутствии staged files.

## Review status

**Latest verdict:** FAIL
**Latest report:** `planning/reviews/STEP-019/REVIEW-2026-09-19T18-49-17Z.md`

Fresh independent architecture/security и test-handoff review обязателен для изменённого Proposed ADR-007.

## Blocker / Failure reason

STEP-020 дал NO-GO: systemd user manager + D-Bus transient units + cgroup v2 не доказывают atomic boundary между durable store и OS lifecycle, epoch/takeover fence, activation/revoke linearization и terminal receipt. STEP-022 — hard dependency для отдельного concrete primitive/architecture decision; его NO-GO status не удовлетворяет dependency. STEP-021 отдельно устраняет current runtime drift. ADR-006 остаётся current base security contract; ADR-007 нельзя принимать как full successor. См. `docs/research/STEP-020-linux-containment-profile.md`.
