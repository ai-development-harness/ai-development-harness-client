# ADR-004 — Безопасная Git worktree projection

**Status:** Accepted
**Date:** 2026-09-19
**Deciders:** Команда проекта
**Supersedes:** —
**Superseded by:** —

## Context

`local-service` открывает каталог, выбранный пользователем, и строит read-only repository projection. Этот выбор не устанавливает доверие к содержимому root. Независимый review STEP-002 воспроизвёл выполнение `filter.<name>.clean/process` из `.gitattributes` при `git status` с правами local service.

## Problem

Нужно честно представить отсутствие безопасно доступных Git facts, не исполняя repository-controlled code и не превращая локальную проекцию в скрытый privileged Git bridge.

## Decision

В MVP selected root считается untrusted. `local-service` не запускает Git subprocess для его worktree или metadata: фиксированные аргументы, `safe.directory`, same UID, валидный Harness scaffold и отсутствие известных config keys не доказывают безопасную исполнимую closure.

`GitProjection` остаётся частью typed ClientApi, но Git facts возвращаются как `unavailable` с reason `SECURITY_POLICY`. Это не означает clean worktree, отсутствие Git или structural invalidity repository. Repository projection продолжает читать только data artifacts через ограниченную filesystem boundary; operational I/O и resource failures остаются отличимыми typed errors.

Worktree или metadata Git capability принадлежит STEP-013 и возможна только после его отдельного capability decision и independent security review. Если она потребует Git execution, решение должно предусмотреть OS sandbox worker: trusted absolute Git binary, isolated filesystem/home/temp, запрет сети и helpers, resource/output/time limits, process-group termination, canonical root/Git-dir identity и revoke при их замене.

## Alternatives considered

### Неформально доверенный repository

Отклонено для MVP. Сам выбор path, предыдущий успешный read, owner UID или Git configuration не доказывают, что filters, config includes, external Git dir, hooks и helpers не исполнят код. Полный trust grant потребует отдельного scoped, revocable capability lifecycle.

### Ограниченный Git allowlist с fixed arguments

Отклонено для MVP. `git status` уже доказывает риск filters; metadata commands также читают repository-local config, refs и Git dir, а Git может использовать дополнительные механизмы. Timeout и очищенный global config ограничивают ущерб, но не создают isolation boundary.

### OS sandbox для Git

Отложено. Переносимый sandbox с filesystem, network, process и resource isolation является новой capability, а не деталью `loadRepository`; его проектирование относится к отдельному STEP.

## Consequences

UI честно показывает Git facts unavailable по security policy и не делает inference о чистоте worktree. STEP-002 должен удалить Git subprocess из untrusted repository projection, расширить typed unavailable reason и не возвращать raw Git stderr в UI. Это уменьшает MVP observability, но сохраняет repository/Harness как source of truth без произвольного исполнения.

## Security implications

Threat model включает `.git/config`, config includes, `.gitattributes`, filters, hooks, external Git dir, refs/objects, remote/promisor helpers, symbolic links, FIFO/device files, oversized or numerous artifacts, hangs и attacker-controlled subprocess output. Отсутствуют ancestor fallback и repository-controlled tooling fallback. Текущая Linux data-only projection и будущая capability fail closed: каждый artifact path segment открывается через `/proc/self/fd` с `O_NOFOLLOW`, final file — с `O_NONBLOCK`, а type и size проверяются на том же descriptor. Directory traversal streamed и ограничен общим числом entries, artifact reads bounded; при отсутствии platform capability projection возвращает typed I/O failure.

## Data / migration implications

Новых canonical stores не создаётся. `unavailable` получает typed reason; потребители, которые различали только `clean`/`dirty`/`unavailable`, сохраняют безопасную деградацию и не могут трактовать её как отсутствие Git.

## Compatibility / operational implications

До отдельной capability Git repository, upstream, divergence и worktree не отображаются для selected root. Linux procfs является operational prerequisite текущей data-only projection; его отсутствие не делает repository structurally invalid, а возвращает typed I/O failure. Future transport или hosted bridge не меняют это решение без нового ADR/STEP.

## Traceability

- REQ: REQ-001, REQ-011
- STEP: STEP-002, STEP-013, STEP-017
