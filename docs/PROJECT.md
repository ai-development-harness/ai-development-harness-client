# AI Development Harness Client

## Назначение

AI Development Harness Client — локальный browser-first графический клиент для Harness v0.4.0. Он помогает открыть и проверить repository, пройти pre-INIT и основной lifecycle, увидеть REQ/ADR/STEP/evidence и безопасно запускать канонические команды без обязательного внешнего терминала.

Repository остаётся source of truth. Клиент не хранит альтернативные статусы STEP, не копирует CTS и не выводит protocol state из текста модели.

## Пользовательский результат MVP

Пользователь открывает Harness repository, создаёт или редактирует local-only `PROJECT_BRIEF.local.md`, явно выбирает Codex либо Claude Code, выполняет `PROJECT INIT`, затем проходит `STEP NEXT` → STEP Detail → `STEP RUN` → Review/Evidence → `GIT CHECK > COMMIT > PUSH > PR` через UI. После mutation клиент перечитывает repository и Git state.

## Границы

- Первый класс runtime: Codex App Server и Claude Agent SDK; automatic fallback запрещён.
- Harness Execution Status — единственное operational recovery state; Activity/Runs являются отдельной Post-MVP client-owned возможностью.
- UI поддерживает только существующие protocol settings и не превращает инварианты Harness в toggles.
- MVP не вводит PM-сущности, собственную STEP state machine, hosted execution или автоматизацию TUI по терминальному тексту.

## Источники и traceability

Нормализованные контракты: [SPEC](requirements/SPEC.md). Архитектурные решения: [ADR](adr/README.md). Очерёдность работ: [PLAN](../planning/PLAN.md). Исходные product references остаются в `references/ui-prototype/` и прослеживаются из REQ.
