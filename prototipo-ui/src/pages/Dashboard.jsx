import { useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Bell, CalendarClock, Users, Wallet } from "lucide-react";
import MarketIntelligence from "../components/market/MarketIntelligence.jsx";
import GoldFibers from "../components/backgrounds/GoldFibers.jsx";
import { ColumnChart, HBarList } from "../components/charts.jsx";
import { clientById, clients, followUpSeries, money, riskProfiles } from "../data/mock.js";
import { bySeverity } from "../lib/alerts.js";
import { daysUntil } from "../lib/dates.js";
import { useStore } from "../lib/store.js";
import { AlertTable } from "../components/alerts/AlertTable.jsx";
import { ClientLink } from "../components/clients/ClientTable.jsx";
import { Badge, Button, Card, CountUp, Metric, PageTitle, PillTabs, SectionHead, severityTone } from "../components/ui";

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

  // Indicador do carrossel no celular: acompanha o deslizar e permite pular de card.
  const track = useRef(null);
  const [page, setPage] = useState(0);
  const onScroll = useCallback(() => {
    const el = track.current;
    const item = el?.children[0];
    if (!item) return;
    setPage(Math.min(steps.length - 1, Math.round(el.scrollLeft / (item.offsetWidth + 12))));
  }, [steps.length]);
  const goTo = (i) => {
    const el = track.current;
    el?.scrollTo({ left: el.children[i].offsetLeft - el.children[0].offsetLeft, behavior: "smooth" });
  };

  return (
    <Card className="mb-5">
      <SectionHead title="Seu dia" subtitle={`${steps.length} próximos passos sugeridos a partir dos alertas e da agenda`} />
      <ol ref={track} onScroll={onScroll} className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
        <AnimatePresence initial={false} mode="popLayout">
          {steps.map((x, i) => (
            <motion.li key={x.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="flex w-[82%] shrink-0 snap-start flex-col rounded-2xl border border-slate-200 p-4 sm:w-[46%] lg:w-auto">
              <div className="flex items-center gap-2.5">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${i === 0 ? "bg-gold text-navy shadow-[0_0_18px_-4px_var(--color-gold)]" : "bg-slate-100 text-slate-700"}`}>{i + 1}</span>
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
      {steps.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 lg:hidden">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Passos do dia">
            {steps.map((x, i) => (
              <button
                key={x.key}
                role="tab"
                aria-selected={page === i}
                aria-label={`Passo ${i + 1}`}
                onClick={() => goTo(i)}
                className="grid h-6 place-items-center px-0.5"
              >
                <motion.span
                  className="block h-1.5 rounded-full"
                  animate={{ width: page === i ? 20 : 6, backgroundColor: page === i ? "var(--color-gold)" : "var(--color-slate-300)" }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              </button>
            ))}
          </div>
          <span className="text-[11px] font-medium text-slate-500">{page + 1} de {steps.length}</span>
        </div>
      )}
    </Card>
  );
}

// Esmaece o fundo de fibras em todas as bordas (horizontal e vertical).
const FADE_EDGES = {
  WebkitMaskImage: "linear-gradient(to right, transparent, black 30%, black 75%, transparent), linear-gradient(to bottom, transparent, black 25%, black 55%, transparent)",
  WebkitMaskComposite: "source-in",
  maskImage: "linear-gradient(to right, transparent, black 30%, black 75%, transparent), linear-gradient(to bottom, transparent, black 25%, black 55%, transparent)",
  maskComposite: "intersect",
};

export function Dashboard() {
  const { alerts, go, theme } = useStore();
  const [range, setRange] = useState("12m");
  const open = alerts.filter((x) => x.status === "Pendente");
  const total = clients.reduce((s, x) => s + x.wealth, 0);
  const series = range === "12m" ? followUpSeries : followUpSeries.slice(-6);
  const colors = { Conservador: "var(--color-chart-1)", Moderado: "var(--color-chart-2)", Arrojado: "var(--color-chart-3)" };

  return (
    <>
      {/* Saudação com fibras douradas (só desktop) esmaecendo para a página. */}
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-4 bottom-0 hidden w-[75%] lg:block" style={FADE_EDGES}>
          <GoldFibers scale={1.6} speed={0.16} glow={1.5} brightness={theme === "light" ? 2.6 : 1.1} />
        </div>
        <div className="relative">
          <PageTitle
            kicker="Visão geral"
            title={<><span className="font-light">Bom dia,</span> <span className="font-semibold">assessor</span></>}
            lead="Acompanhe sua base e comece pelas situações mais relevantes."
          />
        </div>
      </div>

      <NextSteps open={open} />

      <div className="grid grid-cols-3 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric compact onClick={() => go("clients")} label="Clientes na carteira" value={clients.length} foot="Amostra da demonstração" icon={Users} />
        <Metric compact onClick={() => go("clients", { attention: true })} label="Precisam de atenção" value={new Set(open.map((x) => x.cid)).size} foot="Com alertas em aberto" icon={AlertTriangle} accent="text-amber-600" />
        <Metric compact onClick={() => go("alerts", { status: "Pendente" })} label="Alertas em aberto" value={open.length} foot="Priorizados por gravidade" icon={Bell} accent="text-red-500" />
        <Metric onClick={() => go("finance")} className="order-first col-span-3 xl:order-none xl:col-span-1" label="Patrimônio sob gestão" value={total} format={(n) => money(Math.round(n))} foot={`Soma dos ${clients.length} clientes`} icon={Wallet} accent="text-emerald-600" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
        <Card>
          <SectionHead title="Prioridades de atendimento" subtitle="Pendentes, da maior para a menor gravidade" onMore={() => go("alerts")} moreLabel="Ver todos os alertas" />
          <AlertTable compact rows={[...open].sort(bySeverity).slice(0, 4)} />
        </Card>
        <Card>
          <SectionHead title="Atendimentos próximos" onMore={() => go("briefings")} moreLabel="Ver todos os briefings" />
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
                    <Badge tone="gold">
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
                  className="rounded-2xl border border-slate-200 p-3 text-left transition-colors hover:border-slate-300"
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
            action={<PillTabs layoutId="evo-range" value={range} onChange={setRange} tabs={[["6m", "6 meses"], ["12m", "12 meses"]]} className="" />}
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
