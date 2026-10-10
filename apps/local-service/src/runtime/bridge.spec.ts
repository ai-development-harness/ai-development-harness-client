import { describe, expect, it, vi } from 'vitest';

import { RuntimeBridge } from './bridge';
import type {
  Admission,
  ExecutionRequest,
  HarnessAuthority,
  NativeExecution,
  NativeResult,
  NativeRuntimeAdapter,
  RuntimeCapability,
  RuntimeEvent,
  RuntimeId,
  SupportState,
} from './contracts';
import { NativeSessionUnavailable, UNSUPPORTED_CAPABILITIES } from './contracts';

const request: ExecutionRequest = {
  runtimeId: 'codex',
  projectRoot: '/workspace/project',
  command: 'STEP IMPLEMENT STEP-042',
};
const noOpSignal = () => new AbortController().signal;

function allowed(
  runtimeId: RuntimeId = 'codex',
  nativeAction: 'start' | 'resume' = 'start',
): Admission {
  return {
    status: 'allowed',
    runtimeId,
    projectRoot: request.projectRoot,
    executionId: 'exec-042',
    prompt: 'Authoritative current Harness STEP context',
    nativeAction,
    ...(nativeAction === 'resume'
      ? {
          nativeHandle: {
            runtimeId,
            projectRoot: request.projectRoot,
            sessionId: 'native-042',
          },
        }
      : {}),
  };
}

function runtime(
  runtimeId: RuntimeId,
  execute: (run: NativeExecution) => Promise<NativeResult>,
  extras?: Partial<Record<RuntimeCapability, SupportState>>,
): NativeRuntimeAdapter {
  return {
    runtimeId,
    getCapabilities: async () => ({
      ...UNSUPPORTED_CAPABILITIES,
      streaming: 'native',
      resume: 'native',
      ...extras,
    }),
    getAccount: async () => ({ loggedIn: 'unknown' }),
    execute,
  };
}

function setup(
  prepare: HarnessAuthority['prepare'],
  nativeExecute: (run: NativeExecution) => Promise<NativeResult>,
  extras?: Partial<Record<RuntimeCapability, SupportState>>,
) {
  const codexExecute = vi.fn(nativeExecute);
  const claudeExecute = vi.fn(async () => ({ status: 'completed' as const }));
  const gate = vi.fn(prepare);
  const bridge = new RuntimeBridge({
    authority: { prepare: gate },
    adapters: {
      codex: runtime('codex', codexExecute, extras),
      claude: runtime('claude', claudeExecute),
    },
  });
  const events: RuntimeEvent[] = [];
  const execute = (value: ExecutionRequest = request) => bridge.execute(value, {
    signal: noOpSignal(),
    onEvent: (event) => events.push(event),
  });
  return { bridge, execute, gate, codexExecute, claudeExecute, events };
}

describe('runtime bridge — canonical Harness ownership', () => {
  it('не запускает provider без разрешения Harness', async () => {
    const app = setup(
      async () => ({ status: 'blocked', reasonCode: 'INTENT_BASIS_STALE' }),
      async () => ({ status: 'completed' }),
    );
    await expect(app.execute()).resolves.toEqual({
      status: 'blocked',
      reasonCode: 'INTENT_BASIS_STALE',
    });
    expect(app.codexExecute).not.toHaveBeenCalled();
    expect(app.claudeExecute).not.toHaveBeenCalled();
  });

  it('Claude PLAN → Codex IMPLEMENT запускает выбранный Codex без native-сессии Claude', async () => {
    const app = setup(
      async () => allowed('codex', 'start'),
      async (native) => {
        expect(native.nativeSessionId).toBeUndefined();
        expect(native.prompt).toContain('Authoritative current');
        return { status: 'completed', sessionId: 'codex-session' };
      },
    );
    await expect(app.execute()).resolves.toEqual({
      status: 'completed',
      sessionId: 'codex-session',
    });
    expect(app.gate).toHaveBeenCalledTimes(1);
    expect(app.claudeExecute).not.toHaveBeenCalled();
  });

  it('сохраняет native resume при проверенном совпадении runtime и workspace', async () => {
    const app = setup(
      async () => allowed('codex', 'resume'),
      async (native) => {
        expect(native.nativeSessionId).toBe('native-042');
        return { status: 'completed', sessionId: native.nativeSessionId };
      },
    );
    expect((await app.execute()).status).toBe('completed');
    expect(app.codexExecute).toHaveBeenCalledTimes(1);
  });

  it('не может передать Claude session handle в Codex', async () => {
    const invalid = {
      ...allowed('codex', 'resume'),
      nativeHandle: {
        runtimeId: 'claude' as const,
        projectRoot: request.projectRoot,
        sessionId: 'claude-native',
      },
    } as Admission;
    const app = setup(
      async () => invalid,
      async () => ({ status: 'completed' }),
    );
    await expect(app.execute()).resolves.toEqual({
      status: 'blocked',
      reasonCode: 'INVALID_HARNESS_ADMISSION',
    });
    expect(app.codexExecute).not.toHaveBeenCalled();
  });

  it('после подтверждённого native miss запрашивает новый Harness admission', async () => {
    const app = setup(
      async (_request, options) => (
        options.avoidNativeReuse
          ? allowed('codex', 'start')
          : allowed('codex', 'resume')
      ),
      async (native) => {
        if (native.nativeSessionId) throw new NativeSessionUnavailable();
        return { status: 'completed', sessionId: 'new-codex-session' };
      },
    );
    await expect(app.execute()).resolves.toEqual({
      status: 'completed', sessionId: 'new-codex-session',
    });
    expect(app.gate.mock.calls.map((call) => call[1])).toEqual([
      { avoidNativeReuse: false },
      { avoidNativeReuse: true },
    ]);
    expect(app.codexExecute).toHaveBeenCalledTimes(2);
    expect(app.claudeExecute).not.toHaveBeenCalled();
  });

  it('не делает fresh fallback без повторного разрешения canonical recovery', async () => {
    const app = setup(
      async (_request, options) => options.avoidNativeReuse
        ? { status: 'blocked', reasonCode: 'SIDE_EFFECT_UNKNOWN' }
        : allowed('codex', 'resume'),
      async () => { throw new NativeSessionUnavailable(); },
    );
    await expect(app.execute()).resolves.toEqual({
      status: 'blocked', reasonCode: 'SIDE_EFFECT_UNKNOWN',
    });
    expect(app.codexExecute).toHaveBeenCalledTimes(1);
  });

  it('не объявляет произвольную ошибку SDK безопасным native miss', async () => {
    const app = setup(
      async () => allowed('codex', 'resume'),
      async () => { throw new Error('potential turn already started'); },
    );
    await expect(app.execute()).resolves.toEqual({
      status: 'failed', reasonCode: 'NATIVE_RUNTIME_FAILED',
    });
    expect(app.gate).toHaveBeenCalledTimes(1);
  });

  it('не блокирует необязательный MCP, но блокирует объективно требуемый', async () => {
    const optional = setup(
      async () => allowed(),
      async () => ({ status: 'completed' }),
    );
    expect((await optional.execute()).status).toBe('completed');

    const mandatory = setup(
      async () => ({
        ...allowed('codex', 'start'),
        requiredCapabilities: ['toolMcp'],
      }),
      async () => ({ status: 'completed' }),
    );
    await expect(mandatory.execute()).resolves.toEqual({
      status: 'blocked', reasonCode: 'REQUIRED_CAPABILITY_UNAVAILABLE',
    });
    expect(mandatory.codexExecute).not.toHaveBeenCalled();
  });

  it('по умолчанию отказывает в tool approval без явного решения UI', async () => {
    const app = setup(
      async () => allowed(),
      async (native) => {
        expect(await native.requestPermission({
          runtimeId: 'codex',
          kind: 'tool',
          name: 'Bash',
        })).toBe('deny');
        return { status: 'completed' };
      },
    );
    expect((await app.execute()).status).toBe('completed');
  });

  it('не экспортирует ошибочный executionId из событий чужого runtime', async () => {
    const app = setup(
      async () => allowed(),
      async (native) => {
        native.emit({ type: 'run.completed', runtimeId: 'claude', executionId: 'exec-042' });
        native.emit({ type: 'run.completed', runtimeId: 'codex', executionId: 'wrong' });
        native.emit({ type: 'run.completed', runtimeId: 'codex', executionId: 'exec-042' });
        return { status: 'completed' };
      },
    );
    await app.execute();
    expect(app.events).toHaveLength(1);
    expect(app.events[0].runtimeId).toBe('codex');
  });

  it('abort до допуска к provider не создаёт нативную сессию', async () => {
    const app = setup(
      async () => allowed(),
      async () => ({ status: 'completed' }),
    );
    const controller = new AbortController();
    controller.abort();
    await expect(app.bridge.execute(request, {
      signal: controller.signal,
      onEvent: () => undefined,
    })).resolves.toEqual({ status: 'interrupted' });
    expect(app.codexExecute).not.toHaveBeenCalled();
  });
});
