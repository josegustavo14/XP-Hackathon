import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, MessageSquarePlus, RotateCcw, Sparkles } from "lucide-react";
import { clientById, money } from "../data/mock.js";
import { useBackLink } from "../hooks/useBackLink.js";
import { useStore } from "../lib/store.js";
import { NoteSheet } from "../components/clients/NoteSheet.jsx";
import { Badge, Button, Card, Helper, PageTitle, SectionHead, useToast } from "../components/ui";

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
