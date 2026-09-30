import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

import {
  createClaudeCliSurface,
  createCodexAppServerSurface,
  type JsonRpcPeer,
  type ProcessHandle,
  type ProcessLauncher,
} from './runtime-provider-transports';

class FakePeer implements JsonRpcPeer {
  readonly calls: Array<{ method: string; params: unknown }> = [];
  readonly notifications: Array<{ method: string; params: unknown }> = [];
  private listeners = new Set<(notification: { method: string; params?: Readonly<Record<string, unknown>> }) => void>();

  async request(method: string, params: Readonly<Record<string, unknown>> = {}) {
    this.calls.push({ method, params });
    if (method === 'initialize') return { userAgent: 'test' };
    if (method === 'account/read') {
      return {
        account: { type: 'chatgpt', email: 'codex@example.test' },
        requiresOpenaiAuth: true,
      };
    }
    if (method === 'thread/start') return { thread: { id: 'thr-1' } };
    if (method === 'thread/resume') {
      return { thread: { id: params.threadId } };
    }
    if (method === 'turn/start') {
      this.emit({
        method: 'turn/started',
        params: {
          threadId: params.threadId as string,
          turn: { id: 'turn-1', status: 'inProgress' },
        },
      });
      return { turn: { id: 'turn-1', status: 'inProgress' } };
    }
    if (method === 'turn/steer' || method === 'turn/interrupt') return {};
    throw new Error(`unexpected request: ${method}`);
  }

  notify(method: string, params: Readonly<Record<string, unknown>> = {}) {
    this.notifications.push({ method, params });
  }

  onNotification(listener: (notification: { method: string; params?: Readonly<Record<string, unknown>> }) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(notification: { method: string; params?: Readonly<Record<string, unknown>> }) {
    for (const listener of this.listeners) listener(notification);
  }

  close() { return Promise.resolve(); }
}

class FakeProcess extends EventEmitter implements ProcessHandle {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly stdin = new PassThrough();
  exitCode: number | null = null;
  killedWith?: NodeJS.Signals;

  kill(signal: NodeJS.Signals = 'SIGTERM') {
    this.killedWith = signal;
    this.exitCode = signal === 'SIGTERM' ? 143 : 1;
    this.emit('exit', this.exitCode, signal);
    return true;
  }
}

class FakeLauncher implements ProcessLauncher {
  readonly calls: Array<{ command: string; args: readonly string[]; cwd?: string; process: FakeProcess }> = [];

  spawn(command: string, args: readonly string[], options: { cwd?: string }) {
    const process = new FakeProcess();
    this.calls.push({ command, args, cwd: options.cwd, process });
    return process;
  }

  call(index: number) {
    const value = this.calls[index];
    if (!value) throw new Error(`fake process call ${index} not found`);
    return value;
  }

  latest(): FakeProcess {
    const value = this.calls.at(-1);
    if (!value) throw new Error('no fake process');
    return value.process;
  }
}

describe('runtime provider transports', () => {
  it('инициализирует Codex App Server и использует canonical lifecycle methods', async () => {
    const peer = new FakePeer();
    const surface = await createCodexAppServerSurface({ peer });

    expect(peer.calls[0]).toEqual({
      method: 'initialize',
      params: {
        clientInfo: {
          name: 'ai_development_harness_client',
          title: 'AI Development Harness Client',
          version: '0.1.0',
        },
      },
    });
    expect(peer.notifications[0]).toEqual({ method: 'initialized', params: {} });

    await expect(surface.accountRead()).resolves.toEqual({
      authenticated: true,
      email: 'codex@example.test',
      authMethod: 'chatgpt',
      organization: undefined,
    });

    const session = await surface.start({
      projectRoot: '/repo',
      executionId: 'exec-1',
      rootCommand: 'STEP RUN STEP-001',
      command: 'STEP PLAN STEP-001',
    });
    expect(session.handle).toBe('thr-1');

    await surface.sendInput('thr-1', { requestId: 'input-1', value: 'continue' });
    await surface.cancel('thr-1');

    expect(peer.calls.map((call) => call.method)).toEqual([
      'initialize',
      'account/read',
      'thread/start',
      'turn/start',
      'turn/steer',
      'turn/interrupt',
    ]);
  });

  it('нормализует Codex stream notifications', async () => {
    const peer = new FakePeer();
    const surface = await createCodexAppServerSurface({ peer });
    await surface.start({
      projectRoot: '/repo',
      executionId: 'exec-1',
      rootCommand: 'STEP RUN STEP-001',
      command: 'STEP PLAN STEP-001',
    });

    peer.emit({
      method: 'item/agentMessage/delta',
      params: { threadId: 'thr-1', delta: 'hello' },
    });
    peer.emit({
      method: 'turn/completed',
      params: { threadId: 'thr-1', turn: { id: 'turn-1', status: 'completed' } },
    });

    const events = await surface.readEvents('thr-1', 0);
    expect(events.map((event) => event.type)).toEqual([
      'run.started',
      'model.message.delta',
      'run.completed',
    ]);
    await expect(surface.status('thr-1')).resolves.toEqual({
      state: 'completed',
      terminal: true,
    });
  });

  it('использует claude auth status --json как machine-readable account source', async () => {
    const launcher = new FakeLauncher();
    const surface = createClaudeCliSurface({ launcher });

    const promise = surface.authStatus();
    const auth = launcher.latest();
    expect(launcher.calls[0]).toMatchObject({
      command: 'claude',
      args: ['auth', 'status', '--json'],
    });
    auth.stdout.write(
      JSON.stringify({
        loggedIn: true,
        email: 'claude@example.test',
        authMethod: 'oauth_token',
      }),
    );
    auth.emit('exit', 0, null);

    await expect(promise).resolves.toEqual({
      authenticated: true,
      email: 'claude@example.test',
      organization: undefined,
      authMethod: 'oauth_token',
    });
  });

  it('запускает Claude в bidirectional stream-json и сохраняет restart-safe handle', async () => {
    const launcher = new FakeLauncher();
    const surface = createClaudeCliSurface({
      launcher,
      authStatus: { run: async () => ({ loggedIn: true }) },
    });

    const startPromise = surface.start({
      projectRoot: '/repo',
      executionId: 'exec-1',
      rootCommand: 'STEP RUN STEP-001',
      command: 'STEP PLAN STEP-001',
    });
    const first = launcher.latest();
    expect(launcher.calls[0]).toMatchObject({
      command: 'claude',
      cwd: '/repo',
    });
    expect(launcher.call(0).args).toEqual([
      '-p',
      '--output-format',
      'stream-json',
      '--input-format',
      'stream-json',
      '--verbose',
      '--include-partial-messages',
    ]);

    const initialInput = first.stdin.read()?.toString() ?? '';
    expect(initialInput).toContain('STEP PLAN STEP-001');

    first.stdout.write(
      `${JSON.stringify({
        type: 'system',
        subtype: 'init',
        session_id: 'claude-session-1',
        cwd: '/repo',
      })}\n`,
    );
    const started = await startPromise;
    expect(started.handle).toMatch(/^claude:v1:/);

    first.exitCode = 0;
    first.emit('exit', 0, null);

    const resumePromise = surface.resume(started.handle);
    const resumed = launcher.latest();
    expect(launcher.call(1).cwd).toBe('/repo');
    expect(launcher.call(1).args).toContain('--resume');
    expect(launcher.call(1).args).toContain('claude-session-1');

    // Provider может вернуть invocation-only id; canonical handle не меняется.
    resumed.stdout.write(
      `${JSON.stringify({
        type: 'system',
        subtype: 'init',
        session_id: 'invocation-only-id',
        cwd: '/repo',
      })}\n`,
    );
    await expect(resumePromise).resolves.toEqual({ handle: started.handle });

    await surface.sendInput(started.handle, {
      requestId: 'input-2',
      value: 'continue',
    });
    const followUp = resumed.stdin.read()?.toString() ?? '';
    expect(followUp).toContain('continue');

    await surface.cancel(started.handle);
    expect(resumed.killedWith).toBe('SIGTERM');
  });
});
