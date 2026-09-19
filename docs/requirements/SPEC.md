# Спецификация требований

## MVP

### REQ-001 — Repository и Harness остаются источником истины

**Приоритет:** Критический
**Источник:** `CLIENT-REQ-001`, `CLIENT-REQ-002`, `CLIENT-REQ-061`, `CLIENT-REQ-062`

#### Requirement

Клиент строит read views из выбранного Harness repository и использует canonical Harness commands/tooling; он не создаёт альтернативные состояния STEP, CTS или orchestration.

#### Rationale

Поведение UI должно оставаться совместимым с обновляемым protocol layer и работой вне UI.

#### Acceptance

- После повторного открытия UI восстанавливает project state из repository artifacts, Git и Execution Status.
- Client cache не повреждает canonical state; PM-сущности и собственная STEP state machine отсутствуют.
- Client не содержит копию transition matrix как источника семантики.

#### Traceability

- STEP: STEP-002, STEP-005, STEP-006
- ADR: ADR-001

### REQ-002 — Открытие, проверка и pre-INIT lifecycle repository

**Приоритет:** Критический
**Источник:** `CLIENT-REQ-003`–`CLIENT-REQ-008`

#### Requirement

Клиент открывает путь запуска или выбранный local repository, различает initialized/pre-INIT/ordinary/damaged состояния, позволяет переключить project и провести `PROJECT_BRIEF.local.md` → `PROJECT INIT` flow.

#### Rationale

Первый пользовательский сценарий должен проходить без терминала и без нового source of truth для brief.

#### Acceptance

- Ошибка валидации объясняет конкретную причину; project switch сбрасывает runtime, но не меняет уже запущенный run.
- Brief можно создать, редактировать, сохранить local-only и открыть как raw file.
- Успешный INIT запускается как canonical command, затем refresh подтверждает `project.initialized: true`; повторный INIT направляет к RECONCILE.

#### Traceability

- STEP: STEP-003, STEP-008
- ADR: ADR-001

### REQ-003 — Явный multi-runtime выбор

**Приоритет:** Критический
**Источник:** `CLIENT-REQ-009`–`CLIENT-REQ-012`, `CLIENT-REQ-071`

#### Requirement

MVP поддерживает Codex и Claude Code через official programmable integration surfaces; runtime выбирается явно и не меняется автоматически.

#### Rationale

Пользователь должен знать фактический executor, а UI — честно представлять его capabilities.

#### Acceptance

- После открытия/переключения project runtime равен `none`; runtime-required action объясняет blocker.
- Ошибка выбранного runtime не запускает другой adapter.
- Run сохраняет `projectRoot`, `runtimeId`, `executionId`, `rootCommand`; TUI scraping не является primary integration path.

#### Traceability

- STEP: STEP-004, STEP-005, STEP-011
- ADR: ADR-003

### REQ-004 — Навигация и repository knowledge views

**Приоритет:** Высокий
**Источник:** `CLIENT-REQ-013`, `CLIENT-REQ-014`, `CLIENT-REQ-019`, `CLIENT-REQ-038`, `CLIENT-REQ-039`

#### Requirement

MVP даёт доступ к Overview, Roadmap/STEP, Requirements, Architecture/ADR, raw project files, Reviews, Audits, Releases, Skills, Git, Agents/Models, Updates и Policies; Overview показывает фактическое состояние проекта.

#### Rationale

UI должен снижать необходимость ручного обхода Markdown, не скрывая source files.

#### Acceptance

- Overview показывает project, branch, Harness release, selected runtime, validity, STEP summary/blockers/findings, Git/update state и STEP NEXT recommendation.
- REQ/ADR/STEP/evidence/reports видны структурированно и как raw Markdown.
- Роли Harness и runtime-specific model/effort/permissions показываются раздельно.

#### Traceability

- STEP: STEP-007, STEP-009, STEP-010
- ADR: не требуется

### REQ-005 — STEP contract и actions

**Приоритет:** Высокий
**Источник:** `CLIENT-REQ-015`–`CLIENT-REQ-018`

#### Requirement

UI отображает полный фактический contract STEP, актуальность Plan и применимые canonical STEP actions; `STEP NEXT` остаётся рекомендацией с recovery semantics.

#### Rationale

Пользователь не должен подменять task contract упрощённой карточкой или global lock.

#### Acceptance

- STEP Detail содержит Contract, Plan, Evidence, Review, History и Raw source, включая Plan basis/revision/currentness.
- Stale plan предлагает точное `STEP PLAN STEP-NNN`; blocked action объясняет разблокировку.
- Несколько unresolved STEP executions видны, но Harness primary recommendation не запрещает независимые Project/Git/Harness invocations.

#### Traceability

- STEP: STEP-010
- ADR: ADR-001

### REQ-006 — Review и STEP RUN policy

**Приоритет:** Критический
**Источник:** `CLIENT-REQ-020`–`CLIENT-REQ-024`

#### Requirement

Клиент отображает immutable review reports и настоящие RUN settings, не делая independent review optional и не изображая VERIFY/CLOSE canonical commands.

#### Rationale

UI не должен ослаблять quality gates Harness.

#### Acceptance

- В UI нет `never` для security/tests policy и toggles отключения independent review.
- Review report показывает verdict, revision, findings, severity, scenario, impact и verification observations.
- `maxFixReviewCycles` валидируется в диапазоне 1..5, а exhaustion не выглядит success.

#### Traceability

- STEP: STEP-010, STEP-012
- ADR: ADR-001

### REQ-007 — Инструменты quality, skills и updates

**Приоритет:** Высокий
**Источник:** `CLIENT-REQ-025`–`CLIENT-REQ-034`

#### Requirement

UI поддерживает различимые canonical flows Skills, STEP AUDIT, PROJECT RECONCILE, RELEASE CHECK, Harness Updates и только реальные settings.

#### Rationale

Общие tools должны быть доступны без ложных sematics и shadow state.

#### Acceptance

- FIND не устанавливает skill; UI показывает provenance/source/ref/license/safety notes и maxResults 1..10.
- AUDIT и RECONCILE различены; Release report и update route/blockers/handoff доступны.
- UPDATE APPLY использует только matching Harness CHECK либо запускает fresh CHECK; отдельный update state не создаётся.
- Protocol invariants не представлены configurable controls.

#### Traceability

- STEP: STEP-012
- ADR: ADR-001

### REQ-008 — Безопасный Git Workspace

**Приоритет:** Высокий
**Источник:** `CLIENT-REQ-035`–`CLIENT-REQ-037`

#### Requirement

Клиент показывает Git health и запускает canonical Git commands и CTS-permitted chains без unsafe shortcuts.

#### Rationale

Завершение главного lifecycle требует прозрачного безопасного publication flow.

#### Acceptance

- Показаны branch, protection/upstream/ahead-behind-diverged, staged/unstaged/untracked, validation и blockers.
- Доступны CHECK, COMMIT, PUSH, PR, SYNC и валидные chains.
- UI не предлагает force push, automatic merge или automatic rebase.

#### Traceability

- STEP: STEP-013
- ADR: ADR-001

### REQ-009 — Generic Command Palette и canonical preflight

**Приоритет:** Критический
**Источник:** `CLIENT-REQ-040`, `CLIENT-REQ-041`, `CLIENT-REQ-072`, `CLIENT-REQ-073`

#### Requirement

Generic command surface принимает raw canonical command/chain, использует tooling текущего repository для preflight и показывает normalized sequence до dispatch.

#### Rationale

Новые protocol commands должны оставаться доступны без дублирования semantics в client.

#### Acceptance

- Structural invalid input не запускает runtime и не начинает mutation.
- UI показывает segments/results/remaining/NOT_EXECUTED/runtime blockers для explicit valid chain.
- Generic surface не ограничен статическим списком специализированных экранов.

#### Traceability

- STEP: STEP-005, STEP-012, STEP-013
- ADR: ADR-001

### REQ-010 — Доступный локализуемый visual shell

**Приоритет:** Высокий
**Источник:** `CLIENT-REQ-042`–`CLIENT-REQ-044`

#### Requirement

MVP предоставляет dark visual language reference prototype, русский UI и localization-ready strings с accessibility baseline.

#### Rationale

Browser-first client должен быть доступен и согласован с продуктовым visual language.

#### Acceptance

- Поддержаны keyboard navigation, focus, contrast, aria labels, reduced motion, focusable blocked reasons и keyboard dialogs/palette.
- Используются semantic tokens specified reference; dark theme обязательна.
- Русский UI не размазывает hardcoded strings по компонентам; full English остаётся Post-MVP.

#### Traceability

- STEP: STEP-007
- ADR: не требуется

### REQ-011 — Browser-first техническая основа

**Приоритет:** Критический
**Источник:** `CLIENT-REQ-045`–`CLIENT-REQ-048`

#### Requirement

Клиент реализуется как TypeScript React application в Nx workspace с local Node application service, `ClientApi` и replaceable transport.

#### Rationale

Необходима проверяемая foundation, не связывающая frontend domain с privileged execution.

#### Acceptance

- Workspace и package surface соответствуют выбранному stack; UI не вызывает filesystem/process напрямую.
- ClientApi отделяет UI от transport/local service.
- UI domain не предполагает localhost endpoint.

#### Traceability

- STEP: STEP-001, STEP-002
- ADR: ADR-002

### REQ-012 — Live Execution Run

**Приоритет:** Критический
**Источник:** `CLIENT-REQ-063`–`CLIENT-REQ-070`

#### Requirement

Любая runtime command имеет живую UI projection над Execution Status, normalized runtime events и refreshed repository projections.

#### Rationale

Основной lifecycle нуждается в наблюдаемом execution без подмены protocol state.

#### Acceptance

- Surface раздельно показывает execution state, command result и runtime/UI state, immutable context, output, elapsed time и blockers.
- Поддержаны incremental output, structured input/confirmation, cancel при capability и безопасный sanitized Markdown rendering.
- Active run переживает navigation; после mutation UI перечитывает repository/Git, а не доверяет self-report модели.

#### Traceability

- STEP: STEP-005, STEP-011
- ADR: ADR-001, ADR-003

### REQ-013 — Restart-safe execution recovery

**Приоритет:** Критический
**Источник:** `CLIENT-REQ-069`, `CLIENT-REQ-074`

#### Requirement

Клиент использует Harness Execution Status и resolver для unresolved execution/recovery и не создаёт параллельный canonical execution store.

#### Rationale

Reload, service restart или interruption не должны уничтожать фактический путь продолжения.

#### Acceptance

- UI корректно различает mode/status/result/resolver status и несколько unresolved executions.
- Повтор running root command resume-ит её; runtime binding при утрате требует explicit selection.
- Activity/analytics не выдаётся за recovery state или product evidence.

#### Traceability

- STEP: STEP-006, STEP-011
- ADR: ADR-001, ADR-003

## Post-MVP и architectural reserve

### REQ-014 — Activity и execution provenance

**Приоритет:** Средний
**Источник:** `CLIENT-REQ-049`–`CLIENT-REQ-055`

#### Requirement

Client-owned Activity/Runs хранится local-only, отделён от Execution Status и не собирает hidden chain of thought, secrets либо full context by default.

#### Rationale

Observability полезна, но не должна менять Harness verdict/recovery.

#### Acceptance

- JSONL/retention/provenance принадлежат client layer; unknown metadata не угадывается.
- Analytics отображает факты без автоматической оценки моделей.

#### Traceability

- STEP: STEP-014
- ADR: ADR-001

### REQ-015 — Post-MVP UX

**Приоритет:** Низкий
**Источник:** `CLIENT-REQ-056`–`CLIENT-REQ-058`

#### Requirement

Отдельные GitHub Collaboration, full light theme, English UI и live repository watcher развиваются после MVP.

#### Rationale

Они не блокируют главный lifecycle.

#### Acceptance

- Каждая возможность сохраняет границы REQ-001 и REQ-010.

#### Traceability

- STEP: STEP-014
- ADR: не требуется

### REQ-016 — Hosted UI reserve и secure local bridge

**Приоритет:** Средний
**Источник:** `CLIENT-REQ-059`, `CLIENT-REQ-060`

#### Requirement

Архитектура не закрывает hosted UI с локальным bridge без cloud execution; будущий bridge требует explicit pairing, authentication, origin allowlist, CSRF, short-lived credentials, revoke и capability allowlist.

#### Rationale

Remote UI не должен неявно открывать arbitrary shell access или выгружать repository в облако.

#### Acceptance

- Предварительное исследование фиксирует threat model и ADR до implementation bridge.

#### Traceability

- STEP: STEP-015
- ADR: ADR-002
