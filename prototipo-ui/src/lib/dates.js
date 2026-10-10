// Datas da demonstração. "Hoje" é fixo para os prazos da base fictícia baterem.
const TODAY = new Date(2026, 9, 10);

const parseBR = (s) => {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
};

export const daysUntil = (s) => Math.round((parseBR(s) - TODAY) / 86400000);
