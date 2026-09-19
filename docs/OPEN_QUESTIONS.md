# Открытые вопросы

## OQ-001 — Первый production transport

Нужно решить, будет ли первым production target только local Node.js service или также desktop/local bridge. Контракт `ClientApi` и replaceable transport уже обязателен; выбор конкретного bootstrap не нужен для INIT.

**Handoff:** STEP-001 / STEP-002; при необходимости отдельный ADR STEP.

## OQ-002 — Runtime account identity в MVP

Не определено, достаточно ли для MVP availability/authenticated/selected state или нужен показ account identity. Нельзя обещать поле, которое runtime adapter не может надёжно получить.

**Handoff:** STEP-004.

## OQ-003 — UI kit и component playground

Не определён момент перехода от базовых semantic tokens к отдельному reusable UI kit/component playground. Это не блокирует доступный UI shell.

**Handoff:** STEP-007.
