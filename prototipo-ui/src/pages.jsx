import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, Bell, Building2, CalendarClock, CheckCircle2, Copy, Database, FileText, Landmark, MessageSquarePlus, X,
  RotateCcw, Search, Send, ShieldCheck, Sparkles, Trash2, TrendingUp, Users, Wallet,
} from "lucide-react";
import { useStore } from "./store.js";
import {
  AnimatedRow, Badge, Button, Card, CountUp, Empty, Helper, LinkButton, Metric, MobileList, MobileRow, PageTitle, SectionHead,
  TableWrap, Td, Th, severityTone, useToast,
} from "./ui.jsx";
import { ColumnChart, DonutChart, HBarList } from "./charts.jsx";
import MarketIntelligence from "./components/MarketIntelligence.jsx";
import { ChatThread, CopilotMark } from "./chat.jsx";
import { suggestionsFor } from "./copilot.js";
import {
  assetClasses, clientById, clients, dataSources, followUpSeries, institutions, money, riskProfiles,
} from "./data.js";

const TODAY = new Date(2026, 9, 10);
const parseBR = (s) => {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
};
const daysUntil = (s) => Math.round((parseBR(s) - TODAY) / 86400000);
const SEVERITY_ORDER = { Alta: 0, "Média": 1, Baixa: 2 };
const bySeverity = (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
const filterClients = (query, risk) =>
  clients.filter((x) => x.name.toLowerCase().includes(query.toLowerCase()) && (risk === "Todos" || x.risk === risk));

function PillTabs({ tabs, value, onChange, layoutId, className = "" }) {
  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto ${className}`}>
      {tabs.map(([id, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`relative whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${value === id ? "text-on-primary" : "text-slate-500 hover:text-slate-800"}`}
        >
          {value === id && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span className="relative z-10">{label}</span>
        </button>
      ))}
    </div>
  );
}

const Select = ({ value, onChange, options, label }) => (
  <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 min-w-0 flex-1 sm:min-w-40 sm:flex-none rounded-lg border border-slate-200 bg-surface px-3 text-xs font-medium text-slate-700">
    {options.map((o) => (
      <option key={o}>{o}</option>
    ))}
  </select>
);

function ClientLink({ id }) {
  const { go } = useStore();
  return <LinkButton onClick={() => go("profile", id)}>{clientById(id).name}</LinkButton>;
}

function AlertTable({ rows, compact = false }) {
  const { go } = useStore();
  return (
    <>
    <MobileList show={rows.length > 0} empty="Nenhum alerta encontrado.">
      {rows.map((x, i) => (
        <MobileRow key={x.id} index={i} onClick={() => go("alertDetail", x.id)}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={severityTone(x.severity)}>{x.severity}</Badge>
            {!compact && <Badge>{x.type}</Badge>}
            {x.status === "Analisado" && <Badge tone="green">Analisado</Badge>}
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{x.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{clientById(x.cid).name} · {x.date}</p>
        </MobileRow>
      ))}
    </MobileList>
    <TableWrap desktopOnly minWidth={compact ? "min-w-[520px]" : undefined}>
      <thead>
        <tr>
          <Th>Cliente</Th><Th>Ocorrência</Th>{!compact && <Th>Tipo</Th>}<Th>Prioridade</Th><Th>Status</Th><Th />
        </tr>
      </thead>
      <tbody>
        <AnimatePresence initial={false}>
          {rows.map((x, i) => (
            <AnimatedRow key={x.id} index={i}>
              <Td><ClientLink id={x.cid} /></Td>
              <Td className="whitespace-normal">
                <b className="text-slate-800">{x.title}</b>
                <div className="mt-1 text-slate-500">{x.date}</div>
              </Td>
              {!compact && <Td>{x.type}</Td>}
              <Td><Badge tone={severityTone(x.severity)}>{x.severity}</Badge></Td>
              <Td><Badge tone={x.status === "Analisado" ? "green" : "neutral"}>{x.status}</Badge></Td>
              <Td><LinkButton onClick={() => go("alertDetail", x.id)}>Analisar →</LinkButton></Td>
            </AnimatedRow>
          ))}
        </AnimatePresence>
        {!rows.length && <Empty colSpan={compact ? 5 : 6}>Nenhum alerta encontrado.</Empty>}
      </tbody>
    </TableWrap>
    </>
  );
}

function ClientTable({ rows }) {
  const { go, alerts } = useStore();
  const openCount = (id) => alerts.filter((a) => a.cid === id && a.status === "Pendente").length;
  return (
    <>
    <MobileList show={rows.length > 0} empty="Nenhum cliente encontrado.">
      {rows.map((x, i) => {
        const open = openCount(x.id);
        return (
          <MobileRow key={x.id} index={i} onClick={() => go("profile", x.id)}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold text-slate-900">{x.name}</span>
              <span className="shrink-0 text-sm font-bold text-slate-900">{money(x.wealth)}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{x.city} · contato {x.contact.slice(0, 5)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{x.risk}</Badge>
              {open > 0 && <Badge tone="gold">{open} alerta(s)</Badge>}
            </div>
          </MobileRow>
        );
      })}
    </MobileList>
    <TableWrap desktopOnly>
      <thead>
        <tr>
          <Th>Cliente</Th><Th>Perfil</Th><Th>Patrimônio</Th><Th>Instituições</Th><Th>Alertas</Th><Th>Próximo contato</Th><Th />
        </tr>
      </thead>
      <tbody>
        <AnimatePresence initial={false}>
          {rows.map((x, i) => {
            const open = openCount(x.id);
            return (
              <AnimatedRow key={x.id} index={i}>
                <Td>
                  <b className="text-slate-800">{x.name}</b>
                  <div className="mt-1 text-slate-500">{x.city}</div>
                </Td>
                <Td><Badge>{x.risk}</Badge></Td>
                <Td className="font-bold text-slate-800">{money(x.wealth)}</Td>
                <Td>{x.inst}</Td>
                <Td>{open ? <Badge tone="gold">{open} ativo(s)</Badge> : <Badge tone="green">Nenhum</Badge>}</Td>
                <Td>{x.contact}</Td>
                <Td><LinkButton onClick={() => go("profile", x.id)}>Abrir →</LinkButton></Td>
              </AnimatedRow>
            );
          })}
        </AnimatePresence>
        {!rows.length && <Empty colSpan={7}>Nenhum cliente encontrado.</Empty>}
      </tbody>
    </TableWrap>
    </>
  );
}

/* ------------------------------ Visão geral ------------------------------ */

// "Seu dia": até 3 próximos passos montados a partir dos alertas e da agenda.
function NextSteps({ open }) {
  const { go } = useStore();
  const sorted = [...open].sort(bySeverity);
  const first = sorted[0];
  const meeting = [...clients].sort((a, b) => daysUntil(a.contact) - daysUntil(b.contact))[0];
  const third = sorted.find((a) => a !== first && a.type === "Oportunidade") || sorted.find((a) => a !== first);
  const steps = [
    first && { key: `a${first.id}`, tone: severityTone(first.severity), tag: `Alerta · ${first.severity} prioridade`, title: first.title, who: clientById(first.cid).name, cta: "Analisar alerta", run: () => go("alertDetail", first.id) },
    { key: `m${meeting.id}`, tone: "blue", tag: `Reunião · em ${daysUntil(meeting.contact)} dias`, title: `Preparar conversa com ${meeting.name.split(" ")[0]}`, who: meeting.objective, cta: "Gerar briefing", run: () => go("briefing", meeting.id) },
    third && { key: `a${third.id}`, tone: severityTone(third.severity), tag: `${third.type} · ${third.severity} prioridade`, title: third.title, who: clientById(third.cid).name, cta: "Analisar alerta", run: () => go("alertDetail", third.id) },
  ].filter(Boolean);

  return (
    <Card className="mb-5">
      <SectionHead title="Seu dia" subtitle={`${steps.length} próximos passos sugeridos a partir dos alertas e da agenda`} />
      <ol className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
        <AnimatePresence initial={false} mode="popLayout">
          {steps.map((x, i) => (
            <motion.li key={x.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="flex w-[82%] shrink-0 snap-start flex-col rounded-xl border border-slate-200 p-4 sm:w-[46%] lg:w-auto">
              <div className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-on-primary">{i + 1}</span>
                <Badge tone={x.tone}>{x.tag}</Badge>
              </div>
              <p className="mt-3 text-sm font-semibold leading-snug text-slate-900">{x.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{x.who}</p>
              <Button className="mt-4 self-start" onClick={x.run}>
                {x.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </Card>
  );
}

export function Dashboard() {
  const { alerts, go } = useStore();
  const [range, setRange] = useState("12m");
  const open = alerts.filter((x) => x.status === "Pendente");
  const total = clients.reduce((s, x) => s + x.wealth, 0);
  const series = range === "12m" ? followUpSeries : followUpSeries.slice(-6);
  const colors = { Conservador: "var(--color-chart-1)", Moderado: "var(--color-chart-2)", Arrojado: "var(--color-chart-3)" };

  return (
    <>
      <PageTitle
        kicker="Visão geral"
        title="Bom dia, assessor"
        lead="Acompanhe sua base e comece pelas situações mais relevantes."
      />

      <NextSteps open={open} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric label="Clientes na carteira" value={clients.length} foot="Amostra da demonstração" icon={Users} />
        <Metric label="Precisam de atenção" value={new Set(open.map((x) => x.cid)).size} foot="Com alertas em aberto" icon={AlertTriangle} accent="text-amber-600" />
        <Metric label="Alertas em aberto" value={open.length} foot="Priorizados por gravidade" icon={Bell} accent="text-red-500" />
        <Metric label="Patrimônio sob gestão" value={total} format={(n) => money(Math.round(n))} foot={`Soma dos ${clients.length} clientes`} icon={Wallet} accent="text-emerald-600" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
        <Card>
          <SectionHead title="Prioridades de atendimento" subtitle="Pendentes, da maior para a menor gravidade" action={<Button onClick={() => go("alerts")}>Ver todos</Button>} />
          <AlertTable compact rows={[...open].sort(bySeverity).slice(0, 4)} />
        </Card>
        <Card>
          <SectionHead title="Atendimentos próximos" />
          <ul>
            {clients.slice(0, 4).map((x, i) => {
              const d = daysUntil(x.contact);
              return (
                <motion.li
                  key={x.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  className="border-b border-slate-100 py-3 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <ClientLink id={x.id} />
                    <Badge tone={d <= 4 ? "gold" : "blue"}>
                      <CalendarClock className="h-3 w-3" /> {x.contact.slice(0, 5)} · em {d} dias
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{x.objective}</p>
                </motion.li>
              );
            })}
          </ul>
          <Button variant="primary" className="mt-4" onClick={() => go("briefings")}>Preparar briefing</Button>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <SectionHead title="Distribuição da base por perfil" subtitle="Clique em um perfil para ver os clientes" />
          <HBarList
            max={clients.length}
            onSelect={(item) => go("clients", { risk: item.label })}
            items={riskProfiles.map((r) => {
              const list = clients.filter((c) => c.risk === r);
              return {
                label: r,
                value: list.length,
                color: colors[r],
                display: `${list.length} · ${Math.round((list.length / clients.length) * 100)}%`,
                hint: `${money(list.reduce((s, c) => s + c.wealth, 0))} em patrimônio`,
              };
            })}
          />
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
            {riskProfiles.map((r, i) => {
              const list = clients.filter((c) => c.risk === r);
              return (
                <motion.button
                  key={r}
                  whileHover={{ y: -3 }}
                  onClick={() => go("clients", { risk: r })}
                  className="rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-slate-300"
                >
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[r] }} /> {r}
                  </span>
                  <span className="mt-1 block text-sm font-bold text-slate-900">
                    <CountUp value={list.reduce((s, c) => s + c.wealth, 0) / 1e6} format={(n) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`} duration={1 + i * 0.2} />
                  </span>
                  <span className="text-[11px] text-slate-500">patrimônio somado</span>
                </motion.button>
              );
            })}
          </div>
        </Card>
        <Card>
          <SectionHead
            title="Evolução ilustrativa do acompanhamento"
            subtitle="Índice de contatos realizados vs. planejados (0–100)"
            action={<PillTabs layoutId="evo-range" value={range} onChange={setRange} tabs={[["6m", "6 meses"], ["12m", "12 meses"]]} className="rounded-lg bg-slate-100 p-1" />}
          />
          <ColumnChart key={range} data={series} valueLabel="Índice" />
          <p className="mt-3 text-[11px] text-slate-500">Gráfico demonstrativo, sem representação de resultados reais.</p>
        </Card>
      </div>

      <div className="mt-5">
        <MarketIntelligence location="dashboard" visibleClients={clients} />
      </div>
    </>
  );
}

/* -------------------------------- Clientes ------------------------------- */

export function ClientsPage() {
  const { params } = useStore();
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState(params?.risk || "Todos");
  const found = useMemo(() => filterClients(query, risk), [query, risk]);

  return (
    <>
      <PageTitle kicker="Base de clientes" title="Clientes" lead="Pesquise e acompanhe seus clientes em um único lugar." />
      <Card>
        <SectionHead
          title={<>Lista de clientes <span className="text-sm font-normal text-slate-500">(<CountUp key={found.length} value={found.length} duration={0.4} />)</span></>}
          action={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <label className="relative min-w-0 flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="h-10 w-full sm:w-56 rounded-lg border border-slate-200 bg-surface pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <Select label="Perfil de risco" value={risk} onChange={setRisk} options={["Todos", ...riskProfiles]} />
            </div>
          }
        />
        <ClientTable rows={found} />
      </Card>
      <div className="mt-5">
        <MarketIntelligence location="clients" visibleClients={found} />
      </div>
    </>
  );
}

/* --------------------------------- Perfil -------------------------------- */

const BACK_LABEL = {
  dashboard: "Voltar ao início", clients: "Voltar aos clientes", profile: "Voltar ao cliente", alerts: "Voltar à fila de alertas",
  alertDetail: "Voltar ao alerta", copilot: "Voltar ao copiloto", briefings: "Voltar aos briefings", briefing: "Voltar ao briefing",
  finance: "Voltar aos dados integrados", sources: "Voltar às fontes", settings: "Voltar às configurações",
};

// "Voltar" que leva à tela de origem (ex.: do alerta para o cliente e de volta ao alerta).
function useBackLink() {
  const { back, prev } = useStore();
  return { label: BACK_LABEL[prev.page] || "Voltar", onClick: back };
}

// Registro de interação: painel lateral no desktop, folha inferior no celular.
function NoteSheet({ client, open, onClose, onSaved }) {
  const { addNote } = useStore();
  const toast = useToast();
  const first = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => first.current?.focus(), 200);
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function save(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    addNote({ cid: client.id, type: f.get("type"), date: String(f.get("date")).split("-").reverse().join("/"), text: f.get("text"), next: f.get("next") });
    toast("Interação registrada no histórico");
    onClose();
    onSaved?.();
  }

  const input = "h-11 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.section
            role="dialog"
            aria-label={`Registrar interação com ${client.name}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-2xl md:max-h-none md:w-[440px] md:rounded-none md:border-l md:border-slate-200"
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200 md:hidden" aria-hidden />
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Registrar interação</h2>
                <p className="mt-0.5 text-xs text-slate-500">{client.name} · fica salvo no histórico do cliente</p>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </header>
            <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-slate-600">
                    Tipo
                    <select ref={first} name="type" className={`${input} mt-1.5`}>
                      {["Reunião", "Ligação", "Contato digital", "Observação"].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Data
                    <input name="date" type="date" defaultValue="2026-10-10" required className={`${input} mt-1.5`} />
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-600">
                  Resumo do atendimento
                  <textarea name="text" required placeholder="O que foi discutido?" className={`${input} mt-1.5 h-auto min-h-28 py-3`} />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Próximos passos
                  <textarea name="next" placeholder="O que deve ser acompanhado?" className={`${input} mt-1.5 h-auto min-h-24 py-3`} />
                </label>
                <Helper>Registre somente informações pertinentes ao atendimento e autorizadas pelo cliente.</Helper>
              </div>
              <footer className="flex gap-3 border-t border-slate-200 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button type="button" onClick={onClose} className="flex-1 md:flex-none">Cancelar</Button>
                <Button variant="primary" type="submit" className="flex-1">Salvar registro</Button>
              </footer>
            </form>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Profile() {
  const { params, go, alerts, notes } = useStore();
  const x = clientById(params);
  const [tab, setTab] = useState("overview");
  const [noteOpen, setNoteOpen] = useState(false);
  const clientAlerts = alerts.filter((a) => a.cid === x.id);
  const timeline = notes.filter((n) => n.cid === x.id);
  const backLink = useBackLink();

  return (
    <>
      <PageTitle
        back={backLink}
        kicker="Relacionamento / Cliente"
        title={x.name}
        lead={`${x.city} • Perfil ${x.risk} • ${x.inst} instituições`}
        action={<Button variant="primary" onClick={() => setNoteOpen(true)} className="w-full sm:w-auto"><MessageSquarePlus className="h-3.5 w-3.5" /> Registrar interação</Button>}
      />
      <NoteSheet client={x} open={noteOpen} onClose={() => setNoteOpen(false)} onSaved={() => setTab("memory")} />
      <div className="mb-5 border-b border-slate-200 pb-3">
        <PillTabs layoutId="profile-tab" value={tab} onChange={setTab} tabs={[["overview", "Visão geral"], ["portfolio", "Carteira"], ["memory", `Histórico (${timeline.length})`]]} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                <Metric className="col-span-2 md:col-span-1" label="Patrimônio consolidado" value={x.wealth} format={(n) => money(Math.round(n))} foot={`${x.inst} instituições simuladas`} icon={Wallet} accent="text-emerald-600" />
                <Metric label="Perfil de risco" value={x.risk} foot="Suitability demonstrativa" icon={ShieldCheck} />
                <Metric label="Alertas ativos" value={clientAlerts.filter((a) => a.status === "Pendente").length} foot="Acompanhamento pendente" icon={Bell} accent="text-red-500" />
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
                <Card>
                  <SectionHead title="Objetivos e preferências" />
                  <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {[["Objetivo principal", x.objective], ["Região", x.city], ["Próximo contato", x.contact], ["Relacionamento", "Atendimento personalizado"]].map(([l, v]) => (
                      <div key={l}>
                        <dt className="mb-1 text-[11px] text-slate-500">{l}</dt>
                        <dd className="text-sm font-bold text-slate-800">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
                <Card>
                  <SectionHead title="Próximo passo" />
                  <p className="mb-4 text-sm text-slate-500">Revise os alertas e o histórico antes de entrar em contato.</p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => go("briefing", x.id)}><Sparkles className="h-3.5 w-3.5" /> Gerar briefing</Button>
                    <Button variant="ghost" onClick={() => setTab("memory")}>Ver histórico</Button>
                  </div>
                </Card>
              </div>
              <Card className="mt-5">
                <SectionHead title="Alertas deste cliente" />
                <AlertTable rows={clientAlerts} />
              </Card>
            </>
          )}

          {tab === "portfolio" && (
            <>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
                <Card>
                  <SectionHead title="Alocação por classe" subtitle="Passe o mouse sobre as fatias para ver o detalhe" />
                  <DonutChart
                    centerTitle="Patrimônio"
                    centerValue={`R$ ${(x.wealth / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`}
                    format={(v) => `${v}% · ${money((x.wealth * v) / 100)}`}
                    segments={assetClasses.map((c, i) => ({ ...c, value: x.allocation[i] }))}
                  />
                </Card>
                <Card>
                  <SectionHead title="Patrimônio consolidado" />
                  <div className="text-[28px] font-bold tracking-tight"><CountUp value={x.wealth} format={(n) => money(Math.round(n))} /></div>
                  <p className="text-xs text-slate-500">{x.inst} instituições · Base sintética</p>
                  <h3 className="mt-5 text-sm font-semibold text-slate-700">Saldo em conta</h3>
                  <div className="text-[23px] font-bold tracking-tight"><CountUp value={x.cash} format={(n) => money(Math.round(n))} /></div>
                  <p className="mb-4 text-xs text-slate-500">{((x.cash / x.wealth) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do patrimônio</p>
                  <Helper>A composição apresentada é fictícia. Não constitui recomendação financeira.</Helper>
                </Card>
              </div>
              <Card className="mt-5">
                <SectionHead title="Distribuição por instituição" action={<Button onClick={() => go("finance")}>Dados integrados</Button>} />
                <HBarList labelWidth="w-48" max={1} items={institutions.map((i) => ({ label: i.name, value: i.share, display: money(x.wealth * i.share), hint: `${Math.round(i.share * 100)}% do patrimônio` }))} />
              </Card>
            </>
          )}

          {tab === "memory" && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
              <Card>
                <SectionHead title="Linha do tempo" action={<Button onClick={() => setNoteOpen(true)}><MessageSquarePlus className="h-3.5 w-3.5" /> Novo registro</Button>} />
                <ol className="relative ml-1.5 border-l-2 border-slate-100">
                  {timeline.map((n, i) => (
                    <motion.li key={`${n.date}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="relative py-3.5 pl-7">
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 + i * 0.08, type: "spring" }} className="absolute -left-[7px] top-5 h-3 w-3 rounded-full bg-gold ring-4 ring-surface" />
                      <small className="text-slate-500">{n.date} • {n.type}</small>
                      <h4 className="my-1.5 text-[13px] font-semibold text-slate-800">{n.text}</h4>
                      <p className="text-xs text-slate-500">Próximo passo: {n.next || "Não definido"}</p>
                    </motion.li>
                  ))}
                  {!timeline.length && <Empty>Ainda não há registros.</Empty>}
                </ol>
              </Card>
              <Card>
                <SectionHead title="Memória do cliente" />
                <p className="mb-4 text-sm leading-relaxed text-slate-500">Registre objetivos, pontos abordados e próximos passos para dar continuidade ao relacionamento.</p>
                <Helper>Armazene somente informações pertinentes ao atendimento e autorizadas pelo cliente.</Helper>
              </Card>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </>
  );
}

/* --------------------------------- Alertas -------------------------------- */

export function AlertsPage() {
  const { alerts } = useStore();
  const [type, setType] = useState("Todos");
  const [severity, setSeverity] = useState("Todas");
  const rows = alerts
    .filter((x) => (type === "Todos" || x.type === type) && (severity === "Todas" || x.severity === severity))
    .sort((a, b) => (a.status === "Pendente" ? 0 : 1) - (b.status === "Pendente" ? 0 : 1) || bySeverity(a, b));
  const pending = alerts.filter((x) => x.status === "Pendente");

  return (
    <>
      <PageTitle kicker="Monitoramento inteligente" title="Riscos e oportunidades" lead="Alertas calculados com regras demonstrativas e revisados pelo assessor." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric label="Em aberto" value={pending.length} foot="Pendentes de avaliação" icon={Bell} />
        <Metric label="Alta prioridade" value={pending.filter((x) => x.severity === "Alta").length} foot="Requerem acompanhamento" icon={AlertTriangle} accent="text-red-500" />
        <Metric label="Vencimentos" value={alerts.filter((x) => x.type === "Vencimento").length} foot="Monitorados pela plataforma" icon={CalendarClock} />
        <Metric label="Oportunidades" value={alerts.filter((x) => x.type === "Oportunidade").length} foot="Sujeitas à adequação" icon={TrendingUp} accent="text-emerald-600" />
      </div>
      <Card className="mt-5">
        <SectionHead
          title="Fila de alertas"
          subtitle={`${rows.length} de ${alerts.length} alertas · pendentes primeiro, por gravidade`}
          action={
            <div className="flex w-full gap-2 sm:w-auto">
              <Select label="Tipo de alerta" value={type} onChange={setType} options={["Todos", "Concentração", "Vencimento", "Oportunidade", "Relacionamento"]} />
              <Select label="Prioridade" value={severity} onChange={setSeverity} options={["Todas", "Alta", "Média", "Baixa"]} />
            </div>
          }
        />
        <AlertTable rows={rows} />
      </Card>
    </>
  );
}

export function AlertDetail() {
  const { params, alerts, go, toggleAlert, askCopilot } = useStore();
  const backLink = useBackLink();
  const toast = useToast();
  const x = alerts.find((a) => a.id === +params) || alerts[0];
  const cl = clientById(x.cid);
  const done = x.status === "Analisado";
  const pendingLeft = alerts.filter((a) => a.status === "Pendente" && a.id !== x.id).sort(bySeverity);
  const next = pendingLeft[0];

  function markDone() {
    toggleAlert(x.id);
    toast(done ? "Alerta reaberto" : "Alerta marcado como analisado");
  }

  return (
    <>
      <PageTitle kicker="Monitoramento / Detalhe do alerta" title={x.title} lead={`${cl.name} · ${x.type} · identificado em ${x.date}`} back={backLink} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone={severityTone(x.severity)}>{x.severity} prioridade</Badge>
            <Badge>{x.type}</Badge>
            <motion.span key={x.status} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <Badge tone={done ? "green" : "neutral"}>{x.status}</Badge>
            </motion.span>
          </div>
          <h2 className="mt-7 text-lg font-semibold">O que foi identificado</h2>
          <p className="mt-2 text-sm leading-loose text-slate-600">{x.description}</p>
          <h2 className="mt-7 text-lg font-semibold">Dados utilizados</h2>
          <p className="mb-4 mt-2 text-sm text-slate-500">{x.source}</p>
          <Helper>O alerta serve como apoio à análise. Qualquer orientação financeira depende da avaliação do assessor, perfil do cliente e regras aplicáveis.</Helper>

          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 rounded-xl border border-slate-200 bg-emerald-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Alerta analisado
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {next ? `Próximo da fila: ${next.title} · ${clientById(next.cid).name}` : "Todos os alertas da fila foram analisados."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {next ? (
                    <Button variant="primary" onClick={() => go("alertDetail", next.id)}>Próximo alerta <ArrowRight className="h-3.5 w-3.5" /></Button>
                  ) : (
                    <Button variant="primary" onClick={() => go("dashboard")}>Voltar ao início</Button>
                  )}
                  <Button variant="ghost" onClick={markDone}><RotateCcw className="h-3.5 w-3.5" /> Reabrir</Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="todo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 flex flex-wrap gap-3">
                <Button variant="primary" onClick={markDone}><CheckCircle2 className="h-3.5 w-3.5" /> Marcar como analisado</Button>
                <Button onClick={() => askCopilot(`Explique o alerta “${x.title}”`)}><Sparkles className="h-3.5 w-3.5" /> Perguntar ao copiloto</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
        <Card>
          <SectionHead title="Cliente relacionado" />
          <div className="text-[22px] font-bold">{cl.name}</div>
          <p className="text-sm text-slate-500">{cl.risk} • {cl.city}</p>
          <dl className="mt-7 grid grid-cols-2 gap-4">
            <div><dt className="text-[11px] text-slate-500">Patrimônio</dt><dd className="text-sm font-bold">{money(cl.wealth)}</dd></div>
            <div><dt className="text-[11px] text-slate-500">Próximo contato</dt><dd className="text-sm font-bold">{cl.contact}</dd></div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => go("profile", cl.id)}>Abrir cliente</Button>
            <Button onClick={() => go("briefing", cl.id)}><FileText className="h-3.5 w-3.5" /> Preparar briefing</Button>
          </div>
          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
            {pendingLeft.length ? `${pendingLeft.length} outro(s) alerta(s) pendente(s) na fila.` : "Nenhum outro alerta pendente."}
          </p>
        </Card>
      </div>
    </>
  );
}

/* --------------------------------- Copiloto ------------------------------- */

export function Copilot() {
  const { chat, setChat, ask, typing } = useStore();
  const [input, setInput] = useState("");

  function submit(q) {
    if (ask(q ?? input)) setInput("");
  }

  return (
    <>
      <PageTitle kicker="Inteligência aplicada" title="Copiloto IA" lead="Consulte os dados dos clientes usando linguagem natural e verifique as fontes." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
        <Card className="flex min-h-[520px] flex-col">
          <SectionHead title="Conversa com o assistente" subtitle="Respostas produzidas para a base fictícia" action={<Badge>Demonstração</Badge>} />
          <ChatThread
            chat={chat}
            typing={typing}
            empty={
              <div className="px-3 py-10 text-center">
                <div className="mb-3 flex justify-center"><CopilotMark /></div>
                <h2 className="text-lg font-semibold">Como posso ajudar hoje?</h2>
                <p className="mt-1 text-sm text-slate-500">Faça perguntas sobre a carteira, alertas e relacionamento com os clientes.</p>
              </div>
            }
          />
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2 border-t border-slate-200 pt-4">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte sobre seus clientes..." className="h-11 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <Button variant="primary" type="submit" disabled={typing}>Enviar <Send className="h-3.5 w-3.5" /></Button>
          </form>
        </Card>
        <Card>
          <SectionHead title="Perguntas sugeridas" subtitle="Escolha uma consulta para testar o copiloto." />
          <div className="mb-4 grid gap-2">
            {suggestionsFor("copilot").items.map((q) => (
              <motion.button key={q} whileHover={{ x: 4 }} onClick={() => submit(q)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-surface px-3.5 py-3 text-left text-xs text-slate-600 hover:border-slate-300">
                {q} <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </motion.button>
            ))}
          </div>
          <Helper className="mb-4">O copiloto consulta apenas o conjunto de dados fictício e explica as fontes. As respostas precisam ser revisadas pelo assessor.</Helper>
          <Button onClick={() => setChat([])}><Trash2 className="h-3.5 w-3.5" /> Limpar conversa</Button>
        </Card>
      </div>
    </>
  );
}

/* -------------------------------- Briefings ------------------------------- */

export function Briefings() {
  const { go } = useStore();
  const agenda = [...clients].sort((a, b) => daysUntil(a.contact) - daysUntil(b.contact));
  const nextBadge = <Badge tone="blue">Próximo</Badge>;
  return (
    <>
      <PageTitle kicker="Preparação de reuniões" title="Briefings inteligentes" lead="Resumos de clientes e pautas de atendimento para revisão humana." />
      <Card>
        <SectionHead title="Próximos atendimentos" subtitle="Em ordem de data · abra um cliente para ver a pauta" />
        <MobileList>
          {agenda.map((x, i) => (
            <MobileRow key={x.id} index={i} onClick={() => go("briefing", x.id)}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-semibold text-slate-900">{x.name}</span>{i === 0 && nextBadge}</span>
                <span className="shrink-0 text-xs text-slate-500">{x.contact.slice(0, 5)} · em {daysUntil(x.contact)} dias</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{x.objective}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-800"><FileText className="h-3.5 w-3.5" /> Ver briefing</span>
            </MobileRow>
          ))}
        </MobileList>
        <TableWrap desktopOnly>
          <thead><tr><Th>Cliente</Th><Th>Data prevista</Th><Th>Objetivo</Th><Th /></tr></thead>
          <tbody>
            {agenda.map((x, i) => (
              <AnimatedRow key={x.id} index={i}>
                <Td><span className="inline-flex items-center gap-2"><ClientLink id={x.id} />{i === 0 && nextBadge}</span></Td>
                <Td>{x.contact} <span className="text-slate-500">· em {daysUntil(x.contact)} dias</span></Td>
                <Td className="whitespace-normal">{x.objective}</Td>
                <Td className="text-right"><Button onClick={() => go("briefing", x.id)}><FileText className="h-3.5 w-3.5" /> Ver briefing</Button></Td>
              </AnimatedRow>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}

export function Briefing() {
  const { params, alerts, notes, go } = useStore();
  const backLink = useBackLink();
  const [noteOpen, setNoteOpen] = useState(false);
  const toast = useToast();
  const x = clientById(params);
  const [phase, setPhase] = useState("loading");
  const [run, setRun] = useState(0);
  const ref = useRef(null);
  const related = alerts.filter((a) => a.cid === x.id && a.status === "Pendente");
  const last = notes.find((n) => n.cid === x.id);

  // Gera ao abrir a tela; "Regenerar" incrementa run e repete.
  useEffect(() => {
    setPhase("loading");
    const t = setTimeout(() => setPhase("ready"), 1100);
    return () => clearTimeout(t);
  }, [x.id, run]);
  function copy() {
    navigator.clipboard.writeText(ref.current?.innerText || "").then(() => toast("Briefing copiado")).catch(() => toast("Não foi possível copiar"));
  }

  const sections = [
    ["1. Resumo executivo", <p key="p">{x.name} tem perfil {x.risk.toLowerCase()}, patrimônio fictício de {money(x.wealth)} e objetivo principal de {x.objective.toLowerCase()}. A carteira contempla {x.inst} instituições simuladas.</p>],
    ["2. Pontos de atenção", <ul key="u" className="list-disc pl-5">{related.length ? related.map((a) => <li key={a.id}>{a.title} — prioridade {a.severity.toLowerCase()}.</li>) : <li>Nenhum alerta em aberto para este cliente.</li>}</ul>],
    ["3. Histórico relevante", <p key="p">{last ? last.text : "Ainda não há registros de atendimento para este cliente."}</p>],
    ["4. Perguntas sugeridas", <ul key="u" className="list-disc pl-5"><li>Seus objetivos financeiros continuam os mesmos?</li><li>Houve mudanças na necessidade de liquidez?</li><li>Como você avalia sua carteira atual em relação aos seus planos?</li></ul>],
    ["5. Próximos passos", <p key="p">Revisar as informações, conversar com o cliente e registrar decisões após o atendimento.</p>],
  ];

  return (
    <>
      <PageTitle kicker="Inteligência / Briefing" title={`Briefing — ${x.name}`} lead="Resumo contextualizado para apoiar o próximo atendimento." back={backLink} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
        <Card>
          <SectionHead title="Preparação da reunião" action={<Badge tone="blue">Revisão obrigatória</Badge>} />
          {phase === "loading" && (
            <div className="space-y-3" role="status" aria-label="Gerando briefing">
              <p className="mb-4 flex items-center gap-2 text-sm text-slate-500"><Sparkles className="h-3.5 w-3.5 text-slate-400" /> Montando a pauta com cadastro, carteira, alertas e histórico…</p>
              {[90, 70, 85, 60, 75].map((w, i) => (
                <motion.div key={i} className="h-3.5 rounded bg-slate-200" style={{ width: `${w}%` }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.1 }} />
              ))}
            </div>
          )}
          {phase === "ready" && (
            <>
              <div ref={ref} className="text-[13px] leading-loose text-slate-600">
                {sections.map(([h, body], i) => (
                  <motion.section key={h} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
                    <h3 className="mb-1 mt-5 text-[15px] font-semibold text-slate-900 first:mt-0">{h}</h3>
                    {body}
                  </motion.section>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="primary" onClick={copy}><Copy className="h-3.5 w-3.5" /> Copiar briefing</Button>
                <Button onClick={() => setNoteOpen(true)}><MessageSquarePlus className="h-3.5 w-3.5" /> Registrar após a reunião</Button>
                <Button variant="ghost" onClick={() => setRun((n) => n + 1)}><RotateCcw className="h-3.5 w-3.5" /> Regenerar</Button>
              </div>
              <NoteSheet client={x} open={noteOpen} onClose={() => setNoteOpen(false)} />
            </>
          )}
        </Card>
        <Card>
          <SectionHead title="Fontes consideradas" />
          <ul className="mb-4 space-y-2 text-sm text-slate-500">
            <li>Dados cadastrais • {x.contact}</li>
            <li>Carteira simulada • 09/10/2026</li>
            <li>Alertas em aberto • {related.length}</li>
            <li>Histórico de atendimento • {last ? "Disponível" : "Não disponível"}</li>
          </ul>
          <Helper>Conteúdo demonstrativo gerado por modelo de regras. Não há consulta a serviço externo de IA nesta versão.</Helper>
          <Button className="mt-5" onClick={() => go("profile", x.id)}>Abrir perfil</Button>
        </Card>
      </div>
    </>
  );
}

/* ----------------------------- Dados integrados ---------------------------- */

export function Finance() {
  const { go } = useStore();
  const total = clients.reduce((s, x) => s + x.wealth, 0);
  return (
    <>
      <PageTitle kicker="Consolidação patrimonial" title="Dados integrados" lead="Visão de fontes financeiras unificadas com origem e atualização identificadas." />
      <Helper>A integração Open Finance é simulada neste protótipo. Nenhuma conta bancária está conectada.</Helper>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Patrimônio total" value={total} format={(n) => money(Math.round(n))} foot="Amostra de 6 clientes" icon={Wallet} accent="text-emerald-600" />
        <Metric label="Instituições simuladas" value={3} foot="Fontes normalizadas" icon={Landmark} />
        <Metric label="Última atualização" value="09/10/2026" foot="Data fictícia" icon={CalendarClock} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
        <Card>
          <SectionHead title="Patrimônio por instituição" subtitle="Participação no total consolidado" />
          <HBarList labelWidth="w-48" max={1} items={institutions.map((i) => ({ label: i.name, value: i.share, display: `${Math.round(i.share * 100)}%`, hint: money(total * i.share) }))} />
        </Card>
        <Card>
          <SectionHead title="Governança de dados" />
          <p className="mb-4 text-sm leading-relaxed text-slate-500">Origem das informações, datas de atualização e controles de autorização deverão ser validados antes de qualquer integração real.</p>
          <Button variant="primary" onClick={() => go("sources")}><Database className="h-3.5 w-3.5" /> Ver fontes de dados</Button>
        </Card>
      </div>
      <Card className="mt-5">
        <SectionHead title="Visão por cliente" />
        <ClientTable rows={clients} />
      </Card>
    </>
  );
}

export function Sources() {
  const backLink = useBackLink();
  return (
    <>
      <PageTitle kicker="Governança / Integrações" title="Fontes e qualidade dos dados" lead="Identificação das origens e do status de cada integração." back={backLink} />
      <Card>
        <TableWrap>
          <thead><tr><Th>Fonte</Th><Th>Tipo</Th><Th>Atualização</Th><Th>Status</Th></tr></thead>
          <tbody>
            {dataSources.map((r, i) => (
              <AnimatedRow key={r[0]} index={i}>
                <Td><span className="inline-flex items-center gap-2 font-semibold text-slate-800"><Building2 className="h-3.5 w-3.5 text-slate-400" />{r[0]}</span></Td>
                <Td>{r[1]}</Td>
                <Td>{r[2]}</Td>
                <Td><Badge>Demonstrativo</Badge></Td>
              </AnimatedRow>
            ))}
          </tbody>
        </TableWrap>
      </Card>
      <Helper className="mt-5">Uma versão de produção precisaria de consentimento quando aplicável, autorização de acesso, trilha de auditoria, retenção adequada e integração por fornecedores autorizados.</Helper>
    </>
  );
}

/* ------------------------------- Configurações ------------------------------ */

export function Settings() {
  const { logout, resetDemo } = useStore();
  const toast = useToast();
  return (
    <>
      <PageTitle kicker="Administração" title="Configurações" lead="Informações sobre o ambiente de demonstração e permissões." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
        <Card>
          <SectionHead title="Conta e acesso" />
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[["Usuário", "Assessor Demo"], ["Papel", "Assessor"], ["Ambiente", "Protótipo local"], ["Dados", "Fictícios"]].map(([l, v]) => (
              <div key={l}><dt className="mb-1 text-[11px] text-slate-500">{l}</dt><dd className="text-sm font-bold">{v}</dd></div>
            ))}
          </dl>
          <Button className="mt-6" onClick={logout}>Sair da demonstração</Button>
        </Card>
        <Card>
          <SectionHead title="Privacidade e segurança" />
          <p className="mb-4 text-sm leading-relaxed text-slate-500">Este protótipo não implementa autenticação real, integração bancária, autorização de produção nem persistência remota. As anotações e estados dos alertas são armazenados apenas no navegador atual.</p>
          <Helper className="mb-4">Não utilize dados pessoais ou financeiros verdadeiros neste ambiente.</Helper>
          <Button onClick={() => { if (confirm("Restaurar os dados da demonstração?")) { resetDemo(); toast("Dados restaurados"); } }}>
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar dados fictícios
          </Button>
        </Card>
      </div>
    </>
  );
}

/* ---------------------------------- Login --------------------------------- */

export function Logo() {
  return (
    <div className="px-3 text-[21px] font-extrabold tracking-tight text-white">
      XP <b className="text-gold">/</b> ADVISOR
      <small className="mt-0.5 block text-[10px] font-semibold tracking-[0.23em] text-white/55">COPILOT</small>
    </div>
  );
}

export function Login({ onLogin }) {
  const field = "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="relative hidden w-[41%] flex-col justify-between overflow-hidden bg-navy p-16 text-white md:flex">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border border-gold/20"
            style={{ width: 300 + i * 180, height: 300 + i * 180, right: -150 - i * 90, bottom: -150 - i * 90 }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 5, repeat: Infinity, delay: i * 0.8 }}
          />
        ))}
        <Logo />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative">
          <h1 className="max-w-md text-5xl font-bold leading-tight tracking-tight">Mais contexto.<br /><span className="text-gold">Melhores conversas.</span></h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">Inteligência aplicada ao relacionamento entre assessores e investidores.</p>
        </motion.div>
        <div className="relative text-xs tracking-widest text-white/45">PROTÓTIPO DE HACKATHON • OUTUBRO 2026</div>
      </div>
      <div className="grid flex-1 place-items-center p-6">
        <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="w-full max-w-md">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Acesso à demonstração</p>
          <h2 className="mt-2 text-[28px] font-bold tracking-tight">Bem-vindo ao Advisor Copilot</h2>
          <p className="mt-1 text-sm text-slate-500">Entre para explorar os fluxos com informações fictícias.</p>
          <label className="mt-6 block text-xs font-bold">E-mail<input type="email" defaultValue="assessor@demo.com" required className={field} /></label>
          <label className="mt-5 block text-xs font-bold">Senha<input type="password" defaultValue="demonstracao" required className={field} /></label>
          <Button variant="primary" type="submit" className="mt-7 h-12 w-full text-sm">Entrar na plataforma <ArrowRight className="h-4 w-4" /></Button>
          <p className="mt-3 text-xs text-slate-500">Acesso demonstrativo. Nenhuma credencial é validada por servidor.</p>
        </motion.form>
      </div>
    </div>
  );
}
