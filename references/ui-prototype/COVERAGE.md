# AI Development Harness UI — Functional Coverage

Основание: Harness **v0.4.0**, текущая продуктовая модель клиента и утверждённые UX-решения.

## Главный принцип

UI — графическая оболочка над repository-based Harness protocol.

- Repository остаётся source of truth для REQ / ADR / STEP / evidence / reviews / audits.
- UI не реализует собственный orchestration и не hardcode-ит CTS.
- Read-only views строятся из repository / Git projections.
- Commands проходят Harness deterministic preflight до runtime dispatch.
- Harness Execution Status остаётся operational recovery state.
- Runtime events нормализуются отдельно и не переопределяют protocol state.
- Каждый запуск фиксирует `projectRoot + runtimeId`, а Harness возвращает `executionId`.
- После mutation итоговое состояние перечитывается из repository / Git.
- Runtime не выбирается автоматически.
- Свободный текст модели не считается Harness protocol state.

## Client lifecycle

| Capability | UI surface |
|---|---|
| `harness-ui` / path argument | Launcher model / Open Project |
| Repository selection | Open Project |
| Recent projects | Open Project / project switcher |
| Harness validation | Open Project |
| Initialized project | Overview |
| Pre-INIT project | Project / INIT |
| Create/edit `PROJECT_BRIEF.local.md` | Project / INIT |
| Run `PROJECT INIT` | Project / INIT |
| Refresh after successful INIT | Project / INIT → Overview |
| Invalid repository | Validation error |
| Project switch | Topbar |
| Explicit runtime | Topbar |
| Command Palette | Global |
| Command preflight / normalized chain | Command Palette / command surfaces |
| Immutable execution context | Execution Run surface |
| Unresolved executions / recovery | Overview / Execution Run surface |

## Canonical Harness commands

| Command | UI surface |
|---|---|
| `PROJECT INIT` | Project / INIT |
| `PROJECT STATUS` | Overview |
| `PROJECT RECONCILE` | Audits / Reconcile |
| `PROJECT QUICK FIX:` | Overview / Command Palette |
| `STEP ADD:` | Roadmap / Command Palette |
| `STEP NEXT` | Overview recommendation |
| `STEP PLAN STEP-NNN` | STEP Detail |
| `STEP IMPLEMENT STEP-NNN` | STEP Detail |
| `STEP REVIEW STEP-NNN` | STEP Detail / Reviews |
| `STEP FIX STEP-NNN` | Reviews / STEP Detail |
| `STEP RUN STEP-NNN` | STEP Detail / Execution Run |
| `STEP AUDIT STEP-NNN` | Audits |
| `SKILL FIND:` | Skills |
| `SKILL INSTALL:` | Skills candidate inspector |
| `SKILL CREATE:` | Skills |
| `GITHUB GENERATE TEMPLATES` | GitHub collaboration / Command Palette |
| `RELEASE CHECK` | Releases |
| `HARNESS UPDATE CHECK [TO <tag>]` | Harness Updates |
| `HARNESS UPDATE APPLY [TO <tag>]` | Harness Updates |
| `GIT CHECK` | Git Workspace |
| `GIT COMMIT[: hint]` | Git Workspace |
| `GIT PUSH` | Git Workspace |
| `GIT PR` | GitHub collaboration / Git Workspace |
| `GIT SYNC` | Git Workspace |

## Explicit chains / CTS

MVP должен поддерживать chains, разрешённые текущим `.project/command-transitions.json`.

Примеры:

```text
GIT CHECK > COMMIT > PUSH > PR
STEP PLAN STEP-NNN > IMPLEMENT > REVIEW
STEP REVIEW STEP-NNN > FIX > REVIEW
HARNESS UPDATE CHECK TO <tag> > APPLY
```

До dispatch UI показывает deterministic preflight:

- `VALID_COMMAND` / `VALID_CHAIN`;
- normalized sequence;
- transition conditions;
- runtime preconditions.

Structural errors вроде `INVALID_CHAIN`, `DOMAIN_MISMATCH`, `TARGET_MISMATCH` или `MISSING_INPUT` блокируют dispatch до первого segment.

## v0.4.0 settings

| Setting | UI | Constraint |
|---|---|---|
| `execution.maxFixReviewCycles` | Policies & Settings / Execution Run | integer 1..5 |
| `review.security` | Policies & Settings / Reviews | `auto | always` |
| `review.tests` | Policies & Settings / Reviews | `auto | always` |
| `skills.search.maxResults` | Policies & Settings / Skills | integer 1..10 |
| `language.*` | Policies & Settings | BCP 47 tags |

No hidden fallback is represented in UI.

## Important semantics

### STEP NEXT

One primary recommendation, not a global execution lock.

Перед выбором нового STEP Harness resolver учитывает unresolved STEP-related executions. При interruption UI может рекомендовать exact resume command вместо нового STEP.

Явно запрошенные независимые Git / Project / Harness commands остаются допустимыми.

### STEP RUN

`STEP RUN STEP-NNN` — root orchestration command.

Canonical CTS child commands:

```text
STEP PLAN STEP-NNN
STEP IMPLEMENT STEP-NNN
STEP REVIEW STEP-NNN
STEP FIX STEP-NNN
```

`VERIFY` и `CLOSE` не показываются как canonical commands. Verification — runtime/deterministic activity; finalization после REVIEW PASS относится к root RUN.

### AUDIT vs RECONCILE

Separate concepts and actions:

- `STEP AUDIT STEP-NNN` — bounded scope;
- `PROJECT RECONCILE` — project-wide.

Обе команды standalone-only.

### PROJECT QUICK FIX

No setting may expand `PROJECT QUICK FIX` into behavior/API/data/security/architecture/dependency changes.

### Reviews

Independent review is always required. Specialized reviewers can be `auto` or `always`, never disabled through project settings.

`FAIL` не является универсальным terminal error: в chain `STEP REVIEW ... > FIX > REVIEW` он активирует допустимый CTS edge к FIX.

### Plan freshness

STEP Detail показывает:

- `Plan status`;
- `Plan revision`;
- `Plan basis`;
- `Planned at`;
- current / stale interpretation относительно текущего STEP contract.

Stale plan предлагает exact action `STEP PLAN STEP-NNN`.

### Git

`sync.allow_merge` и `sync.allow_rebase` отсутствуют. Automatic merge/rebase и force push остаются protocol invariants.

### Execution Run

MVP capability для живого выполнения Harness-команд.

UI projection строится из:

```text
Harness Execution Status
+ runtime event stream
+ repository/Git projections
```

Показываются минимум:

- `executionId`;
- mode: `single | chain | orchestration`;
- `rootCommand`;
- `current.command`;
- attempt;
- execution status: `running | complete | blocked`;
- command result: `SUCCESS | PASS | FAIL | BLOCKED`;
- runtime/UI state;
- incremental output;
- structured interaction / approval;
- final repository refresh.

Runtime/UI `waiting-for-input` не заменяет Harness execution status.

### Execution recovery

MVP использует:

```text
.project/local/execution/execution-status.json
tools/harness/resolve-next-command.py --json
```

Resolver state:

```text
RESUME
NEXT
DONE
BLOCKED
NOT_FOUND
```

Unresolved executions может быть несколько одновременно. Browser navigation/reload или runtime interruption не должны заставлять клиента угадывать продолжение по chat history.

Execution Status runtime-agnostic: для automatic reattach клиент использует минимальную local-only runtime binding, а при её отсутствии требует explicit runtime selection.

### Activity / Runs

Post-MVP client-owned projection.

```text
Harness Execution Status
→ operational recovery
→ MVP

Client Activity
→ observability / telemetry / analytics
→ Post-MVP
```

Activity не становится canonical state для STEP / review / evidence и не заменяет `execution-status.json`.

Предпочтительное хранение client telemetry — local-only daily JSONL под `.project/local/activity/`.

## Delivery scope

### MVP

- Open/validate repository;
- create/edit local Project Brief;
- `PROJECT INIT` through UI;
- Overview / Roadmap / STEP / REQ / ADR / Knowledge;
- `STEP NEXT` с recovery semantics;
- Reviews / `STEP AUDIT` / `PROJECT RECONCILE` / Releases;
- Skills;
- Git Workspace и `GIT PR`;
- explicit CTS chains;
- deterministic command preflight;
- restart-safe Execution Status / unresolved executions;
- Agents & Models;
- Harness Updates;
- Policies & Settings;
- Command Palette;
- live Execution Run surface;
- dark theme + accessibility baseline.

### Post-MVP

- Activity / Runs и runtime/model provenance;
- model/runtime analytics;
- отдельный GitHub Collaboration screen;
- full light theme;
- English UI;
- live repository watcher.

### Architectural reserve

- hosted UI;
- secure local bridge;
- remote pairing.

Точный acceptance contract: [`REQUIREMENTS.md`](REQUIREMENTS.md).

## Navigation

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
14. GitHub Collaboration
15. Activity / Runs
16. Agents & Models
17. Harness Updates
18. Policies & Settings
19. Global Command Palette

## Visual reference

Visual language is derived from `ai-development-harness/website`:

- `#050b14` base background;
- `#0b1726` surfaces;
- `#00d7f5`, `#2585ff`, `#8a52ff` accent range;
- `#30d890`, `#ffb84a`, `#ff5364` status colors;
- grid background;
- translucent surfaces;
- light theme through semantic token replacement.

## Implementation architecture requirements

These are product architecture requirements, not dashboard screens:

- Nx monorepo;
- TypeScript;
- React browser-first UI;
- npm package `@ai-development-harness/client`;
- executable `harness-ui`;
- local Node application service;
- `ClientApi` boundary;
- replaceable transport/bootstrap;
- no hardcoded localhost assumptions in UI domain model;
- current repository Harness tooling is used for CTS/preflight/recovery instead of a duplicated client state machine;
- future secure local bridge may support hosted UI without cloud execution;
- runtime adapters prefer official programmable integration surfaces over TUI automation;
- Codex adapter baseline: Codex App Server;
- Claude Code adapter baseline: Claude Agent SDK;
- PTY/stdout prompt scraping is not the primary production integration path;
- adapter capability model exposes unsupported interactive/streaming features instead of guessing support.
