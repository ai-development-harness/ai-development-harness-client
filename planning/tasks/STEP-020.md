# STEP-020 — Linux supported containment profile research

**Статус:** Выполнено
**Type:** RESEARCH
**Приоритет:** Критический
**Фаза:** MVP foundation
**Depends on:** STEP-001, STEP-017

## Requirements

- REQ-001
- REQ-011

## ADR

- ADR-006
- ADR-007 (Proposed)

## Risk flags

- security-sensitive
- architecture
- concurrency
- performance-critical

## Goal

Исследовать и зафиксировать evidence-backed Linux-only supported containment profile для data-only repository projection, который делает проверяемыми ownership, admission, create/teardown fencing и terminal proof до revision ADR-007.

## Context

STEP-019 обнаружил, что универсальный lifecycle contract без выбранного OS profile не может доказать atomic boundaries между durable state, unit creation, activation и recovery. Для MVP продукт ограничен Linux; candidate profile — systemd user manager/transient service units совместно с cgroup v2. Он не считается принятым, пока research не докажет доступность required guarantees либо честно не зафиксирует `PLATFORM_UNSUPPORTED`.

## Scope

- Проверить systemd user manager, D-Bus API, transient service units и cgroup v2 как Linux-only candidate profile по первичной документации и воспроизводимым local probes.
- Определить проверяемые prerequisites и fail-closed policy: Linux, cgroup v2, systemd user manager, D-Bus access, требуемые controllers и resource/isolation settings; при отсутствии любого — `PLATFORM_UNSUPPORTED` до spawn.
- Сформулировать ownership/recovery model: single writer или durable epoch/takeover, linearizable capacity check + reservation, fencing delayed create и stale owner, terminal proof/reaper semantics.
- Определить, какие guarantees предоставляет profile, какие должен durable local store, а какие недостижимы и требуют отказа от success path.
- Подготовить research report и proposal нового ADR для конкретного Linux profile; уточнить dependency и minimal handoff для STEP-019/STEP-002 без изменения Accepted ADR-006.

## Mutation policy

### Allowed

- Research report, ADR proposal, task/roadmap/requirements traceability и evidence.

### Conditional

- Новый ADR после отдельного architecture/security review и явного принятия решения.

### Forbidden

- Production containment/supervisor/store/transport implementation.
- Изменение Decision или истории Accepted ADR-006.
- Принятие ADR-007, изменение Git capability boundary или cross-platform support.

## Out of scope

- macOS, Windows, containers, hosted execution и portable abstraction поверх других OS.
- Реализация systemd/D-Bus/cgroup integration или реальная repository projection success path.
- Скрытое исправление текущего ADR-007 вместо documented Linux profile decision.

## Acceptance criteria

- Research однозначно определяет Linux-only supported profile или evidence-backed отказ от него; fallback всегда `PLATFORM_UNSUPPORTED` до spawn.
- Для admission, create, activation, teardown, restart и release указаны владелец, durable state, linearization point, stale-owner fence и terminal proof; неизвестная guarantee не объявлена обеспеченной.
- Документировано, сохраняет ли ADR-006 статус current base security contract и какие clauses может дополнять будущий profile ADR без полного supersede.
- Есть executable handoff для STEP-019/STEP-002: multi-supervisor, delayed create, durable intent/proven-child outcome, generation-fenced `notStarted|pending → absent`, atomic `attachIntent: notStarted → pending`, recovery, user-bus escape и closed six-fixture negative capability gate; scope не создаёт production code.

## Verification

- Primary-source review systemd и Linux kernel documentation.
- Reproducible local capability probes без selected repository I/O или process execution.
- Independent architecture/security review research report и ADR proposal.
- REQ ↔ STEP ↔ ADR traceability, `python3 tools/harness/validate.py --mode commit`, `git diff --check` и no-index whitespace checks для всех untracked deliverables.

## Deliverables

- Research report Linux profile capabilities, limits, rejected alternatives и fail-closed behavior.
- Proposed ADR concrete Linux containment profile или documented decision оставить success path unavailable.
- Обновлённый handoff STEP-019/STEP-002 и roadmap dependencies после принятия решения.

## Implementation plan

**Plan status:** Ready
**Plan revision:** 2
**Plan basis:** sha256:11d68bf30df148d20b33309ae63e4751f637937a2c1242cc46e6845223cd2e42
**Planned at:** 2026-09-19T19:59:57+00:00

1. Составить contract matrix из ADR-004/ADR-006/ADR-007, STEP-019/STEP-002 и последнего FAIL review: для каждого mandatory guarantee указать owner, candidate Linux primitive, prerequisite, linearization point, restart semantics и ожидаемый evidence. Отдельно закрепить generation-fenced `childOutcome notStarted|pending → absent`, взаимное исключение с atomic `attachIntent: notStarted → pending` и pre-spawn terminal receipt. ADR-006 остаётся current base security contract; STEP-020 не принимает и не переписывает ADR-007.
2. Исследовать по первичной документации candidate profile `Linux + systemd user manager + D-Bus + transient service unit + cgroup v2`: lifecycle unit/job, stable identity, manager/client/reboot recovery, cgroup membership/empty proof, resource controls и isolation. Отдельно доказать либо отклонить applicability `PrivateNetwork`, `RestrictAddressFamilies`, `SystemCallFilter`, `MemoryMax`, `TasksMax`, `CPUQuota`, `KillMode=control-group` для untrusted Node worker.
3. Запустить только read-only local capability probes без selected repository I/O и без запуска service process: kernel/systemd version, cgroup v2 mount/controllers, user D-Bus and `org.freedesktop.systemd1`, introspection D-Bus methods/properties, user-manager lifecycle prerequisites. Сохранить command, exit code и observed result; отсутствие любой required capability означает `PLATFORM_UNSUPPORTED` до spawn.
4. Проверить boundary ownership: может ли profile обеспечить single writer или durable epoch/takeover, linearizable capacity-check + reservation, fencing delayed create/stale owner, durable relation application record ↔ unit/job ↔ cgroup and terminal proof. Не считать D-Bus transaction атомарной с local durable store без явного подтверждения.
5. Подготовить `docs/research/STEP-020-linux-containment-profile.md`: evidence matrix, результаты probes, rejected alternatives, GO/NO-GO decision и открытые runtime postconditions. GO допустим только при конкретном primitive и executable proof для всех mandatory guarantees; иначе зафиксировать NO-GO, отделить target `PLATFORM_UNSUPPORTED` contract от фактического runtime и создать corrective STEP для implementation drift.
6. При GO подготовить Proposed ADR-008 с concrete Linux profile, сохраняя ADR-006 base contract и не принимая ADR-007. При NO-GO не создавать ложный profile ADR; минимально обновить handoff STEP-019/STEP-002, PLAN/STATUS и traceability, указав конкретный profile blocker.
7. Передать research report и любой ADR proposal на independent architecture/security review. Проверить future executable matrix: overlapping supervisors, delayed create, intent-before-child/failed-spawn/delayed-child outcome, `RESERVED`/`CREATED`/pre-attach `BOUND` cancellation/crash, fence-versus-attach interleaving, manager/reboot recovery, activation/revoke, empty proof, resource/isolation postconditions, closed six-fixture capability gate и opaque observation. Затем выполнить traceability search, `python3 tools/harness/validate.py --mode commit`, `git diff --check` и no-index whitespace checks для всех untracked deliverables.

## Результат реализации

Выполнен NO-GO outcome. `docs/research/STEP-020-linux-containment-profile.md` отделяет документированные возможности systemd/cgroup от недоказанных обязательных guarantees. Report также фиксирует current implementation drift: fail-closed `PLATFORM_UNSUPPORTED` до spawn — требование ADR-006, но ещё не enforced runtime policy; STEP-021 владеет его typed correction. ADR-008 не создан: current evidence не позволяет принять concrete supported profile. Handoff STEP-019/STEP-002, PLAN и STATUS указывают concrete blocker; Accepted ADR-006 не изменялся, а Proposed ADR-007 уточнён только как future lifecycle handoff для F-A30/F-S30.

## Evidence

- `docs/research/STEP-020-linux-containment-profile.md` — создан evidence-backed NO-GO report: candidate `systemd user manager + D-Bus transient units + cgroup v2` не доказывает mandatory cross-store lifecycle guarantees. Report не выдаёт target policy `PLATFORM_UNSUPPORTED` до spawn за current runtime fact и ссылается на STEP-021 для correction implementation.
- Primary-source review: official systemd D-Bus API, resource-control, execution and kill documentation; Linux kernel cgroup v2 documentation. Report связывает каждый источник только с документированным primitive, не объявляя unsupported guarantee.
- Read-only local probes без selected repository I/O и без service process: `uname -srmo` (exit 0), `systemctl --version` (exit 0), cgroup v2/controller checks (exit 0), `test -w /sys/fs/cgroup` (exit 1; mount read-only), user D-Bus `Ping` and manager introspection (exit 0), `systemctl --user is-system-running` (exit 1; manager usability through CLI not established). Exact observed output is recorded in research report.
- `python3 tools/harness/execution-state.py stamp-plan STEP-020` — exit code 0; `planStatus: Ready`, `planRevision: 2`, `planBasis: sha256:11d68bf30df148d20b33309ae63e4751f637937a2c1242cc46e6845223cd2e42`.
- `PYTHONPATH=tools/harness python3 -c "from pathlib import Path; from execution_status import plan_info; print(plan_info(Path('.'), 'STEP-020'))"` — exit code 0; stored и current basis совпали, `ready: True`.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`, предупреждение только об отсутствии staged files. Этот gate охватывает tracked files.
- `git diff --check` — exit code 0; whitespace errors в tracked diff не обнаружены.
- No-index check всех untracked artifacts: для каждого файла из `git ls-files --others --exclude-standard -z` выполнен `git diff --no-index --check /dev/null <artifact>`; wrapper завершился exit code 0, `untracked_artifacts=53 whitespace_failures=0`. Individual no-index exit code 1 означает наличие нового файла и не был whitespace failure; вывод каждого check был пустым.
- `rg -n -C 1 'notStarted\\|pending|attachIntent: notStarted → pending|RESERVED.*CREATED.*BOUND|fence.*attachIntent|noChildEverAttached' docs/adr/ADR-007-crash-consistent-containment-lifecycle.md planning/tasks/STEP-020.md` — exit code 0; transition, atomic attach, three pre-spawn states и required test handoff найдены в owning artifacts.
- Fresh independent review: `planning/reviews/STEP-020/REVIEW-2026-09-19T20-06-49Z.md` — verdict `PASS`; research NO-GO и executable handoff соответствуют acceptance criteria STEP-020, findings не обнаружены.
- Fresh security review: `planning/reviews/STEP-020/SECURITY-REVIEW-2026-09-19T20-05-15Z.md` — verdict `PASS`; delayed-attach fence, fail-closed boundary и security handoff проверены без findings.

## Review status

**Latest verdict:** PASS
**Latest report:** `planning/reviews/STEP-020/REVIEW-2026-09-19T20-06-49Z.md`
**Security verdict:** PASS
**Security report:** `planning/reviews/STEP-020/SECURITY-REVIEW-2026-09-19T20-05-15Z.md`

## Последующие блокеры

Research завершён с evidence-backed NO-GO: concrete supported primitive не доказан, поэтому profile ADR не создан. Это не является implementation success path: STEP-021 владеет исправлением current runtime drift, STEP-022 — reviewed decision о supported primitive; до их завершения STEP-019 и STEP-002 остаются заблокированными.
