# STEP-018 — Containment boundary repository projection

**Статус:** Заменено
**Type:** ADR
**Приоритет:** Критический
**Фаза:** MVP foundation
**Depends on:** STEP-001, STEP-017

## Requirements

- REQ-001
- REQ-011

## ADR

- ADR-005 (historical, superseded ADR-006)
- ADR-006

## Risk flags

- security-sensitive
- architecture
- concurrency

## Goal

Принять устойчивую containment boundary для bounded и отменяемой data-only repository projection над untrusted filesystem root.

## Context

Независимый security review STEP-002 подтвердил, что `O_NONBLOCK`, descriptor traversal и in-flight limit не ограничивают зависший FUSE/NFS I/O: несколько calls могут навсегда занять service и libuv thread pool. Реализация worker/process с deadline меняет execution boundary local service и не должна добавляться в STEP-002 без отдельного решения.

## Scope

- Threat model blocking/unresponsive filesystem, cancellation, timeout, process/worker teardown и resource accounting.
- Superseding ADR с pre-admission, cancellation, lifecycle, containment identity, concurrency budget и platform constraints.
- Traceability и contract correction STEP-002 после принятия решения.

## Mutation policy

### Allowed

- ADR, связанные task/roadmap/REQ traceability и evidence.

### Conditional

- Минимальная корректировка ClientApi/local-service contract только если необходима для фиксации принятого решения.

### Forbidden

- Production implementation worker/process boundary.
- Git worktree capability, transport, arbitrary command execution и UI workflow.

## Out of scope

- Реализация secure local bridge из STEP-015.
- Возобновление STEP-002 до принятия ADR и корректировки его dependency/plan.
- Изменение Accepted ADR задним числом.

## Acceptance criteria

- Accepted ADR-006 гарантирует, что parent до containment не обращается к selected root через filesystem, а monotonic deadline покрывает очередь, spawn, child I/O, IPC и teardown.
- Решение определяет private stable containment unit, durable restart-safe lease accounting и read-only observation, empty proof/reap перед release lease, typed failure semantics, resource budget и fail-closed platform limitation.
- STEP-002 зависит от STEP-018 и не продолжает implementation до ADR-006, containment implementation и независимого review.

## Verification

- Новый независимый architecture/security review ADR-006.
- Проверка REQ ↔ STEP ↔ ADR traceability, `python3 tools/harness/validate.py --mode commit` и `git diff --check`.

## Deliverables

- Новый Accepted ADR-006, superseding historical ADR-005.
- Обновлённые STEP-002, PLAN и requirements traceability.
- Evidence architecture/security review.

## Implementation plan

**Plan status:** Ready
**Plan revision:** 7
**Plan basis:** sha256:92db4bfea03e4e8e2918cff80fe138b3a3183481257694f45b6216f2d17b9f5e
**Planned at:** 2026-09-19T17:07:15+00:00

1. Зафиксировать ADR-006 как superseding решение для review findings: parent с момента начала load использует единый monotonic deadline, включающий bounded queue, и до containment выполняет только lexical checks absolute/NUL/size. Already-aborted request возвращает `CANCELLED` без spawn, lexical root rejection — `INVALID_PROJECT_ROOT`, нехватка capacity — `RESOURCE_LIMIT`.
2. Перед созданием containment unit получить admission lease. Child сначала открывает selected root directory descriptor и получает `dev`/`ino` через `fstat` того же descriptor; все reads используют только его. `canonicalPath` допустим лишь как advisory display value, полученный из уже открытого descriptor без повторного path resolution; иначе он отсутствует. Parent не делает filesystem recheck selected root.
3. Определить supervisor-owned private unit со stable non-reusable OS handle до untrusted I/O. Durable supervisor-independent record фиксирует unit identity и lease до admission; после restart supervisor обязан reconcile-ить все retained units до нового admission. Lease освобождается только после proof empty unit и reap direct child; PID/PGID/negative kill или direct-child exit отдельно недостаточны. При отсутствии atomic private unit, stable handle, kill-all, empty proof, restart-safe recovery либо любого required OS network/process/CPU/memory/PID/tasks containment возвращать `PLATFORM_UNSUPPORTED` без fallback.
4. Зафиксировать mandatory OS profile: data-only load требует запрета network и child-process capability, hard CPU/memory/PID/tasks limits, trusted absolute bundled runtime/entrypoint, `shell: false`, trusted cwd, allowlisted env без loader hooks/secrets, explicit stdio/IPC и закрытие остальных FD. До отдельного ADR с проверенным primitive и postconditions каждого limit supported success path отсутствует и service fail-closed возвращает `PLATFORM_UNSUPPORTED` до spawn; единственный residual risk — uninterruptible process с удержанным lease.
5. Уточнить typed lifecycle: caller result immutable; первый terminal event до settlement определяет `CANCELLED`/`IO_TIMEOUT`/`IO_ERROR`/`INVALID_REPOSITORY`. После cancel/deadline late IPC и teardown error не меняют result; failed late teardown создаёт durable typed `supervisorOutcome` и retained lease до empty proof. Read-only observation возвращает только `ACTIVE`/`RECOVERING`/`TEARDOWN_FAILED`, opaque unit identity и retained lease; startup recovery не допускает reuse capacity. Синхронизировать architecture и STEP-002, не изменяя ADR-004/ADR-005 и REQ lifecycle.
6. Подготовить future implementation/review handoff в STEP-002: tests required OS limits/fail-closed, descriptor-first race replacement symlink/mount, отсутствие parent filesystem I/O до readiness, queue/deadline/cancel/no spawn, late IPC, bad artifact, malformed IPC/crash/teardown, timeout/cancel с late teardown failure и durable outcome, supervisor restart/reconciliation retained unit без reuse capacity, unit-empty accounting, platform unsupported/resource limit и no in-process fallback. Выполнить stamp plan, traceability check, validation и whitespace check; STEP-018 не переводить в «Выполнено» до нового independent review.

### Совместимость, риски и rollback

- `ClientApi` и UI не получают privileged filesystem/process API; при последующей реализации расширение error code должно быть backward-compatible через typed result, а не inference из текста ошибки. Git policy ADR-004 остаётся неизменной.
- Главный residual risk — process, застрявший в uninterruptible OS state: service сохраняет responsiveness ценой durable retained lease до empty proof и ограниченной деградации availability, включая restart supervisor. Неограниченное освобождение slot запрещено, иначе deadline становится механизмом истощения host resources.
- Откат ADR STEP удаляет только ADR-006 и согласованные traceability/plan projections; он не возвращает in-process projection в STEP-002 и не отменяет historical ADR-005 либо ADR-004. Production implementation, migrations и transport в этом STEP отсутствуют.

## Evidence

- Предыдущая evidence относилась к ADR-005 и не подтверждает remediation ADR-006; актуальные команды и результаты добавляются после изменений.
- `python3 tools/harness/execution-state.py stamp-plan STEP-018` — exit code 0; `planStatus: Ready`, `planRevision: 3`, `planBasis: sha256:d7ea7a3cf8fcee747b5bfa10e8bfab27ede898d32982c88fac04602e1ac555e7`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-002` — exit code 0; скорректированный containment handoff получил `planStatus: Ready`, `planRevision: 6`, `planBasis: sha256:6800049443026ed74acca40de25304809e12994e607524a8bb45583f991b8f29`.
- `rg -n -C 2 "ADR-006|ADR-005|STEP-018|INVALID_PROJECT_ROOT|PLATFORM_UNSUPPORTED|empty proof" docs/adr/ADR-006-containment-boundary-repository-projection.md docs/adr/README.md docs/architecture.md docs/requirements/SPEC.md docs/requirements/STATUS.md planning/tasks/STEP-018.md planning/tasks/STEP-002.md planning/PLAN.md planning/STATUS.md` — exit code 0; ADR-006 supersedes ADR-005, REQ-001/REQ-011 и STEP-002 ссылаются на current contract, а REQ lifecycle не изменён.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`; предупреждение только об отсутствии staged files.
- `git diff --check` — exit code 0; whitespace errors не обнаружены.
- Remediation последнего FAIL review: ADR-006 классифицирует required OS guarantees и запрещает success без отдельного supported platform profile; identity формируется descriptor-first, а `canonicalPath` только advisory; caller result отделён от post-settlement `supervisorOutcome`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-018` — exit code 0; `planStatus: Ready`, `planRevision: 5`, `planBasis: sha256:d7ea7a3cf8fcee747b5bfa10e8bfab27ede898d32982c88fac04602e1ac555e7`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-002` — exit code 0; containment handoff получил `planStatus: Ready`, `planRevision: 7`, `planBasis: sha256:1ccbb4a2bb8a0c89ff577bb24f2fc649c6415045b18597081627433bc9c7b55d`.
- `rg -n -C 2 'supported platform|residual risk|descriptor-first|canonicalPath|supervisorOutcome|late teardown|required OS|Plan revision|Plan basis' docs/adr/ADR-006-containment-boundary-repository-projection.md docs/architecture.md planning/tasks/STEP-018.md planning/tasks/STEP-002.md` — exit code 0; обязательные OS guarantees, descriptor identity, immutable caller result и future test handoff присутствуют во всех owning contracts.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`; предупреждение только об отсутствии staged files.
- `git diff --check` — exit code 0; whitespace errors не обнаружены после remediation.
- Traceability search по ADR-005/ADR-006, STEP-018, `PLATFORM_UNSUPPORTED`, descriptor identity, `supervisorOutcome` и `empty proof` — exit code 0; historical/current ADR links, REQ coverage и STEP-002 dependency присутствуют.
- Remediation последнего FAIL review: future supported profile обязан durable восстановить retained unit/lease до нового admission; typed read-only observation сохраняет `TEARDOWN_FAILED` через restart до empty proof, а STEP-002 handoff требует соответствующую regression.
- `python3 tools/harness/execution-state.py stamp-plan STEP-018` — exit code 0; `planStatus: Ready`, `planRevision: 6`, `planBasis: sha256:92db4bfea03e4e8e2918cff80fe138b3a3183481257694f45b6216f2d17b9f5e`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-002` — exit code 0; `planStatus: Ready`, `planRevision: 8`, `planBasis: sha256:ad467397ec2fa923cd0a9b91d927c6d790dfcc16e135b0e58626545069eec235`.
- Traceability search по ADR-006, STEP-018/002, `TEARDOWN_FAILED`, restart-safe accounting и current/historical process-group references — exit code 0; process-group teardown не входит в active plan STEP-002, а ADR-006 хранит его только как superseded alternative.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`; предупреждение только об отсутствии staged files.
- `git diff --check` — exit code 0; whitespace errors не обнаружены.
- После `STEP FIX STEP-018`: traceability search по durable restart-safe lease, `TEARDOWN_FAILED`, empty proof и historical `process-group teardown` — exit code 0; ADR-006, architecture и STEP-002 закрепляют recovery до нового admission, а process group сохранена только как superseded alternative.
- `python3 tools/harness/execution-state.py stamp-plan STEP-018` — exit code 0; `planStatus: Ready`, `planRevision: 7`, `planBasis: sha256:92db4bfea03e4e8e2918cff80fe138b3a3183481257694f45b6216f2d17b9f5e`.
- `python3 tools/harness/execution-state.py stamp-plan STEP-002` — exit code 0; containment handoff получил `planStatus: Ready`, `planRevision: 9`, `planBasis: sha256:ad467397ec2fa923cd0a9b91d927c6d790dfcc16e135b0e58626545069eec235`.
- После `STEP FIX STEP-018`: `python3 tools/harness/validate.py --mode commit` и `git diff --check` — exit code 0; Harness validation прошла для 201 tracked files, whitespace errors не обнаружены.

## Review status

**Latest verdict:** FAIL
**Latest report:** `planning/reviews/STEP-018/REVIEW-2026-09-19T17-17-22Z.md`

## Blocker / Failure reason

Заменён STEP-019 после review `REVIEW-2026-09-19T17-17-22Z.md`: дальнейшая remediation требует нового ADR-007, superseding ADR-006, а не изменения Accepted ADR-006 задним числом.

Current remediation contract расположен в STEP-019; historical ADR-006 и immutable review reports этого STEP не переписываются.
