# STEP-017 — Граница безопасной Git worktree projection

**Статус:** Выполнено
**Type:** ADR
**Приоритет:** Критический
**Фаза:** MVP foundation
**Depends on:** STEP-001

## Requirements

- REQ-001
- REQ-011

## ADR

- ADR-004

## Risk flags

- security-sensitive
- architecture

## Goal

Принять устойчивое решение, при каких условиях local service может получать Git worktree facts выбранного repository без исполнения repository-controlled code.

## Context

Независимый review STEP-002 подтвердил, что `git status` над произвольным выбранным root может запустить filters из `.gitattributes`. Отключение отдельных Git config keys не даёт достаточной security boundary, а отсутствие worktree projection меняет согласованный scope STEP-002.

## Scope

- Threat model для selected repository, Git filters/hooks/config и filesystem/subprocess denial of service.
- Варианты boundary: trusted repository, изолированный Git sandbox либо явный отказ от worktree inspection в MVP.
- Accepted ADR с trust assumptions, capability/API surface, failure semantics, operational constraints и migration path для STEP-002.
- Dependency/contract correction STEP-002 по принятому решению.

## Mutation policy

### Allowed

- ADR, связанные task/roadmap/REQ traceability и evidence.

### Conditional

- Минимальная правка ClientApi или local-service только если она необходима для проверки уже принятого решения.

### Forbidden

- Реализация hosted bridge, arbitrary command execution, UI workflow или Git mutation chains.

## Out of scope

- Production implementation secure local bridge из STEP-015.
- Выполнение Git worktree commands до принятия boundary.
- Повторный broad refactor STEP-002.

## Acceptance criteria

- Accepted ADR явно определяет trust boundary для worktree inspection и рассматривает repository-controlled filters.
- Решение устанавливает безопасный MVP behaviour для untrusted selected root и честный typed failure/unavailable result.
- STEP-002 зависит от STEP-017; его implementation plan и дальнейший scope могут быть продолжены только после decision.

## Verification

- Независимый architecture review ADR.
- Security review threat model и выбранной boundary.
- Проверка traceability REQ ↔ STEP ↔ ADR и `python3 tools/harness/validate.py --mode commit`.

## Deliverables

- Новый Accepted ADR.
- Обновлённые STEP-002, PLAN и requirements status projections.
- Evidence architecture/security review.

## Implementation plan

**Plan status:** Ready
**Plan revision:** 2
**Plan basis:** sha256:37795b7771564fb02616f43aa17b940573380ac79efa47ce7573e517d79f1919
**Planned at:** 2026-09-19T14:57:52+00:00

1. Зафиксировать воспроизводимый threat model по независимому review STEP-002: selected `projectRoot` считается untrusted data boundary; `.git/config`, `.gitattributes`, hooks, external `gitdir`, refs/objects, symbolic links, special files и объём artifacts не дают local service право исполнять repository-controlled code. Отдельно описать последствия blocking filesystem/subprocess operations, attacker-controlled stderr и required bounded failure.
2. Подготовить ADR-004 о безопасной Git worktree projection. Сопоставить и отклонить для MVP неформальный флаг «trusted repository» (не доказывает безопасную исполнимую closure) и OS sandbox (требует отдельной portable capability/операционной модели). Принять MVP policy: local service не запускает Git commands, которые читают worktree или могут активировать repository filters; для любого selected root поле worktree остаётся typed `unavailable` с причиной policy. Отдельным decision ADR явно определить судьбу metadata Git subprocess: до доказанной безопасной closure они также unavailable, а не предполагаемо безопасный fixed-argument allowlist.
3. В ADR определить API и failure semantics: `unavailable` означает недоступность именно worktree fact, а не `clean`; typed reason отличает security policy от отсутствия Git, I/O, canonicalization, root-identity mismatch, timeout и resource limit. Ошибки безопасной проверки границы не маскируются под validity repository. Зафиксировать operational limits: canonical root/Git-dir containment, atomic no-follow reading, limits size/count/complexity, bounded subprocess timeout/output/process-tree termination и отсутствие fallback к repository tooling. Описать migration path: worktree либо metadata capability возможна только отдельным STEP после explicit OS sandbox/capability design и security review; hosted bridge остаётся scope STEP-015.
4. Обновить ADR index и architecture documentation ссылкой на ADR-004. Синхронизировать двустороннюю traceability REQ-001/REQ-011 ↔ STEP-017 ↔ ADR-004 в `docs/requirements/SPEC.md` и `docs/requirements/STATUS.md`, не меняя lifecycle-статусы требований.
5. Скорректировать зависимый contract STEP-002 по принятому ADR: сохранить dependency `STEP-017`, добавить `ADR-004`, заменить требование worktree fact на честный `unavailable` с причиной policy и исключить `git status`/diff и любой execution repository-owned tooling. Обновить его implementation plan, acceptance/verification и rollback только в пределах decision; не устранять остальные findings STEP-002 в этом ADR STEP.
6. Подготовить evidence для независимых architecture и security reviews: sentinels для `.gitattributes` filter/process, `core.fsmonitor`, hooks, config include и remote/promisor helper доказывают, что untrusted MVP path не исполняет helper и не обращается вне root; cases для Git absence, nested/external Git boundary, timeout/I/O, FIFO/symlink/oversized artifact и typed `unavailable` проверяют описанные semantics. Выполнить `python3 tools/harness/validate.py --mode commit` и traceability check; после implementation передать ADR отдельным reviewers, не устанавливая STEP-017 в `Выполнено` до их PASS.

### Совместимость, риски и rollback

- Контракт уточняет существующее значение `GitProjection.worktree: 'unavailable'` typed reason, поэтому UI не может интерпретировать его как `clean` или отсутствие Git; migration к worktree facts потребует отдельной capability и обратимо заменит только это ограничение.
- Главный residual risk MVP — неполные Git facts. Он предпочтительнее исполнения repository-controlled code; metadata остаются subject to root-identity и bounded-operation constraints ADR-004.
- При откате удаляются только ADR-004 и согласованные projections/traceability текущего STEP; не возвращается небезопасный вызов worktree Git command.

## Evidence

- `./node_modules/.bin/nx run-many --target=test,typecheck,lint,build --projects=web,local-service --parallel=1 --skip-nx-cache` — exit code 0; все восемь Nx targets прошли.
- `python3 tools/harness/validate.py --mode commit` — exit code 0; `HARNESS VALIDATION: PASS`.
- `git diff --check` — exit code 0; whitespace errors не обнаружены.
- Независимый primary review: `planning/reviews/STEP-017/REVIEW-2026-09-19T15-23-21Z.md` — PASS; regression 1001 non-STEP entries подтвердил bounded traversal.
- Независимый security review: `planning/reviews/STEP-017/REVIEW-2026-09-19T15-22-25Z.md` — PASS; подтверждены descriptor-relative data boundary и отсутствие Git subprocess.

## Review status

**Latest verdict:** PASS
**Latest report:** `planning/reviews/STEP-017/REVIEW-2026-09-19T15-23-21Z.md`

## Blocker / Failure reason

—
