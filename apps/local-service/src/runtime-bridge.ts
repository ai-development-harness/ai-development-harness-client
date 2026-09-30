import type {
  RuntimeAccount,
  RuntimeCapabilities,
  RuntimeEvent,
  RuntimeEventPage,
  RuntimeId,
  RuntimeInput,
  RuntimeClientApi,
  RuntimeSessionBinding,
  RuntimeStartRequest,
  RuntimeStatus,
} from '@org/client-api';

const EVENT_TYPES = new Set<RuntimeEvent['type']>([
  'run.started',
  'model.message.delta',
  'model.message.completed',
  'tool.started',
  'tool.completed',
  'input.required',
  'auth.required',
  'run.interrupted',
  'run.completed',
  'run.failed',
]);

const CAPABILITY_KEYS = [
  'runtimeIdentity',
  'authenticatedAccount',
  'modelEffort',
  'interactiveInput',
  'streaming',
  'resume',
  'cancel',
  'subagents',
  'structuredOutput',
  'toolMcp',
  'sessionExecutionIds',
] as const;

export interface RuntimeDriverEvent {
  type: RuntimeEvent['type'];
  data?: Readonly<Record<string, unknown>>;
}

export interface RuntimeDriverSession {
  handle: string;
  events?: readonly RuntimeDriverEvent[];
}

export interface RuntimeDriver {
  readonly runtimeId: RuntimeId;
  readonly adapterVersion: number;
  readonly capabilities: RuntimeCapabilities;
  getAccount(): Promise<RuntimeAccount>;
  start(request: RuntimeStartRequest): Promise<RuntimeDriverSession>;
  resume(handle: string): Promise<RuntimeDriverSession>;
  cancel(handle: string): Promise<void>;
  sendInput(handle: string, input: RuntimeInput): Promise<void>;
  status(handle: string): Promise<RuntimeStatus>;
  readEvents(handle: string, afterSequence: number): Promise<readonly RuntimeDriverEvent[]>;
}

export interface HarnessResumeDecision {
  action: 'resume' | 'complete' | 'blocked';
  canonicalCommand?: string;
  reason?: string;
}

export interface HarnessExecutionResolver {
  resolve(projectRoot: string, executionId: string): Promise<HarnessResumeDecision>;
}

export interface RuntimeBridge {
  listRuntimeIds(): readonly RuntimeId[];
  getCapabilities(runtimeId: RuntimeId): RuntimeCapabilities;
  getAccount(runtimeId: RuntimeId): Promise<RuntimeAccount>;
  start(runtimeId: RuntimeId, request: RuntimeStartRequest): Promise<RuntimeSessionBinding>;
  resume(binding: RuntimeSessionBinding): Promise<RuntimeSessionBinding>;
  cancel(binding: RuntimeSessionBinding): Promise<void>;
  sendInput(binding: RuntimeSessionBinding, input: RuntimeInput): Promise<void>;
  status(binding: RuntimeSessionBinding): Promise<RuntimeStatus>;
  readEvents(binding: RuntimeSessionBinding, afterSequence: number): Promise<RuntimeEventPage>;
}

function requireSupport(
  capabilities: RuntimeCapabilities,
  name: keyof RuntimeCapabilities,
): void {
  if (capabilities[name] === 'unsupported') {
    throw new Error(`RUNTIME_CAPABILITY_UNSUPPORTED: ${name}`);
  }
}

function assertCapabilities(capabilities: RuntimeCapabilities): void {
  for (const key of CAPABILITY_KEYS) {
    const value = capabilities[key];
    if (value !== 'native' && value !== 'synthesized' && value !== 'unsupported') {
      throw new Error(`RUNTIME_CONTRACT_INVALID: capability ${key}`);
    }
  }
}

function assertBinding(driver: RuntimeDriver, binding: RuntimeSessionBinding): void {
  if (driver.runtimeId !== binding.runtimeId) {
    throw new Error(
      `RUNTIME_BINDING_MISMATCH: expected ${driver.runtimeId}, got ${binding.runtimeId}`,
    );
  }
  if (!binding.handle || !binding.executionId || !binding.rootCommand || !binding.projectRoot) {
    throw new Error('RUNTIME_BINDING_INVALID');
  }
}

function normalizeEvent(
  runtimeId: RuntimeId,
  binding: RuntimeSessionBinding,
  event: RuntimeDriverEvent,
  sequence: number,
): RuntimeEvent {
  if (!EVENT_TYPES.has(event.type)) {
    throw new Error(`RUNTIME_EVENT_UNSUPPORTED: ${event.type}`);
  }
  return {
    schemaVersion: 1,
    sequence,
    type: event.type,
    runtimeId,
    sessionId: binding.handle,
    executionId: binding.executionId,
    data: event.data ?? {},
  };
}

export function createRuntimeBridge(options: {
  drivers: readonly RuntimeDriver[];
  resolver: HarnessExecutionResolver;
}): RuntimeBridge {
  const drivers = new Map<RuntimeId, RuntimeDriver>();
  for (const driver of options.drivers) {
    if (drivers.has(driver.runtimeId)) {
      throw new Error(`RUNTIME_DUPLICATE: ${driver.runtimeId}`);
    }
    if (!Number.isInteger(driver.adapterVersion) || driver.adapterVersion < 1) {
      throw new Error(`RUNTIME_CONTRACT_INVALID: adapterVersion ${driver.runtimeId}`);
    }
    assertCapabilities(driver.capabilities);
    drivers.set(driver.runtimeId, driver);
  }

  const requireDriver = (runtimeId: RuntimeId): RuntimeDriver => {
    const driver = drivers.get(runtimeId);
    if (!driver) throw new Error(`RUNTIME_NOT_REGISTERED: ${runtimeId}`);
    return driver;
  };

  const makeBinding = (
    runtimeId: RuntimeId,
    request: RuntimeStartRequest,
    session: RuntimeDriverSession,
  ): RuntimeSessionBinding => ({
    schemaVersion: 1,
    runtimeId,
    handle: session.handle,
    projectRoot: request.projectRoot,
    executionId: request.executionId,
    rootCommand: request.rootCommand,
    terminal: false,
    cursor: 0,
  });

  return {
    listRuntimeIds() {
      return [...drivers.keys()].sort();
    },

    getCapabilities(runtimeId) {
      return { ...requireDriver(runtimeId).capabilities };
    },

    async getAccount(runtimeId) {
      const driver = requireDriver(runtimeId);
      requireSupport(driver.capabilities, 'authenticatedAccount');
      const account = await driver.getAccount();
      return {
        authenticated: account.authenticated,
        displayName: account.displayName,
        email: account.email,
        organization: account.organization,
        authMethod: account.authMethod,
        avatarUrl: account.avatarUrl,
      };
    },

    async start(runtimeId, request) {
      const driver = requireDriver(runtimeId);
      requireSupport(driver.capabilities, 'runtimeIdentity');
      requireSupport(driver.capabilities, 'streaming');
      const session = await driver.start(request);
      if (!session.handle) throw new Error('RUNTIME_SESSION_HANDLE_MISSING');
      return makeBinding(runtimeId, request, session);
    },

    async resume(binding) {
      const driver = requireDriver(binding.runtimeId);
      assertBinding(driver, binding);
      requireSupport(driver.capabilities, 'resume');

      const decision = await options.resolver.resolve(binding.projectRoot, binding.executionId);
      if (decision.action !== 'resume') {
        const suffix = decision.reason ? `: ${decision.reason}` : '';
        throw new Error(`HARNESS_RESUME_NOT_ALLOWED: ${decision.action}${suffix}`);
      }

      const session = await driver.resume(binding.handle);
      if (session.handle !== binding.handle) {
        throw new Error('RUNTIME_RESUME_HANDLE_CHANGED');
      }
      return { ...binding, terminal: false };
    },

    async cancel(binding) {
      const driver = requireDriver(binding.runtimeId);
      assertBinding(driver, binding);
      requireSupport(driver.capabilities, 'cancel');
      await driver.cancel(binding.handle);
    },

    async sendInput(binding, input) {
      const driver = requireDriver(binding.runtimeId);
      assertBinding(driver, binding);
      requireSupport(driver.capabilities, 'interactiveInput');
      await driver.sendInput(binding.handle, input);
    },

    status(binding) {
      const driver = requireDriver(binding.runtimeId);
      assertBinding(driver, binding);
      return driver.status(binding.handle);
    },

    async readEvents(binding, afterSequence) {
      const driver = requireDriver(binding.runtimeId);
      assertBinding(driver, binding);
      requireSupport(driver.capabilities, 'streaming');
      if (!Number.isInteger(afterSequence) || afterSequence < 0) {
        throw new Error('RUNTIME_CURSOR_INVALID');
      }

      const raw = await driver.readEvents(binding.handle, afterSequence);
      const events = raw.map((event, index) =>
        normalizeEvent(binding.runtimeId, binding, event, afterSequence + index + 1),
      );
      return {
        events,
        nextCursor: events.at(-1)?.sequence ?? afterSequence,
      };
    },
  };
}

export interface CodexRuntimeSurface {
  accountRead(): Promise<RuntimeAccount>;
  start(request: RuntimeStartRequest): Promise<RuntimeDriverSession>;
  resume(handle: string): Promise<RuntimeDriverSession>;
  cancel(handle: string): Promise<void>;
  sendInput(handle: string, input: RuntimeInput): Promise<void>;
  status(handle: string): Promise<RuntimeStatus>;
  readEvents(handle: string, afterSequence: number): Promise<readonly RuntimeDriverEvent[]>;
}

export interface ClaudeRuntimeSurface {
  authStatus(): Promise<RuntimeAccount>;
  start(request: RuntimeStartRequest): Promise<RuntimeDriverSession>;
  resume(handle: string): Promise<RuntimeDriverSession>;
  cancel(handle: string): Promise<void>;
  sendInput(handle: string, input: RuntimeInput): Promise<void>;
  status(handle: string): Promise<RuntimeStatus>;
  readEvents(handle: string, afterSequence: number): Promise<readonly RuntimeDriverEvent[]>;
}

const CODEX_CAPABILITIES: RuntimeCapabilities = {
  runtimeIdentity: 'native',
  authenticatedAccount: 'native',
  modelEffort: 'native',
  interactiveInput: 'native',
  streaming: 'native',
  resume: 'native',
  cancel: 'native',
  subagents: 'native',
  structuredOutput: 'native',
  toolMcp: 'native',
  sessionExecutionIds: 'native',
};

const CLAUDE_CAPABILITIES: RuntimeCapabilities = {
  runtimeIdentity: 'native',
  authenticatedAccount: 'native',
  modelEffort: 'native',
  interactiveInput: 'native',
  streaming: 'native',
  resume: 'native',
  cancel: 'native',
  subagents: 'native',
  structuredOutput: 'synthesized',
  toolMcp: 'native',
  sessionExecutionIds: 'synthesized',
};

export function createCodexRuntimeDriver(surface: CodexRuntimeSurface): RuntimeDriver {
  return {
    runtimeId: 'codex',
    adapterVersion: 1,
    capabilities: CODEX_CAPABILITIES,
    getAccount: () => surface.accountRead(),
    start: (request) => surface.start(request),
    resume: (handle) => surface.resume(handle),
    cancel: (handle) => surface.cancel(handle),
    sendInput: (handle, input) => surface.sendInput(handle, input),
    status: (handle) => surface.status(handle),
    readEvents: (handle, afterSequence) => surface.readEvents(handle, afterSequence),
  };
}

export function createClaudeRuntimeDriver(surface: ClaudeRuntimeSurface): RuntimeDriver {
  return {
    runtimeId: 'claude',
    adapterVersion: 1,
    capabilities: CLAUDE_CAPABILITIES,
    getAccount: () => surface.authStatus(),
    start: (request) => surface.start(request),
    resume: (handle) => surface.resume(handle),
    cancel: (handle) => surface.cancel(handle),
    sendInput: (handle, input) => surface.sendInput(handle, input),
    status: (handle) => surface.status(handle),
    readEvents: (handle, afterSequence) => surface.readEvents(handle, afterSequence),
  };
}


export function createRuntimeClientApi(bridge: RuntimeBridge): RuntimeClientApi {
  return {
    async listRuntimeIds() {
      return bridge.listRuntimeIds();
    },
    async getRuntimeCapabilities(runtimeId) {
      return bridge.getCapabilities(runtimeId);
    },
    async getRuntimeAccount(runtimeId) {
      return bridge.getAccount(runtimeId);
    },
    async startRuntime(runtimeId, request) {
      return bridge.start(runtimeId, request);
    },
    async resumeRuntime(binding) {
      return bridge.resume(binding);
    },
    async cancelRuntime(binding) {
      await bridge.cancel(binding);
    },
    async sendRuntimeInput(binding, input) {
      await bridge.sendInput(binding, input);
    },
    async getRuntimeStatus(binding) {
      return bridge.status(binding);
    },
    async readRuntimeEvents(binding, afterSequence) {
      return bridge.readEvents(binding, afterSequence);
    },
  };
}
