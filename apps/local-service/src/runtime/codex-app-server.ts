import type {
  AccountSummary,
  NativeExecution,
  NativeResult,
  NativeRuntimeAdapter,
  RuntimeCapability,
  RuntimeEvent,
  SupportState,
} from './contracts';
import {
  NativeSessionUnavailable,
  safeAccount,
  UNSUPPORTED_CAPABILITIES,
} from './contracts';

/**
 * Подключённый Codex app-server JSON-RPC 2.0 порт.
 *
 * Transport/STDIO process запускает только будущий approved supervisor
 * STEP-002. initialize() обязан сделать initialize → initialized handshake.
 * Adapter не spawn-ит процесс и не выбирает другой runtime автоматически.
 */
export interface CodexRpcPort {
  initialize(): Promise<void>;
  request(method: string, params?: Readonly<Record<string, unknown>>): Promise<unknown>;
  events(signal: AbortSignal): AsyncIterable<CodexRpcEvent>;
  respond?(id: string | number, result: Readonly<Record<string, unknown>>): Promise<void>;
}

export interface CodexRpcEvent {
  method: string;
  params?: unknown;
  /** Присутствует для запросов разрешения от app-server к клиенту. */
  id?: string | number;
}

export interface CodexAdapterOptions {
  rpc: CodexRpcPort;
  /** Определять ТОЛЬКО фактический structured pre-turn "thread not found". */
  isMissingThread?(error: unknown): boolean;
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null;
}

function objectField(record: Record<string, unknown> | null, name: string) {
  return object(record?.[name]);
}

function text(record: Record<string, unknown> | null, name: string): string | undefined {
  const value = record?.[name];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function nestedId(value: unknown, name: string): string | undefined {
  const root = object(value);
  return text(objectField(root, name), 'id');
}

function emit(
  run: NativeExecution,
  type: RuntimeEvent['type'],
  sessionId: string,
  data?: RuntimeEvent['data'],
): void {
  run.emit({
    type,
    runtimeId: 'codex',
    executionId: run.executionId,
    sessionId,
    ...(data ? { data } : {}),
  });
}

export function createCodexAppServerAdapter(
  options: CodexAdapterOptions,
): NativeRuntimeAdapter {
  const { rpc } = options;
  // One initialized JSON-RPC connection may serve consecutive turns; never
  // claim success if initialization or the native account endpoint failed.
  let init: Promise<void> | undefined;
  const ready = () => {
    init ??= rpc.initialize().catch((error: unknown) => {
      init = undefined;
      throw error;
    });
    return init;
  };
  const capabilities: Readonly<Record<RuntimeCapability, SupportState>> = {
    ...UNSUPPORTED_CAPABILITIES,
    streaming: 'native',
    resume: 'native',
    cancel: 'native',
    interactiveInput: rpc.respond ? 'native' : 'unsupported',
    authenticatedAccount: 'native',
    // MCP is optional. Не заявляем доступность без negotiated proof.
  };

  return {
    runtimeId: 'codex',
    async getCapabilities() {
      return capabilities;
    },
    async getAccount(): Promise<AccountSummary> {
      await ready();
      const account = await rpc.request('account/read', { refreshToken: false });
      return safeAccount(account);
    },
    async execute(run: NativeExecution): Promise<NativeResult> {
      await ready();
      if (run.signal.aborted) return { status: 'interrupted' };

      let threadId: string;
      if (run.nativeSessionId) {
        try {
          const restored = await rpc.request('thread/resume', {
            threadId: run.nativeSessionId,
          });
          threadId = nestedId(restored, 'thread') ?? run.nativeSessionId;
        } catch (error) {
          // SessionUnavailable разрешён только ДО turn/start, иначе retry
          // опасен (side effects могли начаться).
          if (options.isMissingThread?.(error) === true) {
            throw new NativeSessionUnavailable();
          }
          throw error;
        }
      } else {
        const started = await rpc.request('thread/start', {
          cwd: run.projectRoot,
        });
        const id = nestedId(started, 'thread');
        if (!id) throw new TypeError('Codex thread/start did not return thread.id');
        threadId = id;
      }

      if (run.signal.aborted) return { status: 'interrupted', sessionId: threadId };
      const turn = await rpc.request('turn/start', {
        threadId,
        input: [{ type: 'text', text: run.prompt }],
      });
      const turnId = nestedId(turn, 'turn');
      if (!turnId) throw new TypeError('Codex turn/start did not return turn.id');
      emit(run, 'run.started', threadId);

      const interrupt = async () => {
        try {
          await rpc.request('turn/interrupt', { threadId, turnId });
        } catch {
          // Нельзя маскировать чужую state/side-effect проблему как
          // успешную отмену, но никакой raw error provider в UI не отдаём.
        }
      };

      try {
        for await (const message of rpc.events(run.signal)) {
          if (run.signal.aborted) {
            await interrupt();
            emit(run, 'run.interrupted', threadId);
            return { status: 'interrupted', sessionId: threadId };
          }
          const data = object(message.params);
          const targetThread = text(data, 'threadId');
          if (targetThread && targetThread !== threadId) continue;
          const targetTurn = text(data, 'turnId');
          if (targetTurn && targetTurn !== turnId) continue;

          if (
            message.id !== undefined &&
            (message.method === 'item/commandExecution/requestApproval' ||
              message.method === 'item/fileChange/requestApproval')
          ) {
            const kind = message.method.includes('fileChange')
              ? 'file-change' : 'command';
            emit(run, 'input.required', threadId, {
              tool: kind,
              requestId: String(message.id),
            });
            const response = await run.requestPermission({
              runtimeId: 'codex',
              kind,
              name: kind,
              requestId: String(message.id),
            }).catch(() => 'deny' as const);
            if (!rpc.respond) throw new TypeError('Codex transport cannot answer approval requests');
            await rpc.respond(message.id, {
              decision: response === 'allow' ? 'accept' : 'decline',
            });
            continue;
          }

          if (message.method === 'item/agentMessage/delta') {
            // Никогда не пересылать raw RPC metadata, tool params или
            // model reasoning. UI отображает только нормализованный text.
            const delta = text(data, 'delta') ?? text(data, 'text');
            if (delta) emit(run, 'model.message.delta', threadId, { text: delta });
          } else if (message.method === 'item/started') {
            const item = objectField(data, 'item');
            const kind = text(item, 'type');
            if (kind && kind !== 'agentMessage' && kind !== 'reasoning') {
              emit(run, 'tool.started', threadId, { tool: kind });
            }
          } else if (message.method === 'item/completed') {
            const item = objectField(data, 'item');
            const kind = text(item, 'type');
            if (kind === 'agentMessage') {
              emit(run, 'model.message.completed', threadId);
            } else if (kind && kind !== 'reasoning') {
              emit(run, 'tool.completed', threadId, { tool: kind });
            }
          } else if (message.method === 'turn/completed') {
            const turnRecord = objectField(data, 'turn');
            const completedTurn = text(turnRecord, 'id');
            if (completedTurn && completedTurn !== turnId) continue;
            const status = text(turnRecord, 'status');
            if (status === 'completed') {
              emit(run, 'run.completed', threadId);
              return { status: 'completed', sessionId: threadId };
            }
            if (status === 'interrupted') {
              emit(run, 'run.interrupted', threadId);
              return { status: 'interrupted', sessionId: threadId };
            }
            emit(run, 'run.failed', threadId, { reasonCode: 'CODEX_TURN_FAILED' });
            return {
              status: 'failed',
              sessionId: threadId,
              reasonCode: 'CODEX_TURN_FAILED',
            };
          }
        }
      } catch (error) {
        if (!run.signal.aborted) throw error;
      }
      if (run.signal.aborted) {
        await interrupt();
        emit(run, 'run.interrupted', threadId);
        return { status: 'interrupted', sessionId: threadId };
      }
      return {
        status: 'failed',
        sessionId: threadId,
        reasonCode: 'CODEX_STREAM_ENDED_UNPROVEN',
      };
    },
  };
}
