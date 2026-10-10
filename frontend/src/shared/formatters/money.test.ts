import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats a decimal string in BRL', () => {
    expect(formatMoney('1280000.00')).toContain('1.280.000,00');
  });

  it('returns a placeholder for invalid values', () => {
    expect(formatMoney('invalid')).toBe('—');
  });
});
