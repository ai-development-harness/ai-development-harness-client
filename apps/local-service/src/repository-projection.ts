import type { ClientApi, RepositoryLoadResult } from '@org/client-api';

export interface RepositoryProjectionOptions {
  procFdPath?(fd: number): string;
  maxInFlightLoads?: number;
  /** Тестовый барьер прежнего admission path. До supported profile он не вызывается. */
  beforeLoad?(): Promise<void>;
}

function platformUnsupported(): RepositoryLoadResult {
  return {
    ok: false,
    error: {
      code: 'PLATFORM_UNSUPPORTED',
      message: 'Для repository projection ещё не принят supported containment profile.',
    },
  };
}

export function createRepositoryClientApi(_options: RepositoryProjectionOptions = {}): ClientApi {
  void _options;
  return {
    async loadRepository(_projectRoot): Promise<RepositoryLoadResult> {
      void _projectRoot;
      // ADR-006 запрещает parent selected-root I/O и admission до принятия containment profile.
      // Поэтому этот путь намеренно завершается до filesystem, lease/capacity и process primitives.
      return platformUnsupported();
    },
  };
}
