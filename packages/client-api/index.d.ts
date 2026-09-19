export type RepositoryValidity = 'initialized' | 'pre-init' | 'invalid';

export interface ProjectionError {
  code: 'INVALID_REPOSITORY' | 'IO_ERROR' | 'GIT_UNAVAILABLE' | 'RESOURCE_LIMIT';
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
