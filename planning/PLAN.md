# План проекта

## MVP

| STEP | Название | Type | Приоритет | Depends on | Статус |
| --- | --- | --- | --- | --- | --- |
| STEP-001 | Bootstrap Nx workspace и границ приложения | IMPLEMENTATION | Критический | — | Выполнено |
| STEP-002 | ClientApi и repository projections | IMPLEMENTATION | Критический | STEP-001 | Запланировано |
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
| STEP-013 | Git Workspace и publication chains | IMPLEMENTATION | Высокий | STEP-005, STEP-007 | Запланировано |
| STEP-014 | Post-MVP Activity и расширенные UX surfaces | IMPLEMENTATION | Средний | STEP-011, STEP-012, STEP-013 | Запланировано |
| STEP-016 | Docker dev окружение и миграция на Yarn | IMPLEMENTATION | Высокий | STEP-001 | Выполнено |

## Architectural reserve

| STEP | Название | Type | Приоритет | Depends on | Статус |
| --- | --- | --- | --- | --- | --- |
| STEP-015 | Secure local bridge research и ADR | RESEARCH | Средний | STEP-002 | Запланировано |

Порядок определён dependencies. Первое исполнимое действие: `STEP PLAN STEP-002`.
