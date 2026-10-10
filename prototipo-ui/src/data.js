// Base fictícia do protótipo. Nenhum dado aqui é real.

export const clients = [
  { id: 1, name: "Mariana Costa", risk: "Moderado", wealth: 1280000, inst: 3, alerts: 2, city: "Campinas · SP", objective: "Aposentadoria em 2045", contact: "14/10/2026", allocation: [55, 20, 15, 10], cash: 14000 },
  { id: 2, name: "Ricardo Almeida", risk: "Conservador", wealth: 740000, inst: 2, alerts: 1, city: "Ribeirão Preto · SP", objective: "Proteção patrimonial", contact: "15/10/2026", allocation: [78, 12, 5, 5], cash: 8000 },
  { id: 3, name: "Fernanda Lima", risk: "Arrojado", wealth: 2420000, inst: 4, alerts: 0, city: "Toledo · PR", objective: "Crescimento de longo prazo", contact: "16/10/2026", allocation: [28, 22, 42, 8], cash: 12000 },
  { id: 4, name: "Carlos Rocha", risk: "Moderado", wealth: 890000, inst: 3, alerts: 1, city: "São Carlos · SP", objective: "Compra de imóvel", contact: "17/10/2026", allocation: [50, 18, 22, 10], cash: 93000 },
  { id: 5, name: "Ana Martins", risk: "Conservador", wealth: 560000, inst: 2, alerts: 0, city: "Fortaleza · CE", objective: "Reserva e estabilidade", contact: "18/10/2026", allocation: [80, 13, 3, 4], cash: 6500 },
  { id: 6, name: "João Ferreira", risk: "Moderado", wealth: 1930000, inst: 3, alerts: 1, city: "Londrina · PR", objective: "Independência financeira", contact: "21/10/2026", allocation: [48, 23, 20, 9], cash: 16000 },
];

export const defaultAlerts = [
  { id: 1, cid: 1, type: "Concentração", title: "Exposição elevada a crédito privado", severity: "Alta", date: "10/10/2026", description: "42% da carteira analisada está exposta a crédito privado. Recomenda-se revisar a concentração, liquidez e adequação ao perfil, sem presumir que uma realocação é necessária.", source: "Posições simuladas · 09/10/2026", status: "Pendente" },
  { id: 2, cid: 2, type: "Vencimento", title: "CDB com vencimento em 7 dias", severity: "Alta", date: "10/10/2026", description: "Um CDB da carteira de Ricardo possui vencimento próximo. O assessor pode antecipar uma conversa sobre objetivos e alternativas.", source: "Posições simuladas · 09/10/2026", status: "Pendente" },
  { id: 3, cid: 4, type: "Oportunidade", title: "Saldo disponível para avaliação", severity: "Média", date: "09/10/2026", description: "Saldo em conta superior ao habitual. A adequação de qualquer ação depende do planejamento e do perfil do investidor.", source: "Saldo bancário fictício · 09/10/2026", status: "Pendente" },
  { id: 4, cid: 1, type: "Relacionamento", title: "Revisão trimestral agendada", severity: "Média", date: "09/10/2026", description: "Preparar atendimento periódico e revisar objetivos, reservas e preocupações atuais.", source: "CRM fictício", status: "Pendente" },
  { id: 5, cid: 6, type: "Concentração", title: "Exposição concentrada por emissor", severity: "Média", date: "08/10/2026", description: "Possível concentração em emissor na carteira simulada.", source: "Posições simuladas · 09/10/2026", status: "Pendente" },
];

export const defaultNotes = [
  { cid: 1, date: "02/10/2026", type: "Reunião", text: "Revisão trimestral. Cliente deseja atualizar o plano de aposentadoria.", next: "Conferir liquidez e preparar nova proposta para avaliação." },
  { cid: 1, date: "18/08/2026", type: "Ligação", text: "Confirmou preferência por liquidez e explicações simples.", next: "Reavaliar necessidade de reserva." },
  { cid: 2, date: "23/09/2026", type: "Reunião", text: "Cliente solicitou contato antes do vencimento do CDB.", next: "Preparar briefing." },
];

export const institutions = [
  { name: "XP Investimentos", share: 0.56 },
  { name: "Banco Alfa (fictício)", share: 0.29 },
  { name: "Corretora Beta (fictícia)", share: 0.15 },
];

// Cores vêm dos tokens --color-chart-* (validados para daltonismo nos dois temas). Ordem fixa por classe.
export const assetClasses = [
  { label: "Renda fixa", color: "var(--color-chart-1)" },
  { label: "Fundos", color: "var(--color-chart-2)" },
  { label: "Renda variável", color: "var(--color-chart-3)" },
  { label: "Outros", color: "var(--color-chart-4)" },
];

export const riskProfiles = ["Conservador", "Moderado", "Arrojado"];

// Índice ilustrativo de acompanhamento (contatos realizados / planejados), 12 meses.
export const followUpSeries = [
  { month: "Nov/25", value: 38 }, { month: "Dez/25", value: 54 }, { month: "Jan/26", value: 49 },
  { month: "Fev/26", value: 63 }, { month: "Mar/26", value: 72 }, { month: "Abr/26", value: 66 },
  { month: "Mai/26", value: 74 }, { month: "Jun/26", value: 83 }, { month: "Jul/26", value: 78 },
  { month: "Ago/26", value: 92 }, { month: "Set/26", value: 85 }, { month: "Out/26", value: 97 },
];

export const dataSources = [
  ["Carteira XP (simulada)", "Interna", "09/10/2026"],
  ["Banco Alfa (fictício)", "Open Finance simulado", "09/10/2026"],
  ["Corretora Beta (fictícia)", "Open Finance simulado", "09/10/2026"],
  ["CRM demonstrativo", "Relacionamento", "10/10/2026"],
];

export const money = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const clientById = (id) => clients.find((x) => x.id === +id) || clients[0];

export function copilotResponse(q) {
  const low = q.toLowerCase();
  if (/venciment/.test(low)) return "Encontrei 1 vencimento próximo na base demonstrativa:\n\n• Ricardo Almeida — CDB com vencimento em 7 dias.\n\nFonte: alerta #2, posições simuladas de 09/10/2026. Abra o perfil e valide as informações antes do contato.";
  if (/concentra|risco/.test(low)) return "Há alertas de concentração para:\n\n• Mariana Costa — exposição elevada a crédito privado (42% segundo o cenário fictício).\n• João Ferreira — possível concentração por emissor.\n\nFonte: alertas #1 e #5. Estes indicadores não representam aconselhamento automático.";
  if (/mariana/.test(low)) return "Mariana Costa | Perfil moderado\nPatrimônio simulado: R$ 1.280.000\nObjetivo: aposentadoria em 2045\n2 alertas cadastrados: concentração em crédito privado e revisão trimestral.\nPróximo contato: 14/10/2026.\n\nFontes: cadastro, carteira e CRM fictícios.";
  if (/prioridad|atenç|cliente/.test(low)) return "As prioridades sugeridas, com base nos alertas ainda abertos, são:\n\n1. Mariana Costa — concentração em crédito privado.\n2. Ricardo Almeida — vencimento próximo.\n3. Carlos Rocha — saldo disponível para avaliação.\n\nCritério: severidade cadastrada e status pendente. Dados sintéticos.";
  return "Posso ajudar a consultar riscos, vencimentos, prioridades e perfis dos clientes desta demonstração. Tente perguntar: “Quais clientes têm concentração?” ou “Resuma Mariana Costa”.\n\nNão tenho acesso a dados externos e não faço recomendações de investimento.";
}
