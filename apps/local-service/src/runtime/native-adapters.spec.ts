import { describe, expect, it, vi } from 'vitest';
import { createCodexAppServerAdapter } from './codex-app-server';
import type { CodexRpcPort, CodexRpcEvent } from './codex-app-server';
import { createClaudeAgentSdkAdapter } from './claude-agent-sdk';
import type { ClaudeSdkPort } from './claude-agent-sdk';
import type { NativeExecution, RuntimeEvent } from './contracts';
import { NativeSessionUnavailable } from './contracts';

function createRun(
  overrides: Partial<NativeExecution> = {},
) {
  const events: RuntimeEvent[] = [];
  const run: NativeExecution = {
    executionId: 'exec-001',
    projectRoot: '/project',
    prompt: 'Current STEP context from Harness',
    signal: new AbortController().signal,
    emit: (event) => events.push(event),
    requestPermission: async () => 'deny',
    ...overrides,
  };
  return { run, events };
}

function codexPort(
  messages: CodexRpcEvent[],
  options: { failNativeResume?: boolean } = {},
) {
  const methods: string[] = [];
  const calls: Array<{ method: string; params: Readonly<Record<string, unknown>> | undefined }> = [];
  const replies: { id: string | number; decision: unknown }[] = [];
  const port: CodexRpcPort = {
    initialize: vi.fn(async () => undefined),
    request: vi.fn(async (method, params) => {
      methods.push(method);
      calls.push({ method, params });
      if (method === 'thread/resume') {
        if (options.failNativeResume) throw { code: 'THREAD_NOT_FOUND' };
        return { thread: { id: 'thr-1' } };
      }
      if (method === 'thread/start') return { thread: { id: 'thr-1' } };
      if (method === 'turn/start') return { turn: { id: 'turn-1' } };
      if (method === 'account/read') {
        return {
          account: {
            loggedIn: true,
            email: 'dev@example.invalid',
            token: 'SECRET_SHOULD_NOT_LEAK',
          },
        };
      }
      return {};
    }),
    events: async function* () {
      for (const message of messages) yield message;
    },
    respond: async (id, result) => {
      replies.push({ id, decision: result.decision });
    },
  };
  return { port, methods, replies, calls };
}

describe('Codex App Server protocol', () => {
  it('использует initialize → thread/start → turn/start и нормализует только безопасные events', async () => {
    const fake = codexPort([
      {
        method: 'item/agentMessage/delta',
        params: {
          threadId: 'different-thread',
          turnId: 'turn-1',
          delta: 'PRIVATE_FROM_ANOTHER_THREAD',
        },
      },
      {
        method: 'item/agentMessage/delta',
        params: { threadId: 'thr-1', turnId: 'turn-1', delta: 'All good' },
      },
      {
        method: 'item/started',
        params: {
          threadId: 'thr-1', turnId: 'turn-1',
          item: { type: 'commandExecution', command: 'SECRET_COMMAND' },
        },
      },
      {
        method: 'item/completed',
        params: {
          threadId: 'thr-1', turnId: 'turn-1',
          item: { type: 'commandExecution', result: 'SECRET_OUTPUT' },
        },
      },
      {
        method: 'turn/completed',
        params: {
          threadId: 'thr-1', turnId: 'turn-1',
          turn: { id: 'turn-1', status: 'completed' },
        },
      },
    ]);
    const adapter = createCodexAppServerAdapter({ rpc: fake.port });
    const { run, events } = createRun();
    expect(await adapter.execute(run)).toEqual({ status: 'completed', sessionId: 'thr-1' });
    expect(fake.methods).toEqual(['thread/start', 'turn/start']);
    expect(fake.calls.find((entry) => entry.method === 'thread/start')?.params)
      .toMatchObject({
        cwd: '/project',
        sandbox: 'workspace-write',
        approvalPolicy: 'on-request',
      });
    expect(fake.calls.find((entry) => entry.method === 'turn/start')?.params)
      .toMatchObject({ approvalPolicy: 'on-request' });
    expect(fake.port.initialize).toHaveBeenCalledTimes(1);
    expect(events.map((event) => event.type)).toEqual([
      'run.started', 'model.message.delta', 'tool.started',
      'tool.completed', 'run.completed',
    ]);
    expect(events[1].data?.text).toBe('All good');
    expect(JSON.stringify(events)).not.toContain('SECRET');
    expect(JSON.stringify(events)).not.toContain('PRIVATE');
  });

  it('передаёт approval только явным решением broker, по умолчанию deny', async () => {
    const fake = codexPort([
      {
        method: 'item/commandExecution/requestApproval',
        id: 17,
        params: { threadId: 'thr-1', turnId: 'turn-1', command: 'rm -rf' },
      },
      {
        method: 'turn/completed',
        params: {
          threadId: 'thr-1', turnId: 'turn-1',
          turn: { id: 'turn-1', status: 'interrupted' },
        },
      },
    ]);
    const adapter = createCodexAppServerAdapter({ rpc: fake.port });
    const { run, events } = createRun();
    const result = await adapter.execute(run);
    expect(result.status).toBe('interrupted');
    expect(fake.replies).toEqual([{ id: 17, decision: 'decline' }]);
    expect(events.some((event) => event.type === 'input.required')).toBe(true);
    expect(JSON.stringify(events)).not.toContain('rm -rf');
  });

  it('обнаруживает только structured missing session до turn/start', async () => {
    const fake = codexPort([], { failNativeResume: true });
    const adapter = createCodexAppServerAdapter({
      rpc: fake.port,
      isMissingThread: (error: unknown) => (
        typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'THREAD_NOT_FOUND'
      ),
    });
    const { run } = createRun({ nativeSessionId: 'native-expired' });
    await expect(adapter.execute(run)).rejects.toBeInstanceOf(NativeSessionUnavailable);
    expect(fake.methods).toEqual(['thread/resume']);
    expect(fake.methods).not.toContain('turn/start');
  });

  it('получает учётную запись из account/read без сохранения token fields', async () => {
    const fake = codexPort([]);
    const adapter = createCodexAppServerAdapter({ rpc: fake.port });
    expect(await adapter.getAccount()).toEqual({
      loggedIn: true,
      email: 'dev@example.invalid',
    });
    expect(fake.methods).toContain('account/read');
    expect(JSON.stringify(await adapter.getAccount())).not.toContain('SECRET');
  });

  it('не превращает failed turn в completed', async () => {
    const fake = codexPort([{
      method: 'turn/completed',
      params: {
        turnId: 'turn-1',
        threadId: 'thr-1',
        turn: { id: 'turn-1', status: 'failed' },
      },
    }]);
    const adapter = createCodexAppServerAdapter({ rpc: fake.port });
    const { run } = createRun();
    expect(await adapter.execute(run)).toMatchObject({
      status: 'failed', reasonCode: 'CODEX_TURN_FAILED',
    });
  });
});

describe('Claude Agent SDK query adapter', () => {
  it('передаёт native resume, не раскрывая SDK metadata и raw tool input', async () => {
    const captured: unknown[] = [];
    const sdk: ClaudeSdkPort = {
      query: async function* (request) {
        captured.push(request);
        yield { type: 'system', subtype: 'init', session_id: 'claude-session-1' };
        yield {
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Ready' },
          },
        };
        yield {
          type: 'assistant',
          message: {
            content: [
              { type: 'text', text: 'Ready' },
              { type: 'tool_use', name: 'Read', input: { apiKey: 'SECRET' } },
            ],
          },
        };
        yield { type: 'result', subtype: 'success', is_error: false };
      },
      authStatus: async () => ({
        loggedIn: true,
        email: 'dev@example.invalid',
        token: 'SECRET',
      }),
    };
    const adapter = createClaudeAgentSdkAdapter({ sdk });
    const { run, events } = createRun({ nativeSessionId: 'claude-previous' });
    expect(await adapter.execute(run)).toEqual({
      status: 'completed', sessionId: 'claude-session-1',
    });
    const input = captured[0] as { options: { resume: string; cwd: string } };
    expect(input.options.resume).toBe('claude-previous');
    expect((captured[0] as { options: { settingSources: unknown[] } }).options.settingSources)
      .toEqual([]);
    expect(input.options.cwd).toBe('/project');
    expect(events.map((event) => event.type)).toEqual([
      'run.started', 'model.message.delta', 'tool.started',
      'model.message.completed', 'run.completed',
    ]);
    expect(JSON.stringify(events)).not.toContain('SECRET');
    expect(await adapter.getAccount()).toEqual({
      loggedIn: true, email: 'dev@example.invalid',
    });
  });

  it('запрашивает разрешение на tool вызов и без approval отказывает', async () => {
    let decision: unknown;
    const sdk: ClaudeSdkPort = {
      query: async function* (request) {
        decision = await request.options.canUseTool('Bash', { command: 'secret' });
        yield { type: 'system', subtype: 'init', session_id: 's' };
        yield { type: 'result', subtype: 'success', is_error: false };
      },
    };
    const adapter = createClaudeAgentSdkAdapter({ sdk });
    const { run, events } = createRun();
    expect((await adapter.execute(run)).status).toBe('completed');
    expect(decision).toEqual({ behavior: 'deny', message: 'Tool approval denied' });
    expect(events[0]).toMatchObject({
      type: 'input.required', data: { tool: 'Bash' },
    });
    expect(JSON.stringify(events)).not.toContain('secret');
  });

  it('использует safe native fallback только до любой модели или tool', async () => {
    const sdk: ClaudeSdkPort = {
      query: async function* () {
        throw { code: 'SESSION_NOT_FOUND' };
      },
    };
    const adapter = createClaudeAgentSdkAdapter({
      sdk,
      isMissingSession: (error) => (
        typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'SESSION_NOT_FOUND'
      ),
    });
    const { run } = createRun({ nativeSessionId: 'expired' });
    await expect(adapter.execute(run)).rejects.toBeInstanceOf(NativeSessionUnavailable);
  });

  it('не считает SDK is_error результат успешным', async () => {
    const sdk: ClaudeSdkPort = {
      query: async function* () {
        yield { type: 'system', subtype: 'init', session_id: 's' };
        yield { type: 'result', subtype: 'error_during_execution', is_error: true };
      },
    };
    const adapter = createClaudeAgentSdkAdapter({ sdk });
    const { run } = createRun();
    expect(await adapter.execute(run)).toMatchObject({
      status: 'failed',
      reasonCode: 'CLAUDE_QUERY_FAILED',
    });
  });
});
