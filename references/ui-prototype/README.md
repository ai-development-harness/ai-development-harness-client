# AI Development Harness — Full UI Prototype

Откройте `index.html` в браузере. Внешних зависимостей нет.

Это интерактивный UX-прототип клиента AI Development Harness, а не альтернативная реализация Harness.

## Что обновлено под текущую архитектуру

Прототип теперь начинается с реального lifecycle клиента:

1. npm-пакет предоставляет executable `harness-ui`.
2. Клиент может запускаться как `harness-ui`, `harness-ui .`, `harness-ui /path/to/project` или `harness-ui --project /path/to/project`.
3. Если project path не задан однозначно, пользователь выбирает локальный Harness repository.
4. Клиент детерминированно валидирует project context.
5. Выбранный repository становится `current project`.
6. Read-only/project views читают состояние из repository / Git projection layer.
7. Любая Harness command передаётся **явно выбранному runtime adapter** с `projectRoot` выбранного repository и explicit `runtimeId`.
8. Запущенный run сохраняет immutable snapshot `projectRoot + runtimeId`, даже если UI позже переключён на другой проект или runtime.

Без валидного current project Harness-команды заблокированы.

### Demo preview mode

Это интерактивный UX-макет, поэтому **все разделы интерфейса доступны для навигации даже без выбранного repository**. В этом состоянии отображаются демонстрационные данные и баннер `DEMO PREVIEW`.

Ограничение «без project context нельзя выполнять Harness command» относится только к command actions, а не к просмотру экранов прототипа.

## В прототипе есть

- стартовый `Open Harness project`;
- recent projects;
- validation states: valid / pre-INIT / not Harness;
- project switcher;
- explicit current repository path/branch;
- Command Palette (`Ctrl/Cmd + K`) с блокировкой команд без project context;
- immutable project context в run drawer;
- Overview;
- Project / INIT;
- Roadmap / STEP;
- Requirements;
- Architecture / ADR;
- Reviews;
- Audits / Reconcile;
- Releases;
- Skills;
- Git workspace;
- GitHub collaboration;
- Knowledge / raw source;
- Activity / Runs;
- Agents & Models;
- Policies & Settings.

См. `COVERAGE.md` для карты функционального покрытия.


## Синхронизация с актуальным Harness main

Reference обновлён по текущему `ai-development-harness-template/main`:

- локальные repository-wide preferences/aliases: `AGENTS.local.md`;
- Harness protocol version `1`, release `0.2.2`;
- maintenance commands `CHECK HARNESS UPDATE` и `UPDATE HARNESS`;
- `.project/harness-update.toml`, `.project/harness.lock.json`, `planning/harness-updates/`;
- core skill `update-harness`;
- agent role `harness_updater`;
- validator остаётся `tools/harness/validate.py`.

## UX additions

- глобальный быстрый переключатель UI locale (`ru`, `en`, `de` в прототипе);
- все blocked controls показывают причину блокировки и способ разблокировать при hover/focus;
- фильтры таблиц работают;
- фильтруемые списки/таблицы имеют объясняющее empty state;
- `UPDATE HARNESS` блокируется до успешного `CHECK HARNESS UPDATE`.


## Codex + Claude Code

Актуальный Harness поддерживает два first-class runtime adapter:

- **Codex** — `.codex/config.toml`, `.codex/agents/*.toml`;
- **Claude Code** — `CLAUDE.md`, `.claude/settings.json`, `.claude/agents/*.md`.

`CLAUDE.md` импортирует `@AGENTS.md`, поэтому канонический repository contract остаётся единым.

В `harness-ui` active runtime **не имеет значения по умолчанию**:

1. пользователь открывает Harness repository;
2. явно выбирает `Codex` или `Claude Code` в глобальном Runtime switcher;
3. только после этого Harness commands становятся исполнимыми.

Project switch сбрасывает runtime selection. Уже запущенный run хранит immutable snapshot `projectRoot + runtimeId`.

Наличие обоих adapter в repository или наличие установленного executable на host **не является согласием пользователя на выбор runtime**. Автоматический fallback с одного runtime на другой запрещён.


## Harness main baseline

Последняя сверка этого reference-комплекта выполнена с `ai-development-harness/ai-development-harness-template/main`.

На момент сверки manifest содержит `harness.version = "1"` и `harness.release = "0.2.2"`. Integrity policy требует оба adapter layer: `CLAUDE.md` / `.claude/*` для Claude Code и `.codex/*` для Codex.
