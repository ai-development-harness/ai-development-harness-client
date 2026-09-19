# SECURITY REVIEW STEP-020 — 2026-09-19 20:05 UTC

**Reviewer role:** независимый adversarial security reviewer
**Verdict:** PASS
**Reviewed revisions:** research report `sha256:882961875224b1283f0f744cebd8d856677f9a21ef491bf78dc0c62352cbce3d`; ADR-006 `sha256:cd1da8a2930c0f038609ddd40d5cef385c5ae9553ee29ad87a88573319551375`; ADR-007 `sha256:7f254230db0263491e8d95f960e9b945d18d5c51b806d29388d864a6497c0430`; STEP-020 `sha256:72cf2adab5ef6823bb97655d70f8fa1b87553e5e303ee2d10860138a018cb998`

## Проверенный scope

- Закрытие F-S30 на pre-spawn cancellation/crash boundary и невозможность как unsafe release, так и бесконечного удержания lease при доказанном отсутствии child.
- Fail-closed `PLATFORM_UNSUPPORTED`, отсутствие fallback и честное отделение target policy ADR-006 от текущего implementation drift.
- Ownership/admission, delayed create/attach, stale-owner и activation/revoke fencing, restart recovery, terminal receipt и ABA-safe release.
- Ограничения candidate `systemd user manager + D-Bus transient units + cgroup v2`: user-bus/control-plane escape, effective isolation/resource postconditions и недостающие cross-store guarantees.
- Public data exposure и executable handoff STEP-002/STEP-019/STEP-021/STEP-022 против STEP-020, ADR-006, Proposed ADR-007, research report и latest failing reports.

## Findings

Security findings не обнаружены.

## Закрытие F-S30

F-S30 закрыт в проверенной revision ADR-007. Generation-bound `childOutcome` остаётся `notStarted` до атомарного `attachIntent: notStarted → pending`. После generation fence platform primitive может перевести и `notStarted`, и `pending` в durable `absent` только при доказанном отсутствии reaper-observable child и запрете delayed create/attach той же generation. Этот transition взаимно исключён с `attachIntent`: выигравший fence запрещает attach, а выигравший intent требует отдельного proof для `pending`.

Terminal `noChildEverAttached` receipt разрешён только по durable `childOutcome=absent`; `notStarted` и `pending` сохраняют lease. Для reaper-observable child требуется persisted `present(identity)` и `directChildReaped(identity)`. Поэтому прежний attack scenario с повторными pre-spawn cancellation больше не создаёт безусловно вечный retained budget, а освобождение capacity не может обойти delayed-attach fence. Handoff требует deterministic cases для `RESERVED`, `CREATED`, pre-attach `BOUND` и interleaving fence против `attachIntent`, включая exactly-once ABA-safe release.

## Подтверждённые security properties

- NO-GO не открывает success path: D-Bus job/unit name, PID/PGID, timeout, `cgroup.events: populated=0` и `KillMode=control-group` не считаются stable ownership handle, direct-child proof или durable terminal receipt.
- ADR-006 остаётся current base security contract. Proposed ADR-007 только добавляет lifecycle requirements и не ослабляет lexical-only parent, descriptor-first identity, trusted spawn/isolation, immutable settlement и success-after-teardown clauses.
- Candidate systemd/cgroup profile отклонён из-за отсутствия доказанного owner epoch/takeover, serializable admission reservation, delayed-create/attach fence, atomic activation/revoke и receipt/release boundary. Reachable user D-Bus и наличие controller не выданы за effective supported profile.
- Future worker не получает доступ к user D-Bus/control sockets и raw `StartTransientUnit`; невозможность enforce этого denial ведёт к `PLATFORM_UNSUPPORTED`.
- Closed six-fixture negative capability gate требует typed `PLATFORM_UNSUPPORTED` до unit create/attach/spawn/selected-root I/O и без lease/capacity mutation. Effective network, child-process, CPU, memory и tasks restrictions должны быть доказаны на реальном worker, а не наличием settings.
- Missing/orphan/corrupt/unknown/unresolvable lifecycle state удерживает budget либо блокирует admission до authoritative reconciliation. Timeout и частичный OS result не освобождают lease.
- Public observation ограничена typed lifecycle, opaque identity и retained-lease flag; selected root, PID, OS handle, stderr и raw diagnostics запрещены до и после restart.
- Текущий local-service всё ещё выполняет parent `realpath` и in-process selected-root I/O. Research не маскирует этот drift: STEP-021 отдельно владеет typed fail-closed correction, а STEP-022 — будущим profile decision. Security PASS STEP-020 не является PASS текущей runtime implementation и не снимает blockers STEP-019/STEP-002.

## Evidence и verification

- Проверены STEP-020, research report, Accepted ADR-006, Proposed ADR-007, STEP-002/STEP-019/STEP-021/STEP-022 и все предыдущие immutable STEP-020 review reports.
- Linux kernel cgroup v2 primary documentation подтверждает только membership/delegation/controller semantics и `populated=0` для отсутствия live processes в subtree; она не предоставляет ownership epoch, direct-child reap или cross-store receipt.
- `sha256sum` зафиксировал перечисленные reviewed revisions; ADR-007 и STEP-020 изменились после failing F-S30 report.
- `plan_info(Path('.'), 'STEP-020')` — stored/current basis совпадают, `ready: True`.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`, с предупреждением об отсутствии staged files.
- `git diff --check` — exit code 0. No-index whitespace checks четырёх untracked owning deliverables вернули ожидаемый exit 1 для новых файлов с пустым output; whitespace errors не обнаружены.
- Production tests и service process не запускались: STEP-020 является research scope и запрещает production containment implementation. Исполнимость handoff должна быть доказана отдельными STEP-021/STEP-022/STEP-002 implementation и review.

## Verdict rationale

Проверенный NO-GO сохраняет fail-closed boundary, не приписывает systemd/cgroup недоказанные гарантии и маршрутизирует текущий runtime drift в отдельный обязательный BUGFIX. Remediation F-S30 теперь задаёт безопасный terminal path для доказанно child-free pre-spawn states без ослабления delayed-attach fencing. Конкретных exploitable gaps в security scope STEP-020 не осталось; verdict `PASS` относится только к research, lifecycle handoff и неизменённым reviewed revisions.
