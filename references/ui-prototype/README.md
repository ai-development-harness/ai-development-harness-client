# AI Development Harness — Interactive UI Prototype

Откройте `index.html` в браузере. Внешних зависимостей нет.

Prototype хранится как обычные читаемые HTML/CSS/JS файлы. Он **не использует gzip/base64 payload, `DecompressionStream` или runtime reconstruction HTML**.

Это UX/UI reference **целевого клиента** AI Development Harness, а не отдельная реализация Harness protocol. Прототип может показывать Post-MVP surfaces; обязательный scope первой версии фиксирует `REQUIREMENTS.md`.

## Baseline

Reference синхронизирован с публичным Harness **v0.4.0** и визуальным языком текущего сайта AI Development Harness.

Ключевые возможности Harness v0.4.0, отражённые в интерфейсе:

- canonical namespaced command interface;
- deterministic CTS preflight через `validate-command.py`;
- explicit same-domain chains;
- universal `.project/local/execution/execution-status.json`;
- restart-safe resolver `RESUME | NEXT | DONE | BLOCKED | NOT_FOUND`;
- `STEP NEXT` с recovery незавершённых STEP executions;
- `STEP RUN STEP-NNN` как root orchestration;
- Plan status / revision / basis / planned-at;
- `execution.maxFixReviewCycles` — 1..5;
- `review.security` — `auto | always`;
- `review.tests` — `auto | always`;
- `skills.search.maxResults` — 1..10.

Protocol invariants не превращаются в toggles: mandatory independent review, PROJECT QUICK FIX safety boundary и запрет automatic merge/rebase остаются фиксированными правилами.

## Структура reference

```text
references/ui-prototype/
├── index.html
└── assets/
    ├── prototype.css
    ├── prototype.js
    └── execution-run-demo.js
```

Это намеренно обычный статический browser prototype: файлы можно читать и ревьюить напрямую в Git diff.

## Что есть в прототипе

- Open Project + validation states;
- Overview + корректная семантика `STEP NEXT` как рекомендации;
- Project / INIT, включая pre-INIT сценарий `PROJECT_BRIEF.local.md → PROJECT INIT → repository refresh`;
- deterministic command preflight / normalized chains;
- unresolved execution recovery через Harness Execution Status;
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
- `STEP RUN STEP-NNN` открывает интерактивный **Execution Run** с `executionId`, mode, root/current command и immutable `projectRoot + runtimeId`;
- Execution Run является projection над Harness Execution Status + runtime stream, а не отдельной state machine;
- demo различает Harness execution status, command result и runtime/UI state;
- в ходе demo runtime переходит в `waiting-for-input`, принимает structured clarification, продолжает тот же run, затем показывает native-style permission request;
- разрешение/отклонение влияет на продолжение run; успешный путь заканчивается deterministic verification, independent review и repository refresh;
- панель можно закрыть во время выполнения и открыть снова — demo run продолжает жить отдельно от текущего UI surface;
- Settings интерактивно обновляет manifest preview, RUN policy и Skills shortlist;
- Harness Updates демонстрирует `HARNESS UPDATE CHECK` / `HARNESS UPDATE APPLY` и matching-check handoff;
- Git Workspace показывает explicit chain `GIT CHECK > COMMIT > PUSH > PR`;
- Overview показывает recovery-state для interrupted STEP execution;
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
