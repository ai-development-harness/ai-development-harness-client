# AI Development Harness Client — Product Requirements

> Этот документ фиксирует требования к клиенту и этапы их реализации.
>
> Это **reference requirements** для продукта Client, а не канонический `docs/requirements/SPEC.md` Harness-проекта. Поэтому используются отдельные идентификаторы `CLIENT-REQ-NNN`, чтобы не смешивать их с REQ, которые создаёт `INIT PROJECT`.

## 1. Этапы

### MVP

Первая версия должна позволять пройти через клиент основной жизненный цикл Harness-проекта:

```text
Open repository
→ pre-INIT validation
→ create/edit PROJECT_BRIEF.local.md
→ select runtime
→ INIT PROJECT
→ Overview
→ NEXT STEP
→ STEP Detail
→ RUN STEP-NNN
→ Review / Evidence
→ GIT CHECK
→ COMMIT
→ PUSH
→ PR
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

Клиент должен передавать канонические Harness commands выбранному runtime adapter, а не воспроизводить протокол самостоятельно.

**Acceptance**

- `RUN STEP-NNN` выполняется runtime adapter;
- UI может визуализировать flow, но не является источником его семантики;
- изменение Harness protocol не требует поддерживать отдельную client-side state machine.

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

## CLIENT-REQ-007 — INIT PROJECT через UI

Клиент должен поддерживать полный запуск `INIT PROJECT` без внешнего терминала.

Flow:

1. открыть pre-INIT repository;
2. проверить `project.initialized: false`;
3. проверить/создать `PROJECT_BRIEF.local.md`;
4. выбрать runtime;
5. запустить каноническую команду `INIT PROJECT`;
6. отобразить execution state и итог;
7. после success перечитать repository;
8. подтвердить `project.initialized: true`;
9. показать созданные PROJECT / REQ / ADR / STEP;
10. перейти в обычный initialized-project UI.

Клиент не генерирует REQ/ADR/STEP самостоятельно вместо Harness.

**Stage:** MVP

---

## CLIENT-REQ-008 — Защита от повторного INIT

При `project.initialized: true` обычный `INIT PROJECT` не должен предлагаться как стандартное действие.

UI должен направлять пользователя к `RECONCILE PROJECT`, если нет явного destructive re-initialization intent.

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

## CLIENT-REQ-012 — Immutable run context

При запуске операции фиксируются:

```text
projectRoot
runtimeId
```

Последующее переключение project/runtime не меняет context уже запущенной операции.

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

# 6. Overview и NEXT STEP

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
- NEXT STEP recommendation.

**Stage:** MVP

---

## CLIENT-REQ-015 — NEXT STEP остаётся рекомендацией

UI не должен интерпретировать `NEXT STEP` как execution lock.

Должно быть явно указано, что в проекте могут существовать другие незаблокированные STEP.

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
- Evidence;
- Review status;
- Blocker / Failure reason.

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

History в MVP может строиться из repository artifacts без отдельного telemetry store.

**Stage:** MVP

---

## CLIENT-REQ-018 — STEP commands

Клиент должен позволять запускать применимые:

```text
PLAN STEP-NNN
IMPLEMENT STEP-NNN
REVIEW STEP-NNN
FIX STEP-NNN
RUN STEP-NNN
AUDIT STEP-NNN
```

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

## CLIENT-REQ-024 — RUN flow

UI должен визуализировать фактическую policy:

```text
PLAN
→ IMPLEMENT
→ VERIFY
→ REVIEW
→ FIX ↔ REVIEW × N
→ CLOSE
```

Исчерпание лимита не отображается как success.

**Stage:** MVP

---

# 10. Skills

## CLIENT-REQ-025 — FIND SKILL maxResults

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
FIND SKILL
→ candidates
→ inspect
→ explicit selection
→ INSTALL SKILL
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

## CLIENT-REQ-028 — AUDIT и RECONCILE различаются

UI должен сохранять отдельную семантику:

- `AUDIT STEP-NNN` — bounded scope;
- `RECONCILE PROJECT` — project-wide reconciliation.

**Stage:** MVP

---

## CLIENT-REQ-029 — Release reports

Клиент должен позволять запускать `RELEASE CHECK` и отображать созданный report/blockers.

Отдельная release-management subsystem не требуется для MVP.

**Stage:** MVP

---

# 12. Harness Updates

## CLIENT-REQ-030 — Harness Updates screen

Клиент должен иметь отдельный surface для:

```text
CHECK HARNESS UPDATE [TO <tag>]
UPDATE HARNESS [TO <tag>]
```

**Stage:** MVP

---

## CLIENT-REQ-031 — UPDATE только после matching CHECK

`UPDATE HARNESS` доступен только после успешного matching `CHECK HARNESS UPDATE` для того же target/route.

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
- QUICK FIX safety boundary;
- immutable release tags;
- количества primary results команды NEXT STEP.

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

Поддерживать:

```text
GIT CHECK
COMMIT
PUSH
PR
SYNC
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

Клиент должен предоставлять keyboard-driven Command Palette для Harness commands.

**Stage:** MVP

---

## CLIENT-REQ-041 — Forward compatibility commands

Command без специализированного UI должен оставаться запускаемым generic способом, если он поддерживается текущим Harness protocol.

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

## CLIENT-REQ-049 — Activity является client-owned

Activity / Runs не является canonical Harness state.

Удаление Activity не должно повреждать STEP/review/evidence.

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

Команда `PR` при этом уже должна работать в MVP.

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

Минимально показываются:

- command;
- runtime;
- run status;
- elapsed time;
- model/runtime output;
- errors / blockers;
- final result.

`ExecutionRun` является временной client-owned сущностью выполнения и не является STEP, Harness state или Activity history.

Минимальные технические статусы:

```text
starting
running
waiting-for-input
succeeded
failed
blocked
cancelled
```

Статусы и этапы Harness вроде PLAN / IMPLEMENT / VERIFY / REVIEW / FIX / CLOSE не должны становиться альтернативной client-side state machine.

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

Codex и Claude Code могут предоставлять execution output разными способами.

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

Дополнительные структурированные события допустимы, если runtime или deterministic tooling предоставляют их достоверно, например:

```text
activity.started
activity.completed
artifact.changed
verification.result
```

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

## CLIENT-REQ-069 — Run переживает навигацию UI

Активный run должен принадлежать local application service, а не жизненному циклу React-компонента.

Переход между экранами не останавливает и не теряет run.

После повторного открытия execution surface frontend должен иметь возможность получить состояние активного run по `runId` и снова подписаться на его события, пока local service сохраняет этот run активным.

Долговременное хранение завершённых runs и Activity history этим требованием не вводится.

**Stage:** MVP

---

## CLIENT-REQ-070 — Repository refresh after mutation

После успешного завершения команды, способной изменить repository, клиент должен перечитать затронутые repository projections и Git state.

Примеры:

```text
INIT PROJECT
IMPLEMENT STEP-NNN
FIX STEP-NNN
RUN STEP-NNN
QUICK FIX
UPDATE HARNESS
```

Model output не является доказательством фактического изменения repository.

UI должен строить итоговое состояние из реальных файлов, Harness artifacts, Git state и deterministic outputs после завершения mutation.

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
INIT PROJECT
        ↓
Repository refresh
        ↓
project.initialized = true
        ↓
Overview
        ↓
NEXT STEP
        ↓
STEP Detail
        ↓
RUN STEP-NNN
        ↓
Review / Evidence
        ↓
GIT CHECK
        ↓
COMMIT
        ↓
PUSH
        ↓
PR
```

После `INIT PROJECT` клиент без перезапуска должен:

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
- выполнить RECONCILE PROJECT;
- выполнить RELEASE CHECK;
- CHECK / UPDATE HARNESS;
- пройти безопасный Git workflow.

Обязательные этапы основного жизненного цикла не должны требовать внешнего терминала.

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
