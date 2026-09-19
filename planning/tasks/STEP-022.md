# STEP-022 — Решение о Linux containment primitive

**Статус:** Запланировано
**Type:** ADR
**Приоритет:** Критический
**Фаза:** MVP foundation
**Depends on:** STEP-020, STEP-021

## Requirements

- REQ-001
- REQ-011

## ADR

- ADR-006
- ADR-007 (Proposed, additive lifecycle handoff)

## Risk flags

- security-sensitive
- architecture
- concurrency

## Goal

Принять только evidence-backed Linux containment primitive, который реализуемо доказывает required ownership, lifecycle fencing, terminal child proof и worker isolation; при отсутствии такого primitive сохранить unavailable state без ложного разблокирования STEP-019.

## Context

STEP-020 дал NO-GO candidate systemd user manager + D-Bus transient units + cgroup v2: documented operations не объединяют durable epoch, OS mutation, activation/revoke и receipt. STEP-019 нельзя продолжить только потому, что research завершился: необходим отдельный reviewed architecture decision о primitive либо durable blocker.

## Scope

- Выбрать или отклонить конкретный Linux primitive и описать owner epoch/takeover, admission transaction, create/attach/activation/revoke fence, reaper-observable child outcome и terminal receipt.
- При положительном evidence создать Proposed profile ADR, который сохраняет ADR-006 current base contract и добавляет lifecycle clauses ADR-007 без полного supersede.
- При отсутствии complete evidence зафиксировать decision `Заблокировано`, concrete missing guarantee и product/architecture action; не выдавать NO-GO за completed supported-profile decision.
- Передать executable test matrix для overlapping supervisors, delayed create, intent-before-child/failed spawn/delayed child, user-bus escape, recovery и capability gates.

## Mutation policy

### Allowed

- New Proposed ADR, research/evidence, STEP/roadmap/requirements traceability.

### Conditional

- Принятие ADR только после independent architecture, security и test-handoff PASS для неизменённого decision body.

### Forbidden

- Production implementation, изменение Accepted ADR-006 или принятие ADR-007 без required review.
- Ослабление base security contract, cross-platform support и скрытое снятие blockers STEP-019/STEP-002.

## Out of scope

- Реализация systemd/D-Bus/cgroup integration или new supervisor/store.
- Закрытие STEP-019 на основании одного research NO-GO.

## Acceptance criteria

- Каждая mandatory guarantee имеет конкретный primitive, owner, durable state, linearization point, stale-owner fence и executable evidence; unknown guarantee не объявлена обеспеченной.
- Worker cannot connect to systemd user-bus/control sockets or issue raw `StartTransientUnit`; absence of enforceable denial is `PLATFORM_UNSUPPORTED`.
- Closed six-fixture negative capability gate covers non-Linux, missing cgroup v2, unreachable/unauthorized manager, delegated subtree/controller/effective-limit readback mismatch, failed worker restriction/user-bus denial and missing ownership/activation/receipt primitive; each returns typed `PLATFORM_UNSUPPORTED` with zero unit create/attach/spawn/selected-root I/O and no lease/capacity mutation.
- `attachIntent` is distinct from proven child outcome: terminal receipt requires `noChildEverAttached` only for durably proven no child, otherwise `directChildReaped` for the proven child identity.
- STEP-022 can be marked `Выполнено` only with a reviewed supported primitive/ADR. A NO-GO result keeps STEP-022 `Заблокировано`; therefore STEP-019 remains blocked.

## Verification

- Primary-source and reproducible non-destructive probes for the selected primitive.
- Independent architecture/security and test-handoff reviews.
- REQ/ADR/STEP traceability, `python3 tools/harness/validate.py --mode commit` and `git diff --check`.

## Deliverables

- Accepted or Proposed Linux profile ADR with evidence, or durable blocked decision; executable test handoff and updated blockers.

## Implementation plan

**Plan status:** Not planned
**Plan revision:** —
**Plan basis:** —
**Planned at:** —

Заполняется командой `STEP PLAN STEP-022`.

## Evidence

Создан successor architecture decision task по F-A23/F-S20/F-A24/F-T20/F-A25 review STEP-020; research ещё не выполнялось.

## Review status

**Latest verdict:** NOT REVIEWED
**Latest report:** —

## Blocker / Failure reason

Ожидает завершения и review STEP-020 и STEP-021. No-GO без concrete primitive не удовлетворяет dependency STEP-019.
