import { execFile } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { ESLint } from 'eslint';

import {
  createRepositoryClientApi,
  isCanonicalExecutionStatus,
} from './repository-projection';
import type { GitProjection } from '@org/client-api';

const unavailableGitTypeProof: GitProjection = {
  available: false,
  worktree: 'unavailable',
  unavailableReason: 'SECURITY_POLICY',
};
// Недоступная ветвь GitProjection не должна принимать metadata selected repository.
// @ts-expect-error ADR-004 запрещает Git facts при SECURITY_POLICY.
const unavailableGitWithFacts: GitProjection = { ...unavailableGitTypeProof, branch: 'main' };
void unavailableGitWithFacts;

const execFileAsync = promisify(execFile);

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

async function createRepository(initialized: boolean): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'harness-client-'));
  await mkdir(join(root, '.project'), { recursive: true });
  await mkdir(join(root, 'planning/tasks'), { recursive: true });
  await mkdir(join(root, 'docs/requirements'), { recursive: true });
  await mkdir(join(root, 'docs/adr'), { recursive: true });
  await writeFile(join(root, 'AGENTS.md'), '# Repository Agent Instructions\n\n## 3. Канонические команды\n');
  await writeFile(join(root, 'planning/EXECUTION_PROTOCOL.md'), '# Project Execution Protocol\n\n## 0. Command interface и цепочки\n\n## 25. Completion\n');
  await writeFile(join(root, 'docs/requirements/SPEC.md'), '# Спецификация требований\n\n### REQ-001 — Проверка\n\n#### Requirement\n\nТребование.\n\n#### Acceptance\n\nПроверка.\n');
  await writeFile(join(root, 'docs/adr/TEMPLATE.md'), '# ADR-NNN — Решение\n\n## Context\n\n## Decision\n\n## Traceability\n');
  await writeFile(
    join(root, '.project/manifest.yaml'),
    `harness:\n  release: "0.4.0"\nproject:\n  initialized: ${initialized}\n  name: ${initialized ? 'fixture' : 'null'}\n  initializedAt: ${initialized ? '"2026-09-19T12:44:15+03:00"' : 'null'}\n`,
  );
  if (initialized) {
    await writeFile(
      join(root, 'planning/tasks/STEP-001.md'),
      '# STEP-001 — Проверяемый шаг\n\n**Статус:** Выполнено\n\n## Requirements\n\n- REQ-001\n\n## ADR\n\n- ADR-001\n\n## Implementation plan\n\nReady\n\n## Verification\n\n- test\n',
    );
  }
  return root;
}

describe('repository projection', () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(
      roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  it('не исполняет validator из выбранного repository', async () => {
    const root = await createRepository(true);
    roots.push(root);
    const sentinel = join(root, 'validator-ran');
    await mkdir(join(root, 'tools/harness'), { recursive: true });
    await writeFile(
      join(root, 'tools/harness/validate.py'),
      `from pathlib import Path\nPath(${JSON.stringify(sentinel)}).write_text('unsafe')\n`,
    );

    await expect(
      createRepositoryClientApi().loadRepository(root),
    ).resolves.toMatchObject({
      ok: true,
      value: { validity: 'initialized' },
    });
    await expect(readFile(sentinel, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('отклоняет repository с некорректным manifest без запуска его tooling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'harness-client-invalid-'));
    roots.push(root);
    await mkdir(join(root, '.project'), { recursive: true });
    await writeFile(join(root, '.project/manifest.yaml'), 'project: [');

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('отклоняет сформированные placeholder artifacts без исполнения repository tooling', async () => {
    const root = await createRepository(true);
    roots.push(root);
    await writeFile(join(root, '.project/manifest.yaml'), 'harness:\n  release: "fake"\nproject:\n  initialized: true\n  name: placeholder\n  initializedAt: "2026-09-19T12:44:15+03:00"\n');

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('отклоняет symbolic link artifact без чтения его target', async () => {
    const root = await createRepository(true);
    roots.push(root);
    const outside = join(root, '..', 'outside-manifest.yaml');
    await writeFile(outside, 'project:\n  initialized: true\n');
    await rm(join(root, '.project/manifest.yaml'));
    await symlink(outside, join(root, '.project/manifest.yaml'));

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
    await rm(outside, { force: true });
  });

  it('отклоняет symbolic link в intermediate artifact directory', async () => {
    const root = await createRepository(true);
    roots.push(root);
    const outside = await mkdtemp(join(tmpdir(), 'harness-client-outside-'));
    roots.push(outside);
    await writeFile(join(outside, 'manifest.yaml'), 'project:\n  initialized: true\n');
    await rm(join(root, '.project'), { recursive: true, force: true });
    await symlink(outside, join(root, '.project'));

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('отклоняет FIFO artifact без блокировки projection', async () => {
    const root = await createRepository(true);
    roots.push(root);
    await rm(join(root, '.project/manifest.yaml'));
    await execFileAsync('mkfifo', [join(root, '.project/manifest.yaml')]);

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('ограничивает общее число entries каталога STEP', async () => {
    const root = await createRepository(true);
    roots.push(root);
    await Promise.all(
      Array.from({ length: 1_001 }, (_, index) => writeFile(join(root, 'planning/tasks', `noise-${index}`), 'x')),
    );

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('различает isolated initialized и pre-init repository без Git', async () => {
    const initializedRoot = await createRepository(true);
    const preInitRoot = await createRepository(false);
    roots.push(initializedRoot, preInitRoot);
    const client = createRepositoryClientApi();

    await expect(client.loadRepository(initializedRoot)).resolves.toMatchObject(
      {
        ok: true,
        value: {
          validity: 'initialized',
          initialized: true,
          git: { available: false, worktree: 'unavailable', unavailableReason: 'SECURITY_POLICY' },
        },
      },
    );
    await expect(client.loadRepository(preInitRoot)).resolves.toMatchObject({
      ok: true,
      value: {
        validity: 'pre-init',
        initialized: false,
        git: { available: false, worktree: 'unavailable', unavailableReason: 'SECURITY_POLICY' },
      },
    });
  });

  it('возвращает IO_ERROR при operational failure чтения artifact', async () => {
    const root = await createRepository(true);
    roots.push(root);
    const restrictedDirectory = join(root, 'docs/requirements');
    await chmod(restrictedDirectory, 0o000);

    try {
      await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
        ok: false,
        error: { code: 'IO_ERROR' },
      });
    } finally {
      // Cleanup должен восстановить права fixture, иначе afterEach не сможет удалить temp root.
      await chmod(restrictedDirectory, 0o700);
    }
  });

  it('возвращает IO_ERROR, когда platform не предоставляет procfs descriptor traversal', async () => {
    const root = await createRepository(true);
    roots.push(root);

    await expect(createRepositoryClientApi({ procFdPath: () => '/missing-procfs' }).loadRepository(root)).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'IO_ERROR' }),
    });
  });

  it('возвращает IO_ERROR, если procfs исчезает после initial probe во время чтения Execution Status', async () => {
    const root = await createRepository(true);
    roots.push(root);
    let traversalCount = 0;
    const client = createRepositoryClientApi({
      procFdPath(fd) {
        traversalCount += 1;
        // Первые десять переходов покрывают manifest и обязательный scaffold; следующий начинает Execution Status.
        return traversalCount <= 10 ? `/proc/self/fd/${fd}` : '/missing-procfs';
      },
    });

    await expect(client.loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'IO_ERROR' },
    });
  });

  it('ограничивает суммарный объём прочитанных artifacts', async () => {
    const root = await createRepository(true);
    roots.push(root);
    await Promise.all(Array.from({ length: 5 }, async (_, index) => {
      const id = String(index + 1).padStart(3, '0');
      const step = `# STEP-${id} — Проверяемый шаг\n\n**Статус:** Выполнено\n\n## Requirements\n\n- REQ-001\n\n## ADR\n\n- ADR-001\n\n## Implementation plan\n\nReady\n\n## Verification\n\n- test\n`;
      await writeFile(join(root, 'planning/tasks', `STEP-${id}.md`), step.padEnd(900_000, 'x'));
    }));

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'RESOURCE_LIMIT' },
    });
  });

  it('отклоняет пятый одновременный load и повторно использует освобождённый slot', async () => {
    const root = await createRepository(true);
    roots.push(root);
    const gates: Array<{ resolve(): void }> = [];
    const client = createRepositoryClientApi({
      beforeLoad: () => {
        const gate = deferred<void>();
        gates.push(gate);
        return gate.promise;
      },
    });
    const pendingLoads = Array.from({ length: 4 }, () => client.loadRepository(root));

    await Promise.resolve();
    expect(gates).toHaveLength(4);
    await expect(client.loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'RESOURCE_LIMIT' },
    });

    gates.shift()?.resolve();
    await expect(pendingLoads.shift()).resolves.toMatchObject({ ok: true });

    const reusableLoad = client.loadRepository(root);
    await Promise.resolve();
    expect(gates).toHaveLength(4);
    for (const gate of gates) gate.resolve();

    const completedLoads = await Promise.all([...pendingLoads, reusableLoad]);
    expect(completedLoads).toHaveLength(4);
    expect(completedLoads.every((result) => result.ok)).toBe(true);
  });

  it('не проецирует Git facts selected repository по security policy', async () => {
    const root = await createRepository(true);
    roots.push(root);
    await execFileAsync('git', ['init', '--initial-branch=main'], {
      cwd: root,
    });

    const result = await createRepositoryClientApi().loadRepository(root);
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        git: { available: false, worktree: 'unavailable', unavailableReason: 'SECURITY_POLICY' },
      }),
    });
    if (result.ok) {
      expect(result.value.git).not.toHaveProperty('branch');
      expect(result.value.git).not.toHaveProperty('upstream');
      expect(result.value.git).not.toHaveProperty('ahead');
      expect(result.value.git).not.toHaveProperty('behind');
    }
  });

  it('не раскрывает upstream и divergence selected repository по security policy', async () => {
    const root = await createRepository(true);
    const remote = await mkdtemp(join(tmpdir(), 'harness-client-remote-'));
    roots.push(root, remote);
    await execFileAsync('git', ['init', '--initial-branch=main'], { cwd: root });
    await execFileAsync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: root });
    await execFileAsync('git', ['config', 'user.name', 'Тест'], { cwd: root });
    await execFileAsync('git', ['add', '.'], { cwd: root });
    await execFileAsync('git', ['commit', '-m', 'Начальный commit'], { cwd: root });
    await execFileAsync('git', ['init', '--bare', '--initial-branch=main'], { cwd: remote });
    await execFileAsync('git', ['remote', 'add', 'origin', remote], { cwd: root });
    await execFileAsync('git', ['push', '-u', 'origin', 'main'], { cwd: root });
    await writeFile(join(root, 'local.md'), 'ahead\n');
    await execFileAsync('git', ['add', 'local.md'], { cwd: root });
    await execFileAsync('git', ['commit', '-m', 'Локальный commit'], { cwd: root });

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: true,
      value: { git: { available: false, worktree: 'unavailable', unavailableReason: 'SECURITY_POLICY' } },
    });
  });

  it('не использует ancestor Git repository для вложенного selected root', async () => {
    const root = await createRepository(true);
    roots.push(root);
    await execFileAsync('git', ['init', '--initial-branch=main'], { cwd: root });
    const nested = join(root, 'nested');
    await mkdir(nested);

    await expect(createRepositoryClientApi().loadRepository(nested)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('не запускает configured Git fsmonitor из выбранного repository', async () => {
    const root = await createRepository(true);
    roots.push(root);
    const sentinel = join(root, 'fsmonitor-ran');
    const helper = join(root, 'fsmonitor-helper');
    await execFileAsync('git', ['init', '--initial-branch=main'], {
      cwd: root,
    });
    await writeFile(helper, `#!/bin/sh\ntouch ${JSON.stringify(sentinel)}\n`);
    await chmod(helper, 0o700);
    await execFileAsync('git', ['config', 'core.fsmonitor', helper], {
      cwd: root,
    });

    await expect(
      createRepositoryClientApi().loadRepository(root),
    ).resolves.toMatchObject({
      ok: true,
      value: { git: { available: false, worktree: 'unavailable', unavailableReason: 'SECURITY_POLICY' } },
    });
    await expect(readFile(sentinel, 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('не запускает Git filter из .gitattributes при repository projection', async () => {
    const root = await createRepository(true);
    roots.push(root);
    const sentinel = join(root, 'filter-ran');
    const helper = join(root, 'filter-helper');
    await execFileAsync('git', ['init', '--initial-branch=main'], { cwd: root });
    await execFileAsync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: root });
    await execFileAsync('git', ['config', 'user.name', 'Тест'], { cwd: root });
    await execFileAsync('git', ['add', '.'], { cwd: root });
    await execFileAsync('git', ['commit', '-m', 'Начальный commit'], { cwd: root });
    await writeFile(helper, `#!/bin/sh\ntouch ${JSON.stringify(sentinel)}\ncat\n`);
    await chmod(helper, 0o700);
    await writeFile(join(root, '.gitattributes'), 'filtered.txt filter=unsafe\n');
    await writeFile(join(root, 'filtered.txt'), 'untrusted\n');
    await execFileAsync('git', ['config', 'filter.unsafe.clean', helper], { cwd: root });

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: true,
      value: { git: { available: false, worktree: 'unavailable', unavailableReason: 'SECURITY_POLICY' } },
    });
    await expect(readFile(sentinel, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('возвращает typed error для directory без Harness manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'harness-client-invalid-'));
    roots.push(root);

    await expect(
      createRepositoryClientApi().loadRepository(root),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('не считает manifest с одним STEP initialized Harness repository', async () => {
    const root = await mkdtemp(join(tmpdir(), 'harness-client-incomplete-'));
    roots.push(root);
    await mkdir(join(root, '.project'), { recursive: true });
    await mkdir(join(root, 'planning/tasks'), { recursive: true });
    await writeFile(join(root, '.project/manifest.yaml'), 'harness:\n  release: "0.4.0"\nproject:\n  initialized: true\n  name: fixture\n  initializedAt: "2026-09-19T12:44:15+03:00"\n');
    await writeFile(join(root, 'planning/tasks/STEP-001.md'), '# STEP-001 — Шаг\n\n**Статус:** Выполнено\n\n## Requirements\n\n## Implementation plan\n');

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('проецирует valid Execution Status без потери raw и data', async () => {
    const root = await createRepository(true);
    roots.push(root);
    const source = JSON.stringify({
      schemaVersion: 1,
      executions: [{
        executionId: 'exec-1', mode: 'single', status: 'running',
        rootCommand: 'STEP FIX STEP-002', sequence: ['STEP FIX STEP-002'],
        current: { command: 'STEP FIX STEP-002', status: 'running', result: null, attempt: 1 },
      }],
    });
    await mkdir(join(root, '.project/local/execution'), { recursive: true });
    await writeFile(join(root, '.project/local/execution/execution-status.json'), source);

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: true,
      value: { executionStatus: { availability: 'valid', executionCount: 1, raw: source, data: { schemaVersion: 1 } } },
    });
  });

  it('отклоняет STEP без обязательного status', async () => {
    const root = await createRepository(true);
    roots.push(root);
    await writeFile(join(root, 'planning/tasks/STEP-001.md'), '# STEP-001 — Шаг\n\n## Requirements\n\n## Implementation plan\n');

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('отклоняет oversized artifact без чтения его содержимого', async () => {
    const root = await createRepository(true);
    roots.push(root);
    await writeFile(join(root, 'planning/tasks/STEP-001.md'), 'x'.repeat(1024 * 1024 + 1));

    await expect(createRepositoryClientApi().loadRepository(root)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_REPOSITORY' },
    });
  });

  it('проецирует missing, malformed и invalid Execution Status', async () => {
    const missingRoot = await createRepository(true);
    const malformedRoot = await createRepository(true);
    const invalidRoot = await createRepository(true);
    roots.push(missingRoot, malformedRoot, invalidRoot);
    await mkdir(join(malformedRoot, '.project/local/execution'), {
      recursive: true,
    });
    await mkdir(join(invalidRoot, '.project/local/execution'), {
      recursive: true,
    });
    await writeFile(
      join(malformedRoot, '.project/local/execution/execution-status.json'),
      '{',
    );
    await writeFile(
      join(invalidRoot, '.project/local/execution/execution-status.json'),
      '{"schemaVersion":1,"executions":[{"executionId":"","current":{}}]}',
    );
    const client = createRepositoryClientApi();

    await expect(client.loadRepository(missingRoot)).resolves.toMatchObject({
      ok: true,
      value: { executionStatus: { availability: 'missing' } },
    });
    await expect(client.loadRepository(malformedRoot)).resolves.toMatchObject({
      ok: true,
      value: { executionStatus: { availability: 'invalid' } },
    });
    await expect(client.loadRepository(invalidRoot)).resolves.toMatchObject({
      ok: true,
      value: { executionStatus: { availability: 'invalid' } },
    });
  });
});

describe('Execution Status projection', () => {
  const execution = {
    executionId: 'exec-1',
    mode: 'single',
    status: 'running',
    rootCommand: 'STEP FIX STEP-002',
    sequence: ['STEP FIX STEP-002'],
    current: {
      command: 'STEP FIX STEP-002',
      status: 'running',
      result: null,
      attempt: 1,
    },
  };

  it('принимает shape, который принимает canonical validate_status', () => {
    expect(isCanonicalExecutionStatus({ schemaVersion: 1 }, [execution])).toBe(
      true,
    );
  });

  it.each([
    ['пустой executionId', [{ ...execution, executionId: '' }]],
    ['duplicate executionId', [execution, { ...execution }]],
    ['пустая root command', [{ ...execution, rootCommand: '' }]],
    ['пустая sequence command', [{ ...execution, sequence: [''] }]],
    [
      'нецелочисленный attempt',
      [{ ...execution, current: { ...execution.current, attempt: 1.5 } }],
    ],
    [
      'нулевой attempt',
      [{ ...execution, current: { ...execution.current, attempt: 0 } }],
    ],
  ])('отклоняет %s по canonical инвариантам', (_label, executions) => {
    expect(isCanonicalExecutionStatus({ schemaVersion: 1 }, executions)).toBe(
      false,
    );
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
