# Native runtime bridge — stage 1 (Harness #294, client #11)

## Статус

**Реализованы адаптеры и контрактный runtime bridge. Production activation пока
заблокирована STEP-002.** Этот документ не заявляет, что Codex/Claude уже
запускаются из GUI: main.ts не импортирует runtime modules, ClientApi ещё
предоставляет только loadRepository, реальный transport/admission supervisor
не готов.

Harness CLI **не** запускает модели и не должен начать их запускать ради UI.
Runtime bridge живёт в client/local-service и будет подключён после supported
platform containment и завершения STEP-002 → STEP-004/005.

## Архитектура

    UI выбирает Claude Code или Codex (никогда не auto-switch)
      ↓
    Approved local-service supervisor / ClientApi (будущий STEP-002/004/005)
      ↓
    HarnessAuthority.prepare → deterministic Harness resolver + session entry
      ├─ BLOCKED → ни одного native SDK/process call
      ├─ NEW COMMAND → start выбранного provider
      └─ RECOVERY → start или native resume (только того же provider)
      ↓
    RuntimeBridge (provider-neutral telemetry, no CTS)
      ├─ CodexAppServerAdapter → already initialized app-server JSON-RPC port
      └─ ClaudeAgentSdkAdapter → injected Claude Agent SDK query(...)
      ↓
    Normalized event stream → UI; Activity не становится source of truth

Все canonical REQ/ADR/STEP и execution status остаются во владении Harness.
Ни account status, ни native session handle не доказывают safe resume.

### Что было → Что стало

| Ситуация | Раньше | Теперь (на уровне bridge) |
| --- | --- | --- |
| Claude PLAN → Codex IMPLEMENT | Нет унифицированного SDK consumer | Новая canonical команда запускает Codex без попытки открыть Claude session |
| Прерванный IMPLEMENT, та же модель | Native session semantics не реализованы | Resume допустим только с matching runtime/projectRoot handle и Harness admission |
| Native session устарела | Нет явного маршрута fallback | Только доказанный pre-turn miss → повторное обращение к Harness; при PASS — start новой сессии |
| Прерванный IMPLEMENT, другая модель | Риск смешать native handles | Handle прошлого provider не используется ни в одном вызове |
| Пришёл permission request | Нет bridge | Создаётся input.required; без explicit UI approval ответ deny |
| Нужный MCP отсутствует | Неясные возможности | Только обязательная capability блокирует, необязательная не мешает |
| Провайдер вернул internal data/tokens | Нет единой фильтрации | UI получает только whitelisted event fields, не raw JSON-RPC/SDK metadata |
| SDK вернул 'failed' или 'interrupted' | Не было формального маппинга | Нельзя принимать за SUCCESS или автоматически изменять Harness cursor |

## Реальные provider APIs

### Codex App Server

Транспорт будущего supervisor предоставляет initialize() c handshake
initialize → initialized, JSON-RPC request(method, params), асинхронный поток
сообщений и respond(id, approval). Adapter выполняет:

- account/read;
- thread/start (cwd) либо thread/resume (только та же session);
- turn/start (input text из Harness canonical context);
- item/agentMessage/delta, item/started, item/completed, turn/completed;
- item/commandExecution/requestApproval и item/fileChange/requestApproval;
- turn/interrupt при cancellation.

**Важно:** порт обязан буферизовать ранние notifications; после turn/start
сервер вправе послать turn/started до возврата RPC. Нативная ошибка
'thread not found' классифицируется по структурированному кодy, а не
по тексту ошибки. При других ошибках runtime bridge не повторяет turn.

Reference: https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server

### Claude Agent SDK

Фабрика получает уже подключённую SDK query функцию с аргументами
prompt/options: cwd, resume, abortController, permissionMode=default,
canUseTool. Она:

- сохраняет session_id только как local UI metadata;
- normalizes system/init, stream_event text_delta, assistant tool metadata,
  result/success|error;
- передаёт canUseTool в user-approved permission broker и по умолчанию deny;
- использует AbortController для отмены.

До model/tool output structured SDK 'session not found' может приводить
к fresh-session attempt **только через повторный Harness admission**.
Произвольная runtime exception никогда не считается безопасным resume.

Reference: https://code.claude.com/docs/en/agent-sdk/typescript
Reference: https://code.claude.com/docs/en/agent-sdk/sessions

## Ограничения и безопасность

1. **Fail-closed:** нет вызова native adapter без trusted HarnessAuthority.
   Этот контракт доверенного host пока не реализован и поэтому НЕ подключён
   к main.ts; запуск моделей до принятия STEP-002 запрещён.
2. Нет automatic fallback на другой provider. Даже если лимиты у Claude
   закончились, новый Codex выбирает только пользователь.
3. Session identifiers существуют лишь внутри текущего adapter вызова/UI;
   не являются долговечным подтверждением execution, не записываются в
   REQ/ADR/STEP fingerprints.
4. Права инструментов не разрешаются по умолчанию. Codex явно получает
   `approvalPolicy=on-request` и `sandbox=workspace-write` на уровне thread;
   Claude использует `permissionMode=default` и `settingSources=[]`, не
   загружая обычные user/project allowlists. Managed policy остаётся вне
   контроля адаптера. Без permission broker команда/редактирование получают
   deny; UI broker должен увидеть конкретный command/path preview.
   Если preview недоступен, запрос отклоняется вместо слепого подтверждения.
   Никаких bypassPermissions.
5. Raw SDK event/JSON-RPC args, stderr/traceback и auth tokens не выводятся
   как telemetry. В UI допускается только whitelisted text/tool/type.
   Содержимое model text по природе остаётся недоверенным и должно безопасно
   отображаться как text, не как HTML/скрипт. Данные конкретного action,
   необходимые для осмысленного подтверждения, доступны лишь callback
   интерактивного permission broker — не логируются в runtime events.
6. Нет прямого процесса/FS I/O/transport в новых файлах runtime. Реальные
   dependencies и invocation появятся за approved supervisor boundary.
7. Не считать этот этап end-to-end SDK integration или выполненным STEP-004/005.
   См. client #11 и Harness #294.

## Как проверить

    corepack yarn install --immutable
    corepack yarn nx typecheck local-service --skip-nx-cache
    corepack yarn nx test local-service --skip-nx-cache

Scripted cases проверяют Codex JSON-RPC methods, authenticated account
allowlist, Claude SDK query resume, input approval, authorization gate,
session fallback, failure/interruption и отсутствие чужих runtime events.

После безопасного STEP-002 нужен отдельный integration test с реально
запущенными Codex App Server и Claude SDK, плюс проверка продолжения
прерванного STEP через Harness resolver. Без этого #294/#11 остаются открытыми.

## Действия пользователя

| Сценарий | Новые действия |
| --- | --- |
| Claude PLAN → Codex IMPLEMENT → Claude REVIEW | Никаких |
| Нативная сессия протухла | Никакой ручной миграции; fresh session после Harness допуска |
| Требуется опасный tool | Только существующее явное разрешение через UI |
| Нет supported containment profile STEP-002 | Runtime execution в GUI пока недоступен, обхода нет |
