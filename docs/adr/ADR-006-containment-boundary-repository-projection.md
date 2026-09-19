# ADR-006 — Containment boundary repository projection

**Status:** Accepted
**Date:** 2026-09-19
**Deciders:** Команда проекта
**Supersedes:** ADR-005
**Superseded by:** —

## Context

ADR-005 выбрал isolated child process, но independent architecture/security review STEP-018 выявил три незакрытые границы: parent мог зависнуть в `realpath` до запуска child, identity process group не доказывала безопасный teardown, а profile child не ограничивал унаследованные capability. Для untrusted filesystem это нарушает требование bounded responsiveness local service.

## Decision

Каждый admission-controlled load выполняется в supervisor-owned containment unit. Это не утверждение о sandbox. Для единственного data-only load обязательны запрет network capability и создания дочерних процессов, а также hard limits CPU, memory и PID/tasks; доверенный bundled runtime/entrypoint, `cwd`, environment, FD и IPC profile также обязательны. Никакая из этих гарантий не может быть объявлена residual risk для успешного load. Единственный accepted residual risk — process, застрявший в uninterruptible OS state после попытки kill-all: он не освобождает lease и не делает unit безопасно пустым.

1. В начале `loadRepository` parent запускает monotonic hard deadline; bounded queue consumption входит в тот же deadline. До admission и spawn parent выполняет только bounded lexical validation входной строки: абсолютный путь, отсутствие NUL и ограничение размера. Он не вызывает над selected root никаких filesystem syscall, включая `realpath`, `stat`, `access` и `cwd`. Lexical rejection возвращает `INVALID_PROJECT_ROOT`; already-aborted signal возвращает `CANCELLED` без spawn.
2. Parent получает admission lease до создания unit и spawn; отсутствие capacity возвращает `RESOURCE_LIMIT`. Deadline покрывает queue, spawn, handshake, root acquisition, чтение, IPC и teardown. Child сначала открывает selected root как directory descriptor с безопасными flags и получает `dev`/`ino` через `fstat` этого же descriptor; только этот descriptor используется для всех filesystem reads текущего load. `canonicalPath`, если platform primitive может получить его из уже открытого descriptor без повторного resolution selected path, является только advisory display value и никогда не участвует в access control или source identity. Если такое получение невозможно, artifact не содержит `canonicalPath`; отдельный `realpath` до/после open и несвязанная пара path + `dev`/`ino` запрещены. Parent не делает filesystem recheck; security identity текущего load — descriptor-derived `dev`/`ino`.
3. До любого untrusted I/O supervisor создаёт private containment unit и помещает в неё worker. Unit имеет stable, non-reusable OS handle, принадлежащий supervisor. Lease освобождается лишь после доказательства, что unit пуст, и reap direct child; PID, PGID, отрицательный `kill` и один child exit сами по себе не являются таким доказательством. Supported platform profile обязан до admission durable записывать supervisor-independent identity unit и состояние lease, а после restart до любого нового admission восстанавливать эти records, сверять их со stable OS handles и продолжать reconciliation до empty proof/reap. Неизвестный, неразрешимый или неотреконсилированный retained unit остаётся занятым budget; service не может считать capacity свободной. Если платформа не предоставляет атомарное создание private unit, stable handle, kill-all, proof empty или durable restart-safe recovery, service возвращает `PLATFORM_UNSUPPORTED` без fallback.
4. Spawn использует trusted absolute bundled runtime и entrypoint, `shell: false`, trusted cwd, allowlisted environment без loader hooks и secrets, явный allowlist stdio/IPC и закрытие остальных FD. В child запрещены root code, config и dynamic imports. Пока проект не принял отдельным ADR проверенный platform profile с конкретным primitive и postconditions для запрета сети и child-process creation, а также hard limits CPU, memory и PID/tasks, **нет supported platform для успешного data-only load**: service всегда возвращает `PLATFORM_UNSUPPORTED` до spawn и без fallback. Будущий ADR обязан назвать supported target и проверяемые postconditions каждого required limit; иначе success запрещён.
5. Caller result immutable. Already-aborted request возвращает `CANCELLED`; после admission первый observed terminal event фиксирует result: cancel — `CANCELLED`, deadline — `IO_TIMEOUT`, а spawn/handshake/protocol/teardown failure до settlement — `IO_ERROR`; bad artifact до settlement — `INVALID_REPOSITORY`. После `CANCELLED`/`IO_TIMEOUT` поздний IPC игнорируется и никакая поздняя ошибка teardown не заменяет caller result. Teardown продолжается под lease и capacity остаётся занята до empty proof. Late teardown failure записывается в durable unit record как отдельный typed `supervisorOutcome` (`TEARDOWN_FAILED`, opaque unit identity, retained lease). Read-only supervisor observation возвращает только typed lifecycle `ACTIVE`, `RECOVERING` или `TEARDOWN_FAILED` и факт retained lease; она не раскрывает selected path, PID или raw diagnostic. Этот outcome доступен после restart до successful empty proof/reap, а startup reconciliation не допускает reuse capacity до такого доказательства. Успешный repository result разрешён только после teardown/empty proof; `RESOURCE_LIMIT` означает исчерпанный budget. Ни один operational outcome не является fact о validity repository.

## Alternatives considered

### ADR-005 process-group teardown

Заменено. Process group без private stable containment identity допускает collateral signal, PID/PGID reuse и преждевременное освобождение capacity.

### In-process I/O и isolated worker thread

Отклонено. Promise, `AbortSignal` и worker thread не дают hard revoke неотменяемого filesystem I/O и не освобождают process-wide resources.

### Fallback к in-process projection

Отклонено. При отсутствии containment guarantees service fail-closed возвращает `PLATFORM_UNSUPPORTED`.

## Consequences

STEP-002 не реализует success path, пока отдельный ADR не добавит supported platform profile; до этого допустим только fail-closed `PLATFORM_UNSUPPORTED` до spawn. Его future tests должны покрыть каждый required platform limit и fail-closed при отсутствии любого из них, descriptor-first acquisition и race replacement selected symlink/mount, отсутствие parent filesystem I/O до child readiness, deadline/cancel без ожидания, late IPC, invalid artifact, handshake/protocol/crash/teardown errors, immutable caller result при поздней teardown failure, durable read-only `supervisorOutcome`, unit-empty accounting, restart reconciliation retained unit без reuse capacity, `RESOURCE_LIMIT` и отсутствие in-process fallback. Git policy ADR-004 остаётся неизменной.

## Security implications

Selected root не получает shell, repository-controlled cwd, executable, config, dynamic import, transport или command-dispatch capability. До отдельного supported profile load не получает и OS capability. Bounded IPC не передаёт raw attacker-controlled stderr. Residual process в uninterruptible OS state ограничивает availability durable retained lease до empty proof; restart supervisor не может освободить этот budget без recovery и OS proof.

## Data / migration implications

Новых canonical stores и migrations нет. `ClientApi` получает только backward-compatible typed signal/error union.

## Traceability

- REQ: REQ-001, REQ-011
- STEP: STEP-002, STEP-018
