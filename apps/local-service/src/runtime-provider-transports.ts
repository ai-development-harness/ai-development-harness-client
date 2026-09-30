import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

import type {
  RuntimeAccount,
  RuntimeEventType,
  RuntimeInput,
  RuntimeStartRequest,
  RuntimeStatus,
} from '@org/client-api';

import type {
  ClaudeRuntimeSurface,
  CodexRuntimeSurface,
  RuntimeDriverEvent,
  RuntimeDriverSession,
} from './runtime-bridge';

type JsonObject = Readonly<Record<string, unknown>>;

interface JsonRpcResponse {
  id: number;
  result?: unknown;
  error?: { code?: number; message?: string };
}

interface JsonRpcNotification {
  method: string;
  params?: JsonObject;
}

export interface JsonRpcPeer {
  request(method: string, params?: JsonObject): Promise<unknown>;
  notify(method: string, params?: JsonObject): void;
  onNotification(listener: (notification: JsonRpcNotification) => void): () => void;
  close(): Promise<void>;
}

export interface ProcessHandle {
  readonly stdout: NodeJS.ReadableStream;
  readonly stderr: NodeJS.ReadableStream;
  readonly stdin: NodeJS.WritableStream;
  readonly exitCode: number | null;
  kill(signal?: NodeJS.Signals): boolean;
  once(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this;
}

export interface ProcessLauncher {
  spawn(command: string, args: readonly string[], options: { cwd?: string }): ProcessHandle;
}

export function createNodeProcessLauncher(): ProcessLauncher {
  return {
    spawn(command, args, options) {
      return spawn(command, [...args], {
        cwd: options.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      }) as ChildProcessWithoutNullStreams;
    },
  };
}

function writeJsonLine(stream: NodeJS.WritableStream, value: unknown): void {
  stream.write(`${JSON.stringify(value)}\n`);
}

export function createStdioJsonRpcPeer(options: {
  launcher?: ProcessLauncher;
  command: string;
  args: readonly string[];
  cwd?: string;
}): JsonRpcPeer {
  const launcher = options.launcher ?? createNodeProcessLauncher();
  const child = launcher.spawn(options.command, options.args, { cwd: options.cwd });
  const pending = new Map<
    number,
    { resolve(value: unknown): void; reject(error: Error): void }
  >();
  const listeners = new Set<(notification: JsonRpcNotification) => void>();
  let nextId = 1;
  let closed = false;
  let stderr = '';

  const stdout = createInterface({ input: child.stdout });
  const stderrLines = createInterface({ input: child.stderr });

  stderrLines.on('line', (line) => {
    stderr = `${stderr}\n${line}`.slice(-8192);
  });

  stdout.on('line', (line) => {
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (!message || typeof message !== 'object') return;
    const record = message as Record<string, unknown>;

    if (typeof record.id === 'number') {
      const waiter = pending.get(record.id);
      if (!waiter) return;
      pending.delete(record.id);
      const response = record as unknown as JsonRpcResponse;
      if (response.error) {
        waiter.reject(
          new Error(
            `JSON_RPC_ERROR ${response.error.code ?? ''}: ${response.error.message ?? 'unknown'}`,
          ),
        );
      } else {
        waiter.resolve(response.result);
      }
      return;
    }

    if (typeof record.method === 'string') {
      const notification: JsonRpcNotification = {
        method: record.method,
        params:
          record.params && typeof record.params === 'object'
            ? (record.params as JsonObject)
            : undefined,
      };
      for (const listener of listeners) listener(notification);
    }
  });

  child.once('exit', (code, signal) => {
    closed = true;
    const reason = `JSON_RPC_PROCESS_EXITED: code=${String(code)} signal=${String(signal)}${stderr}`;
    for (const waiter of pending.values()) waiter.reject(new Error(reason));
    pending.clear();
  });

  return {
    request(method, params = {}) {
      if (closed) return Promise.reject(new Error('JSON_RPC_PROCESS_CLOSED'));
      const id = nextId++;
      writeJsonLine(child.stdin, { method, id, params });
      return new Promise<unknown>((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },

    notify(method, params = {}) {
      if (closed) throw new Error('JSON_RPC_PROCESS_CLOSED');
      writeJsonLine(child.stdin, { method, params });
    },

    onNotification(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async close() {
      if (closed) return;
      closed = true;
      stdout.close();
      stderrLines.close();
      child.kill('SIGTERM');
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('RUNTIME_PROVIDER_RESPONSE_INVALID');
  return value as Record<string, unknown>;
}

function stringField(value: unknown, key: string): string | undefined {
  const field = asRecord(value)[key];
  return typeof field === 'string' ? field : undefined;
}

function normalizeCodexNotification(notification: JsonRpcNotification): RuntimeDriverEvent | undefined {
  const params = notification.params ?? {};
  switch (notification.method) {
    case 'turn/started':
      return { type: 'run.started', data: params };
    case 'item/agentMessage/delta':
      return { type: 'model.message.delta', data: params };
    case 'item/completed': {
      const item = params.item;
      if (item && typeof item === 'object' && (item as Record<string, unknown>).type === 'agentMessage') {
        return { type: 'model.message.completed', data: params };
      }
      return { type: 'tool.completed', data: params };
    }
    case 'item/started':
      return { type: 'tool.started', data: params };
    case 'turn/completed': {
      const turn = params.turn;
      const status =
        turn && typeof turn === 'object'
          ? (turn as Record<string, unknown>).status
          : undefined;
      if (status === 'interrupted') return { type: 'run.interrupted', data: params };
      if (status === 'failed') return { type: 'run.failed', data: params };
      return { type: 'run.completed', data: params };
    }
    case 'account/updated':
      return undefined;
    default:
      return undefined;
  }
}

interface CodexSession {
  threadId: string;
  activeTurnId?: string;
  events: RuntimeDriverEvent[];
  status: RuntimeStatus;
}

export async function createCodexAppServerSurface(options: {
  peer?: JsonRpcPeer;
  launcher?: ProcessLauncher;
  command?: string;
  args?: readonly string[];
} = {}): Promise<CodexRuntimeSurface & { close(): Promise<void> }> {
  const peer =
    options.peer ??
    createStdioJsonRpcPeer({
      launcher: options.launcher,
      command: options.command ?? 'codex',
      args: options.args ?? ['app-server'],
    });

  await peer.request('initialize', {
    clientInfo: {
      name: 'ai_development_harness_client',
      title: 'AI Development Harness Client',
      version: '0.1.0',
    },
  });
  peer.notify('initialized');

  const sessions = new Map<string, CodexSession>();
  peer.onNotification((notification) => {
    const event = normalizeCodexNotification(notification);
    const params = notification.params ?? {};
    const threadId =
      typeof params.threadId === 'string'
        ? params.threadId
        : params.thread && typeof params.thread === 'object'
          ? stringField(params.thread, 'id')
          : undefined;
    if (!threadId) return;

    const session = sessions.get(threadId);
    if (!session) return;

    if (notification.method === 'turn/started') {
      const turn = params.turn;
      if (turn && typeof turn === 'object') {
        session.activeTurnId = stringField(turn, 'id');
      }
      session.status = { state: 'running', terminal: false };
    }
    if (notification.method === 'turn/completed') {
      const turn = params.turn;
      const providerStatus =
        turn && typeof turn === 'object'
          ? (turn as Record<string, unknown>).status
          : undefined;
      if (providerStatus === 'interrupted') {
        session.status = { state: 'cancelled', terminal: true };
      } else if (providerStatus === 'failed') {
        session.status = { state: 'failed', terminal: true };
      } else {
        session.status = { state: 'completed', terminal: true };
      }
      session.activeTurnId = undefined;
    }
    if (event) session.events.push(event);
  });

  async function startTurn(threadId: string, command: string): Promise<void> {
    const response = asRecord(
      await peer.request('turn/start', {
        threadId,
        input: [{ type: 'text', text: command }],
      }),
    );
    const turn = asRecord(response.turn);
    const session = sessions.get(threadId);
    if (!session) throw new Error('CODEX_SESSION_NOT_REGISTERED');
    session.activeTurnId = stringField(turn, 'id');
  }

  return {
    async accountRead() {
      const response = asRecord(await peer.request('account/read', { refreshToken: false }));
      const account = response.account;
      if (!account || typeof account !== 'object') return { authenticated: false };
      const record = account as Record<string, unknown>;
      return {
        authenticated: true,
        email: typeof record.email === 'string' ? record.email : undefined,
        authMethod: typeof record.type === 'string' ? record.type : undefined,
        organization:
          typeof record.workspaceName === 'string' ? record.workspaceName : undefined,
      } satisfies RuntimeAccount;
    },

    async start(request) {
      const response = asRecord(
        await peer.request('thread/start', {
          cwd: request.projectRoot,
        }),
      );
      const thread = asRecord(response.thread);
      const threadId = stringField(thread, 'id');
      if (!threadId) throw new Error('CODEX_THREAD_ID_MISSING');
      sessions.set(threadId, {
        threadId,
        events: [],
        status: { state: 'starting', terminal: false },
      });
      await startTurn(threadId, request.command);
      return { handle: threadId };
    },

    async resume(handle) {
      const response = asRecord(await peer.request('thread/resume', { threadId: handle }));
      const thread = asRecord(response.thread);
      const threadId = stringField(thread, 'id');
      if (threadId !== handle) throw new Error('CODEX_RESUME_HANDLE_CHANGED');
      const existing = sessions.get(handle);
      sessions.set(handle, existing ?? {
        threadId: handle,
        events: [],
        status: { state: 'interrupted', terminal: false },
      });
      return { handle };
    },

    async cancel(handle) {
      const session = sessions.get(handle);
      if (!session?.activeTurnId) throw new Error('CODEX_NO_ACTIVE_TURN');
      await peer.request('turn/interrupt', {
        threadId: handle,
        turnId: session.activeTurnId,
      });
    },

    async sendInput(handle, input: RuntimeInput) {
      const session = sessions.get(handle);
      if (!session?.activeTurnId) throw new Error('CODEX_NO_ACTIVE_TURN');
      await peer.request('turn/steer', {
        threadId: handle,
        expectedTurnId: session.activeTurnId,
        input: [{ type: 'text', text: input.value }],
      });
    },

    async status(handle) {
      const session = sessions.get(handle);
      if (!session) throw new Error('CODEX_SESSION_NOT_FOUND');
      return session.status;
    },

    async readEvents(handle, afterSequence) {
      const session = sessions.get(handle);
      if (!session) throw new Error('CODEX_SESSION_NOT_FOUND');
      return session.events.slice(afterSequence);
    },

    close: () => peer.close(),
  };
}

export interface ClaudeAuthStatusRunner {
  run(): Promise<unknown>;
}

export function createClaudeAuthStatusRunner(options: {
  launcher?: ProcessLauncher;
  command?: string;
} = {}): ClaudeAuthStatusRunner {
  const launcher = options.launcher ?? createNodeProcessLauncher();
  const command = options.command ?? 'claude';
  return {
    run() {
      const child = launcher.spawn(command, ['auth', 'status', '--json'], {});
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer | string) => {
        stdout += String(chunk);
      });
      child.stderr.on('data', (chunk: Buffer | string) => {
        stderr += String(chunk);
      });
      return new Promise<unknown>((resolve, reject) => {
        child.once('exit', (code, signal) => {
          if (code !== 0) {
            reject(
              new Error(
                `CLAUDE_AUTH_STATUS_FAILED: code=${String(code)} signal=${String(signal)} ${stderr.slice(-4096)}`,
              ),
            );
            return;
          }
          try {
            resolve(JSON.parse(stdout));
          } catch {
            reject(new Error('CLAUDE_AUTH_STATUS_INVALID_JSON'));
          }
        });
      });
    },
  };
}

export interface ClaudeProcessSession {
  handle: string;
  events: RuntimeDriverEvent[];
  status: RuntimeStatus;
  process: ProcessHandle;
}

function claudeEventType(record: Record<string, unknown>): RuntimeEventType | undefined {
  if (record.type === 'system' && record.subtype === 'init') return 'run.started';
  if (record.type === 'assistant') return 'model.message.completed';
  if (record.type === 'stream_event') return 'model.message.delta';
  if (record.type === 'result') {
    if (record.subtype === 'error_during_execution' || record.is_error === true) {
      return 'run.failed';
    }
    return 'run.completed';
  }
  return undefined;
}

export function createClaudeCliSurface(options: {
  launcher?: ProcessLauncher;
  authStatus?: ClaudeAuthStatusRunner;
  command?: string;
} = {}): ClaudeRuntimeSurface {
  const launcher = options.launcher ?? createNodeProcessLauncher();
  const executable = options.command ?? 'claude';
  const authStatus =
    options.authStatus ??
    createClaudeAuthStatusRunner({ launcher, command: executable });
  const sessions = new Map<string, ClaudeProcessSession>();

  function writeUserInput(process: ProcessHandle, value: string): void {
    writeJsonLine(process.stdin, {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: value }],
      },
    });
  }

  function spawnSession(
    projectRoot: string,
    resumeHandle?: string,
    initialInput?: string,
  ): Promise<ClaudeProcessSession> {
    const args = [
      '-p',
      '--output-format',
      'stream-json',
      '--input-format',
      'stream-json',
      '--verbose',
      '--include-partial-messages',
    ];
    if (resumeHandle) args.push('--resume', resumeHandle);

    const process = launcher.spawn(executable, args, { cwd: projectRoot });
    const events: RuntimeDriverEvent[] = [];
    let settled = false;
    let canonicalHandle = resumeHandle;

    if (initialInput !== undefined) writeUserInput(process, initialInput);

    return new Promise<ClaudeProcessSession>((resolve, reject) => {
      const lines = createInterface({ input: process.stdout });

      lines.on('line', (line) => {
        let value: unknown;
        try {
          value = JSON.parse(line);
        } catch {
          return;
        }
        if (!value || typeof value !== 'object') return;
        const record = value as Record<string, unknown>;
        const type = claudeEventType(record);
        if (type) events.push({ type, data: record });

        if (!settled && record.type === 'system' && record.subtype === 'init') {
          const observed =
            typeof record.session_id === 'string' ? record.session_id : undefined;
          // На resume canonical handle всегда остаётся тем, который запросил host.
          // Это защищает recovery от invocation-only session_id некоторых версий CLI.
          canonicalHandle ??= observed;
          if (!canonicalHandle) {
            reject(new Error('CLAUDE_SESSION_ID_MISSING'));
            return;
          }
          const session: ClaudeProcessSession = {
            handle: canonicalHandle,
            events,
            status: { state: 'running', terminal: false },
            process,
          };
          sessions.set(canonicalHandle, session);
          settled = true;
          resolve(session);
        }

        if (record.type === 'result' && canonicalHandle) {
          const session = sessions.get(canonicalHandle);
          if (session) {
            session.status =
              record.is_error === true
                ? { state: 'failed', terminal: true }
                : { state: 'completed', terminal: true };
          }
        }
      });

      process.once('exit', (code, signal) => {
        if (!settled) {
          reject(
            new Error(
              `CLAUDE_PROCESS_EXITED_BEFORE_INIT: code=${String(code)} signal=${String(signal)}`,
            ),
          );
          return;
        }
        if (canonicalHandle) {
          const session = sessions.get(canonicalHandle);
          if (session && !session.status.terminal) {
            session.status =
              code === 0
                ? { state: 'completed', terminal: true }
                : { state: 'failed', terminal: true, reason: `exit ${String(code)}` };
          }
        }
      });
    });
  }

  return {
    async authStatus() {
      const value = asRecord(await authStatus.run());
      const authenticated =
        value.loggedIn === true ||
        value.authenticated === true ||
        value.logged_in === true;
      return {
        authenticated,
        email: typeof value.email === 'string' ? value.email : undefined,
        organization:
          typeof value.organization === 'string'
            ? value.organization
            : typeof value.org === 'string'
              ? value.org
              : undefined,
        authMethod:
          typeof value.authMethod === 'string'
            ? value.authMethod
            : typeof value.subscriptionType === 'string'
              ? value.subscriptionType
              : undefined,
      };
    },

    async start(request) {
      const session = await spawnSession(
        request.projectRoot,
        undefined,
        request.command,
      );
      return { handle: session.handle };
    },

    async resume(handle) {
      const existing = sessions.get(handle);
      if (existing && !existing.status.terminal && existing.process.exitCode === null) {
        return { handle };
      }
      const projectRoot =
        existing && typeof existing.events[0]?.data?.cwd === 'string'
          ? existing.events[0].data.cwd
          : process.cwd();
      const session = await spawnSession(projectRoot, handle);
      return { handle: session.handle };
    },

    async cancel(handle) {
      const session = sessions.get(handle);
      if (!session) throw new Error('CLAUDE_SESSION_NOT_FOUND');
      if (session.status.terminal) return;
      session.process.kill('SIGTERM');
      session.events.push({ type: 'run.interrupted', data: {} });
      session.status = { state: 'cancelled', terminal: true };
    },

    async sendInput(handle, input) {
      const session = sessions.get(handle);
      if (!session) throw new Error('CLAUDE_SESSION_NOT_FOUND');
      if (session.status.terminal) throw new Error('CLAUDE_SESSION_TERMINAL');
      writeUserInput(session.process, input.value);
    },

    async status(handle) {
      const session = sessions.get(handle);
      if (!session) throw new Error('CLAUDE_SESSION_NOT_FOUND');
      return session.status;
    },

    async readEvents(handle, afterSequence) {
      const session = sessions.get(handle);
      if (!session) throw new Error('CLAUDE_SESSION_NOT_FOUND');
      return session.events.slice(afterSequence);
    },
  };
}
