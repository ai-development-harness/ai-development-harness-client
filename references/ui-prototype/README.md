# AI Development Harness — Interactive UI Prototype

Откройте `index.html` в браузере. Внешних зависимостей нет.

Это UX/UI reference **целевого клиента** AI Development Harness, а не отдельная реализация Harness protocol. Прототип может показывать Post-MVP surfaces; обязательный scope первой версии фиксирует `REQUIREMENTS.md`.

## Baseline

Reference синхронизирован с публичным Harness **v0.3.0** и визуальным языком текущего сайта AI Development Harness.

Ключевые v0.3.0 настройки, отражённые в интерфейсе:

- `execution.maxFixReviewCycles` — 1..5;
- `review.security` — `auto | always`;
- `review.tests` — `auto | always`;
- `skills.search.maxResults` — 1..10.

Protocol invariants не превращаются в toggles: mandatory independent review, QUICK FIX safety boundary и запрет automatic merge/rebase остаются фиксированными правилами.

## Что есть в прототипе

- Open Project + validation states;
- Overview + корректная семантика `NEXT STEP` как рекомендации;
- Project / INIT, включая pre-INIT сценарий `PROJECT_BRIEF.local.md → INIT PROJECT → repository refresh`;
- Roadmap / STEP;
- STEP Detail с Contract / Plan / Evidence / Review / History;
- Requirements;
- Architecture / ADR;
- Reviews & findings;
- Audits / Reconcile;
- Releases;
- Skills;
- Git workspace;
- GitHub collaboration;
- Knowledge / raw source;
- Activity / Runs как client-owned projection;
- Agents & Models;
- Harness Updates;
- Policies & Settings;
- Command Palette (`Ctrl/Cmd + K`);
- explicit Runtime switcher `Codex / Claude Code / None`;
- dark/light theme.

## Визуальное направление

Prototype использует semantic tokens сайта:

- dark navy background;
- cyan → blue → violet accent;
- тонкие blue borders;
- grid background;
- translucent cards;
- радиусы 12 / 18 / 26 px;
- тот же mark/logo language;
- светлая тема строится на тех же semantic tokens.

## Interaction notes

Это демонстрационный prototype:

- команды не запускают реальные runtime adapters;
- кнопки Harness command показывают preview / toast;
- `RUN STEP` открывает интерактивный **Execution Run** с immutable `projectRoot + runtimeId`;
- Execution Run демонстрирует incremental output, structured Harness phases и правило «текст модели ≠ protocol state»;
- в ходе demo runtime переходит в `waiting-for-input`, принимает structured clarification, продолжает тот же run, затем показывает native-style permission request;
- разрешение/отклонение влияет на продолжение run; успешный путь заканчивается deterministic verification, independent review и repository refresh;
- панель можно закрыть во время выполнения и открыть снова — demo run продолжает жить отдельно от текущего UI surface;
- Settings интерактивно обновляет manifest preview, RUN policy и Skills shortlist;
- Harness Updates демонстрирует read-only CHECK flow;
- таблица Roadmap фильтруется;
- STEP tabs переключаются;
- Command Palette работает с клавиатуры;
- при runtime=`None` command actions показывают blocker.

## Источники истины

При расхождении:

```text
Harness protocol / requirements / Accepted ADR
    > interactive prototype
    > visual experiments
```

Продуктовый brief: [`BRIEF.md`](BRIEF.md).
Требования и scope MVP: [`REQUIREMENTS.md`](REQUIREMENTS.md).
Функциональное покрытие: [`COVERAGE.md`](COVERAGE.md).
