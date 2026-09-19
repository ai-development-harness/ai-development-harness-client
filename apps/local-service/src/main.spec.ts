import { localServiceBoundary } from './main';

describe('local service foundation', () => {
  it('объявляет изолированную local service boundary', () => {
    expect(localServiceBoundary).toEqual({ name: 'local-service' });
  });
});
