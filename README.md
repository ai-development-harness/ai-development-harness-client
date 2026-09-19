<!-- PROJECT:START -->
# AI Development Harness Client

Локальный browser-first клиент для работы с AI Development Harness через графический интерфейс. Repository и Harness protocol остаются источником истины: клиент читает их проекции и запускает канонические команды через явно выбранный runtime.

Проект находится на стадии формирования MVP. Рекомендуемая следующая команда: `STEP NEXT`.

Подробнее: [проект](docs/PROJECT.md), [требования](docs/requirements/SPEC.md), [архитектура](docs/architecture.md), [roadmap](planning/PLAN.md).
<!-- PROJECT:END -->

## Runtime adapters

Harness protocol не привязан к одной модели или одному coding agent:

- Codex: `.codex/config.toml` + `.codex/agents/*.toml`;
- Claude Code: `CLAUDE.md` + `.claude/settings.json` + `.claude/agents/*.md`.

`AGENTS.md`, execution protocol, REQ/ADR/STEP и `.agents/skills/` остаются общими источниками истины.

## Документация Harness

- [Начало работы](docs/harness/GETTING_STARTED.md)
- [Как устроена документация и связи REQ / ADR / STEP / PLAN / STATUS](docs/harness/DOCUMENT_MODEL.md)
- [Глоссарий терминов Harness](docs/harness/GLOSSARY.md)
- [Структура репозитория](docs/harness/REPOSITORY_LAYOUT.md)
- [Команды](docs/harness/COMMANDS.md)
- [Execution Protocol](planning/EXECUTION_PROTOCOL.md)
- [Обновление Harness в существующем проекте](docs/harness/UPDATES.md)
- [Агенты, модели и reasoning effort](docs/harness/AGENT_CONFIGURATION.md)
- [Claude Code adapter](docs/harness/CLAUDE_CODE.md)
- [Git workflow: GIT CHECK / GIT COMMIT / GIT PUSH / GIT PR / GIT SYNC](docs/harness/GIT_WORKFLOW.md)
- [CI и Harness Integrity](docs/harness/CI.md)
- [Skills: SKILL FIND / SKILL INSTALL / SKILL CREATE](docs/harness/SKILL_MANAGEMENT.md)
- [Синтаксис команд и цепочек](docs/harness/COMMAND_SYNTAX.md)
- [Таблица допустимых переходов команд](docs/harness/COMMAND_TRANSITIONS.md)
- [Полное оглавление документации Harness](docs/harness/README.md)
