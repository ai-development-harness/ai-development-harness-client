# STEP-020 — исследование Linux containment profile

**Статус:** NO-GO
**Дата:** 2026-09-19
**Область:** Linux-only candidate: systemd user manager, D-Bus transient service units и cgroup v2.

## Вывод

Проверяемый candidate profile не принимается. ADR-006 требует, чтобы до отдельного решения с конкретным проверяемым primitive service возвращал `PLATFORM_UNSUPPORTED` до spawn; in-process fallback запрещён. Это **целевой current contract, а не утверждение о текущем runtime**: в существующей реализации local-service обнаружен drift — она делает parent `realpath` и in-process selected-root I/O и возвращает успешную projection. Исправление этого drift выделено в STEP-021; до его review PASS runtime policy нельзя считать enforced.

Причина не в отсутствии одного package: первичные источники и локальные probes не доказывают обязательные lifecycle guarantees. `StartTransientUnit` создаёт/запускает transient unit как отдельную manager operation; она не образует одну транзакцию с durable local store, ownership epoch, admission reservation или generation-bound revoke. После остановки или reboot transient unit может быть освобождён, поэтому его D-Bus object path/name не является durable non-reusable handle. cgroup v2 даёт membership и empty observation, но не single-writer ownership, ABA-safe lease release, direct-child reap или fencing delayed create/attach.

Следовательно, systemd user manager + cgroup v2 допустимы только как будущие компоненты profile, но не как evidence-backed supported profile. Этот результат не меняет Accepted ADR-006 и не принимает Proposed ADR-007.

## Contract matrix

| Обязательная гарантия | Владелец | Candidate primitive / prerequisite | Evidence | Результат |
| --- | --- | --- | --- | --- |
| Linux-only prerequisite admission | Runtime capability gate | Linux kernel, cgroup v2, reachable user D-Bus manager, delegated writable subtree, controllers `cpu`, `memory`, `pids` | Kernel cgroup v2 documentation; local probes | Частично доступно; текущая cgroup mount read-only, поэтому этот environment обязан fail-closed |
| Private unit и resource limits | systemd manager + delegated cgroup subtree | `StartTransientUnit`; `CPUQuota=`, `MemoryMax=`, `TasksMax=` | systemd D-Bus/resource-control documentation | Не принято: availability controller не доказывает delegated writable subtree или effective applied settings |
| Запрет network и child-process | profile primitive | `PrivateNetwork=`, `RestrictAddressFamilies=`, `SystemCallFilter=` с executable postconditions для Node | systemd.exec documentation недостаточна, чтобы доказать точный untrusted Node profile | Не доказано; success path отсутствует |
| Atomic capacity check и reservation | durable local store | serializable transaction над retained lease и owner epoch | Systemd/cgroup primitive не объединяет D-Bus operation с local durable transaction | Нужен отдельный design/primitive |
| Fence для delayed create и stale owner | durable store + OS primitive | owner epoch, проверяемая idempotent create/attach operation | `StartTransientUnit` создаёт manager job; cross-store epoch comparison не документирован | Не доказано |
| Activation/revoke linearization | profile primitive | одна операция atomically validates generation, consumes release и runs/revokes worker | Подходящая systemd/cgroup operation не найдена | Не доказано |
| Authoritative empty proof | cgroup v2 + manager reconciliation | non-root `cgroup.events: populated=0` after authoritative enumeration | Kernel documents live-process subtree signal | Недостаточно: нет direct-child reap, ownership или durable receipt |
| Kill всех members | systemd/cgroup v2 | `KillMode=control-group` или `cgroup.kill` | systemd kill documentation; kernel cgroup v2 documentation | Компонент доступен, но это не terminal proof и не fence |
| Restart/reboot recovery | durable local store + manager enumeration | durable record ↔ unit/cgroup identity, reconciliation before admission | Transient unit освобождается на stop/reboot; нет durable binding/epoch primitive | Не доказано |
| Exactly-once ABA-safe release | durable local store | receipt + tombstone в одной durable transaction | Вне ответственности systemd/cgroup | Нужен отдельный design/primitive |

## Primary-source findings

- [systemd D-Bus API](https://www.freedesktop.org/software/systemd/man/org.freedesktop.systemd1.html) определяет `StartTransientUnit` как manager call, возвращающий job, и описывает освобождение transient unit, когда он больше не запущен/не имеет references или при reboot. Это подтверждает manager-side creation и job observation, но не atomic protocol с другим durable store.
- [Linux cgroup v2](https://docs.kernel.org/admin-guide/cgroup-v2.html) указывает, что `cgroup.events` сообщает `populated=0` только если в cgroup и descendants нет live processes; также документированы hierarchical controller availability/enabling и явная delegation. Это полезное evidence для будущего empty proof, но не direct-child reap receipt и не ownership fence.
- [systemd resource control](https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html) документирует resource-control directives, но их наличие не доказывает delegation и effective application в каждом user-manager environment.
- [systemd execution environment](https://www.freedesktop.org/software/systemd/man/systemd.exec.html) документирует isolation и syscall settings. Будущий profile должен доказать на actual supported Node runtime, что выбранные network и process-creation restrictions применяются и не ослабляют/не ломают trusted runtime; это research не запускало service process.
- [systemd kill semantics](https://www.freedesktop.org/software/systemd/man/systemd.kill.html) документирует unit process killing. Kill scope не заменяет authoritative empty proof, direct-child reap или durable terminal receipt.

## Local capability probes

All probes were read-only. They did not access a selected repository and did not start a service process.

| Command | Exit | Observed |
| --- | --- | --- |
| `uname -srmo` | 0 | `Linux 7.0.0-31-generic x86_64 GNU/Linux` |
| `systemctl --version` | 0 | systemd `255.4-1ubuntu8.17`, `default-hierarchy=unified` |
| `test -f /sys/fs/cgroup/cgroup.controllers` | 0 | cgroup v2 controller file exists |
| `cat /sys/fs/cgroup/cgroup.controllers` | 0 | `cpuset cpu io memory hugetlb pids rdma misc dmem` |
| `findmnt -no TARGET,FSTYPE,OPTIONS /sys/fs/cgroup` | 0 | `/sys/fs/cgroup cgroup2 ro,nosuid,nodev,noexec,relatime,nsdelegate,memory_recursiveprot` |
| `test -w /sys/fs/cgroup` | 1 | current process не может писать в cgroup root; delegated writable subtree не установлено |
| `busctl --user call org.freedesktop.systemd1 /org/freedesktop/systemd1 org.freedesktop.DBus.Peer Ping` | 0 | user D-Bus достигает `org.freedesktop.systemd1` |
| `busctl --user introspect org.freedesktop.systemd1 /org/freedesktop/systemd1 org.freedesktop.systemd1.Manager \| rg 'StartTransientUnit\|GetUnitByPID\|Subscribe\|JobRemoved\|UnitNew\|UnitRemoved'` | 0 | API раскрывает manager creation/discovery/event methods |
| `systemctl --user is-system-running` | 1 | `Failed to connect to bus: No data available`; CLI-level manager lifecycle usability не доказана D-Bus ping |

Последние два наблюдения намеренно не превращаются в success claim: достижимое bus name не доказывает применение всех required manager operations, authorization, delegated controllers и isolation settings.

## Fail-closed capability policy

После исправления STEP-021, до любого unit creation, spawn или selected-root I/O runtime обязан проверить всё ниже. Любая failed, unavailable или unverifiable проверка возвращает typed `PLATFORM_UNSUPPORTED`. Текущая реализация ещё не выполняет этот capability gate и не может использоваться как evidence его enforcement.

1. Linux kernel and cgroup v2 hierarchy are present.
2. A live systemd user manager is reachable through the intended D-Bus client path and authorizes the required transient unit operations.
3. The manager supplies a dedicated delegated writable subtree where `cpu`, `memory` and `pids` controllers are available and the requested limits are read back as effective.
4. A real worker probe proves the accepted network, process-creation, CPU, memory and tasks restrictions; configuration-object presence is insufficient.
5. A concrete primitive proves durable owner epoch/takeover, serializable lease reservation, idempotent create keyed by the epoch, and a stale-owner/delayed-create fence.
6. A concrete primitive proves generation-bound activation/revoke, authoritative member enumeration/empty proof, direct-child reap, and a durable terminal receipt before ABA-safe release.

Future suite фиксирует закрытый набор из шести negative fixtures: (1) non-Linux; (2) missing cgroup v2; (3) unreachable или unauthorized systemd user manager; (4) missing delegated subtree, required controller или effective-limit readback mismatch; (5) failed worker restriction либо user-bus/control-socket denial; (6) missing ownership, activation либо receipt primitive. Каждый fixture обязан вернуть typed `PLATFORM_UNSUPPORTED` до unit create/attach/spawn/selected-root I/O и без durable lease/capacity mutation; fixture не может быть заменён broad проверкой «any prerequisite».

## Ownership and recovery model required before GO

The durable local store, not D-Bus, must be the source of truth for `leaseId`, `unitKey`, nonce, owner epoch and lifecycle record. It needs a serializable transaction for capacity check plus retained reservation. A supervisor may perform OS work only while its durable epoch is current; every OS result must be verified against that epoch before it becomes a durable transition.

Это research не обнаружило документированную systemd user-manager operation, которая atomically сравнивает внешний epoch при создании transient unit, attach worker, release activation или teardown cgroup. Следующий ADR должен либо назвать primitive, предоставляющий эти boundaries, либо оставить success path unavailable. Restart reconciliation обязан удерживать budget при любой missing, unknown, corrupt или unresolvable record/unit relation; timeout, PID result, job result или один `populated=0` никогда сами по себе не освобождают lease.

## Required future executable matrix

Любой candidate replacement обязан содержать deterministic tests/probes для:

- two overlapping supervisors, takeover and stale-owner delayed create;
- durable reservation before OS mutation and every crash boundary through terminal receipt/release;
- durable `attachIntent` versus independently proven child outcome: `attachIntent` — только попытка admission и сам по себе не требует reap. Receipt разрешён лишь с `noChildEverAttached`, когда durable outcome доказывает, что child не стал reaper-observable, либо с `directChildReaped`, когда durable outcome содержит identity proven child. Cases включают intent-before-child, failed spawn и delayed child outcome после teardown;
- manager restart/reboot recovery, orphan/missing/corrupt relations and retained capacity;
- `ACTIVE`/pending release versus revoke, drain, seal and delayed release; and
- effective `PrivateNetwork`, address-family/syscall policy, CPU, memory and tasks limits on the trusted Node worker, плюс запрет worker connection к user D-Bus/control sockets и raw `StartTransientUnit`; и opaque observation;
- closed six-fixture parameterized negative capability-gate matrix: non-Linux; missing cgroup v2; unreachable/unauthorized manager; missing delegated subtree/controller/effective-limit readback mismatch; failed worker restriction/user-bus denial; missing ownership/activation/receipt primitive. Каждый fixture требует typed `PLATFORM_UNSUPPORTED`, zero unit create/attach/spawn/selected-root I/O и отсутствие lease/capacity mutation. Positive probe допустим только после принятого profile.

## Handoff and alternatives

ADR-008 не предлагается: выпуск profile ADR ложно означал бы supported success path. STEP-021 сначала должен устранить current runtime drift и typed fail-closed contract. Затем STEP-022 обязан принять отдельное architecture/security решение о concrete primitive. STEP-019 имеет STEP-022 как hard dependency и не может быть разблокирован только NO-GO результатом STEP-020: если STEP-022 не находит проверяемый primitive, он остаётся `Заблокировано`, а не завершается формальным success. Будущий lifecycle handoff ADR-007 только дополняет ADR-006; он не может полностью supersede base security clauses (lexical-only parent, descriptor-first identity, trusted spawn/isolation, immutable settlement и success-after-teardown), пока отдельный ADR явно не переносит их и не пройдёт review. STEP-002 остаётся заблокированным и по current contract ADR-006 должен возвращать `PLATFORM_UNSUPPORTED` до spawn после исправления STEP-021.

Rejected alternatives: считать unit name, D-Bus job, PID/PGID, `cgroup.events`, `KillMode=control-group` или timeout полным lifecycle receipt. Каждый из них доказывает лишь более узкий local fact и не предоставляет отсутствующие cross-store fencing и recovery guarantees.
