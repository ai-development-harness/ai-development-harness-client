import { execFile, spawn } from 'node:child_process';
import * as fsPromises from 'node:fs/promises';

import { ESLint } from 'eslint';
import type { ClientApi, GitProjection, ProjectionError } from '@org/client-api';
import { vi } from 'vitest';

import { createRepositoryClientApi } from './repository-projection';

vi.mock('node:fs/promises', () => ({
  realpath: vi.fn(),
  open: vi.fn(),
  stat: vi.fn(),
  opendir: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
  spawn: vi.fn(),
}));

const unavailableGitTypeProof: GitProjection = {
  available: false,
  worktree: 'unavailable',
  unavailableReason: 'SECURITY_POLICY',
};
// Недоступная Git branch не передаёт metadata selected repository через публичный contract.
// @ts-expect-error ADR-004 запрещает Git facts при SECURITY_POLICY.
const unavailableGitWithFacts: GitProjection = { ...unavailableGitTypeProof, branch: 'main' };
void unavailableGitWithFacts;

describe('repository projection', () => {
  it('выражает PLATFORM_UNSUPPORTED в публичном typed contract', async () => {
    const client: ClientApi = createRepositoryClientApi();

    await expect(client.loadRepository('/selected/repository')).resolves.toEqual({
      ok: false,
      error: {
        code: 'PLATFORM_UNSUPPORTED',
        message: 'Для repository projection ещё не принят supported containment profile.',
      },
    });

    const error: ProjectionError = {
      code: 'PLATFORM_UNSUPPORTED',
      message: 'Typed contract допускает unavailable platform.',
    };
    expect(error.code).toBe('PLATFORM_UNSUPPORTED');
  });

  it('не вызывает selected-root I/O, admission или process primitives для нескольких roots', async () => {
    const beforeLoad = vi.fn<() => Promise<void>>();
    const client = createRepositoryClientApi({
      beforeLoad,
      maxInFlightLoads: 0,
      procFdPath: () => '/selected/procfs',
    });

    const results = await Promise.all([
      client.loadRepository('/selected/root-a'),
      client.loadRepository('/selected/root-b'),
    ]);

    for (const result of results) {
      expect(result).toMatchObject({ ok: false, error: { code: 'PLATFORM_UNSUPPORTED' } });
    }
    expect(beforeLoad).not.toHaveBeenCalled();
    expect(fsPromises.realpath).not.toHaveBeenCalled();
    expect(fsPromises.open).not.toHaveBeenCalled();
    expect(fsPromises.stat).not.toHaveBeenCalled();
    expect(fsPromises.opendir).not.toHaveBeenCalled();
    expect(execFile).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe('web privilege lint boundary', () => {
  it.each([
    ['CommonJS require', "require('node:fs');"],
    ['globalThis process', 'globalThis.process;'],
    ['window process', 'window.process;'],
  ])('отклоняет %s', async (_label, source) => {
    const eslint = new ESLint({ cwd: process.cwd() });
    const [result] = await eslint.lintText(source, {
      filePath: 'apps/web/src/lint-probe.ts',
    });

    expect(result.errorCount).toBeGreaterThan(0);
  });
});
