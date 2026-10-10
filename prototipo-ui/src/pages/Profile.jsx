import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, MessageSquarePlus, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { DonutChart, HBarList } from "../components/charts.jsx";
import { assetClasses, clientById, institutions, money } from "../data/mock.js";
import { useBackLink } from "../hooks/useBackLink.js";
import { useStore } from "../lib/store.js";
import { AlertTable } from "../components/alerts/AlertTable.jsx";
import { NoteSheet } from "../components/clients/NoteSheet.jsx";
import { Button, Card, CountUp, Empty, Helper, Metric, PageTitle, PillTabs, SectionHead } from "../components/ui";

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
