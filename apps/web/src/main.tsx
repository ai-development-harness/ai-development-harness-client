import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import type { ClientApi } from '@org/client-api';
import App from './app/app';

const unavailableClientApi: ClientApi = {
  async loadRepository() {
    return {
      ok: false,
      error: {
        code: 'IO_ERROR',
        message: 'Transport local service ещё не выбран.',
      },
    };
  },
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <App clientApi={unavailableClientApi} />
  </StrictMode>,
);
