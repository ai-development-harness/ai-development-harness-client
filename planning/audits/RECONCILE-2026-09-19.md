# PROJECT RECONCILE — 2026-09-19

**Scope:** project
**Mode:** RECONCILE
**Execution:** `PROJECT RECONCILE`

## Sources checked

- Фактический workspace: `apps/local-service`, `apps/web`, `packages/client-api`, workspace configuration и test targets.
- Product contracts: `docs/PROJECT.md`, `docs/requirements/SPEC.md`, `docs/requirements/STATUS.md`.
- Architecture: ADR-001—ADR-007 и `docs/architecture.md`.
- Canonical task/evidence state: `planning/PLAN.md`, `planning/STATUS.md`, STEP-001—STEP-022 и latest immutable reviews.

## Actual state

- Проект initialized; `PROJECT RECONCILE` применим.
- Реализованная repository projection всё ещё выполняет selected-root filesystem I/O в parent/in-process path. Это не соответствует fail-closed policy Accepted ADR-006 до принятия supported containment profile.
- Этот architecture/implementation drift уже явно принадлежит запланированному corrective STEP-021. STEP-002 и STEP-019 остаются заблокированными, STEP-022 остаётся prerequisite для возможного supported success path.
- Плановые и статусные проекции согласованы с canonical task files: 4 STEP выполнены (STEP-001, STEP-016, STEP-017, STEP-020), 2 заблокированы (STEP-002, STEP-019), STEP-018 заменён, остальные 15 запланированы. REQ-001 и REQ-011 корректно не отмечены выполненными.

## Drift / findings

### R-001 — исправлен — обратная ссылка supersession ADR-005

`ADR-006` явно указывает `Supersedes: ADR-005`, а заголовок ADR-005 ранее оставлял `Superseded by: —`. Обратная ссылка синхронизирована в `docs/adr/ADR-005-otmenyaemaya-granitsa-repository-projection.md`; тело historical decision не изменялось.

### R-002 — открытый, уже маршрутизирован — fail-closed runtime policy ADR-006

`apps/local-service/src/repository-projection.ts` открывает и читает selected root, тогда как ADR-006 требует до accepted supported profile вернуть typed `PLATFORM_UNSUPPORTED` до selected-root I/O и spawn. Дефект не исправлялся в reconciliation; ему уже владеет STEP-021 с scope, acceptance criteria и independent security-aware review gate.

Новых corrective STEP не требуется: STEP-021 точно покрывает фактический gap, а STEP-022 отделённо владеет evidence-backed architecture decision о primitive. Не считать успешно прошедшие текущие unit tests доказательством выполнения ADR-006: они проверяют существующий in-process path, а не target fail-closed contract.

## Evidence

- `yarn nx test local-service --skip-nx-cache` — exit 0; 35 tests passed.
- `yarn nx test web --skip-nx-cache` — exit 0; 6 tests passed.
- `yarn nx typecheck local-service --skip-nx-cache` — exit 0.
- `yarn nx typecheck web --skip-nx-cache` — exit 0.
- `python3 tools/harness/validate.py --mode commit` — exit 0; `HARNESS VALIDATION: PASS (201 tracked files checked, mode=commit)`; only warning: no staged files.
- `git diff --check` — exit 0.
- Latest evidence-backed research review: `planning/reviews/STEP-020/REVIEW-2026-09-19T20-06-49Z.md` — PASS; it confirms the NO-GO result and preserves STEP-021/STEP-022 blockers.

## Corrective actions

- STEP-021 — plan and implement typed fail-closed `PLATFORM_UNSUPPORTED` correction before selected-root I/O; then conduct independent security-aware review.
- STEP-022 — only after STEP-021, make a reviewed Linux containment primitive decision; do not reopen a repository-projection success path without this decision.
