# AI Development Harness UI — Functional Coverage

Основание: Harness v0.3.0, текущая продуктовая модель клиента и утверждённые UX-решения.

## Главный принцип

UI — графическая оболочка над repository-based Harness protocol.

- Repository остаётся source of truth.
- UI не реализует собственный orchestration.
- Read-only views строятся из repository / Git projections.
- Commands передаются explicit runtime adapter.
- Каждый run фиксирует `projectRoot + runtimeId`.
- Live execution в MVP идёт через временный client-owned `ExecutionRun` и нормализованный event stream.
- Свободный текст модели не считается Harness protocol state.
- После mutation итоговое состояние перечитывается из repository / Git.
- Runtime не выбирается автоматически.

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
| Run `INIT PROJECT` | Project / INIT |
| Refresh after successful INIT | Project / INIT → Overview |
| Invalid repository | Validation error |
| Project switch | Topbar |
| Explicit runtime | Topbar |
| Command Palette | Global |
| Immutable run context | Execution Run surface |

## Canonical Harness commands

| Command | UI surface |
|---|---|
| INIT PROJECT | Project / INIT |
| ADD STEP | Roadmap |
| FIND SKILL | Skills |
| INSTALL SKILL | Skills candidate inspector |
| CREATE SKILL | Skills |
| GENERATE GITHUB TEMPLATES | GitHub collaboration |
| QUICK FIX | Overview / Command Palette |
| PLAN STEP-NNN | STEP Detail |
| IMPLEMENT STEP-NNN | STEP Detail |
| REVIEW STEP-NNN | STEP Detail / Reviews |
| FIX STEP-NNN | Reviews / STEP Detail |
| RUN STEP-NNN | STEP Detail / RUN drawer |
| AUDIT STEP-NNN | Audits |
| STATUS PROJECT | Overview |
| NEXT STEP | Overview recommendation |
| RECONCILE PROJECT | Audits / Reconcile |
| RELEASE CHECK | Releases |
| CHECK HARNESS UPDATE | Harness Updates |
| UPDATE HARNESS | Harness Updates |
| GIT CHECK | Git workspace |
| COMMIT | Git workspace |
| PUSH | Git workspace |
| PR | GitHub collaboration / Git workspace |
| SYNC | Git workspace |

## v0.3.0 settings

| Setting | UI | Constraint |
|---|---|---|
| `execution.maxFixReviewCycles` | Policies & Settings / RUN drawer | integer 1..5 |
| `review.security` | Policies & Settings / Reviews / RUN | `auto | always` |
| `review.tests` | Policies & Settings / Reviews / RUN | `auto | always` |
| `skills.search.maxResults` | Policies & Settings / Skills | integer 1..10 |

No hidden fallback is represented in UI.

## Important semantics

### NEXT STEP

One primary recommendation, not an execution lock. UI explicitly shows that other unblocked STEP can exist.

### AUDIT vs RECONCILE

Separate concepts and actions. AUDIT is bounded; RECONCILE is project-wide.

### QUICK FIX

No setting may expand QUICK FIX into behavior/API/data/security/architecture/dependency changes.

### Reviews

Independent review is always required. Specialized reviewers can be `auto` or `always`, never disabled through project settings.

### Git

`sync.allow_merge` and `sync.allow_rebase` are intentionally absent. Automatic merge/rebase remains a protocol invariant.

### Execution Run

MVP capability для живого выполнения Harness-команд.

- единый execution surface для runtime commands;
- incremental output;
- normalized runtime events;
- safe Markdown/code rendering;
- `waiting-for-input` для интерактивного продолжения;
- active run сохраняется при навигации UI;
- transport не фиксируется как SSE/WebSocket на уровне product contract;
- protocol phases отображаются только из достоверных structured sources;
- после mutation repository projections и Git state перечитываются.

Это не Activity history и не новый source of truth.

### Activity / Runs

Post-MVP client-owned projection. It must not become canonical state for STEP / review / evidence. Предпочтительное хранение execution metadata — local-only daily JSONL под `.project/local/activity/`.

## Delivery scope

### MVP

- Open/validate repository;
- create/edit local Project Brief;
- INIT PROJECT through UI;
- Overview / Roadmap / STEP / REQ / ADR / Knowledge;
- Reviews / Audit / Reconcile / Releases;
- Skills;
- Git Workspace и PR command;
- Agents & Models;
- Harness Updates;
- Policies & Settings;
- Command Palette;
- live Execution Run surface для runtime commands;
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
- future secure local bridge may support hosted UI without cloud execution.
