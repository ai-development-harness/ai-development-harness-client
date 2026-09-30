import type {
  RuntimeAccount,
  RuntimeEvent,
  RuntimeInput,
  RuntimeStartRequest,
  RuntimeStatus,
} from '@org/client-api';

import {
  createClaudeRuntimeDriver,
  createCodexRuntimeDriver,
  createRuntimeBridge,
  type ClaudeRuntimeSurface,
  type CodexRuntimeSurface,
  type HarnessResumeDecision,
  type RuntimeDriverEvent,
  type RuntimeDriverSession,
} from './runtime-bridge';

function surface(account: RuntimeAccount) {
  const calls = {
    starts: [] as RuntimeStartRequest[],
    resumes: [] as string[],
    cancels: [] as string[],
    inputs: [] as Array<{ handle: string; input: RuntimeInput }>,
  };
  const sessions = new Map<string, RuntimeDriverEvent[]>([
    [
      'session-1',
      [
        { type: 'run.started' },
        { type: 'model.message.delta', data: { text: 'hello' } },
        { type: 'input.required', data: { requestId: 'input-1', prompt: 'Continue?' } },
      ],
    ],
  ]);

  const common = {
    start: async (request: RuntimeStartRequest): Promise<RuntimeDriverSession> => {
      calls.starts.push(request);
      return { handle: 'session-1' };
    },
    resume: async (handle: string): Promise<RuntimeDriverSession> => {
      calls.resumes.push(handle);
      return { handle };
    },
    cancel: async (handle: string): Promise<void> => {
      calls.cancels.push(handle);
    },
    sendInput: async (handle: string, input: RuntimeInput): Promise<void> => {
      calls.inputs.push({ handle, input });
    },
    status: async (): Promise<RuntimeStatus> => ({
      state: 'running',
      terminal: false,
    }),
    readEvents: async (
      handle: string,
      afterSequence: number,
    ): Promise<readonly RuntimeDriverEvent[]> => {
      return (sessions.get(handle) ?? []).slice(afterSequence);
    },
  };

  const codex: CodexRuntimeSurface = {
    accountRead: async () => account,
    ...common,
  };
  const claude: ClaudeRuntimeSurface = {
    authStatus: async () => account,
    ...common,
  };
  return { codex, claude, calls };
}

describe('runtime bridge contract', () => {
  const request: RuntimeStartRequest = {
    projectRoot: '/repo',
    executionId: 'exec-1',
    rootCommand: 'STEP RUN STEP-001',
    command: 'STEP PLAN STEP-001',
  };

  it('публикует один interface для Codex и Claude без fallback', () => {
    const fake = surface({ authenticated: true, email: 'dev@example.test' });
    const bridge = createRuntimeBridge({
      drivers: [createCodexRuntimeDriver(fake.codex), createClaudeRuntimeDriver(fake.claude)],
      resolver: { resolve: async () => ({ action: 'resume' }) },
    });

    expect(bridge.listRuntimeIds()).toEqual(['claude', 'codex']);
    expect(bridge.getCapabilities('codex').structuredOutput).toBe('native');
    expect(bridge.getCapabilities('claude').structuredOutput).toBe('synthesized');
    expect(bridge.getCapabilities('claude').sessionExecutionIds).toBe('synthesized');
  });

  it('нормализует runtime events и сохраняет immutable execution binding', async () => {
    const fake = surface({ authenticated: true, email: 'dev@example.test' });
    const bridge = createRuntimeBridge({
      drivers: [createCodexRuntimeDriver(fake.codex)],
      resolver: { resolve: async () => ({ action: 'resume' }) },
    });

    const binding = await bridge.start('codex', request);
    expect(binding).toEqual({
      schemaVersion: 1,
      runtimeId: 'codex',
      handle: 'session-1',
      projectRoot: '/repo',
      executionId: 'exec-1',
      rootCommand: 'STEP RUN STEP-001',
      terminal: false,
      cursor: 0,
    });

    const page = await bridge.readEvents(binding, 0);
    expect(page.nextCursor).toBe(3);
    expect(
      page.events.map((event: RuntimeEvent) => [
        event.sequence,
        event.type,
        event.runtimeId,
        event.executionId,
      ]),
    ).toEqual([
      [1, 'run.started', 'codex', 'exec-1'],
      [2, 'model.message.delta', 'codex', 'exec-1'],
      [3, 'input.required', 'codex', 'exec-1'],
    ]);
  });

  it('перед resume всегда запрашивает Harness resolver', async () => {
    const fake = surface({ authenticated: true });
    const decisions: HarnessResumeDecision[] = [
      { action: 'blocked', reason: 'REVIEW evidence incomplete' },
      { action: 'resume', canonicalCommand: 'STEP FIX STEP-001' },
    ];
    const resolverCalls: string[] = [];
    const bridge = createRuntimeBridge({
      drivers: [createClaudeRuntimeDriver(fake.claude)],
      resolver: {
        resolve: async (projectRoot, executionId) => {
          resolverCalls.push(`${projectRoot}:${executionId}`);
          return decisions.shift() ?? { action: 'blocked' };
        },
      },
    });

    const binding = await bridge.start('claude', request);
    await expect(bridge.resume(binding)).rejects.toThrow(
      'HARNESS_RESUME_NOT_ALLOWED: blocked: REVIEW evidence incomplete',
    );
    await expect(bridge.resume(binding)).resolves.toEqual(binding);
    expect(resolverCalls).toEqual(['/repo:exec-1', '/repo:exec-1']);
    expect(fake.calls.resumes).toEqual(['session-1']);
  });

  it('передаёт input и cancel как отдельные lifecycle actions', async () => {
    const fake = surface({ authenticated: true });
    const bridge = createRuntimeBridge({
      drivers: [createCodexRuntimeDriver(fake.codex)],
      resolver: { resolve: async () => ({ action: 'resume' }) },
    });
    const binding = await bridge.start('codex', request);

    await bridge.sendInput(binding, { requestId: 'input-1', value: 'yes' });
    await bridge.cancel(binding);

    expect(fake.calls.inputs).toEqual([
      { handle: 'session-1', input: { requestId: 'input-1', value: 'yes' } },
    ]);
    expect(fake.calls.cancels).toEqual(['session-1']);
  });

  it('не возвращает произвольные provider fields из account payload', async () => {
    const account = {
      authenticated: true,
      displayName: 'Developer',
      email: 'dev@example.test',
      organization: 'org',
      authMethod: 'subscription',
      accessToken: 'must-not-cross-boundary',
    } as RuntimeAccount & { accessToken: string };
    const fake = surface(account);
    const bridge = createRuntimeBridge({
      drivers: [createCodexRuntimeDriver(fake.codex)],
      resolver: { resolve: async () => ({ action: 'resume' }) },
    });

    await expect(bridge.getAccount('codex')).resolves.toEqual({
      authenticated: true,
      displayName: 'Developer',
      email: 'dev@example.test',
      organization: 'org',
      authMethod: 'subscription',
      avatarUrl: undefined,
    });
  });

  it('явно блокирует unsupported capability вместо provider fallback', async () => {
    const fake = surface({ authenticated: true });
    const driver = createCodexRuntimeDriver(fake.codex);
    const unsupported = {
      ...driver,
      capabilities: { ...driver.capabilities, interactiveInput: 'unsupported' as const },
    };
    const bridge = createRuntimeBridge({
      drivers: [unsupported],
      resolver: { resolve: async () => ({ action: 'resume' }) },
    });
    const binding = await bridge.start('codex', request);

    await expect(
      bridge.sendInput(binding, { requestId: 'input-1', value: 'yes' }),
    ).rejects.toThrow('RUNTIME_CAPABILITY_UNSUPPORTED: interactiveInput');
  });
});
