# ADR-007 — Crash-consistent containment lifecycle

**Status:** Proposed
**Date:** 2026-09-19
**Deciders:** Команда проекта
**Supersedes:** —
**Superseded by:** —

## Context

ADR-006 установил fail-closed containment boundary, но review STEP-018 выявил незакрытое crash window между admission lease, созданием OS unit и durable binding его stable handle (F-S09). Также future handoff не требовал regressions для damaged durable records (F-T07) и не доказывал непрозрачность read-only observation после restart (F-T08). ADR-006 остаётся Accepted historical record: исправление его contract требует нового ADR, а не rewrite истории (F-A11).

## Problem

Если process аварийно завершается после reservation lease либо создания private unit, но до durable binding stable handle, следующий supervisor может не иметь достаточного record для discovery/reconciliation. Освобождение capacity по отсутствию record, PID, timeout или одному exit создаёт возможность reuse budget при живом unit. При recovery public observation также не должна превращать operational data в repository fact или раскрывать selected-root path, PID либо raw diagnostics.

## Decision

Этот ADR дополняет ADR-006 lifecycle-гарантиями и не заменяет ни одну из его base security clauses. До принятия service сохраняет текущий fail-closed путь `PLATFORM_UNSUPPORTED`; этот документ не добавляет supported OS profile, runtime, transport или success path.

### Durable lifecycle и admission

Containment record имеет versioned schema, immutable opaque `unitKey` и per-instance nonce, идентификатор lease, `ownerGeneration`, состояние activation channel, generation-bound `childOutcome` и lifecycle state:

```text
RESERVED → CREATED → BOUND → ACTIVE → TEARDOWN
```

`RESERVED` — единственная точка admission. До любой OS mutation supervisor атомарно durable записывает retained lease, заранее назначенные `unitKey`/nonce и state `RESERVED`. Platform profile обязан по этой паре исключительно и идемпотентно создать private unit и сделать его discoverable; повтор не создаёт второй unit.

`CREATED` фиксируется durable только после создания пустого unit. `BOUND` фиксируется durable только после verification stable non-reusable OS handle, связанного с `unitKey`/nonce. До `BOUND` запрещены attach worker и untrusted I/O.

Worker получает одноразовый activation token, связанный с `unitKey`/nonce, generation lease и durable record. После `BOUND` supervisor может attach только inert worker с этим token; worker не способен начать untrusted I/O без отдельного one-shot release. Supervisor сначала durable фиксирует `ACTIVE` вместе с activation generation, состоянием открытого activation channel и membership proof, затем посылает release. Release — только доставка одноразового намерения: даже уже доставленный или отложенный release может перевести worker в running лишь через `activate` текущей generation.

Supported platform profile обязан дать один linearizable activation primitive. Его `activate` одним неделимым действием проверяет current token/generation/open channel, поглощает one-shot release и переводит worker `inert → running` с предоставлением capability для untrusted I/O. Его `revoke` тем же primitive атомарно с durable `TEARDOWN` intent и новой generation закрывает activation boundary: если `revoke` выигрывает, paused/delayed `activate` и уже доставленный release не могут начать I/O; если `activate` выигрывает, его transition в running уже произошёл до выигравшего teardown и teardown обязан его drain/kill. Простая receiver-side проверка до отдельного transition не удовлетворяет contract. Отсутствие primitive, объединяющего durable fence и revoke, означает `PLATFORM_UNSUPPORTED`; повтор release не открывает новый generation.

Вход в `TEARDOWN` является отдельной crash-consistent границей: до OS seal supervisor через тот же linearizable primitive атомарно durable фиксирует state `TEARDOWN`, новую отозванную `ownerGeneration`, intent `activationChannel=revoking` и revoke activation boundary. С этого intent recovery не имеет пути resume/release. Затем supervisor закрывает для новых send и drain-ит activation channel: все queued/in-flight release отозванного generation должны завершиться rejected либо уже завершённым `activate`, прежде чем продолжится seal. Только после drain platform seal-ит unit для новых members, а seal линейно предшествует kill-all; destroy unit делает stale handle непригодным. Лишь затем разрешены kill-all и authoritative empty proof. Повтор каждого шага teardown idempotent; backward transition запрещён.

### Таблица переходов и recovery

| Откуда | Normal edge | Recovery-only edge и условие | Durable payload перед OS mutation | Recovery policy |
| --- | --- | --- | --- | --- |
| `RESERVED` | `CREATED` после создания пустого unit | `TEARDOWN`, если restart, cancellation, найден partial/orphan unit или creation нельзя доказать | retained lease, `unitKey`/nonce, `ownerGeneration`, `attachIntent=absent`, `childOutcome=notStarted`, `TEARDOWN` intent/revoke при cleanup | discover/reconcile; не создавать worker; no-child proof возможен лишь после generation fence, переведшего `notStarted` или `pending` в `absent` |
| `CREATED` | `BOUND` после verified stable handle | `TEARDOWN` при restart, cancellation, damaged/unresolvable handle или любой reconciliation failure | verified handle для `BOUND`; либо новая generation, `attachIntent=absent`, `childOutcome=notStarted` и `TEARDOWN` intent/revoke | не attach; seal/drain/kill; no-child proof возможен лишь после generation fence, переведшего `notStarted` или `pending` в `absent` |
| `BOUND` | `ACTIVE` только после atomically journaled `attachIntent`, inert attach, membership proof и durable activation channel | `TEARDOWN` при restart, cancellation, member без committed `ACTIVE`, damaged record или failed reconciliation | `ACTIVE`+generation+membership+open channel; либо новая generation и `TEARDOWN` intent/revoke | no-child receipt допустим только при durable `childOutcome=absent`; иначе никогда не release/resume и teardown member fail-closed до proven outcome |
| `ACTIVE` | `TEARDOWN` при normal completion, cancellation или deadline | `TEARDOWN` при любом restart независимо от момента one-shot release | новая generation, `TEARDOWN` intent и `activationChannel=revoking` до revoke/seal | always fenced teardown; не replay release и не продолжать request |
| `TEARDOWN` | terminal receipt → idempotent release/tombstone transaction | тот же `TEARDOWN` после crash до/после seal, kill, receipt или transaction | terminal receipt до release; tombstone в transaction | продолжить revoke/close/drain/seal/kill/reap; lease retained до receipt |

Только normal edges из второй колонки разрешают progress request. Recovery-only edges не создают worker и не переводят record обратно в `RESERVED`, `CREATED`, `BOUND` или `ACTIVE`. Crash после teardown intent до seal и после seal до kill/receipt всегда возобновляет тот же fenced teardown.

### Recovery и teardown

Перед любым новым admission startup authoritatively enumerates lifecycle records и units, принадлежащие profile. Для `RESERVED` и `CREATED` supervisor discover/reconcile-ит unit по opaque key; для `BOUND` и `ACTIVE` дополнительно verifies durable stable handle, owner generation, activation token, activation channel, `attachIntent`, `childOutcome` и membership. `childOutcome` generation-bound: до `attachIntent` он равен `notStarted`; атомарная запись `attachIntent` перед первым возможным spawn/attach одновременно переводит его в `pending` для той же generation. Marker не доказывает появление child и сам по себе не требует reap. Только platform primitive после generation fence, доказавшего отсутствие reaper-observable child и исключившего delayed create/attach этой generation, может перевести `notStarted` или `pending` в `absent`. Эта fenced transition взаимно исключается с `attachIntent`: если атомарный `notStarted → pending` уже выиграл, `absent` требует доказательство для `pending`; если fence уже зафиксировал `absent`, attach для этой generation запрещён. Только доказанный reaper-observable child может перевести `pending` в `present(identity)` с persisted identity. Пока outcome равен `notStarted` или `pending`, lease остаётся retained и recovery не синтезирует receipt. Recovery применяет таблицу: `BOUND` с member без committed `ACTIVE` и каждый recovered `ACTIVE` всегда идут в fenced teardown. Это намеренно исключает resume/replay one-shot release, потому что durable `ACTIVE` не доказывает, был ли release отправлен, принят или уже начал I/O.

После seal и kill-all platform/reaper выдаёт durable, generation-bound terminal receipt: он атомарно связывает authoritative empty proof с outcome-appropriate child proof. `noChildEverAttached` допустим только при `childOutcome=absent`; `directChildReaped(identity)` допустим только при `childOutcome=present(identity)` и reaper для той же persisted identity. Receipt никогда не выводится из `attachIntent`, PID/PGID, negative kill, timeout, отсутствия одного record либо exit одного child. Receipt связывается с `unitKey`/nonce и lease identity, создаётся до release и может быть идемпотентно проверен новым supervisor; отсутствие receipt удерживает lease. Lease release, terminal tombstone и удаление operational lifecycle record выполняются одной идемпотентной durable transaction только по валидному receipt. Tombstone сохраняет lease identity и release generation, поэтому replay старой transaction не освобождает новый lease (ABA-safe). Exactly-once release обеспечивается transaction identity lease: повтор recovery/teardown либо завершает ту же transaction, либо видит tombstone уже released lease без второго release.

Missing record при найденном orphan unit, record без unit, unknown schema/version/state, corrupt или truncated record, unresolvable handle и reconciliation failure удерживают затронутый budget fail-closed. Пока authoritative enumeration ownership невозможна, service блокирует весь admission либо возвращает `PLATFORM_UNSUPPORTED`. Никакой timeout не освобождает retained lease.

### Read-only observation

Public read-only observation — typed payload, допускающий только lifecycle `ACTIVE`, `RECOVERING` или `TEARDOWN_FAILED`, opaque identity unit и retained-lease flag. Он не содержит selected-root path, PID, raw stderr, raw diagnostics, OS handle или repository-validity fact. Unknown/corrupt record остаётся operational recovery condition и не означает valid/invalid repository. Это ограничение действует одинаково до и после restart, для IPC/loggable response и serialized payload.

## Test handoff для STEP-002

STEP-002 обязан реализовать parameterized crash-injection/restart regressions после каждого boundary: durable `RESERVED`, OS unit creation перед `CREATED`, stable-handle binding перед `BOUND`, atomically journaled `attachIntent`, `childOutcome`, inert worker attach, committed `ACTIVE`, до send release, после send до acknowledgement, после начала untrusted I/O, durable `TEARDOWN` intent/revoke до seal, после seal до kill/receipt, terminal receipt до release transaction, во время атомарного commit release/tombstone/delete и после commit до acknowledgement. Для `RESERVED`, `CREATED` и pre-attach `BOUND` cancellation/crash обязан пройти `generation fence → notStarted|pending → absent → noChildEverAttached → exactly-once release`; fence обязан доказать отсутствие reaper-observable child и исключить delayed create/attach. Отдельные cases `intent-before-child`, failed spawn и `intent → TEARDOWN → delayed child` (включая crash/restart до receipt) доказывают, что marker не подменяет outcome: absent child разрешает receipt только при durable `childOutcome=absent`, а reaper-observable child — только с persisted identity и `directChildReaped(identity)`. Отдельный deterministic interleaving `fence` против атомарного `attachIntent: notStarted → pending` доказывает, что выигравший attach требует outcome `pending`, а выигравший fence запрещает attach этой generation. Каждый restart доказывает отсутствие нового admission/spawn, `RESOURCE_LIMIT` при занятом budget и exactly-once release только после reconciliation, valid terminal receipt и authoritative empty proof; частично применённые release/delete состояния не наблюдаемы. Каждый recovered `ACTIVE` доказывает fenced teardown без replay release или продолжения request.

Отдельный deterministic interleaving обязателен: `receiver validate passed → pause before atomic activate → durable TEARDOWN intent/new generation + atomic revoke → resume`. Он доказывает, что выигравший revoke не допускает transition `inert → running` и untrusted I/O. Также обязателен `ACTIVE committed → release pending → durable TEARDOWN intent/new generation + atomic revoke → close/drain activation channel → seal → delayed release`; он доказывает отсутствие untrusted I/O и member после fence, сохранение lease до terminal receipt, включая crash/restart до kill-all. Дополнительно `attach pending → TEARDOWN intent/seal → empty proof/release → delayed attach` доказывает те же свойства для attach. Crash cases activation доказывают, что worker не может выполнить untrusted I/O до committed `ACTIVE` и one-shot release, а recovery `BOUND` с member teardown-ит его fail-closed. Отдельные pre-spawn cases после `RESERVED`/`CREATED`/`BOUND` с durable `childOutcome=absent` доказывают no-child receipt и exactly-once release без фиктивного reap.

Отдельные cases обязательны для orphan/missing record, record без unit, unknown version/state, unresolvable handle, corrupt/truncated record и reconciliation failure. Для каждого case tests доказывают retained budget либо `PLATFORM_UNSUPPORTED`, без silent reuse capacity.

Adversarial observation regression использует poison selected-root path, PID и raw diagnostic. До и после restart public observation, IPC/loggable response и serialized read-only payload не содержат poison values; разрешённый payload содержит лишь lifecycle, opaque identity и retained-lease flag.

## Alternatives considered

### Освобождение lease при missing record или timeout

Отклонено. Absence durable record не доказывает absence live unit после crash.

### Идентификация только PID/process group

Отклонено. PID/PGID reuse и exit direct child не доказывают containment membership, empty state или ownership enumeration.

### Восстановление с raw diagnostics в public observation

Отклонено. Такой payload раскрывает sensitive operational data и смешивает recovery с repository validity.

## Consequences

До independent architecture/security и test-handoff review `PASS` ADR-007 остаётся Proposed, а ADR-006 сохраняет current Accepted status и все base security clauses. После PASS отдельная documentation synchronization может принять неизменённое тело ADR-007 как additive lifecycle contract и добавить его в current traceability, не помечая ADR-006 superseded. Любое изменение decision body аннулирует этот review.

STEP-002 остаётся заблокированным: implementation не начинается до принятия ADR-007, отдельной implementation/review цепочки и supported platform profile. Реализация должна выбирать конкретный OS primitive/profile отдельным ADR и доказать его postconditions.

## Security implications

Crash не превращается в capacity reuse: availability может деградировать retained lease, но untrusted I/O невозможно до committed `ACTIVE`, one-shot release и выигравшего atomic `activate` текущей generation. После durable `TEARDOWN` intent + atomic revoke activation channel закрывается и drain-ится до seal/kill, поэтому delayed release не возобновляет load. Pre-spawn recovery освобождает lease только по no-child receipt после generation-fenced `notStarted|pending → absent`, доказавшей отсутствие reaper-observable child и запретившей delayed attach; intent без proven outcome удерживает lease и не создаёт фиктивный reap. Public observation не раскрывает selected root, process identity или raw diagnostics.

## Data / migration implications

Новых stores, migrations или public API этот Proposed ADR не создаёт. Будущий durable lifecycle record обязан иметь versioned schema и corruption detection; неизвестная версия fail-closed.

## Traceability

- REQ: REQ-001, REQ-011
- STEP: STEP-002, STEP-019
