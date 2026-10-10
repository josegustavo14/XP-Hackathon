const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata o decimal recebido pela API sem converter para ponto flutuante. */
export function formatMoney(value: string): string {
  const normalized = value.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return '—';
  const [integer, decimals = ''] = normalized.replace('-', '').split('.');
  const cents = `${decimals}00`.slice(0, 2);
  const amount = Number(`${normalized.startsWith('-') ? '-' : ''}${integer}.${cents}`);
  return Number.isFinite(amount) ? formatter.format(amount) : '—';
}
