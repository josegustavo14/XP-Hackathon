import { clientById, clients, defaultAlerts, defaultNotes, money } from "./data.js";

// Respostas do copiloto por regras locais, calculadas sobre o estado atual
// (alertas e anotações). Cada resposta traz o texto, as fontes consultadas e
// atalhos de ação no formato [rótulo, página, parâmetro].

const SEVERITY_RANK = { Alta: 0, "Média": 1, Baixa: 2 };
const POSITIONS = "Posições simuladas · 09/10/2026";

const firstName = (c) => c.name.split(" ")[0];
const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const bullets = (items) => items.map((x) => `• ${x}`).join("\n");

function findClient(low) {
  return clients.find((c) => low.includes(norm(c.name))) || clients.find((c) => new RegExp(`\\b${norm(firstName(c))}\\b`).test(low));
}

export function copilotResponse(q, { alerts = defaultAlerts, notes = defaultNotes } = {}) {
  const low = norm(q);
  const pending = alerts.filter((a) => a.status === "Pendente").sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const alert = alerts.find((a) => low.includes(norm(a.title)));
  const client = findClient(low);

  if (alert) {
    const c = clientById(alert.cid);
    return {
      text: `${alert.title} · ${c.name}\nPrioridade ${alert.severity.toLowerCase()} · ${alert.type} · ${alert.status.toLowerCase()}\n\nO que foi identificado: ${alert.description}\n\nComo conduzir: confirme os dados na carteira, relacione com o objetivo do cliente (${c.objective.toLowerCase()}) e registre a decisão após o contato.`,
      sources: [`Alerta #${alert.id}`, alert.source],
      actions: [["Abrir cliente", "profile", c.id], ["Gerar briefing", "briefing", c.id]],
    };
  }

  if (client && /ultima|conversa|reuniao|historico/.test(low)) {
    const last = notes.find((n) => n.cid === client.id);
    return {
      text: last
        ? `Último registro com ${client.name} (${last.type.toLowerCase()} em ${last.date}):\n\n“${last.text}”\n\nPróximo passo combinado: ${last.next || "não definido"}.`
        : `Ainda não há registros de atendimento com ${client.name}. Vale registrar a próxima conversa para manter o histórico.`,
      sources: ["Histórico de atendimento"],
      actions: [["Ver histórico", "profile", client.id]],
    };
  }

  if (client && /alerta/.test(low)) {
    const list = pending.filter((a) => a.cid === client.id);
    return {
      text: list.length
        ? `${client.name} tem ${list.length} alerta(s) em aberto:\n\n${bullets(list.map((a) => `${a.title} — prioridade ${a.severity.toLowerCase()}`))}`
        : `${client.name} não tem alertas em aberto no momento.`,
      sources: [...list.map((a) => `Alerta #${a.id}`), POSITIONS],
      actions: list.length ? [["Analisar o mais grave", "alertDetail", list[0].id]] : [["Abrir cliente", "profile", client.id]],
    };
  }

  if (client) {
    const list = pending.filter((a) => a.cid === client.id);
    const last = notes.find((n) => n.cid === client.id);
    const alertsLine = list.length ? `Alertas em aberto: ${list.map((a) => a.title.toLowerCase()).join("; ")}.` : "Sem alertas em aberto.";
    return {
      text: `${client.name} · Perfil ${client.risk.toLowerCase()}\nPatrimônio: ${money(client.wealth)} em ${client.inst} instituições\nObjetivo: ${client.objective}\nPróximo contato: ${client.contact}\n\n${alertsLine}${last ? `\nÚltimo contato (${last.date}): ${last.text}` : ""}`,
      sources: ["Cadastro", POSITIONS, "Histórico de atendimento"],
      actions: [["Abrir cliente", "profile", client.id], ["Gerar briefing", "briefing", client.id]],
    };
  }

  if (/venciment/.test(low)) {
    const list = pending.filter((a) => a.type === "Vencimento");
    return {
      text: list.length
        ? `Vencimentos próximos com alerta em aberto:\n\n${bullets(list.map((a) => `${clientById(a.cid).name} — ${a.title}`))}\n\nValide as posições antes do contato.`
        : "Não há vencimentos com alerta em aberto.",
      sources: [...list.map((a) => `Alerta #${a.id}`), POSITIONS],
      actions: list.slice(0, 1).map((a) => ["Analisar alerta", "alertDetail", a.id]),
    };
  }

  if (/concentra|risco/.test(low)) {
    const list = pending.filter((a) => a.type === "Concentração");
    return {
      text: list.length
        ? `Alertas de concentração em aberto:\n\n${bullets(list.map((a) => `${clientById(a.cid).name} — ${a.title.toLowerCase()}`))}\n\nOs indicadores apoiam a análise e não representam recomendação automática.`
        : "Não há alertas de concentração em aberto.",
      sources: [...list.map((a) => `Alerta #${a.id}`), POSITIONS],
      actions: list.slice(0, 1).map((a) => ["Analisar alerta", "alertDetail", a.id]),
    };
  }

  if (/prioridad|atenc|cliente|comec/.test(low)) {
    const top = pending.slice(0, 3);
    return {
      text: top.length
        ? `Sugestão de ordem de atendimento, pelos alertas em aberto:\n\n${top.map((a, i) => `${i + 1}. ${clientById(a.cid).name} — ${a.title.toLowerCase()} (${a.severity.toLowerCase()})`).join("\n")}\n\nCritério: gravidade e status pendente.`
        : "Todos os alertas foram analisados. Nenhum cliente exige atenção imediata.",
      sources: [`${pending.length} alertas pendentes`, POSITIONS],
      actions: top.length ? [["Ver alertas", "alerts", null]] : [],
    };
  }

  return {
    text: "Posso consultar riscos, vencimentos, prioridades, alertas e o histórico dos clientes desta demonstração. Experimente: “Quais clientes têm concentração?” ou “Resuma a situação da Mariana Costa”.\n\nNão acesso dados externos e não faço recomendações de investimento.",
    sources: [],
    actions: [],
  };
}

// Perguntas sugeridas de acordo com a tela aberta.
const GENERAL = ["Quais clientes precisam de atenção?", "Quais são os vencimentos próximos?", "Quais clientes têm concentração?"];

export function suggestionsFor(page, params, alerts) {
  if (page === "alertDetail") {
    const a = alerts.find((x) => x.id === +params) || alerts[0];
    const c = clientById(a.cid);
    return { context: c.name, items: [`Explique o alerta “${a.title}”`, `Resuma a situação de ${c.name}`, `O que foi tratado na última conversa com ${firstName(c)}?`] };
  }
  if (page === "profile" || page === "briefing") {
    const c = clientById(params);
    return { context: c.name, items: [`Resuma a situação de ${c.name}`, `Quais alertas de ${firstName(c)} estão em aberto?`, `O que foi tratado na última conversa com ${firstName(c)}?`] };
  }
  return { context: null, items: [...GENERAL, "Resuma a situação da Mariana Costa"] };
}
