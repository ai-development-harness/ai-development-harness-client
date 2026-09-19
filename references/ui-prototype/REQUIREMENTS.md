# AI Development Harness Client — Product Requirements

> Этот документ фиксирует требования к клиенту и этапы их реализации.
>
> Это **reference requirements** для продукта Client, а не канонический `docs/requirements/SPEC.md` Harness-проекта. Поэтому используются отдельные идентификаторы `CLIENT-REQ-NNN`, чтобы не смешивать их с REQ, которые создаёт `PROJECT INIT`.

## 1. Этапы

### MVP

Первая версия должна позволять пройти через клиент основной жизненный цикл Harness-проекта:

```text
Open repository
→ pre-INIT validation
→ create/edit PROJECT_BRIEF.local.md
→ select runtime
→ GIT PROJECT INIT
→ Overview
→ STEP NEXT
→ STEP Detail
→ STEP RUN STEP-NNN
→ Review / Evidence
→ GIT CHECK
→ GIT COMMIT
→ GIT PUSH
→ GIT PR
```

Обязательные этапы этого сценария не должны требовать внешнего терминала.

### Post-MVP

Функции, которые улучшают наблюдаемость, аналитику и удобство, но не нужны для корректного основного Harness lifecycle:

- Activity / Runs;
- local execution telemetry;
- runtime/model provenance;
- analytics по runtime/model;
- отдельный GitHub Collaboration screen;
- полноценная light theme;
- английская локализация;
- live repository watcher.

### Architectural reserve

Архитектура должна не блокировать будущие:

- hosted UI;
- secure local bridge;
- remote pairing;
- выполнение на локальной машине при удалённом UI.

---

# 2. Основные принципы

## CLIENT-REQ-001 — Repository остаётся source of truth

Клиент должен использовать выбранный Harness repository как канонический источник REQ, ADR, STEP, evidence, reviews, audits, release reports, policies и Git state.

**Acceptance**

- после повторного открытия состояние восстанавливается из repository artifacts;
- удаление client cache не повреждает каноническое состояние;
- client-owned данные явно отделены от Harness artifacts.

**Stage:** MVP

---

## CLIENT-REQ-002 — Клиент не реализует второй orchestration

Клиент должен использовать canonical Harness command surface и существующее Harness tooling, а не воспроизводить command semantics, CTS или execution recovery самостоятельно.

Базовый путь выполнения:

```text
raw command
→ Harness deterministic preflight
→ Execution Status registration / resolve
→ runtime adapter
→ Codex App Server / Claude Agent SDK
```

**Acceptance**

- `STEP RUN STEP-NNN` остаётся Harness orchestration command;
- transition graph не дублируется в TypeScript/React;
- UI визуализирует Harness Execution Status и runtime events, но не является источником их семантики;
- изменение `.project/command-transitions.json` не требует ручного обновления client-side transition matrix.

**Stage:** MVP

---

# 3. Открытие и инициализация проекта

## CLIENT-REQ-003 — Выбор repository

Клиент должен поддерживать:

```text
harness-ui
harness-ui .
harness-ui /path/to/project
harness-ui --project /path/to/project
```

Если project path не задан однозначно, пользователь выбирает локальный repository через UI.

**Stage:** MVP

---

## CLIENT-REQ-004 — Валидация repository

Клиент должен различать:

1. initialized Harness project;
2. valid pre-INIT Harness project;
3. ordinary Git repository / Harness not found;
4. invalid or damaged Harness project.

Для blocked/invalid state показывается конкретная причина.

**Stage:** MVP

---

## CLIENT-REQ-005 — Переключение проекта

Пользователь должен иметь возможность переключить current project.

При project switch:

- новый `projectRoot` становится текущим;
- selected runtime сбрасывается;
- уже запущенный run сохраняет исходный context.

**Stage:** MVP

---

## CLIENT-REQ-006 — PROJECT_BRIEF.local.md через UI

Для pre-INIT project клиент должен позволять:

- создать `PROJECT_BRIEF.local.md`, если он отсутствует;
- редактировать содержимое;
- сохранить локально;
- видеть template/help по структуре brief;
- видеть явную отметку `local-only`;
- открыть raw source.

Клиент не должен переносить содержимое brief во внутреннюю БД как новый source of truth.

**Stage:** MVP

---

## CLIENT-REQ-007 — PROJECT INIT через UI

Клиент должен поддерживать полный запуск `PROJECT INIT` без внешнего терминала.

Flow:

1. открыть pre-INIT repository;
2. проверить `project.initialized: false`;
3. проверить/создать `PROJECT_BRIEF.local.md`;
4. выбрать runtime;
5. запустить каноническую команду `PROJECT INIT`;
6. отобразить execution state и итог;
7. после success перечитать repository;
8. подтвердить `project.initialized: true`;
9. показать созданные PROJECT / REQ / ADR / STEP;
10. перейти в обычный initialized-project UI.

Клиент не генерирует REQ/ADR/STEP самостоятельно вместо Harness.

**Stage:** MVP

---

## CLIENT-REQ-008 — Защита от повторного INIT

При `project.initialized: true` обычный `PROJECT INIT` не должен предлагаться как стандартное действие.

UI должен направлять пользователя к `PROJECT RECONCILE`, если нет явного destructive re-initialization intent.

**Stage:** MVP

---

# 4. Runtime adapters

## CLIENT-REQ-009 — Multi-runtime model

MVP должен поддерживать first-class adapters:

- Codex;
- Claude Code.

Domain model клиента не должен зависеть от конкретного runtime.

**Stage:** MVP

---

## CLIENT-REQ-010 — Explicit runtime selection

После открытия/переключения проекта:

```text
runtime = none
```

Команды, требующие runtime, заблокированы до explicit selection.

**Stage:** MVP

---

## CLIENT-REQ-011 — Нет automatic fallback

Ошибка выбранного runtime не должна приводить к автоматическому запуску другого runtime.

**Stage:** MVP

---

## CLIENT-REQ-012 — Immutable execution context

При запуске операции фиксируются:

```text
projectRoot
runtimeId
executionId
rootCommand
```

`executionId` и command state принадлежат Harness Execution Status; `projectRoot + runtimeId` фиксируются client/runtime layer.

Последующее переключение project/runtime не меняет context уже запущенной execution.

Harness Execution Status runtime-agnostic. Для бесшовного reattach клиент может хранить минимальную local-only binding `executionId → runtimeId / runtimeSessionId`; это не Activity analytics и не canonical Harness state. Если binding после restart недоступна, UI требует новый explicit runtime selection и не применяет automatic fallback.

**Stage:** MVP

---

# 5. Основные экраны MVP

## CLIENT-REQ-013 — MVP navigation

В MVP должны быть доступны:

1. Open Project
2. Overview
3. Project / INIT
4. Roadmap / STEP
5. STEP Detail
6. Requirements
7. Architecture / ADR
8. Knowledge / Project Files
9. Reviews & Findings
10. Audits / Reconcile
11. Releases
12. Skills
13. Git Workspace
14. Agents & Models
15. Harness Updates
16. Policies & Settings
17. Global Command Palette

Отдельные Activity / Runs и GitHub Collaboration screens не являются blocker MVP.

**Stage:** MVP

---

# 6. Overview и STEP NEXT

## CLIENT-REQ-014 — Overview

Overview должен показывать минимум:

- current project;
- branch;
- Harness release;
- selected runtime;
- repository validity;
- STEP summary;
- blockers;
- unresolved findings;
- Git state;
- Harness update state;
- STEP NEXT recommendation.

**Stage:** MVP

---

## CLIENT-REQ-015 — STEP NEXT остаётся рекомендацией и учитывает recovery

UI не должен интерпретировать `STEP NEXT` как global execution lock.

Перед выбором нового STEP команда `STEP NEXT` учитывает unresolved executions через Harness resolver:

```text
resolve unresolved STEP executions
→ если есть interrupted STEP work: вернуть exact resume command
→ иначе выбрать следующий executable STEP
```

Если unresolved STEP executions несколько, UI должен позволить показать их все, сохранив один primary recommendation Harness.

Пользователь по-прежнему может явно запускать независимые Project / Git / Harness commands; CTS не задаёт глобальный порядок отдельных invocations.

**Stage:** MVP

---

# 7. STEP

## CLIENT-REQ-016 — Канонические поля STEP

Клиент отображает фактический task contract, включая:

- Status;
- Type;
- Priority;
- Phase;
- Depends on;
- Requirements;
- ADR;
- Risk flags;
- Goal;
- Context;
- Scope;
- Mutation policy;
- Out of scope;
- Acceptance criteria;
- Verification;
- Deliverables;
- Implementation plan;
- Plan status;
- Plan revision;
- Plan basis;
- Planned at;
- Evidence;
- Review status;
- Blocker / Failure reason.

`Plan basis` используется Harness для deterministic проверки актуальности плана относительно текущего STEP contract.

**Stage:** MVP

---

## CLIENT-REQ-017 — STEP Detail

Минимальные представления:

- Contract;
- Plan;
- Evidence;
- Review;
- History;
- Raw source.

Во вкладке Plan UI должен различать минимум:

```text
Not planned
Ready / current
Stale relative to current STEP contract
```

Для stale plan пользователь получает точную canonical action `STEP PLAN STEP-NNN`.

History в MVP может строиться из repository artifacts и Harness Execution Status без отдельного client telemetry store.

**Stage:** MVP

---

## CLIENT-REQ-018 — STEP commands

Клиент должен позволять запускать применимые canonical commands:

```text
STEP PLAN STEP-NNN
STEP IMPLEMENT STEP-NNN
STEP REVIEW STEP-NNN
STEP FIX STEP-NNN
STEP RUN STEP-NNN
STEP AUDIT STEP-NNN
```

Также generic command surface должен поддерживать `STEP ADD:` и `STEP NEXT`.

Blocked action объясняет причину и способ разблокировки.

**Stage:** MVP

---

# 8. Requirements / ADR / Knowledge

## CLIENT-REQ-019 — Structured read views

Клиент должен отображать REQ, REQ status, traceability, ADR и связанные STEP, сохраняя доступ к raw Markdown.

Редактирование продуктовых контрактов не обязано реализовываться отдельным rich editor, если тот же результат корректно достигается Harness command.

**Stage:** MVP

---

# 9. Reviews и RUN policy

## CLIENT-REQ-020 — Independent review нельзя отключить

UI не должен предоставлять настройку отключения обязательного independent review.

**Stage:** MVP

---

## CLIENT-REQ-021 — Specialized reviewer policy

Клиент должен поддерживать:

```yaml
review:
  security: auto | always
  tests: auto | always
```

`never` не предлагается.

**Stage:** MVP

---

## CLIENT-REQ-022 — Review reports

Клиент должен отображать immutable review reports:

- verdict;
- reviewed revision;
- findings;
- severity;
- location;
- scenario;
- impact;
- verification observations;
- specialized reviews;
- rationale.

**Stage:** MVP

---

## CLIENT-REQ-023 — maxFixReviewCycles

Клиент должен поддерживать:

```yaml
execution:
  maxFixReviewCycles: N
```

где `1 <= N <= 5`.

Невалидное значение = configuration blocker, без скрытого fallback.

**Stage:** MVP

---

## CLIENT-REQ-024 — STEP RUN flow

UI должен визуализировать фактическую orchestration semantics Harness v0.4.0.

Root execution:

```text
STEP RUN STEP-NNN
```

Canonical child transitions для coding flow используют CTS:

```text
STEP PLAN STEP-NNN
  --SUCCESS-->
STEP IMPLEMENT STEP-NNN
  --SUCCESS-->
STEP REVIEW STEP-NNN
  --FAIL-->
STEP FIX STEP-NNN
  --SUCCESS-->
STEP REVIEW STEP-NNN
```

`VERIFY` и `CLOSE` не должны изображаться как отдельные canonical Harness commands. Verification показывается как runtime/deterministic activity, а finalization после REVIEW PASS остаётся частью root `STEP RUN STEP-NNN`.

Исчерпание `execution.maxFixReviewCycles` не отображается как success.

**Stage:** MVP

---

# 10. Skills

## CLIENT-REQ-025 — SKILL FIND maxResults

Поддерживается:

```yaml
skills:
  search:
    maxResults: N
```

где `1 <= N <= 10`.

**Stage:** MVP

---

## CLIENT-REQ-026 — FIND и INSTALL разделены

```text
SKILL FIND
→ candidates
→ inspect
→ explicit selection
→ SKILL INSTALL
```

Поиск не устанавливает skill автоматически.

**Stage:** MVP

---

## CLIENT-REQ-027 — Third-party skill provenance

Для внешнего skill показываются доступные:

- source/repository;
- path;
- ref/commit;
- license;
- provenance;
- safety notes.

**Stage:** MVP

---

# 11. AUDIT / RECONCILE / Releases

## CLIENT-REQ-028 — STEP AUDIT и PROJECT RECONCILE различаются

UI должен сохранять отдельную семантику:

- `STEP AUDIT STEP-NNN` — bounded scope;
- `PROJECT RECONCILE` — project-wide reconciliation.

Обе команды standalone-only и не объединяются в chain с mutation flow.

**Stage:** MVP

---

## CLIENT-REQ-029 — Release reports

Клиент должен позволять запускать `RELEASE CHECK` и отображать созданный report/blockers.

Отдельная release-management subsystem не требуется для MVP.

**Stage:** MVP

---

# 12. Harness Updates

## CLIENT-REQ-030 — Harness Updates screen

Клиент должен иметь отдельный surface для canonical commands:

```text
HARNESS UPDATE CHECK [TO <tag>]
HARNESS UPDATE APPLY [TO <tag>]
HARNESS UPDATE CHECK [TO <tag>] > APPLY
```

**Stage:** MVP

---

## CLIENT-REQ-031 — HARNESS UPDATE APPLY только после matching CHECK

`HARNESS UPDATE APPLY [TO <tag>]` использует matching успешный `HARNESS UPDATE CHECK` только когда Harness Execution Status подтверждает актуальный handoff для того же target / route / lock.

Если matching CHECK отсутствует или stale, Harness выполняет fresh read-only CHECK до mutation.

Client не создаёт отдельный update-state файл для этой семантики.

**Stage:** MVP

---

## CLIENT-REQ-032 — Update plan

UI показывает:

- current release;
- target;
- route;
- standard / bridge transitions;
- reload requirement;
- introduced/retired managed paths;
- ownership changes;
- blockers;
- post-update handoff.

**Stage:** MVP

---

# 13. Policies & Settings

## CLIENT-REQ-033 — Только реальные settings

UI редактирует только реально поддерживаемые Harness/project settings.

Минимум:

```text
execution.maxFixReviewCycles
review.security
review.tests
skills.search.maxResults
language.*
```

а также допустимые параметры `git-policy.toml` и `harness-policy.toml`.

**Stage:** MVP

---

## CLIENT-REQ-034 — Protocol invariants не становятся toggles

Не показывать configurable controls для:

- mandatory independent review;
- force push;
- automatic merge/rebase;
- PROJECT QUICK FIX safety boundary;
- immutable release tags;
- количества primary results команды STEP NEXT.

**Stage:** MVP

---

# 14. Git

## CLIENT-REQ-035 — Git Workspace

Показывать:

- branch;
- protected status;
- upstream;
- ahead / behind / diverged;
- staged / unstaged / untracked;
- Harness validation;
- blockers.

**Stage:** MVP

---

## CLIENT-REQ-036 — Git commands

Поддерживать canonical commands:

```text
GIT CHECK
GIT COMMIT
GIT COMMIT: <optional hint>
GIT PUSH
GIT PR
GIT SYNC
```

И explicit publication chains, разрешённые CTS, например:

```text
GIT CHECK > COMMIT > PUSH > PR
```

**Stage:** MVP

---

## CLIENT-REQ-037 — Unsafe Git shortcuts запрещены

UI не предлагает force push, automatic merge или automatic rebase как обычные project settings/actions.

**Stage:** MVP

---

# 15. Agents & Models

## CLIENT-REQ-038 — Runtime-specific configuration

Показывать adapter-specific configuration:

### Codex

```text
.codex/config.toml
.codex/agents/*.toml
```

### Claude Code

```text
CLAUDE.md
.claude/settings.json
.claude/agents/*.md
```

**Stage:** MVP

---

## CLIENT-REQ-039 — Role и model разделены

`planner`, `implementer`, `reviewer` и т. п. — Harness roles.

Model / effort / permissions — runtime configuration.

**Stage:** MVP

---

# 16. Command Palette

## CLIENT-REQ-040 — Global Command Palette

Клиент должен предоставлять keyboard-driven Command Palette для canonical Harness commands и explicit command chains.

Command Palette должна:

- принимать raw canonical input;
- показывать результат deterministic preflight до dispatch;
- показывать normalized commands / chain;
- не отправлять structurally invalid input в runtime.

**Stage:** MVP

---

## CLIENT-REQ-041 — Forward compatibility commands

Command без специализированного UI должен оставаться запускаемым generic способом, если он присутствует в текущем Harness command surface.

Клиент не должен поддерживать статический собственный список semantics как единственный источник истины; source command metadata и structural validation берутся из Harness protocol layer текущего repository.

**Stage:** MVP

---

# 17. Accessibility / Visual system / Localization

## CLIENT-REQ-042 — Accessibility baseline

MVP должен обеспечивать:

- keyboard navigation;
- visible focus;
- usable contrast;
- aria labels для icon-only controls;
- reduced motion;
- blocked reason через focus, а не только hover;
- keyboard-accessible dialogs / Command Palette.

**Stage:** MVP

---

## CLIENT-REQ-043 — Visual language сайта

Клиент должен использовать semantic visual language AI Development Harness website:

```text
background      #050b14
surface         #0b1726
surface-hover   #101f31
text            #f5f7fb
text-secondary  #a7b4c5
text-muted      #718198
cyan            #00d7f5
blue            #2585ff
violet          #8a52ff
success         #30d890
warning         #ffb84a
error           #ff5364
```

Dark theme обязательна для MVP.

**Stage:** MVP

---

## CLIENT-REQ-044 — Localization-ready architecture

Архитектура локализации должна существовать с MVP, чтобы UI strings не были размазаны hardcoded по компонентам.

Русский UI обязателен для MVP.

Полная английская локализация — Post-MVP.

**Stage:** MVP / Post-MVP

---

# 18. Архитектура клиента

## CLIENT-REQ-045 — React / TypeScript / Nx

Клиент строится как browser-first React + TypeScript application в Nx workspace.

**Stage:** MVP

---

## CLIENT-REQ-046 — ClientApi boundary

```text
React UI
    ↓
ClientApi
    ↓
transport
    ↓
local application service
    ↓
filesystem / Git / runtime adapters
```

Frontend domain layer не должен напрямую зависеть от filesystem/process execution.

**Stage:** MVP

---

## CLIENT-REQ-047 — Replaceable transport

Transport не должен быть жёстко зашит в конкретный localhost endpoint.

**Stage:** MVP

---

## CLIENT-REQ-048 — Local application service

Local service обеспечивает необходимые filesystem, Git и runtime operations.

**Stage:** MVP

---

# 19. Post-MVP: Activity / Runs и execution provenance

## CLIENT-REQ-049 — Activity является client-owned и отделена от Execution Status

Activity / Runs не является canonical Harness state и не заменяет:

```text
.project/local/execution/execution-status.json
```

Harness Execution Status — MVP operational recovery state.

Client Activity — Post-MVP observability / analytics layer.

Удаление Activity не должно повреждать STEP/review/evidence или restart-safe Harness execution recovery.

**Stage:** Post-MVP

---

## CLIENT-REQ-050 — Local JSONL storage

Предпочтительное хранение:

```text
.project/local/activity/
├── 2026-09-18.jsonl
├── 2026-09-19.jsonl
└── ...
```

Файлы не коммитятся.

**Stage:** Post-MVP

---

## CLIENT-REQ-051 — Runtime/client telemetry

Execution metadata должен собирать client/runtime layer, а не агент через self-report.

Источники:

```text
Harness → command / STEP / role
Runtime adapter → session / model / effort / usage
Client → timestamps / duration / result
```

**Stage:** Post-MVP

---

## CLIENT-REQ-052 — Execution provenance

Если runtime предоставляет данные, сохранять:

- runtime;
- session/thread identifier;
- role;
- command;
- STEP;
- requested model;
- resolved model;
- reasoning/effort;
- result;
- related artifacts.

Неизвестные значения не угадывать.

**Stage:** Post-MVP

---

## CLIENT-REQ-053 — Activity privacy boundary

Activity не должна автоматически сохранять:

- hidden chain of thought;
- полный context window;
- произвольные секреты;
- полный prompt без отдельной необходимости.

**Stage:** Post-MVP

---

## CLIENT-REQ-054 — Activity analytics

Клиент может агрегировать:

- runs by runtime/model;
- PASS / FAIL;
- review findings;
- FIX cycles;
- first-review PASS;
- duration;
- runtime/model usage.

Такая аналитика не является Harness verdict и не должна автоматически объявлять одну модель «лучше» другой.

**Stage:** Post-MVP

---

## CLIENT-REQ-055 — Activity retention

Если появится retention policy, это client setting, а не Harness protocol setting.

**Stage:** Post-MVP

---

# 20. Post-MVP UX

## CLIENT-REQ-056 — GitHub Collaboration screen

Отдельный экран может отображать PR, CI/checks, GitHub review status, templates/issues и связи STEP ↔ PR.

Команда `GIT PR` при этом уже должна работать в MVP.

**Stage:** Post-MVP

---

## CLIENT-REQ-057 — Full light theme

Полноценная light theme строится через те же semantic tokens.

**Stage:** Post-MVP

---

## CLIENT-REQ-058 — Live repository observation

File watcher / Git events могут обновлять projections и runtime availability без manual refresh.

**Stage:** Post-MVP

---

# 21. Architectural reserve

## CLIENT-REQ-059 — Hosted UI without cloud execution

Архитектура должна допускать:

```text
Hosted UI
    ↓ secure connection
Local bridge
    ↓
Local repository / Git / runtimes
```

без обязательной загрузки проекта в облако.

**Stage:** Architectural reserve

---

## CLIENT-REQ-060 — Secure local bridge

Будущий bridge должен предусматривать:

- explicit pairing;
- authentication;
- origin allowlist;
- CSRF protection;
- short-lived credentials;
- revoke;
- capability allowlist;
- отсутствие arbitrary shell API.

**Stage:** Architectural reserve

---

# 22. Постоянный out of scope

## CLIENT-REQ-061 — Не вводить чужую PM-модель

Без отдельного изменения Harness domain model клиент не должен вводить как canonical entities:

- Sprint;
- Milestone;
- Assignee;
- Team;
- Story points;
- Kanban columns;
- percentage progress;
- Deadline;
- Time estimate;
- Project health score.

---

## CLIENT-REQ-062 — Не создавать собственную STEP state machine

STEP lifecycle определяется Harness protocol.

Клиент не создаёт альтернативные statuses/transitions.

---

# 23. MVP: выполнение команд в реальном времени

## CLIENT-REQ-063 — Live execution surface

Любая Harness-команда, выполняемая через runtime adapter, должна иметь единый live execution surface.

Execution surface является **client projection** над:

```text
Harness Execution Status
+
runtime event stream
+
repository projections
```

и не создаёт параллельный canonical execution store.

Минимально показываются:

- `executionId`;
- execution `mode` (`single | chain | orchestration`);
- `rootCommand`;
- `current.command`;
- current attempt;
- Harness execution status;
- command result, если он уже известен;
- runtime/UI connection state;
- elapsed time;
- model/runtime output;
- errors / blockers;
- final result.

Harness execution status и command result показываются отдельно от runtime/UI state.

**Stage:** MVP

---

## CLIENT-REQ-064 — Incremental output

Runtime output должен поступать в UI по мере выполнения, а не только после завершения команды.

Frontend contract должен позволять концептуально:

```text
start run
subscribe to run events
send input when requested
cancel when supported
reconnect to active run
```

Конкретный transport — SSE, WebSocket или иной механизм — этим требованием не фиксируется и остаётся заменяемым за `ClientApi`.

**Stage:** MVP

---

## CLIENT-REQ-065 — Normalized runtime events

Codex и Claude Code могут предоставлять runtime output разными способами.

Runtime adapter должен переводить доступные данные в общий клиентский поток событий.

Минимальное ядро:

```text
run.started
output.delta
output.message
interaction.required
run.completed
run.failed
run.blocked
run.cancelled
```

Дополнительные структурированные runtime events допустимы, например:

```text
activity.started
activity.completed
artifact.changed
verification.result
```

Runtime event stream не является заменой Harness Execution Status и не может самостоятельно переопределять CTS transition, `rootCommand`, `current.command` или command result.

Клиент не обязан превращать каждую строку stdout/stderr в искусственно структурированное событие.

**Stage:** MVP

---

## CLIENT-REQ-066 — Free-form output не является protocol state

Клиент не должен выводить Harness protocol state из свободного текста модели.

Например фраза модели:

```text
Теперь выполняю review...
```

не является достаточным основанием считать REVIEW текущим состоянием protocol.

Источниками структурированного состояния могут быть только:

- Harness repository artifacts;
- deterministic tooling;
- structured runtime events;
- данные runtime adapter с определённой семантикой.

Если доступен только текстовый output, UI отображает его как текст, не превращая в protocol transition.

**Stage:** MVP

---

## CLIENT-REQ-067 — Safe model output rendering

Model/runtime output должен отображаться как недоверенный пользовательский контент.

MVP должен поддерживать минимум:

- incremental text;
- Markdown;
- lists;
- tables;
- links;
- inline code;
- code blocks;
- syntax highlighting.

При этом:

- произвольный HTML не исполняется;
- scripts не исполняются;
- output санитизируется;
- ANSI / terminal control sequences не получают возможность управлять browser UI.

**Stage:** MVP

---

## CLIENT-REQ-068 — Interactive run

Если runtime требует решения пользователя, текущий run может перейти в:

```text
waiting-for-input
```

Клиент должен позволять продолжить тот же run через runtime adapter.

Для MVP достаточно типов взаимодействия:

- free-form text;
- confirmation / explicit choice.

Если runtime поддерживает cancellation, UI предоставляет явное действие Cancel.

Interactive input не создаёт отдельную orchestration-систему клиента и не изменяет Harness protocol semantics.

**Stage:** MVP

---

## CLIENT-REQ-069 — Execution переживает navigation и session interruption

Активная execution не должна принадлежать жизненному циклу React-компонента.

Переход между экранами не останавливает выполнение.

После UI reload / local service restart / runtime session interruption клиент должен использовать Harness Execution Status и resolver, чтобы показать фактическое состояние:

```text
RESUME
NEXT
DONE
BLOCKED
NOT_FOUND
```

и exact `command`, если resolver её возвращает.

Может существовать несколько unresolved executions одновременно; новая независимая command не должна скрывать старую interrupted execution.

Долговременная analytics/history Activity этим требованием не вводится.

**Stage:** MVP

---

## CLIENT-REQ-070 — Repository refresh after mutation

После успешного завершения команды, способной изменить repository, клиент должен перечитать затронутые repository projections и Git state.

Примеры:

```text
PROJECT INIT
STEP IMPLEMENT STEP-NNN
STEP FIX STEP-NNN
STEP RUN STEP-NNN
PROJECT QUICK FIX: <input>
HARNESS UPDATE APPLY [TO <tag>]
```

Model output не является доказательством фактического изменения repository.

UI должен строить итоговое состояние из реальных файлов, Harness artifacts, Execution Status, Git state и deterministic outputs после завершения mutation.

**Stage:** MVP

---

## CLIENT-REQ-071 — Официальный runtime integration surface

Runtime adapter должен использовать официальный программный integration surface runtime, если такой интерфейс существует и покрывает требуемый сценарий.

Для текущих first-class runtime базовый путь интеграции:

```text
Codex       → Codex App Server
Claude Code → Claude Agent SDK
```

Интерактивная TUI не должна автоматизироваться через распознавание терминального вывода, ANSI-последовательностей, псевдотерминал или эвристический парсинг prompt text как основной production integration path.

Официальный integration surface должен использоваться для доступных возможностей, включая:

- streaming output;
- structured runtime events;
- user-input requests;
- approval / permission requests;
- продолжение той же session / turn после ответа;
- cancellation / interruption, если runtime это поддерживает.

Если конкретная возможность отсутствует в официальном API, adapter может иметь ограниченный fallback, но:

- fallback не должен подменять structured semantics эвристическим разбором свободного текста;
- ограничение должно быть явно отражено в capability model runtime adapter;
- UI не должен обещать возможность, которую выбранный adapter достоверно не поддерживает.

**Stage:** MVP

---


## CLIENT-REQ-072 — Deterministic command preflight / CTS

До runtime dispatch любой canonical command или chain должен пройти Harness structural validation текущего repository.

Canonical flow:

```text
tokenize
→ normalize
→ transition-table
→ runtime-preconditions
→ dispatch
```

Для structural validation local application service использует Harness tooling, включая `tools/harness/validate-command.py --json`, и не копирует transition graph в клиент.

При structural error, например `INVALID_CHAIN`:

- runtime не запускается;
- ни один segment chain не выполняется;
- mutation не начинается;
- UI показывает stable error code и причину.

**Stage:** MVP

---

## CLIENT-REQ-073 — Explicit chain execution and visualization

Клиент должен поддерживать explicit chains, разрешённые текущим CTS, например:

```text
GIT CHECK > COMMIT > PUSH > PR
STEP PLAN STEP-NNN > IMPLEMENT > REVIEW
STEP REVIEW STEP-NNN > FIX > REVIEW
HARNESS UPDATE CHECK TO <tag> > APPLY
```

UI показывает:

- normalized sequence;
- current segment;
- result завершённых segments;
- remaining segments;
- `NOT_EXECUTED` segments;
- runtime precondition blockers.

`FAIL` не является универсальным terminal error: например edge `STEP REVIEW --FAIL--> STEP FIX` является допустимым CTS transition.

Cross-domain chains и standalone-only commands не должны предлагаться как valid chain.

**Stage:** MVP

---

## CLIENT-REQ-074 — Harness Execution Status / restart-safe recovery

Клиент должен использовать Harness operational state:

```text
.project/local/execution/execution-status.json
```

и resolver:

```text
tools/harness/resolve-next-command.py --json
```

для restart-safe execution recovery.

UI должен корректно представлять:

```text
execution mode: single | chain | orchestration
execution status: running | complete | blocked
command result: SUCCESS | PASS | FAIL | BLOCKED
resolver status: RESUME | NEXT | DONE | BLOCKED | NOT_FOUND
```

Повторный явный запуск той же running root command должен отображаться как resume существующей execution, а не как новая параллельная execution.

Поскольку Execution Status не хранит runtime identity, automatic reattach использует client-owned local binding, если она доступна. При её отсутствии пользователь явно выбирает runtime перед resume.

Execution Status является operational state Harness и не является Activity analytics или product evidence.

**Stage:** MVP

---

# 24. Критерий готовности MVP

MVP считается готовым, когда новый пользователь способен через клиент выполнить полный путь:

```text
harness-ui .
        ↓
Open / validate repository
        ↓
Pre-INIT project
        ↓
Create / edit PROJECT_BRIEF.local.md
        ↓
Select Codex / Claude Code
        ↓
PROJECT INIT
        ↓
Repository refresh
        ↓
project.initialized = true
        ↓
Overview / STEP NEXT
        ↓
STEP Detail
        ↓
STEP RUN STEP-NNN
        ↓
Review / Evidence
        ↓
GIT CHECK > COMMIT > PUSH > PR
```

После `PROJECT INIT` клиент без перезапуска должен:

- перечитать repository;
- увидеть `project.initialized: true`;
- показать созданные PROJECT / REQ / ADR / STEP;
- перейти к обычному initialized-project workflow.

В рамках того же MVP пользователь также должен иметь возможность:

- открыть существующий initialized project;
- переключить project/runtime;
- просмотреть REQ / ADR / STEP / evidence / reviews;
- изменить разрешённые Harness settings;
- FIND / INSTALL skill;
- выполнить AUDIT;
- выполнить PROJECT RECONCILE;
- выполнить RELEASE CHECK;
- CHECK / HARNESS UPDATE APPLY;
- пройти безопасный Git workflow.

Обязательные этапы основного жизненного цикла не должны требовать внешнего терминала. MVP также должен показывать deterministic command preflight, explicit chain execution и recovery незавершённых executions без необходимости вручную восстанавливать состояние из chat history.

---

# 25. Приоритет источников

При расхождении:

```text
Actual repository state
    > Accepted ADR
    > Harness protocol
    > Client product requirements
    > Interactive prototype
    > Visual experiments
```
