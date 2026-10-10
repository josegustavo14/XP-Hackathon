// Regras de ordenação dos alertas.
const SEVERITY_ORDER = { Alta: 0, "Média": 1, Baixa: 2 };

export const bySeverity = (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
