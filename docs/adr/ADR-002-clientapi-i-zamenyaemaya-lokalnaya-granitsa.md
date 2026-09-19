# ADR-002 — ClientApi и заменяемая локальная граница

**Status:** Accepted
**Date:** 2026-09-19
**Deciders:** Команда проекта
**Supersedes:** —
**Superseded by:** —

## Context

Browser UI работает с локальными файлами, Git, Harness tooling и runtime adapters, но будущий transport ещё не выбран.

## Problem

Прямой filesystem/process access из React привяжет продукт к одному окружению.

## Decision

UI обращается к `ClientApi`; transport/bootstrap и local application service находятся за этой границей. Domain UI не содержит hardcoded localhost assumptions.

## Alternatives considered

Прямой privileged access из frontend смешивает presentation с execution; жёсткий HTTP transport преждевременно фиксирует topology.

## Consequences

Нужны typed contracts и тестируемые adapters. Конкретный transport выбирается отдельной работой.

## Security implications

Privileged операции концентрируются в local service; future bridge сможет использовать capability allowlist.

## Data / migration implications

Не применимо.

## Compatibility / operational implications

Поддерживается local-first MVP и architectural reserve hosted UI с локальным bridge.

## Traceability

- REQ: REQ-011, REQ-016
- STEP: STEP-001, STEP-002, STEP-015
