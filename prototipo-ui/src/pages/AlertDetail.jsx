import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FileText, RotateCcw, Sparkles } from "lucide-react";
import { clientById, money } from "../data/mock.js";
import { useBackLink } from "../hooks/useBackLink.js";
import { bySeverity } from "../lib/alerts.js";
import { useStore } from "../lib/store.js";
import { Badge, Button, Card, Helper, PageTitle, SectionHead, severityTone, useToast } from "../components/ui";

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
              <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 rounded-2xl border border-slate-200 bg-emerald-50 p-4">
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
