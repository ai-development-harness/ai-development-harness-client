# Архитектура AI Development Harness Client

## Контекст и границы

Клиент является локальным browser-first UI над существующим Harness repository. Canonical REQ, ADR, STEP, evidence, Git state, CTS и Execution Status принадлежат repository/Harness; UI только читает их и запускает protocol tooling через runtime adapter.

## Базовая структура

```text
React UI
  → ClientApi
  → replaceable transport/bootstrap
  → local application service
       → repository и Git projections
       → Harness preflight / CTS / Execution Status / resolver
       → runtime adapters
            → Codex App Server | Claude Agent SDK
```

Frontend domain layer не зависит напрямую от filesystem или process execution и не предполагает localhost endpoint. Transport остаётся заменяемым, чтобы не закрыть путь к будущему secure local bridge.

## Выполнение и recovery

Перед runtime dispatch service вызывает актуальное Harness tooling для structural preflight; transition matrix не копируется в TypeScript. Harness Execution Status является источником `executionId`, root/current command, результата и restart-safe resolver. Runtime events нормализуются в client stream, но не меняют protocol state. Минимальная local-only binding runtime session к `executionId` допустима лишь для reattach и не является analytics.

## Runtime и безопасность

Runtime выбирается явно после открытия/переключения проекта. Контекст запущенного run неизменяем: `projectRoot`, `runtimeId`, `executionId`, `rootCommand`. Official programmable APIs — Codex App Server и Claude Agent SDK — являются базовым integration path. Вывод модели недоверен: HTML/scripts/terminal controls не исполняются.

## Принятые решения

- [ADR-001](adr/ADR-001-repository-i-harness-kak-istochnik-istiny.md) — repository/Harness как source of truth.
- [ADR-002](adr/ADR-002-clientapi-i-zamenyaemaya-lokalnaya-granitsa.md) — ClientApi и replaceable local service boundary.
- [ADR-003](adr/ADR-003-runtime-adaptery-i-yavnyy-vybor.md) — first-class adapters и explicit runtime selection.

## Отложенные решения

Первый production transport, account identity runtime и момент выделения UI kit не зафиксированы: это [open questions](OPEN_QUESTIONS.md), а не неявные архитектурные решения.
