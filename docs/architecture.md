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

Data-only repository projection для untrusted root выполняется только через admission-controlled supervisor-owned containment unit. ADR-006 остаётся текущим Accepted base contract, а [ADR-007](adr/ADR-007-crash-consistent-containment-lifecycle.md) — Proposed additive lifecycle handoff и не является current до independent review PASS и supported-primitive decision STEP-022. Base clauses ADR-006 (lexical-only parent, descriptor-first identity, trusted spawn/isolation, immutable settlement и success-after-teardown) не исчезают от принятия lifecycle contract без явного переноса и review. До unit parent делает лишь bounded lexical validation, а monotonic deadline покрывает spawn, descriptor-first root acquisition, I/O, IPC и teardown; `canonicalPath` может быть только advisory, а identity — `dev`/`ino` того же descriptor. Lease освобождается только после empty proof unit и reap proven direct child. Proposed ADR-007 требует durable `RESERVED → CREATED → BOUND → ACTIVE → TEARDOWN`: до OS mutation retained lease и opaque key durable фиксируются, а missing/corrupt/unresolvable recovery record удерживает budget fail-closed. ADR-006 требует до supported OS profile fail-closed `PLATFORM_UNSUPPORTED` до spawn без in-process fallback; current implementation имеет documented drift, которым владеет STEP-021, поэтому это не является утверждением о уже enforced runtime policy. Late teardown failure не меняет уже settled caller result.

## Выполнение и recovery

Перед runtime dispatch service вызывает актуальное Harness tooling для structural preflight; transition matrix не копируется в TypeScript. Harness Execution Status является источником `executionId`, root/current command, результата и restart-safe resolver. Runtime events нормализуются в client stream, но не меняют protocol state. Минимальная local-only binding runtime session к `executionId` допустима лишь для reattach и не является analytics.

## Runtime и безопасность

Runtime выбирается явно после открытия/переключения проекта. Контекст запущенного run неизменяем: `projectRoot`, `runtimeId`, `executionId`, `rootCommand`. Official programmable APIs — Codex App Server и Claude Agent SDK — являются базовым integration path. Вывод модели недоверен: HTML/scripts/terminal controls не исполняются.

## Принятые решения

- [ADR-001](adr/ADR-001-repository-i-harness-kak-istochnik-istiny.md) — repository/Harness как source of truth.
- [ADR-002](adr/ADR-002-clientapi-i-zamenyaemaya-lokalnaya-granitsa.md) — ClientApi и replaceable local service boundary.
- [ADR-003](adr/ADR-003-runtime-adaptery-i-yavnyy-vybor.md) — first-class adapters и explicit runtime selection.
- [ADR-004](adr/ADR-004-bezopasnaya-git-worktree-proektsiya.md) — Git facts untrusted selected repository недоступны до отдельной capability boundary.
- [ADR-005](adr/ADR-005-otmenyaemaya-granitsa-repository-projection.md) — historical process-per-request boundary, superseded ADR-006.
- [ADR-006](adr/ADR-006-containment-boundary-repository-projection.md) — supervisor-owned containment boundary repository projection.
- [ADR-007](adr/ADR-007-crash-consistent-containment-lifecycle.md) — Proposed additive crash-consistent lifecycle; не заменяет base clauses ADR-006 без explicit reviewed decision.

## Отложенные решения

Первый production transport, account identity runtime и момент выделения UI kit не зафиксированы: это [open questions](OPEN_QUESTIONS.md), а не неявные архитектурные решения.
