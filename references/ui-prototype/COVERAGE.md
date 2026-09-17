# AI Development Harness UI — Functional Coverage

Основание: текущая продуктовая модель AI Development Harness Client и текущий публичный Harness protocol.

## Главный принцип

UI — графическая оболочка над repository-based Harness protocol.

- Repository остаётся source of truth.
- UI не реализует второй вариант orchestration.
- Детерминированные read-сценарии обслуживает repository / Git projection layer.
- Командные действия передаются явно выбранному runtime adapter как canonical Harness commands.
- Каждый run получает **явный repository context и explicit runtimeId**.
- `projectRoot + runtimeId` фиксируются на старте run и не меняются при последующем project/runtime switch.

## Client lifecycle

| Capability | UI surface |
|---|---|
| Запуск `harness-ui` | Distribution / launcher model |
| Выбор repository | Open Project |
| Recent projects | Open Project / Project switcher |
| Harness project validation | Open Project / validation state |
| Valid initialized project | Open → Overview |
| Valid pre-INIT project | Open → Project / INIT |
| Ordinary Git repo / invalid Harness | Validation error |
| Current project path + branch | Top bar / sidebar / Project |
| Switch project | Global project switcher |
| Navigation without project | All screens available in Demo Preview mode |
| Commands without project | Locked / requires explicit project context |
| Immutable project context per run | Run drawer + Activity |

## Canonical Harness commands

| Harness capability | UI surface |
|---|---|
| INIT PROJECT | Project / initialization wizard |
| ADD STEP | Roadmap / Add STEP |
| FIND SKILL | Skills / Search |
| INSTALL SKILL | Skills / Candidate inspector |
| CREATE SKILL | Skills / Create |
| GENERATE GITHUB TEMPLATES | GitHub / Collaboration templates |
| QUICK FIX | Overview / Quick Fix modal |
| PLAN STEP-NNN | STEP detail / Plan |
| IMPLEMENT STEP-NNN | STEP detail / Implement |
| REVIEW STEP-NNN | STEP detail + Reviews |
| FIX STEP-NNN | STEP detail / Fix findings |
| RUN STEP-NNN | STEP detail / Orchestration |
| AUDIT STEP-NNN | STEP detail + Audits |
| STATUS PROJECT | Overview / Project health |
| NEXT STEP | Overview / Recommended work |
| RECONCILE PROJECT | Audits & Reconcile |
| RELEASE CHECK | Releases |
| CHECK HARNESS UPDATE | Harness updates |
| UPDATE HARNESS | Harness updates |
| GIT CHECK | Git workspace |
| COMMIT | Git workspace / commit builder |
| PUSH | Git workspace |
| PR | Git workspace |
| SYNC | Git workspace |

## Supporting workflow skills

| Skill | UI surface |
|---|---|
| requirements-review | Requirements |
| architecture-change | Architecture / ADR |
| documentation-sync | Knowledge + STEP tools |
| code-review | Reviews + STEP tools |
| security-review | Reviews + STEP tools |
| write-tests | STEP tools / Reviews |

## Project / runtime boundary

Prototype explicitly models:

```text
UI
├── Repository / Git projection layer
│   └── selected Harness repository
└── Runtime adapter layer
    ├── Codex
    └── Claude Code
        ├── projectRoot = selected repository
        ├── runtimeId = explicit user selection
        └── command = canonical Harness command
```

The UI never resolves a random process cwd at command time, never infers an active runtime, and never copies Harness orchestration into its own client logic.

## Configuration and extension points

- `.project/manifest.yaml` → Project + Policies.
- `.project/git-policy.toml` → Git workspace + Policies.
- `.project/harness-policy.toml` → Policies / Validation.
- `.codex/config.toml` + `.codex/agents/*.toml` → Agents & Models.
- `docs/skills/REGISTRY.md` → Skills.
- `AGENTS.local.md` → Local commands/preferences; Command Palette discovers aliases.
- Project docs / REQ / ADR / STEP / review / audit / release reports → Knowledge browser and structured views.

## Full-product navigation

1. Open Project / repository validation
2. Overview
3. Project / INIT
4. Roadmap / STEP
5. STEP detail
6. Requirements
7. Architecture / ADR
8. Reviews & findings
9. Audits & Reconcile
10. Releases
11. Skills
12. Git workspace
13. GitHub collaboration
14. Knowledge / Project files
15. Activity / Runs
16. Agents & Models
17. Policies & Settings
18. Global Command Palette / local aliases

## Реализационные требования, не являющиеся отдельными dashboard-экранами

Они отражаются в архитектуре и launcher UX, но не требуют декоративных экранов:

- Nx monorepo;
- npm package `@ai-development-harness/client`;
- executable `harness-ui`;
- Docker / Docker Compose как обязательное dev environment;
- React + TypeScript + Vite;
- Node.js local application service;
- Codex и Claude Code как два обязательных first-class runtime adapter, без runtime-specific Harness domain model.

The prototype intentionally includes universal Command Palette and raw-source fallback so new project-specific skills/commands remain usable before bespoke UI is added.


## Current Harness update surface

- `.project/harness-update.toml`
- `.project/harness.lock.json`
- `planning/harness-updates/`
- `.agents/skills/update-harness/`
- `.codex/agents/harness-updater.toml`
- `docs/harness/UPDATES.md`

## Generic UI behavior

- UI locale is globally switchable without opening deep settings.
- Blocked controls expose both **why** they are blocked and **how** to unblock them.
- Table/list filters are interactive.
- Empty result sets render a contextual empty state rather than a blank table.


## Multi-runtime execution

Current Harness adapter coverage:

| Runtime | Repository adapter |
|---|---|
| Codex | `.codex/config.toml`, `.codex/agents/*.toml` |
| Claude Code | `CLAUDE.md`, `.claude/settings.json`, `.claude/agents/*.md` |

`CLAUDE.md` imports canonical `@AGENTS.md`. Core Harness skills remain single-source in `.agents/skills/`.

Client UX rules:

- active runtime starts as **not selected**;
- runtime selection is explicit and globally visible;
- there is no default active runtime;
- Harness commands require both valid project context and explicit runtime;
- switching project clears runtime selection;
- switching runtime affects only future runs;
- each run snapshots `projectRoot + runtimeId`;
- failed/unavailable selected runtime never silently falls back to the other runtime;
- Agents & Models shows adapter-specific model/effort/permission configuration while keeping canonical role semantics runtime-neutral.


## Runtime-selection UI surface

| Capability | UI surface |
|---|---|
| Explicit runtime selection | Global topbar `Codex / Claude Code` switch |
| No selected runtime | Visible warning state; commands locked |
| Runtime selection reason | Hover/focus tooltip on locked commands |
| Adapter configuration | Agents & Models |
| Runtime-specific files | Knowledge / Policies |
| Immutable runtime per run | Run drawer / Activity context |
