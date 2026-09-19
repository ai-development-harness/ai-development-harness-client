# ADR-005 — Отменяемая граница repository projection

**Status:** Accepted
**Date:** 2026-09-19
**Deciders:** Команда проекта
**Supersedes:** —
**Superseded by:** ADR-006

## Context

`local-service` строит data-only projection для выбранного пользователем `projectRoot`. Выбор root не создаёт доверия к его filesystem: `realpath`, descriptor-relative `open`, `stat`, `read` и `opendir` могут зависнуть на FUSE/NFS или другом unresponsive filesystem. `O_NONBLOCK` защищает чтение FIFO, но не гарантирует отмену такого kernel I/O.

Независимый security review STEP-002 подтвердил, что in-process promise и `AbortSignal` прекращают ожидание caller, но не освобождают зависший service/libuv operation. Isolated worker thread не меняет этого свойства: operation и связанные ресурсы процесса могут остаться занятыми, а безопасный revoke worker не гарантирован.

## Problem

Нужна bounded и отменяемая projection, которая сохраняет responsiveness local service при зависшем untrusted filesystem I/O и не позволяет deadline стать способом неограниченно создавать зависшие workers. Решение не должно расширять capability selected repository до command execution, transport или shell access.

## Decision

Для MVP каждый admission-controlled `loadRepository` исполняется в отдельном isolated child process. Родительский supervisor владеет deadline, `AbortSignal`, lifecycle и capacity; child выполняет только trusted bundled entrypoint с canonicalized selected root и versioned data-only IPC request.

По cancellation или hard deadline parent прекращает ожидание результата, возвращает typed outcome и завершает process group: сначала `SIGTERM` с ограниченным grace period, затем `SIGKILL`. Parent не ждёт завершения зависшего child, чтобы вернуть control caller. Cancellation не обязана мгновенно прервать uninterruptible kernel operation, но обязана за bounded время освободить parent service от ожидания и не разрешить неограниченный spawn.

Child не получает shell, repository-controlled cwd, код selected root, UI/runtime command dispatch или transport capability. IPC содержит только минимальный structured request и bounded structured data/error response; raw attacker-controlled stderr не пересылается потребителю. Parent проверяет protocol/version, root identity, message shape, поздние сообщения и cleanup.

Supervisor выдаёт lease до подтверждённого exit/reap process group. Он ограничивает одновременно живые groups, размер request/output и связанные очереди. После failed teardown capacity не переиспользуется: residual stuck child остаётся учтённым до OS-reap и создаёт наблюдаемый operational blocker. При исчерпании budget projection fail-closed возвращает `RESOURCE_LIMIT`.

Caller получает typed outcomes: `CANCELLED` для cancellation, `IO_TIMEOUT` для hard deadline, `IO_ERROR` для spawn/IPC/teardown/isolation failures, `PLATFORM_UNSUPPORTED` при отсутствии process-group termination, monitored child lifecycle или требуемой filesystem boundary, `RESOURCE_LIMIT` при исчерпании budget и `INVALID_REPOSITORY` для недоверенного либо некорректного artifact. Operational outcomes не являются facts о validity repository.

На платформе без требуемых гарантий projection недоступна как typed operational failure. Fallback к in-process read запрещён.

## Alternatives considered

### In-process I/O с promise или AbortSignal

Отклонено. Прекращение ожидания Promise не отменяет uninterruptible filesystem operation и не освобождает libuv/service capacity.

### Isolated worker thread

Отклонено. Thread не обеспечивает hard revoke неотменяемого kernel I/O и сохраняет risk process-wide resource exhaustion.

### Постоянный worker pool

Отклонено для MVP. Pool усложняет revoke, accounting и предотвращение cross-request contamination; per-request child даёт однозначное ownership lifecycle.

### Отказ от projection при невозможности bounded execution

Принято как platform fallback. Если process isolation нельзя реализовать с описанными гарантиями, service возвращает `PLATFORM_UNSUPPORTED`, а не читает repository in-process.

## Consequences

STEP-002 заменяет in-process loader на process-supervised boundary и расширяет `ClientApi` только typed signal/error union. UI не получает privileged filesystem/process API. Реализация должна иметь controllable hanging-I/O seam в child и regression coverage для deadline/cancel/process-group teardown без await, late result, malformed IPC, child crash, platform limitation, caps, recovery после normal completion, no-capacity-reuse до reap, отсутствия in-process fallback и raw stderr.

## Security implications

Boundary противодействует untrusted filesystem hangs, но residual child в uninterruptible OS state может оставаться до OS-reap. Availability деградирует ограниченно удержанными leases, а не бесконечным освобождением slots. Child entrypoint и protocol принадлежат trusted application bundle; repository-controlled command, executable, cwd и transport capability запрещены.

## Data / migration implications

Новых canonical stores и migrations нет. Error union расширяется backward-compatible typed result, а не выводом из текста ошибки.

## Compatibility / operational implications

Реализация требует monitored child lifecycle и process-group termination. Supervisor обязан сделать residual stuck processes и удержанные leases наблюдаемыми operationally. Git policy ADR-004 не меняется.

## Traceability

- REQ: REQ-001, REQ-011
- STEP: STEP-002, STEP-018
