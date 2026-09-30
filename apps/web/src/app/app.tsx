import { useEffect, useState } from 'react';
import type {
  ClientApi,
  RepositoryLoadResult,
  RuntimeAccount,
  RuntimeCapabilities,
  RuntimeClientApi,
  RuntimeId,
} from '@org/client-api';

import './app.css';

export interface AppProps {
  clientApi?: ClientApi;
  repositoryRoot?: string;
  runtimeApi?: RuntimeClientApi;
  selectedRuntime?: RuntimeId;
}

interface RuntimeProjection {
  account: RuntimeAccount;
  capabilities: RuntimeCapabilities;
}

export function App({
  clientApi,
  repositoryRoot,
  runtimeApi,
  selectedRuntime,
}: AppProps) {
  const [result, setResult] = useState<RepositoryLoadResult | undefined>();
  const [runtime, setRuntime] = useState<RuntimeProjection | undefined>();
  const [runtimeError, setRuntimeError] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    // При смене selection старый result не является фактом нового repository и сразу скрывается.
    setResult(undefined);
    if (!clientApi || repositoryRoot === undefined) return () => { active = false; };
    // UI передаёт только явно выбранный root в typed ClientApi, не подменяя selection текущим каталогом.
    void clientApi.loadRepository(repositoryRoot).then((nextResult) => {
      if (active) setResult(nextResult);
    });
    return () => { active = false; };
  }, [clientApi, repositoryRoot]);

  useEffect(() => {
    let active = true;
    setRuntime(undefined);
    setRuntimeError(undefined);

    // Runtime никогда не выбирается автоматически: без explicit selectedRuntime UI остаётся neutral.
    if (!runtimeApi || selectedRuntime === undefined) {
      return () => { active = false; };
    }

    void Promise.all([
      runtimeApi.getRuntimeAccount(selectedRuntime),
      runtimeApi.getRuntimeCapabilities(selectedRuntime),
    ]).then(
      ([account, capabilities]) => {
        if (active) setRuntime({ account, capabilities });
      },
      (error: unknown) => {
        if (active) {
          setRuntimeError(error instanceof Error ? error.message : 'RUNTIME_UNAVAILABLE');
        }
      },
    );

    return () => { active = false; };
  }, [runtimeApi, selectedRuntime]);

  const supportedCapabilities = runtime
    ? Object.values(runtime.capabilities).filter((value) => value !== 'unsupported').length
    : 0;

  return (
    <main>
      <h1>AI Development Harness Client</h1>
      {result && <p role="status">{result.ok ? result.value.validity : result.error.code}</p>}

      <section aria-label="Runtime">
        <h2>Runtime</h2>
        <p>{selectedRuntime ?? 'Не выбран'}</p>
        {runtimeError && <p role="alert">{runtimeError}</p>}
        {runtime && (
          <>
            <p>
              {runtime.account.authenticated
                ? runtime.account.email ?? runtime.account.displayName ?? 'Авторизован'
                : 'Не авторизован'}
            </p>
            <p>{`Capabilities: ${supportedCapabilities}`}</p>
          </>
        )}
      </section>
    </main>
  );
}
export default App;
