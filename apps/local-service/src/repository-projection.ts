import { constants } from 'node:fs';
import { open, opendir, realpath, type FileHandle } from 'node:fs/promises';
import { basename, join, sep } from 'node:path';
import { parseDocument } from 'yaml';

import type { ClientApi, ExecutionStatusProjection, GitProjection, RepositoryLoadResult, StepProjection } from '@org/client-api';

const manifestPath = '.project/manifest.yaml';
const taskDirectory = 'planning/tasks';
const requiredScaffold = ['AGENTS.md', 'planning/EXECUTION_PROTOCOL.md', 'docs/requirements/SPEC.md', 'docs/adr/TEMPLATE.md'];
const maxArtifactBytes = 1024 * 1024;
const maxProjectionBytes = 4 * 1024 * 1024;
const maxStepCount = 500;
const maxTaskDirectoryEntries = 1_000;
const maxStepTitleLength = 512;
const maxStepStatusLength = 128;
const maxInFlightLoads = 4;
const executionModes = new Set(['single', 'chain', 'orchestration']);
const executionStatuses = new Set(['running', 'complete', 'blocked']);
const commandStatuses = new Set(['running', 'complete', 'blocked']);
const executionResults = new Set(['SUCCESS', 'PASS', 'FAIL', 'BLOCKED']);

class InvalidRepositoryError extends Error {}
class ResourceLimitError extends Error {}
class ProcfsUnavailableError extends Error {}

export interface RepositoryProjectionOptions {
  procFdPath?(fd: number): string;
  maxInFlightLoads?: number;
  /** Тестовый барьер удерживает slot после admission, чтобы доказать concurrency limit. */
  beforeLoad?(): Promise<void>;
}

class ArtifactBudget {
  private usedBytes = 0;

  reserve(bytes: number): void {
    this.usedBytes += bytes;
    if (this.usedBytes > maxProjectionBytes) {
      throw new ResourceLimitError('Превышен суммарный лимит данных repository projection.');
    }
  }
}

// Один root descriptor удерживается на весь load; segment traversal идёт только от него.
// Это не даёт mutable pathname смешать artifacts разных roots или пройти через symlink/FIFO.
async function openRootDirectory(root: string): Promise<FileHandle> {
  try {
    return await open(root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ELOOP' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') {
      throw new InvalidRepositoryError('Выбранный путь не является каталогом.');
    }
    throw error;
  }
}

// Descriptor traversal опирается на procfs как на platform capability, а не artifact repository.
// Его отсутствие означает operational I/O failure и не должно превращаться в invalid repository.
async function resolveRootFromDescriptor(root: FileHandle, procFdPath: (fd: number) => string): Promise<string> {
  const descriptorPath = procFdPath(root.fd);
  await ensureDescriptorTraversal(descriptorPath);
  return await realpath(descriptorPath);
}

// Каждый переход через procfs сначала проверяет capability отдельно от artifact.
// Иначе исчезновение procfs между операциями ошибочно выглядело бы как отсутствие файла repository.
async function ensureDescriptorTraversal(descriptorPath: string): Promise<void> {
  try {
    const descriptor = await open(descriptorPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NONBLOCK);
    await descriptor.close();
  } catch (error) {
    throw new ProcfsUnavailableError(`Недоступен platform descriptor traversal: ${error instanceof Error ? error.message : descriptorPath}`);
  }
}

async function openContained(root: FileHandle, path: string, finalFlags: number, procFdPath: (fd: number) => string): Promise<FileHandle> {
  const segments = path.split(sep);
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new InvalidRepositoryError('Путь artifact выходит за repository.');
  }
  let directory: FileHandle = root;
  let ownsDirectory = false;
  try {
    for (const segment of segments.slice(0, -1)) {
      const descriptorPath = procFdPath(directory.fd);
      await ensureDescriptorTraversal(descriptorPath);
      const next = await open(`${descriptorPath}/${segment}`, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      if (ownsDirectory) await directory.close();
      directory = next;
      ownsDirectory = true;
    }
    const descriptorPath = procFdPath(directory.fd);
    await ensureDescriptorTraversal(descriptorPath);
    return await open(`${descriptorPath}/${segments.at(-1)}`, finalFlags);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ELOOP' || (error as NodeJS.ErrnoException).code === 'ENOTDIR') {
      throw new InvalidRepositoryError(`Некорректный artifact: ${path}`);
    }
    throw error;
  } finally {
    if (ownsDirectory) await directory.close();
  }
}

async function readArtifact(root: FileHandle, path: string, budget: ArtifactBudget, procFdPath: (fd: number) => string): Promise<string> {
  const handle = await openContained(root, path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK, procFdPath);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size > maxArtifactBytes) throw new InvalidRepositoryError(`Некорректный artifact: ${path}`);
    budget.reserve(metadata.size);
    const content = Buffer.alloc(metadata.size);
    const { bytesRead } = await handle.read(content, 0, metadata.size, 0);
    return content.subarray(0, bytesRead).toString('utf8');
  } finally {
    await handle.close();
  }
}

function isStableScaffold(path: string, source: string): boolean {
  const requiredMarkers: Record<string, string[]> = {
    'AGENTS.md': ['# Repository Agent Instructions', '## 3. Канонические команды'],
    'planning/EXECUTION_PROTOCOL.md': ['# Project Execution Protocol', '## 0. Command interface и цепочки', '## 25. Completion'],
    'docs/requirements/SPEC.md': ['# Спецификация требований', '### REQ-', '#### Requirement', '#### Acceptance'],
    'docs/adr/TEMPLATE.md': ['# ADR-NNN —', '## Context', '## Decision', '## Traceability'],
  };
  return requiredMarkers[path].every((marker) => source.includes(marker));
}

async function requireScaffold(root: FileHandle, budget: ArtifactBudget, procFdPath: (fd: number) => string): Promise<void> {
  for (const path of requiredScaffold) {
    if (!isStableScaffold(path, await readArtifact(root, path, budget, procFdPath))) {
      throw new InvalidRepositoryError(`Некорректный Harness scaffold: ${path}`);
    }
  }
}

function parseManifest(source: string): { initialized: boolean; harnessRelease: string } | undefined {
  const document = parseDocument(source);
  if (document.errors.length > 0) return undefined;
  const value = document.toJS();
  if (!value || typeof value !== 'object') return undefined;
  const record = value as { harness?: { release?: unknown }; project?: { initialized?: unknown; name?: unknown; initializedAt?: unknown } };
  if (typeof record.project?.initialized !== 'boolean' || typeof record.harness?.release !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(record.harness.release)) return undefined;
  if (!record.project.initialized) return record.project.name === null && record.project.initializedAt === null
    ? { initialized: false, harnessRelease: record.harness.release }
    : undefined;
  return typeof record.project.name === 'string' && record.project.name.length > 0 &&
    typeof record.project.initializedAt === 'string' && !Number.isNaN(Date.parse(record.project.initializedAt))
    ? { initialized: true, harnessRelease: record.harness.release }
    : undefined;
}

function parseStep(source: string, filename: string): StepProjection {
  const title = source.match(/^#\s+STEP-\d+\s+—\s+(.+)$/m)?.[1];
  const status = source.match(/^\*\*Статус:\*\*\s+(.+)$/m)?.[1];
  const id = basename(filename, '.md');
  if (!title || !status || title.length > maxStepTitleLength || status.length > maxStepStatusLength || !/^STEP-\d{3}$/.test(id) || !new Set(['Запланировано', 'В работе', 'Выполнено', 'Заблокировано', 'Отменено', 'Заменено']).has(status)) throw new InvalidRepositoryError(`Некорректный STEP artifact: ${filename}`);
  return { id, title, status };
}

async function loadSteps(root: FileHandle, budget: ArtifactBudget, procFdPath: (fd: number) => string): Promise<StepProjection[]> {
  const taskDirectoryHandle = await openContained(root, taskDirectory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | constants.O_NONBLOCK, procFdPath);
  const names: string[] = [];
  let entryCount = 0;
  try {
    const descriptorPath = procFdPath(taskDirectoryHandle.fd);
    await ensureDescriptorTraversal(descriptorPath);
    const directory = await opendir(descriptorPath, { bufferSize: 32 });
    for await (const entry of directory) {
      entryCount += 1;
      if (entryCount > maxTaskDirectoryEntries) throw new InvalidRepositoryError('Превышено допустимое число entries каталога STEP.');
      if (/^STEP-\d+\.md$/.test(entry.name)) names.push(entry.name);
      if (names.length > maxStepCount) throw new InvalidRepositoryError('Некорректное число STEP artifacts.');
    }
  } finally {
    await taskDirectoryHandle.close();
  }
  if (names.length === 0 || names.length > maxStepCount) throw new InvalidRepositoryError('Некорректное число STEP artifacts.');
  const steps: StepProjection[] = [];
  for (const name of names.sort()) {
    const source = await readArtifact(root, join(taskDirectory, name), budget, procFdPath);
    if (!new RegExp(`^# ${basename(name, '.md')} — .+`, 'm').test(source) || !/^## Requirements/m.test(source) || !/^## ADR/m.test(source) || !/^## Implementation plan/m.test(source) || !/^## Verification/m.test(source)) throw new InvalidRepositoryError(`Некорректный STEP artifact: ${name}`);
    steps.push(parseStep(source, name));
  }
  return steps;
}

async function readExecutionStatus(root: FileHandle, budget: ArtifactBudget, procFdPath: (fd: number) => string): Promise<ExecutionStatusProjection> {
  try {
    const source = await readArtifact(root, '.project/local/execution/execution-status.json', budget, procFdPath);
    const parsed: unknown = JSON.parse(source);
    const status = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined;
    const executions = status?.executions;
    return isCanonicalExecutionStatus(status, executions)
      ? { availability: 'valid', executionCount: executions.length, raw: source, data: status }
      : { availability: 'invalid' };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { availability: 'missing' };
    if (error instanceof SyntaxError || error instanceof InvalidRepositoryError) return { availability: 'invalid' };
    throw error;
  }
}

// Повторяет tools/harness/execution_status.py#validate_status для read-only projection.
// Поля не нормализуются: повреждённый local state должен остаться invalid, а не стать client state.
export function isCanonicalExecutionStatus(status: Record<string, unknown> | undefined, executions: unknown): executions is Record<string, unknown>[] {
  if (status?.schemaVersion !== 1 || !Array.isArray(executions)) return false;
  const executionIds = new Set<string>();
  return executions.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const execution = item as Record<string, unknown>;
    const executionId = execution.executionId;
    if (typeof executionId !== 'string' || !executionId || executionIds.has(executionId)) return false;
    executionIds.add(executionId);
    if (!executionModes.has(execution.mode as string) || !executionStatuses.has(execution.status as string)) return false;
    if (typeof execution.rootCommand !== 'string' || !execution.rootCommand) return false;
    if (!Array.isArray(execution.sequence) || execution.sequence.some((command) => typeof command !== 'string' || !command)) return false;
    const current = execution.current;
    if (!current || typeof current !== 'object') return false;
    const currentRecord = current as Record<string, unknown>;
    const attempt = currentRecord.attempt;
    return typeof currentRecord.command === 'string' && Boolean(currentRecord.command) &&
      commandStatuses.has(currentRecord.status as string) &&
      (currentRecord.result === null || currentRecord.result === undefined || executionResults.has(currentRecord.result as string)) &&
      typeof attempt === 'number' && Number.isInteger(attempt) && attempt >= 1;
  });
}

// ADR-004 запрещает Git subprocess для выбранного root: repository-controlled
// config и helpers не образуют безопасную boundary даже при fixed arguments.
function loadGit(): GitProjection {
  return { available: false, worktree: 'unavailable', unavailableReason: 'SECURITY_POLICY' };
}

function errorResult(error: unknown): RepositoryLoadResult {
  if (error instanceof ResourceLimitError) return { ok: false, error: { code: 'RESOURCE_LIMIT', message: error.message } };
  if (error instanceof InvalidRepositoryError || (error as NodeJS.ErrnoException).code === 'ENOENT') {
    return { ok: false, error: { code: 'INVALID_REPOSITORY', message: error instanceof Error ? error.message : 'Repository не содержит обязательный artifact.' } };
  }
  const message = error instanceof Error ? error.message : 'Неизвестная ошибка чтения repository.';
  return { ok: false, error: { code: 'IO_ERROR', message } };
}

export function createRepositoryClientApi(options: RepositoryProjectionOptions = {}): ClientApi {
  const procFdPath = options.procFdPath ?? ((fd: number) => `/proc/self/fd/${fd}`);
  const inFlightLimit = options.maxInFlightLoads ?? maxInFlightLoads;
  const beforeLoad = options.beforeLoad;
  let inFlightLoads = 0;
  return { async loadRepository(projectRoot): Promise<RepositoryLoadResult> {
    if (inFlightLoads >= inFlightLimit) return errorResult(new ResourceLimitError('Превышен лимит одновременных repository projection.'));
    inFlightLoads += 1;
    try {
      await beforeLoad?.();
      const requestedRoot = await realpath(projectRoot);
      const rootHandle = await openRootDirectory(requestedRoot);
      try {
        const root = await resolveRootFromDescriptor(rootHandle, procFdPath);
        const budget = new ArtifactBudget();
        const manifest = parseManifest(await readArtifact(rootHandle, manifestPath, budget, procFdPath));
        if (!manifest) throw new InvalidRepositoryError('Не удалось прочитать Harness manifest.');
        await requireScaffold(rootHandle, budget, procFdPath);
        const executionStatus = await readExecutionStatus(rootHandle, budget, procFdPath);
        const git = loadGit();
        const steps = manifest.initialized ? await loadSteps(rootHandle, budget, procFdPath) : [];
        return { ok: true, value: { root, validity: manifest.initialized ? 'initialized' : 'pre-init', initialized: manifest.initialized, harnessRelease: manifest.harnessRelease, steps, git, executionStatus } };
      } finally {
        await rootHandle.close();
      }
    } catch (error) { return errorResult(error); } finally { inFlightLoads -= 1; }
  } };
}
