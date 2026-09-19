import { useEffect, useState } from 'react';
import type { ClientApi, RepositoryLoadResult } from '@org/client-api';

import './app.css';

export interface AppProps {
  clientApi?: ClientApi;
  repositoryRoot?: string;
}

export function App({ clientApi, repositoryRoot }: AppProps) {
  const [result, setResult] = useState<RepositoryLoadResult | undefined>();

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

  return (
    <main>
      <h1>AI Development Harness Client</h1>
      {result && <p role="status">{result.ok ? result.value.validity : result.error.code}</p>}
    </main>
  );
}
export default App;
