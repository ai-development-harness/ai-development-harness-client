# ADR-001 — Repository и Harness как источник истины

**Status:** Accepted
**Date:** 2026-09-19
**Deciders:** Команда проекта
**Supersedes:** —
**Superseded by:** —

## Context

Клиент показывает lifecycle Harness, но repository уже содержит canonical artifacts, CTS и Execution Status.

## Problem

Нужна UI-модель, не создающая конкурирующие статусы и orchestration semantics.

## Decision

Клиент строит проекции из repository, Git и Harness tooling. Он передаёт raw canonical command в Harness preflight/execution flow и не копирует transition graph или STEP state machine.

## Alternatives considered

Собственная state machine в UI создаёт второй источник истины, а текстовые ответы runtime не дают надёжного recovery state.

## Consequences

После mutation необходимы repository/Git refresh; свободный model output остаётся недоверенным отображаемым содержимым.

## Security implications

Protocol state не выводится из текста модели.

## Data / migration implications

Новых canonical stores не создаётся.

## Compatibility / operational implications

Client требует валидный Harness repository для command actions.

## Traceability

- REQ: REQ-001, REQ-006, REQ-012, REQ-013
- STEP: STEP-002, STEP-005, STEP-006, STEP-011
