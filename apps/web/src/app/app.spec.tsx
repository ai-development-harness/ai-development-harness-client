import { render } from '@testing-library/react';

import App from './app';

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
});
