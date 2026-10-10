/**
 * Локальная граница runtime adapters — не state machine Harness.
 *
 * API не экспортирован в ClientApi и не подключён к main.ts: STEP-002 пока
 * fail-closed. Эти types описывают интеграцию с будущим approved supervisor.
 * Никогда не передавать сюда произвольный proposal модели как решение CTS.
 */
export type RuntimeId = 'codex' | 'claude';

export type RuntimeCapability =
  | 'streaming'
  | 'resume'
  | 'cancel'
  | 'interactiveInput'
  | 'toolMcp'
  | 'authenticatedAccount';

export type SupportState = 'native' | 'synthesized' | 'unsupported';

export interface AccountSummary {
  /** Значение только из factual provider account endpoint. */
  loggedIn: boolean | 'unknown';
  email?: string;
  organization?: string;
  subscription?: string;
}

export type EventType =
  | 'run.started'
  | 'model.message.delta'
  | 'model.message.completed'
  | 'tool.started'
  | 'tool.completed'
  | 'input.required'
  | 'auth.required'
  | 'run.interrupted'
  | 'run.completed'
  | 'run.failed';

export interface RuntimeEvent {
  type: EventType;
  runtimeId: RuntimeId;
  executionId: string;
  /** Только UI-level metadata. Не является authoritative Harness cursor. */
  sessionId?: string;
  data?: {
    text?: string;
    tool?: string;
    requestId?: string;
    reasonCode?: string;
  };
}

export interface PermissionRequest {
  runtimeId: RuntimeId;
  kind: 'tool' | 'command' | 'file-change';
  name: string;
  /** Не передаём raw command args, environment или токены в UI event/log. */
  requestId?: string;
}

export type PermissionBroker = (request: PermissionRequest) => Promise<'allow' | 'deny'>;

export interface NativeExecution {
  executionId: string;
  projectRoot: string;
  prompt: string;
  /** Только native handle выбранного runtime, не Harness executionId. */
  nativeSessionId?: string;
  signal: AbortSignal;
  emit: (event: RuntimeEvent) => void;
  requestPermission: PermissionBroker;
}

export type NativeStatus = 'completed' | 'failed' | 'interrupted';

export interface NativeResult {
  status: NativeStatus;
  sessionId?: string;
  reasonCode?: string;
}

export interface NativeRuntimeAdapter {
  readonly runtimeId: RuntimeId;
  getAccount(): Promise<AccountSummary>;
  getCapabilities(): Promise<Readonly<Record<RuntimeCapability, SupportState>>>;
  execute(request: NativeExecution): Promise<NativeResult>;
}

/**
 * Нативную сессию невозможно восстановить ДО старта нового turn/query.
 * Если turn уже создан или side effect мог произойти, использовать эту ошибку
 * нельзя: Harness должен остановиться и провести обычную reconciliation.
 */
export class NativeSessionUnavailable extends Error {
  constructor() {
    super('native session unavailable before execution');
    this.name = 'NativeSessionUnavailable';
  }
}

export interface ExecutionRequest {
  /** Выбирает пользователь, не автоматически на основании ошибки provider. */
  runtimeId: RuntimeId;
  projectRoot: string;
  command: string;
}

export interface AllowedExecution {
  status: 'allowed';
  runtimeId: RuntimeId;
  projectRoot: string;
  executionId: string;
  /** Передаётся из Harness canonical context, не transcript предыдущего SDK. */
  prompt: string;
  nativeAction: 'start' | 'resume';
  nativeHandle?: { runtimeId: RuntimeId; projectRoot: string; sessionId: string };
  requiredCapabilities?: RuntimeCapability[];
}

export interface BlockedExecution {
  status: 'blocked';
  reasonCode: string;
}

export type Admission = AllowedExecution | BlockedExecution;

export interface HarnessAuthority {
  /**
   * Только trusted service → Harness deterministic resolver + session-entry
   * contract. Никаких local guesses по строкам model output или auth status.
   *
   * Новый вызов с avoidNativeReuse=true после подтверждённого native miss
   * ОБЯЗАН заново подтвердить canonical re-entry до fresh-session fallback.
   */
  prepare(
    request: ExecutionRequest,
    options: { avoidNativeReuse: boolean },
  ): Promise<Admission>;
}

export function safeAccount(value: unknown): AccountSummary {
  // Display-only allowlist: ни токенов, ни API keys, ни raw provider metadata.
  if (typeof value !== 'object' || value === null) return { loggedIn: 'unknown' };
  const record = value as Record<string, unknown>;
  const account = typeof record.account === 'object' && record.account !== null
    ? record.account as Record<string, unknown>
    : record;
  const rawLoggedIn = account.loggedIn ?? record.loggedIn;
  const loggedIn = typeof rawLoggedIn === 'boolean'
    ? rawLoggedIn
    : account.email && typeof account.email === 'string'
      ? true
      : 'unknown';
  const result: AccountSummary = { loggedIn };
  for (const [key, raw] of [
    ['email', account.email],
    ['organization', account.organization],
    ['subscription', account.subscription],
  ] as const) {
    if (typeof raw === 'string' && raw.trim() && raw.length < 256) {
      result[key] = raw;
    }
  }
  return result;
}

export const UNSUPPORTED_CAPABILITIES: Readonly<Record<RuntimeCapability, SupportState>> = {
  streaming: 'unsupported',
  resume: 'unsupported',
  cancel: 'unsupported',
  interactiveInput: 'unsupported',
  toolMcp: 'unsupported',
  authenticatedAccount: 'unsupported',
};
