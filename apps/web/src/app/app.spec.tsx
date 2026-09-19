import { act, render, waitFor } from '@testing-library/react';
import type { ClientApi } from '@org/client-api';
import { vi } from 'vitest';

import App from './app';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

describe('App', () => {
  it('рендерит нейтральную оболочку foundation', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('не скрывает имя приложения', () => {
    const { getByRole } = render(<App />);
    expect(
      getByRole('heading', { name: 'AI Development Harness Client' }),
    ).toBeTruthy();
  });

  it('не выбирает repository неявно без repositoryRoot', () => {
    const clientApi: ClientApi = { loadRepository: vi.fn() };

    render(<App clientApi={clientApi} />);
    expect(clientApi.loadRepository).not.toHaveBeenCalled();
  });

  it('загружает repository только через typed ClientApi', async () => {
    const loadRepository = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'IO_ERROR', message: 'Транспорт не настроен.' },
    });
    const clientApi: ClientApi = {
      loadRepository,
    };

    const screen = render(<App clientApi={clientApi} repositoryRoot="/selected/repository" />);
    await waitFor(() => expect(loadRepository).toHaveBeenCalledWith('/selected/repository'));
    expect(screen.getByText('IO_ERROR')).toBeTruthy();
  });

  it('не применяет поздний result прежнего selected root', async () => {
    const slowResult = deferred<Awaited<ReturnType<ClientApi['loadRepository']>>>();
    const clientApi: ClientApi = {
      loadRepository: vi.fn()
        .mockReturnValueOnce(slowResult.promise)
        .mockResolvedValueOnce({ ok: false, error: { code: 'RESOURCE_LIMIT', message: 'Новый root.' } }),
    };
    const screen = render(<App clientApi={clientApi} repositoryRoot="/root-a" />);

    screen.rerender(<App clientApi={clientApi} repositoryRoot="/root-b" />);
    await waitFor(() => expect(screen.getByText('RESOURCE_LIMIT')).toBeTruthy());
    await act(async () => {
      slowResult.resolve({ ok: false, error: { code: 'IO_ERROR', message: 'Старый root.' } });
      await Promise.resolve();
    });

    expect(screen.getByText('RESOURCE_LIMIT')).toBeTruthy();
    expect(screen.queryByText('IO_ERROR')).toBeNull();
  });

  it('очищает result при снятии selection и смене ClientApi', async () => {
    const firstClient: ClientApi = {
      loadRepository: vi.fn().mockResolvedValue({ ok: false, error: { code: 'IO_ERROR', message: 'Первый client.' } }),
    };
    const secondClient: ClientApi = {
      loadRepository: vi.fn().mockResolvedValue({ ok: false, error: { code: 'RESOURCE_LIMIT', message: 'Второй client.' } }),
    };
    const screen = render(<App clientApi={firstClient} repositoryRoot="/selected" />);

    await waitFor(() => expect(screen.getByText('IO_ERROR')).toBeTruthy());
    screen.rerender(<App clientApi={secondClient} repositoryRoot="/selected" />);
    expect(screen.queryByRole('status')).toBeNull();
    await waitFor(() => expect(screen.getByText('RESOURCE_LIMIT')).toBeTruthy());
    screen.rerender(<App clientApi={secondClient} />);

    expect(screen.queryByRole('status')).toBeNull();
  });
});
