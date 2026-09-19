# SECURITY REVIEW STEP-020 — 2026-09-19 19:52 UTC

**Reviewer role:** независимый adversarial security reviewer
**Verdict:** FAIL
**Reviewed revisions:** research report `sha256:366ccf3fa8faf27e76357e400d65bdd4e3c4405d97d80a7afae2237e774c4d1c`; ADR-006 `sha256:cd1da8a2930c0f038609ddd40d5cef385c5ae9553ee29ad87a88573319551375`; ADR-007 `sha256:be56ad29a95d1807a829fbeb4c68e92536d8d50d156425bf97082fdd71c06328`; STEP-020 `sha256:798205bf922ba3ea3552158e42a0238248025e7262f80a75ccb067c892616007`

## Проверенный scope

- Fail-closed `PLATFORM_UNSUPPORTED` и отсутствие fallback до принятого supported profile.
- Containment assumptions для systemd user manager, D-Bus transient units и cgroup v2.
- Ownership, admission, activation/revoke fencing, restart recovery, terminal proof и lease release.
- Worker access к user D-Bus/control plane, effective resource/isolation postconditions и data exposure.
- Handoff STEP-002/STEP-019/STEP-021/STEP-022 против STEP-020, Accepted ADR-006, Proposed ADR-007 и latest review `REVIEW-2026-09-19T19-36-00Z.md`.

## Finding

### F-S30 — High — Pre-spawn cancellation/crash позволяет навсегда удержать capacity

**Location:** `docs/adr/ADR-007-crash-consistent-containment-lifecycle.md:43-45,53,55,67`.

**Preconditions:** actor может инициировать repository load и отменить его после durable `RESERVED`/`CREATED` либо до `attachIntent` в `BOUND`; эквивалентное состояние возникает при crash/restart supervisor на этой границе.

**Attack scenario:** actor повторяет admission и cancellation на pre-spawn boundary. Transition table требует после generation fence перевести `childOutcome=notStarted` в `absent`, но normative recovery text разрешает только `pending → absent` и одновременно запрещает terminal receipt, пока outcome остаётся `notStarted`. Каждый такой request удерживает lease после restart; повторение исчерпывает весь admission budget.

**Impact:** persistent availability DoS. Service возвращает `RESOURCE_LIMIT` для последующих запросов, хотя ни один worker не был запущен; restart не восстанавливает capacity. Освобождение lease без доказанного transition, напротив, нарушило бы delayed-attach fence, поэтому безопасного пути вокруг противоречия нет.

**Mitigation:** явно разрешить platform primitive после generation fence, исключившего delayed create/attach этой generation, переводить `notStarted | pending → absent`. Сохранить атомарный `attachIntent: notStarted → pending`, чтобы stale `absent` не мог пережить начавшуюся попытку attach. Terminal `noChildEverAttached` receipt разрешать только по durable generation-bound `absent`.

**Regression test:** для `RESERVED`, `CREATED` и pre-attach `BOUND` выполнить cancellation и crash/restart, затем generation fence, `childOutcome=absent`, `noChildEverAttached` receipt и exactly-once ABA-safe lease release. Отдельный deterministic interleaving `fence versus attachIntent` должен доказать, что выигравший intent делает outcome `pending`, а выигравший fence запрещает delayed attach.

## Подтверждённые security properties

- NO-GO сформулирован честно: D-Bus job, transient unit name/object, PID/PGID, `cgroup.events`, `KillMode=control-group` и timeout не объявлены stable ownership handle, cross-store fence или terminal receipt.
- Research отделяет target ADR-006 policy от фактического runtime drift. STEP-021 владеет typed `PLATFORM_UNSUPPORTED` correction; до его review PASS enforcement не заявлен.
- ADR-006 остаётся current base security contract; Proposed ADR-007 сформулирован как additive lifecycle contract и не открывает success path.
- User-bus escape закрыт в handoff: worker обязан не иметь доступа к user D-Bus/control sockets и raw `StartTransientUnit`; отсутствие enforceable denial означает `PLATFORM_UNSUPPORTED`.
- Closed six-fixture negative capability gate требует typed `PLATFORM_UNSUPPORTED` до unit create/attach/spawn/selected-root I/O и без lease/capacity mutation.
- Effective network, process-creation, CPU, memory и tasks restrictions должны доказываться на реальном worker; наличие configuration object не считается evidence.
- Public observation ограничена opaque lifecycle/retained-lease payload и не раскрывает selected-root path, PID, OS handle или raw diagnostics.

## Evidence и verification

- Проверены STEP-020, research report, ADR-006, ADR-007, latest review и handoff STEP-002/STEP-019/STEP-021/STEP-022.
- Primary-source claims использованы только как evidence узких systemd/cgroup primitives; unsupported guarantees не выведены из local probes.
- `git diff --check` — exit code 0 до сохранения этого отчёта.
- Production tests и service process не запускались: STEP-020 является research scope и запрещает production containment implementation.

## Verdict rationale

Fail-closed NO-GO, user-bus boundary и future capability gates security-sound. Однако unresolved contradiction из latest review создаёт конкретный persistent capacity-exhaustion scenario на обязательном lifecycle contract. До исправления F-S30 и fresh independent security review STEP-020 не может получить security PASS.
