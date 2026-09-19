# Architecture Decision Records

ADR фиксирует **устойчивое архитектурное решение**, его контекст и последствия. ADR не создаётся для каждой задачи.

## Статусы

- `Proposed`
- `Accepted`
- `Rejected`
- `Superseded`
- `Deprecated`

## Правила

1. Accepted ADR считается immutable historical decision record.
2. Если контракт меняется, создай новый ADR и укажи `Supersedes`.
3. Не переписывай прошлую мотивацию задним числом.
4. Если решение ещё не принято, используй `Proposed` или `OPEN_QUESTIONS`, а не выдумывай Accepted ADR.
5. ID не переиспользуется: `ADR-001`, `ADR-002`, ...

## Index

- [ADR-001 — Repository и Harness как источник истины](ADR-001-repository-i-harness-kak-istochnik-istiny.md)
- [ADR-002 — ClientApi и заменяемая локальная граница](ADR-002-clientapi-i-zamenyaemaya-lokalnaya-granitsa.md)
- [ADR-003 — Runtime adapters и явный выбор](ADR-003-runtime-adaptery-i-yavnyy-vybor.md)
- [ADR-004 — Безопасная Git worktree projection](ADR-004-bezopasnaya-git-worktree-proektsiya.md)
- [ADR-005 — Отменяемая граница repository projection](ADR-005-otmenyaemaya-granitsa-repository-projection.md)
- [ADR-006 — Containment boundary repository projection](ADR-006-containment-boundary-repository-projection.md)
- [ADR-007 — Crash-consistent containment lifecycle (Proposed, additive к ADR-006)](ADR-007-crash-consistent-containment-lifecycle.md)
