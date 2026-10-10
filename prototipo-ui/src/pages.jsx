import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, Building2, CalendarClock, Copy, Database, FileText, Landmark,
  RotateCcw, Search, Send, ShieldCheck, Sparkles, Trash2, TrendingUp, Users, Wallet,
} from "lucide-react";
import { useStore } from "./store.js";
import {
  AnimatedRow, Badge, Button, Card, CountUp, Empty, Helper, LinkButton, Metric, MobileList, MobileRow, PageTitle, SectionHead,
  TableWrap, Td, Th, severityTone, useToast,
} from "./ui.jsx";
import { ColumnChart, DonutChart, HBarList } from "./charts.jsx";
import MarketIntelligence from "./components/MarketIntelligence.jsx";
import { ChatThread, CopilotMark, SUGGESTIONS } from "./chat.jsx";
import {
  assetClasses, clientById, clients, dataSources, followUpSeries, institutions, money, riskProfiles,
} from "./data.js";

const TODAY = new Date(2026, 9, 10);
const parseBR = (s) => {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
};
const daysUntil = (s) => Math.round((parseBR(s) - TODAY) / 86400000);
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
                <div className="mt-1 text-slate-400">{x.date}</div>
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
                  <div className="mt-1 text-slate-400">{x.city}</div>
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric label="Clientes sob gestão" value={128} foot="6 perfis disponíveis na demonstração" icon={Users} />
        <Metric label="Precisam de atenção" value={new Set(open.map((x) => x.cid)).size} foot="Com alertas em aberto" icon={AlertTriangle} accent="text-amber-600" />
        <Metric label="Alertas em aberto" value={open.length} foot="Priorizados por gravidade" icon={Bell} accent="text-red-500" />
        <Metric label="Patrimônio exibido" value={total} format={(n) => money(Math.round(n))} foot="Base fictícia dos perfis" icon={Wallet} accent="text-emerald-600" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
        <Card>
          <SectionHead title="Prioridades de atendimento" subtitle="Alertas identificados na base de demonstração" action={<Button onClick={() => go("alerts")}>Ver todos</Button>} />
          <AlertTable compact rows={open.slice(0, 4)} />
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
                  <span className="text-[10px] text-slate-400">patrimônio somado</span>
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
          <p className="mt-3 text-[11px] text-slate-400">Gráfico demonstrativo, sem representação de resultados reais.</p>
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
          title={<>Lista de clientes <span className="text-sm font-normal text-slate-400">(<CountUp key={found.length} value={found.length} duration={0.4} />)</span></>}
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

export function Profile() {
  const { params, go, alerts, notes, addNote } = useStore();
  const toast = useToast();
  const x = clientById(params);
  const [tab, setTab] = useState("overview");
  const clientAlerts = alerts.filter((a) => a.cid === x.id);
  const timeline = notes.filter((n) => n.cid === x.id);

  function save(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    addNote({ cid: x.id, type: f.get("type"), date: String(f.get("date")).split("-").reverse().join("/"), text: f.get("text"), next: f.get("next") });
    setTab("memory");
    toast("Interação registrada com sucesso");
  }

  const input = "h-11 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <>
      <PageTitle
        kicker="Relacionamento / Cliente"
        title={x.name}
        lead={`${x.city} • Perfil ${x.risk} • ${x.inst} instituições`}
        action={<Button onClick={() => go("clients")}><ArrowLeft className="h-3.5 w-3.5" /> Voltar aos clientes</Button>}
      />
      <div className="mb-5 border-b border-slate-200 pb-3">
        <PillTabs layoutId="profile-tab" value={tab} onChange={setTab} tabs={[["overview", "Visão geral"], ["portfolio", "Carteira"], ["memory", "Histórico"], ["note", "Registrar interação"]]} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Metric label="Patrimônio consolidado" value={x.wealth} format={(n) => money(Math.round(n))} foot={`${x.inst} instituições simuladas`} icon={Wallet} accent="text-emerald-600" />
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
                  <Button variant="primary" onClick={() => go("briefing", x.id)}><Sparkles className="h-3.5 w-3.5" /> Gerar briefing</Button>
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
                <SectionHead title="Linha do tempo" action={<Button variant="primary" onClick={() => setTab("note")}>Novo registro</Button>} />
                <ol className="relative ml-1.5 border-l-2 border-slate-100">
                  {timeline.map((n, i) => (
                    <motion.li key={`${n.date}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="relative py-3.5 pl-7">
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 + i * 0.08, type: "spring" }} className="absolute -left-[7px] top-5 h-3 w-3 rounded-full bg-gold ring-4 ring-surface" />
                      <small className="text-slate-400">{n.date} • {n.type}</small>
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

          {tab === "note" && (
            <Card className="max-w-3xl">
              <SectionHead title="Registrar atendimento" subtitle="Este registro ficará disponível na linha do tempo deste cliente." />
              <form onSubmit={save} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Tipo de interação
                    <select name="type" className={`${input} mt-1.5`}>
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
                  <textarea name="next" placeholder="O que deve ser acompanhado?" className={`${input} mt-1.5 h-auto min-h-28 py-3`} />
                </label>
                <Button variant="primary" type="submit">Salvar registro</Button>
              </form>
            </Card>
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
  const rows = alerts.filter((x) => (type === "Todos" || x.type === type) && (severity === "Todas" || x.severity === severity));
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
          subtitle={`${rows.length} de ${alerts.length} alertas`}
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
  const { params, alerts, go, toggleAlert } = useStore();
  const toast = useToast();
  const x = alerts.find((a) => a.id === +params) || alerts[0];
  const cl = clientById(x.cid);

  return (
    <>
      <PageTitle kicker="Monitoramento / Detalhe do alerta" title={x.title} lead="Analise evidências e decida como acompanhar a situação." action={<Button onClick={() => go("alerts")}><ArrowLeft className="h-3.5 w-3.5" /> Voltar à central</Button>} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone={severityTone(x.severity)}>{x.severity} prioridade</Badge>
            <Badge>{x.type}</Badge>
            <motion.span key={x.status} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <Badge tone={x.status === "Analisado" ? "green" : "neutral"}>{x.status}</Badge>
            </motion.span>
          </div>
          <h2 className="mt-7 text-lg font-semibold">O que foi identificado</h2>
          <p className="mt-2 text-sm leading-loose text-slate-600">{x.description}</p>
          <h2 className="mt-7 text-lg font-semibold">Dados utilizados</h2>
          <p className="mb-4 mt-2 text-sm text-slate-500">{x.source}</p>
          <Helper>O alerta serve como apoio à análise. Qualquer orientação financeira depende da avaliação do assessor, perfil do cliente e regras aplicáveis.</Helper>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => go("profile", x.cid)}>Abrir cliente</Button>
            <Button onClick={() => { toggleAlert(x.id); toast("Status do alerta atualizado"); }}>
              {x.status === "Pendente" ? "Marcar como analisado" : "Reabrir alerta"}
            </Button>
          </div>
        </Card>
        <Card>
          <SectionHead title="Cliente relacionado" />
          <div className="text-[22px] font-bold">{cl.name}</div>
          <p className="text-sm text-slate-500">{cl.risk} • {cl.city}</p>
          <dl className="mt-7 grid grid-cols-2 gap-4">
            <div><dt className="text-[11px] text-slate-500">Patrimônio</dt><dd className="text-sm font-bold">{money(cl.wealth)}</dd></div>
            <div><dt className="text-[11px] text-slate-500">Data do alerta</dt><dd className="text-sm font-bold">{x.date}</dd></div>
          </dl>
          <Button className="mt-6" onClick={() => go("briefing", x.cid)}>Preparar briefing</Button>
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
          <SectionHead title="Conversa com o assistente" subtitle="Respostas produzidas para a base fictícia" action={<Badge tone="gold">Demonstração</Badge>} />
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
            {SUGGESTIONS.map((q) => (
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
  return (
    <>
      <PageTitle kicker="Preparação de reuniões" title="Briefings inteligentes" lead="Resumos de clientes e pautas de atendimento para revisão humana." />
      <Card>
        <SectionHead title="Próximos atendimentos" />
        <MobileList>
          {clients.map((x, i) => (
            <MobileRow key={x.id} index={i} onClick={() => go("briefing", x.id)}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-semibold text-slate-900">{x.name}</span>
                <span className="shrink-0 text-xs text-slate-500">{x.contact.slice(0, 5)} · em {daysUntil(x.contact)} dias</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{x.objective}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-800"><FileText className="h-3.5 w-3.5" /> Gerar briefing</span>
            </MobileRow>
          ))}
        </MobileList>
        <TableWrap desktopOnly>
          <thead><tr><Th>Cliente</Th><Th>Data prevista</Th><Th>Objetivo</Th><Th /></tr></thead>
          <tbody>
            {clients.map((x, i) => (
              <AnimatedRow key={x.id} index={i}>
                <Td><ClientLink id={x.id} /></Td>
                <Td>{x.contact} <span className="text-slate-400">· em {daysUntil(x.contact)} dias</span></Td>
                <Td className="whitespace-normal">{x.objective}</Td>
                <Td><Button variant="primary" onClick={() => go("briefing", x.id)}><FileText className="h-3.5 w-3.5" /> Gerar briefing</Button></Td>
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
  const toast = useToast();
  const x = clientById(params);
  const [phase, setPhase] = useState("idle");
  const ref = useRef(null);
  const related = alerts.filter((a) => a.cid === x.id);
  const last = notes.find((n) => n.cid === x.id);

  function generate() {
    setPhase("loading");
    setTimeout(() => setPhase("ready"), 1100);
  }
  function copy() {
    navigator.clipboard.writeText(ref.current?.innerText || "").then(() => toast("Briefing copiado")).catch(() => toast("Não foi possível copiar"));
  }

  const sections = [
    ["1. Resumo executivo", <p key="p">{x.name} tem perfil {x.risk.toLowerCase()}, patrimônio fictício de {money(x.wealth)} e objetivo principal de {x.objective.toLowerCase()}. A carteira contempla {x.inst} instituições simuladas.</p>],
    ["2. Pontos de atenção", <ul key="u" className="list-disc pl-5">{related.length ? related.map((a) => <li key={a.id}>{a.title} — prioridade {a.severity.toLowerCase()}.</li>) : <li>Nenhum alerta registrado para este perfil.</li>}</ul>],
    ["3. Histórico relevante", <p key="p">{last ? last.text : "Ainda não há registros de atendimento para este cliente."}</p>],
    ["4. Perguntas sugeridas", <ul key="u" className="list-disc pl-5"><li>Seus objetivos financeiros continuam os mesmos?</li><li>Houve mudanças na necessidade de liquidez?</li><li>Como você avalia sua carteira atual em relação aos seus planos?</li></ul>],
    ["5. Próximos passos", <p key="p">Revisar as informações, conversar com o cliente e registrar decisões após o atendimento.</p>],
  ];

  return (
    <>
      <PageTitle kicker="Inteligência / Briefing" title={`Briefing — ${x.name}`} lead="Resumo contextualizado para apoiar o próximo atendimento." action={<Button onClick={() => go("briefings")}><ArrowLeft className="h-3.5 w-3.5" /> Todos os briefings</Button>} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
        <Card>
          <SectionHead title="Preparação da reunião" action={<Badge tone="gold">Revisão obrigatória</Badge>} />
          {phase === "idle" && (
            <>
              <p className="mb-4 text-sm text-slate-500">Gere uma pauta considerando cadastro, investimentos e histórico do cliente.</p>
              <Button variant="primary" onClick={generate}><Sparkles className="h-3.5 w-3.5" /> Gerar briefing</Button>
            </>
          )}
          {phase === "loading" && (
            <div className="space-y-3" aria-label="Gerando briefing">
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
                <Button onClick={() => setPhase("idle")}><RotateCcw className="h-3.5 w-3.5" /> Regenerar</Button>
              </div>
            </>
          )}
        </Card>
        <Card>
          <SectionHead title="Fontes consideradas" />
          <ul className="mb-4 space-y-2 text-sm text-slate-500">
            <li>Dados cadastrais • {x.contact}</li>
            <li>Carteira simulada • 09/10/2026</li>
            <li>Alertas associados • {related.length}</li>
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
  const { go } = useStore();
  return (
    <>
      <PageTitle kicker="Governança / Integrações" title="Fontes e qualidade dos dados" lead="Identificação das origens e do status de cada integração." action={<Button onClick={() => go("finance")}><ArrowLeft className="h-3.5 w-3.5" /> Dados integrados</Button>} />
      <Card>
        <TableWrap>
          <thead><tr><Th>Fonte</Th><Th>Tipo</Th><Th>Atualização</Th><Th>Status</Th></tr></thead>
          <tbody>
            {dataSources.map((r, i) => (
              <AnimatedRow key={r[0]} index={i}>
                <Td><span className="inline-flex items-center gap-2 font-semibold text-slate-800"><Building2 className="h-3.5 w-3.5 text-slate-400" />{r[0]}</span></Td>
                <Td>{r[1]}</Td>
                <Td>{r[2]}</Td>
                <Td><Badge tone="gold">Demonstrativo</Badge></Td>
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
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Acesso à demonstração</p>
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
