import { describe, expect, it } from 'vitest';

import { buildNewsPath } from './api';

describe('buildNewsPath', () => {
  it('solicita o feed geral pelo período selecionado', () => {
    expect(buildNewsPath('day')).toBe('/news?period=day');
  });

  it('inclui o cliente no contexto do feed quando selecionado', () => {
    expect(buildNewsPath('week', '0199d9ea-8af8-7e7b-b631-3bcb04a8b680')).toBe(
      '/news?period=week&client_id=0199d9ea-8af8-7e7b-b631-3bcb04a8b680',
    );
  });
});
