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
 * Shape callable Claude Agent SDK query(...) API.
 *
 * В продакшене передавать SDK query из @anthropic-ai/claude-agent-sdk,
 * импортируя его внутри approved supervisor. Этот файл не импортирует SDK
 * и не запускает process до принятия STEP-002 containment profile.
 */
export interface ClaudeSdkQueryRequest {
  prompt: string;
  options: {
    cwd: string;
    resume?: string;
    abortController: AbortController;
    permissionMode: 'default';
    canUseTool: (
      toolName: string,
      input: Record<string, unknown>,
    ) => Promise<
      | { behavior: 'allow'; updatedInput: Record<string, unknown> }
      | { behavior: 'deny'; message: string }
    >;
  };
}

export interface ClaudeSdkPort {
  query(request: ClaudeSdkQueryRequest): AsyncIterable<unknown>;
  /** Factual machine-readable claude auth status, never terminal markup. */
  authStatus?(): Promise<unknown>;
}

export interface ClaudeAdapterOptions {
  sdk: ClaudeSdkPort;
  /** Only explicit native "no such session" BEFORE model/tool execution. */
  isMissingSession?(error: unknown): boolean;
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null;
}

function text(value: Record<string, unknown> | null, field: string): string | undefined {
  const item = value?.[field];
  return typeof item === 'string' && item.trim() ? item : undefined;
}

function emit(
  run: NativeExecution,
  type: RuntimeEvent['type'],
  sessionId?: string,
  data?: RuntimeEvent['data'],
): void {
  run.emit({
    type,
    runtimeId: 'claude',
    executionId: run.executionId,
    ...(sessionId ? { sessionId } : {}),
    ...(data ? { data } : {}),
  });
}

export function createClaudeAgentSdkAdapter(
  options: ClaudeAdapterOptions,
): NativeRuntimeAdapter {
  const { sdk } = options;
  const capabilities: Readonly<Record<RuntimeCapability, SupportState>> = {
    ...UNSUPPORTED_CAPABILITIES,
    streaming: 'native',
    resume: 'native',
    cancel: 'native',
    interactiveInput: 'native',
    authenticatedAccount: sdk.authStatus ? 'synthesized' : 'unsupported',
  };

  return {
    runtimeId: 'claude',
    async getAccount(): Promise<AccountSummary> {
      if (!sdk.authStatus) return { loggedIn: 'unknown' };
      return safeAccount(await sdk.authStatus());
    },
    async getCapabilities() {
      return capabilities;
    },
    async execute(run: NativeExecution): Promise<NativeResult> {
      if (run.signal.aborted) return { status: 'interrupted' };

      const controller = new AbortController();
      const onAbort = () => controller.abort();
      run.signal.addEventListener('abort', onAbort, { once: true });
      let sessionId: string | undefined = run.nativeSessionId;
      let sessionInitialized = false;
      let producedModelOrToolOutput = false;
      let streamedText = false;
      try {
        const stream = sdk.query({
          prompt: run.prompt,
          options: {
            cwd: run.projectRoot,
            ...(run.nativeSessionId ? { resume: run.nativeSessionId } : {}),
            abortController: controller,
            permissionMode: 'default',
            // Permissions never silently become allow. The UI broker is
            // optional, and RuntimeBridge defaults to explicit deny.
            canUseTool: async (toolName, input) => {
              if (run.signal.aborted) {
                return { behavior: 'deny', message: 'Execution cancelled' };
              }
              emit(run, 'input.required', sessionId, { tool: toolName });
              const approved = await run.requestPermission({
                runtimeId: 'claude',
                kind: 'tool',
                name: toolName,
              }).catch(() => 'deny' as const);
              return approved === 'allow'
                ? { behavior: 'allow', updatedInput: input }
                : { behavior: 'deny', message: 'Tool approval denied' };
            },
          },
        });

        for await (const raw of stream) {
          if (run.signal.aborted) return { status: 'interrupted', sessionId };
          const message = object(raw);
          const type = text(message, 'type');
          if (type === 'system' && text(message, 'subtype') === 'init') {
            const id = text(message, 'session_id');
            if (id) sessionId = id;
            sessionInitialized = true;
            emit(run, 'run.started', sessionId);
          } else if (type === 'stream_event') {
            const event = object(message?.event);
            if (text(event, 'type') === 'content_block_delta') {
              const delta = object(event?.delta);
              if (text(delta, 'type') === 'text_delta') {
                const chunk = text(delta, 'text');
                if (chunk) {
                  streamedText = true;
                  producedModelOrToolOutput = true;
                  emit(run, 'model.message.delta', sessionId, { text: chunk });
                }
              }
            }
          } else if (type === 'assistant') {
            producedModelOrToolOutput = true;
            const response = object(message?.message);
            const content = response?.content;
            if (Array.isArray(content)) {
              for (const part of content) {
                const block = object(part);
                const blockType = text(block, 'type');
                if (blockType === 'text' && !streamedText) {
                  const contentText = text(block, 'text');
                  if (contentText) {
                    emit(run, 'model.message.delta', sessionId, { text: contentText });
                  }
                } else if (blockType === 'tool_use') {
                  emit(run, 'tool.started', sessionId, {
                    tool: text(block, 'name') ?? 'tool',
                  });
                }
              }
              emit(run, 'model.message.completed', sessionId);
            }
          } else if (type === 'user') {
            // SDK tool result without raw tool arguments/result/credentials.
            producedModelOrToolOutput = true;
            emit(run, 'tool.completed', sessionId);
          } else if (type === 'result') {
            const status = text(message, 'subtype');
            if (message?.is_error === false && status === 'success') {
              emit(run, 'run.completed', sessionId);
              return { status: 'completed', sessionId };
            }
            emit(run, 'run.failed', sessionId, { reasonCode: 'CLAUDE_QUERY_FAILED' });
            return {
              status: 'failed',
              sessionId,
              reasonCode: 'CLAUDE_QUERY_FAILED',
            };
          }
        }
      } catch (error) {
        if (run.signal.aborted) {
          emit(run, 'run.interrupted', sessionId);
          return { status: 'interrupted', sessionId };
        }
        // Only pre-execution session lookup failure may be considered safe
        // for fresh-session fallback. Otherwise return failed and reconcile.
        if (
          run.nativeSessionId &&
          !sessionInitialized &&
          !producedModelOrToolOutput &&
          options.isMissingSession?.(error) === true
        ) {
          throw new NativeSessionUnavailable();
        }
        throw error;
      } finally {
        run.signal.removeEventListener('abort', onAbort);
      }
      if (run.signal.aborted) {
        emit(run, 'run.interrupted', sessionId);
        return { status: 'interrupted', sessionId };
      }
      return {
        status: 'failed',
        sessionId,
        reasonCode: 'CLAUDE_STREAM_ENDED_UNPROVEN',
      };
    },
  };
}
