export type RepositoryValidity = 'initialized' | 'pre-init' | 'invalid';

export interface ProjectionError {
  code: 'INVALID_REPOSITORY' | 'IO_ERROR' | 'GIT_UNAVAILABLE' | 'RESOURCE_LIMIT' | 'PLATFORM_UNSUPPORTED';
  message: string;
}

export interface StepProjection {
  id: string;
  title: string;
  status: string;
}

export interface AvailableGitProjection {
  available: true;
  branch?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  worktree: 'clean' | 'dirty';
}

// Недоступная Git capability не может передавать metadata выбранного repository.
// Это закрепляет boundary ADR-004 и не позволяет adapter выдать частичные facts.
export interface UnavailableGitProjection {
  available: false;
  worktree: 'unavailable';
  unavailableReason: 'SECURITY_POLICY' | 'NOT_GIT_REPOSITORY' | 'ROOT_IDENTITY_MISMATCH' | 'GIT_TIMEOUT' | 'GIT_FAILED' | 'RESOURCE_LIMIT' | 'IO_ERROR';
  branch?: never;
  upstream?: never;
  ahead?: never;
  behind?: never;
}

export type GitProjection = AvailableGitProjection | UnavailableGitProjection;

export interface ExecutionStatusProjection {
  availability: 'missing' | 'valid' | 'invalid';
  executionCount?: number;
  raw?: string;
  data?: Readonly<Record<string, unknown>>;
}

export interface RepositoryProjection {
  root: string;
  validity: RepositoryValidity;
  initialized?: boolean;
  harnessRelease?: string;
  steps: StepProjection[];
  git: GitProjection;
  executionStatus: ExecutionStatusProjection;
}

export type RepositoryLoadResult =
  | { ok: true; value: RepositoryProjection }
  | { ok: false; error: ProjectionError };

// UI узнаёт о repository только через этот typed contract.
// Transport и privileged implementation остаются за его границей.
export interface ClientApi {
  loadRepository(projectRoot: string): Promise<RepositoryLoadResult>;
}


export type RuntimeId = 'codex' | 'claude';
export type RuntimeSupportState = 'native' | 'synthesized' | 'unsupported';

export interface RuntimeCapabilities {
  runtimeIdentity: RuntimeSupportState;
  authenticatedAccount: RuntimeSupportState;
  modelEffort: RuntimeSupportState;
  interactiveInput: RuntimeSupportState;
  streaming: RuntimeSupportState;
  resume: RuntimeSupportState;
  cancel: RuntimeSupportState;
  subagents: RuntimeSupportState;
  structuredOutput: RuntimeSupportState;
  toolMcp: RuntimeSupportState;
  sessionExecutionIds: RuntimeSupportState;
}

export interface RuntimeAccount {
  authenticated: boolean;
  displayName?: string;
  email?: string;
  organization?: string;
  authMethod?: string;
  avatarUrl?: string;
}

export type RuntimeEventType =
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
  schemaVersion: 1;
  sequence: number;
  type: RuntimeEventType;
  runtimeId: RuntimeId;
  sessionId: string;
  executionId: string;
  data: Readonly<Record<string, unknown>>;
}

export interface RuntimeEventPage {
  events: readonly RuntimeEvent[];
  nextCursor: number;
}

export interface RuntimeInput {
  requestId: string;
  value: string;
}

export interface RuntimeStartRequest {
  projectRoot: string;
  executionId: string;
  rootCommand: string;
  command: string;
}

export interface RuntimeSessionBinding {
  schemaVersion: 1;
  runtimeId: RuntimeId;
  handle: string;
  projectRoot: string;
  executionId: string;
  rootCommand: string;
  terminal: boolean;
  cursor: number;
}

export interface RuntimeStatus {
  state:
    | 'starting'
    | 'running'
    | 'input-required'
    | 'interrupted'
    | 'cancelled'
    | 'completed'
    | 'failed';
  terminal: boolean;
  reason?: string;
}


export interface RuntimeClientApi {
  listRuntimeIds(): Promise<readonly RuntimeId[]>;
  getRuntimeCapabilities(runtimeId: RuntimeId): Promise<RuntimeCapabilities>;
  getRuntimeAccount(runtimeId: RuntimeId): Promise<RuntimeAccount>;
  startRuntime(runtimeId: RuntimeId, request: RuntimeStartRequest): Promise<RuntimeSessionBinding>;
  resumeRuntime(binding: RuntimeSessionBinding): Promise<RuntimeSessionBinding>;
  cancelRuntime(binding: RuntimeSessionBinding): Promise<void>;
  sendRuntimeInput(binding: RuntimeSessionBinding, input: RuntimeInput): Promise<void>;
  getRuntimeStatus(binding: RuntimeSessionBinding): Promise<RuntimeStatus>;
  readRuntimeEvents(binding: RuntimeSessionBinding, afterSequence: number): Promise<RuntimeEventPage>;
}
