const useMocksValue = import.meta.env.VITE_USE_MOCKS ?? 'true';

export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, ''),
  useMocks: useMocksValue.toLowerCase() === 'true',
} as const;
