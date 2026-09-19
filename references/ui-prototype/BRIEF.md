# AI Development Harness Client — Product Brief v2

## 1. Что нужно сделать

Нужен локальный графический клиент для AI Development Harness — удобная визуальная оболочка над repository-based protocol.

Клиент не должен становиться отдельной реализацией Harness. Источником истины остаётся выбранный Git-репозиторий проекта: REQ, ADR, STEP, evidence, review reports, policies, runtime adapters и Git state читаются из него, а изменения выполняются через канонические команды Harness.

Рабочее имя продукта: **AI Development Harness Client**.

Основной способ запуска:

```text
harness-ui
harness-ui .
harness-ui /path/to/project
harness-ui --project /path/to/project
```

Предпочтительное имя npm-пакета: `@ai-development-harness/client`.

## 2. Зачем

Harness уже формализует процесс разработки, но работа только через команды и файлы требует хорошо знать структуру protocol layer.

Клиент должен:

- уменьшить порог входа;
- показывать текущее состояние проекта без ручного обхода Markdown/TOML/YAML;
- визуализировать связи REQ → STEP → implementation → evidence → review;
- безопасно запускать канонические Harness-команды;
- объяснять, почему команда недоступна и что нужно сделать для разблокировки;
- давать доступ к исходным файлам, не скрывая repository source of truth;
- сделать текущие project policies редактируемыми там, где Harness действительно допускает настройку;
- не превращать protocol invariants в пользовательские переключатели.

## 3. Пользователи

Основная аудитория:

1. разработчик, который ведёт проект с AI Development Harness;
2. технический лидер, который хочет видеть состояние requirements / roadmap / review / release gates;
3. небольшая команда, где разные участники используют один repository contract;
4. пользователь, который работает то через Codex, то через Claude Code, но хочет одинаковый workflow.

## 4. Главные продуктовые принципы

### Repository — source of truth

UI читает и изменяет состояние через репозиторий и Harness commands. Не допускается скрытое клиентское состояние, которое начинает конкурировать с REQ / ADR / STEP / policies.

### UI не дублирует orchestration

Например `STEP RUN STEP-NNN` исполняет Harness runtime adapter. Клиент лишь передаёт:

```text
projectRoot
runtimeId
command
```

и визуализирует результат.

### Runtime выбирается явно

First-class runtimes на текущем этапе:

- Codex;
- Claude Code.

При открытии проекта runtime не выбирается автоматически.

Командное действие требует одновременно:

1. валидного Harness repository;
2. explicit runtime selection.

Переключение проекта сбрасывает выбранный runtime.

Каждый уже запущенный run сохраняет immutable snapshot:

```text
projectRoot + runtimeId
```

Смена runtime после старта не меняет контекст существующего run.

### Нет скрытого fallback

Если выбранный runtime недоступен, клиент не переключается автоматически на другой.

Если настройка Harness отсутствует или невалидна, UI показывает configuration blocker, а не использует собственное значение по умолчанию.

### Blocked state должен быть объяснимым

Заблокированная кнопка должна сообщать:

- почему действие недоступно;
- какой факт или шаг его разблокирует.

## 5. Client lifecycle

### Open Project

При запуске без однозначного project path пользователь выбирает локальный repository.

Клиент должен отличать минимум четыре состояния:

1. valid initialized Harness project;
2. valid pre-INIT Harness project;
3. ordinary Git repository / Harness not found;
4. invalid or damaged Harness project.

После открытия валидного проекта клиент фиксирует `projectRoot`, читает Harness release и проверяет unresolved executions.

### Pre-INIT lifecycle

Для valid pre-INIT repository клиент должен покрывать первый пользовательский сценарий целиком:

```text
Open repository
→ create/edit PROJECT_BRIEF.local.md
→ select runtime
→ PROJECT INIT
→ refresh repository state
→ project.initialized = true
→ Overview
```

`PROJECT_BRIEF.local.md` остаётся local-only файлом и не превращается во внутреннее состояние клиента. Сам клиент не генерирует REQ / ADR / STEP вместо Harness — он запускает canonical `PROJECT INIT`.

Если проект уже инициализирован, обычный повторный `PROJECT INIT` не предлагается; стандартный maintenance-path — `PROJECT RECONCILE`.

Для UX-прототипа допустим **Demo Preview**: экраны можно просматривать без project context, но реальные command actions остаются заблокированы.

## 6. Основная информационная архитектура

### Workspace

1. **Open Project**
2. **Overview**
3. **Project / INIT**
4. **Roadmap / STEP**
5. **STEP Detail**

### Knowledge

6. **Requirements**
7. **Architecture / ADR**
8. **Knowledge / Project Files**

### Quality

9. **Reviews & Findings**
10. **Audits / Reconcile**
11. **Releases**

### Tools

12. **Skills**
13. **Git Workspace**
14. **GitHub Collaboration**
15. **Activity / Runs** — client-owned projection, не canonical Harness artifact

### Harness

16. **Agents & Models**
17. **Harness Updates**
18. **Policies & Settings**
19. **Global Command Palette**

Новые Harness-команды и project-specific skills должны оставаться доступными через Command Palette и raw-source fallback даже до появления отдельного специализированного UI.

## 7. Overview

Overview должен отвечать на вопросы:

- какой проект открыт;
- какой runtime выбран;
- валиден ли Harness;
- есть ли blockers / findings;
- есть ли unresolved executions;
- какие STEP доступны;
- что Harness рекомендует делать следующим;
- в каком состоянии Git;
- есть ли Harness update.

### STEP NEXT

`STEP NEXT` остаётся рекомендацией, а не global workflow lock.

Перед выбором нового STEP Harness resolver проверяет unresolved executions. Если есть interrupted STEP-related execution, primary recommendation может быть resume существующей работы:

```text
Есть незавершённая работа

Root:
STEP RUN STEP-017

Resume:
STEP IMPLEMENT STEP-017
```

Если unresolved STEP executions нет, UI показывает обычную рекомендацию:

```text
Рекомендуемый следующий STEP
STEP-024
Рекомендован Harness
Других доступных STEP: 2
```

Явно запрошенные независимые Project / Git / Harness commands остаются допустимыми; CTS не задаёт глобальный порядок отдельных invocations.

## 8. STEP Detail

Минимальные вкладки:

- Contract;
- Plan;
- Evidence;
- Review;
- History.

Команды:

- PLAN;
- IMPLEMENT;
- REVIEW;
- FIX;
- RUN;
- AUDIT — когда применимо.

UI не должен помечать STEP выполненным без обязательного review PASS и deterministic gates.

## 9. Reviews

Independent reviewer обязателен и не отключается настройкой.

Начиная с Harness v0.3.0 есть project-specific policy:

```yaml
review:
  security: auto
  tests: auto
```

Допустимые значения:

```text
auto
always
```

`never` отсутствует намеренно.

- `auto` — specialized reviewer запускается по Risk flags / factual diff / test surface;
- `always` — соответствующий reviewer запускается на каждом review-проходе.

UI должен объяснять это прямо рядом с настройкой.

## 10. STEP RUN policy

Harness v0.4.0 использует root orchestration command:

```text
STEP RUN STEP-NNN
```

Для coding flow canonical child transitions определяет CTS:

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

`VERIFY` и `CLOSE` не являются отдельными canonical commands:

- deterministic verification показывается как activity/evidence;
- после REVIEW PASS remaining finalization выполняется root `STEP RUN STEP-NNN`;
- `execution.maxFixReviewCycles` ограничивает FIX ↔ REVIEW и имеет диапазон **1–5**;
- исчерпание лимита не отображается как success.

Live Execution surface должен показывать `executionId`, `mode`, `rootCommand`, `current.command`, attempt, execution status и command result отдельно от runtime stream.

## 11. Skills

`SKILL FIND` использует:

```yaml
skills:
  search:
    maxResults: 5
```

Допустимый диапазон: **1–10**.

UI поиска skills должен использовать именно это значение как максимальный размер shortlist.

Поиск и установка — разные действия:

```text
SKILL FIND
→ inspect candidates
→ durable search report
→ explicit user selection
→ SKILL INSTALL
```

Third-party skill считать внешней dependency: показать source, ref/commit, license, provenance и safety notes.

## 12. AUDIT и RECONCILE нельзя объединять

### STEP AUDIT STEP-NNN

Проверяет конкретный STEP / bounded area против его контракта.

- audit-only;
- production code mutation запрещена;
- defects становятся findings / corrective STEP.

### PROJECT RECONCILE

Project-wide reconciliation:

- code/config/migrations/tests;
- REQ;
- Accepted ADR;
- architecture docs;
- tasks;
- evidence;
- projections.

Однозначный projection drift можно синхронизировать. Substantive gap должен стать corrective STEP.

UI может размещать их рядом, но смысл и действия должны быть явно различимы.

## 13. Harness Updates

Нужен отдельный экран.

Canonical commands:

```text
HARNESS UPDATE CHECK [TO <tag>]
HARNESS UPDATE APPLY [TO <tag>]
HARNESS UPDATE CHECK [TO <tag>] > APPLY
```

`HARNESS UPDATE CHECK` — read-only.

`HARNESS UPDATE APPLY` может reuse matching CHECK только если Harness Execution Status подтверждает тот же target / route / lock; иначе выполняется fresh CHECK.

На экране показывать:

- current release;
- latest / requested target;
- route;
- standard / bridge transitions;
- reload boundaries;
- ownership changes;
- blockers;
- affected managed paths;
- post-update handoff: inspect diff → `GIT CHECK > COMMIT > PUSH > PR`.

Отдельный client-owned update-state файл для handoff не нужен: v0.4.0 хранит durable metadata в общем Execution Status.

## 14. Policies & Settings

UI должен редактировать только настоящие project-specific settings.

### `.project/manifest.yaml`

На текущем этапе:

```yaml
execution:
  maxFixReviewCycles: 3

review:
  security: auto
  tests: auto

skills:
  search:
    maxResults: 5
```

Плюс language policy.

### `.project/git-policy.toml`

Git workflow:

- commit;
- branch;
- push;
- pull request;
- sync.

### `.project/harness-policy.toml`

Repository integrity / hygiene / deterministic validation.

### Не показывать как configurable preferences

Protocol invariants:

- mandatory independent review;
- запрет automatic merge/rebase;
- PROJECT QUICK FIX safety boundary;
- update security boundaries;
- immutable release tags;
- один primary result команды `STEP NEXT`.

Если правило нельзя безопасно отключить — UI не должен рисовать toggle, создающий ложное впечатление конфигурируемости.

## 15. Git Workspace

Минимально показать:

- current branch;
- protected status;
- upstream;
- ahead / behind / diverged;
- staged / unstaged / untracked;
- Harness validation;
- suspicious files;
- commit type / scope;
- blockers.

Поддерживаемые canonical actions:

```text
GIT CHECK
GIT COMMIT
GIT COMMIT: <optional hint>
GIT PUSH
GIT PR
GIT SYNC
```

И explicit publication chain:

```text
GIT CHECK > COMMIT > PUSH > PR
```

Перед запуском chain UI показывает deterministic preflight и normalized sequence.

Никакого force push. Automatic merge/rebase не является настройкой `GIT SYNC`.

## 16. Agents & Models

Канонические role identifiers остаются runtime-neutral.

Экран должен позволять сравнить adapter-specific configuration:

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

Модель, effort и permissions отображаются как настройки конкретного runtime adapter, а не как свойства STEP.

## 17. Activity / Runs

Это **Post-MVP** client-owned capability.

Её нужно чётко отделять от Harness Execution Status:

```text
.project/local/execution/execution-status.json
→ operational recovery state Harness
→ MVP

.project/local/activity/*.jsonl
→ observability / telemetry / analytics клиента
→ Post-MVP
```

Execution Status может содержать completed records ради recovery/handoff, но не является audit log или Activity storage.

Предпочтительное client-owned хранение Activity:

```text
.project/local/activity/
├── 2026-09-18.jsonl
├── 2026-09-19.jsonl
└── ...
```

Логи не коммитятся. Runtime/model/session/effort metadata собирает client/runtime layer, а не агент через self-report.

Не сохранять hidden chain of thought, полный context window или произвольные секреты. Аналитика показывает факты, но не объявляет одну модель автоматически «лучше» другой.

## 18. Дизайн

Визуальное направление должно совпадать с сайтом AI Development Harness.

### Базовая тема

Тёмная.

Основные токены:

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

Основной accent:

```text
cyan → blue → violet
```

Использовать:

- слабую grid-текстуру фона;
- полупрозрачные поверхности;
- умеренные glow-акценты;
- радиусы 12 / 18 / 26 px;
- тонкие синие borders;
- крупные заголовки без декоративной перегрузки;
- тёмные terminal/code panels даже в light theme.

Светлая тема должна использовать те же semantic tokens, а не отдельный несвязанный дизайн.

## 19. UI shell

Desktop-first layout:

```text
Sidebar
├── project context
├── grouped navigation
└── preview / status

Topbar
├── current surface
├── project switcher
├── explicit runtime switcher
├── Command Palette
├── locale
└── theme

Content
└── current structured / raw projection
```

Sidebar не должен дублировать каждую Harness-команду: команды принадлежат contextual actions и Command Palette.

## 20. Локализация

Минимум:

```text
ru
en
```

Требования:

- BCP 47 resource keys;
- fallback locale;
- `Intl` для дат/чисел;
- persisted client locale;
- переключение без перезапуска;
- UI locale не равен автоматически `language.documentation` проекта.

## 21. Accessibility

Минимум:

- keyboard navigation;
- видимый focus;
- контраст;
- aria labels для icon-only controls;
- reduced motion;
- blocked state доступен через focus, а не только hover;
- command palette полностью управляется с клавиатуры.

## 22. Архитектура клиента

Предпочтительная структура:

- Nx monorepo;
- TypeScript;
- React;
- browser-first frontend;
- локальный Node.js application service;
- `ClientApi` между frontend и transport;
- replaceable bootstrap / transport;
- отсутствие hardcoded localhost assumptions в UI domain layer.

Основной путь:

```text
React UI
   ↓
ClientApi
   ↓
transport / local bridge
   ↓
local application service
   ├── repository / Git projections
   ├── Harness command preflight / CTS
   ├── Harness Execution Status / resolver
   └── runtime adapter
          ↓
     Codex App Server / Claude Agent SDK
```

Клиент не hardcode-ит transition graph и не выводит protocol state из текста модели.

### Command preflight и chains

До dispatch command/chain проходит canonical Harness validation:

```text
tokenize
→ normalize
→ transition-table
→ runtime-preconditions
→ dispatch
```

Structural error вроде `INVALID_CHAIN` останавливает выполнение до первого segment.

Command Palette и специализированные surfaces могут отправлять explicit chains, например:

```text
GIT CHECK > COMMIT > PUSH > PR
STEP PLAN STEP-017 > IMPLEMENT > REVIEW
STEP REVIEW STEP-017 > FIX > REVIEW
HARNESS UPDATE CHECK TO <tag> > APPLY
```

### Выполнение команд в MVP

UI строит `ExecutionRunViewModel` как projection над Harness Execution Status + runtime event stream, а не создаёт второй canonical execution store.

Минимальный context:

```text
projectRoot
runtimeId
executionId
mode
rootCommand
current.command
current.attempt
execution.status
current.result
runtime/UI state
events
```

Важно разделять:

```text
Harness execution status: running | complete | blocked
Command result:           SUCCESS | PASS | FAIL | BLOCKED
Resolver status:          RESUME | NEXT | DONE | BLOCKED | NOT_FOUND
Runtime/UI state:         connecting | streaming | waiting-for-input | disconnected | cancelled
```

Основные правила:

- output поступает в UI по мере выполнения;
- Codex и Claude Code нормализуются через общий runtime event contract;
- свободный текст модели не используется для protocol transitions;
- runtime events не переопределяют Harness Execution Status;
- structured interaction может временно дать UI state `waiting-for-input`;
- active execution переживает navigation;
- после browser/runtime restart клиент использует `resolve-next-command.py --json`;
- unresolved executions может быть несколько одновременно;
- transport остаётся заменяемым за `ClientApi`;
- после mutation client перечитывает repository и Git state;
- Codex использует Codex App Server, Claude Code — Claude Agent SDK;
- PTY/stdin/stdout parsing TUI не является primary production integration path.

Долговременная история/analytics остаётся отдельной Post-MVP capability **Activity / Runs**.

## 23. Будущий remote bridge

Если появится hosted UI + local bridge, предусмотреть:

- explicit pairing;
- authentication;
- origin allowlist / CORS;
- CSRF protection;
- short-lived credentials;
- revoke;
- capability allowlist;
- отсутствие произвольного shell API.

## 24. Что точно не нужно

Не добавлять без отдельного решения:

- Sprint;
- Milestone как Harness domain entity;
- Assignee / Team;
- Story points;
- Kanban columns;
- percent progress STEP;
- deadline / time estimate;
- project health score;
- собственную UI-схему статусов;
- собственную orchestration state machine;
- автоматический выбор runtime;
- automatic fallback runtime;
- настройку отключения independent review;
- настройку разрешения automatic merge/rebase;
- fictional screens, которых нет в product model.

## 25. Референсы и источники истины

### Harness protocol

`https://github.com/ai-development-harness/ai-development-harness-template`

### UI client

`https://github.com/ai-development-harness/ai-development-harness-client`

### Website / visual language

`https://github.com/ai-development-harness/website`

### Interactive prototype

```text
references/ui-prototype/index.html
references/ui-prototype/README.md
references/ui-prototype/COVERAGE.md
references/ui-prototype/BRIEF.md
references/ui-prototype/REQUIREMENTS.md
```

При расхождении приоритет:

```text
Harness protocol / REQ / Accepted ADR
    > interactive prototype
    > visual experiments / screenshots
```

## 26. Этапы реализации

Точный scope и acceptance criteria зафиксированы в [`REQUIREMENTS.md`](REQUIREMENTS.md).

### MVP

MVP обязан покрывать end-to-end путь без внешнего терминала:

```text
pre-INIT repository
→ PROJECT_BRIEF.local.md
→ PROJECT INIT
→ initialized project
→ STEP NEXT / STEP
→ RUN
→ Review / Evidence
→ GIT CHECK
→ COMMIT
→ PUSH
→ PR
```

### Post-MVP

- Activity / Runs;
- JSONL execution telemetry;
- runtime/model provenance и analytics;
- отдельный GitHub Collaboration screen;
- полноценная light theme;
- английский UI;
- live repository watcher.

### Architectural reserve

- hosted UI;
- secure local bridge;
- remote pairing.

## 27. Текущий baseline

Бриф синхронизирован с публичным Harness **v0.4.0**.

Ключевые возможности v0.4.0, которые клиент обязан учитывать:

- canonical namespaced command interface;
- `.project/command-transitions.json` как machine-readable CTS source of truth;
- deterministic `validate-command.py` до dispatch;
- explicit same-domain chains и shorthand inheritance;
- universal crash-safe `.project/local/execution/execution-status.json`;
- execution modes `single | chain | orchestration`;
- resolver statuses `RESUME | NEXT | DONE | BLOCKED | NOT_FOUND`;
- `STEP NEXT` с приоритетом unresolved STEP executions;
- restart-safe `STEP RUN STEP-NNN`;
- Plan status / revision / basis / planned-at;
- `execution.maxFixReviewCycles = 1..5`;
- `review.security = auto | always`;
- `review.tests = auto | always`;
- `skills.search.maxResults = 1..10`;
- Harness update handoff через общий Execution Status;
- отсутствие automatic merge/rebase / force-push shortcuts.

## 28. Открытые вопросы

1. Какой transport считать первым production target: локальный Node service, desktop bridge или оба через общий интерфейс?
2. Нужно ли в первой версии показывать runtime account identity, или достаточно availability/authenticated/selected state?
3. Когда переходить от reference prototype к reusable `ui-kit` и component playground внутри Nx?
