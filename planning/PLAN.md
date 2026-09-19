# План проекта

## MVP

| STEP | Название | Type | Приоритет | Depends on | Статус |
| --- | --- | --- | --- | --- | --- |
| STEP-001 | Bootstrap Nx workspace и границ приложения | IMPLEMENTATION | Критический | — | Выполнено |
| STEP-002 | ClientApi и repository projections | IMPLEMENTATION | Критический | STEP-001, STEP-017, STEP-019, STEP-021, STEP-022 | Заблокировано |
| STEP-003 | Открытие и валидация repository | IMPLEMENTATION | Критический | STEP-002 | Запланировано |
| STEP-004 | Runtime adapters и explicit selection | IMPLEMENTATION | Критический | STEP-002 | Запланировано |
| STEP-005 | Canonical command executor и preflight | IMPLEMENTATION | Критический | STEP-002, STEP-004 | Запланировано |
| STEP-006 | Execution recovery и resolver projections | IMPLEMENTATION | Критический | STEP-002, STEP-005 | Запланировано |
| STEP-007 | Доступный UI shell и localization foundation | IMPLEMENTATION | Высокий | STEP-001 | Запланировано |
| STEP-008 | Pre-INIT и PROJECT INIT UI flow | IMPLEMENTATION | Критический | STEP-003, STEP-004, STEP-005, STEP-007 | Запланировано |
| STEP-009 | Overview и knowledge read views | IMPLEMENTATION | Высокий | STEP-002, STEP-007 | Запланировано |
| STEP-010 | Roadmap, STEP Detail и review policies | IMPLEMENTATION | Высокий | STEP-006, STEP-007, STEP-009 | Запланировано |
| STEP-011 | Live Execution Run | IMPLEMENTATION | Критический | STEP-005, STEP-006, STEP-007 | Запланировано |
| STEP-012 | Quality, skills, updates и settings surfaces | IMPLEMENTATION | Высокий | STEP-005, STEP-007, STEP-009 | Запланировано |
| STEP-013 | Git Workspace и publication chains | IMPLEMENTATION | Высокий | STEP-005, STEP-007, STEP-017 | Запланировано |
| STEP-014 | Post-MVP Activity и расширенные UX surfaces | IMPLEMENTATION | Средний | STEP-011, STEP-012, STEP-013 | Запланировано |
| STEP-016 | Docker dev окружение и миграция на Yarn | IMPLEMENTATION | Высокий | STEP-001 | Выполнено |
| STEP-017 | Граница безопасной Git worktree projection | ADR | Критический | STEP-001 | Выполнено |
| STEP-018 | Containment boundary repository projection | ADR | Критический | STEP-001, STEP-017 | Заменено |
| STEP-019 | Crash-consistent containment lifecycle | ADR | Критический | STEP-001, STEP-017, STEP-020, STEP-022 | Заблокировано |
| STEP-020 | Linux supported containment profile research | RESEARCH | Критический | STEP-001, STEP-017 | Выполнено |
| STEP-021 | Typed fail-closed enforcement repository projection | BUGFIX | Критический | STEP-001, STEP-017 | Запланировано |
| STEP-022 | Решение о Linux containment primitive | ADR | Критический | STEP-020, STEP-021 | Запланировано |

## Architectural reserve

| STEP | Название | Type | Приоритет | Depends on | Статус |
| --- | --- | --- | --- | --- | --- |
| STEP-015 | Secure local bridge research и ADR | RESEARCH | Средний | STEP-002 | Запланировано |

Порядок определён dependencies. STEP-020 оформил NO-GO для проверенного candidate Linux profile. STEP-021 исправляет current runtime drift, а STEP-022 является hard architecture dependency: только его reviewed supported-primitive decision может разблокировать STEP-019; собственный NO-GO оставляет STEP-022 и downstream заблокированными.
