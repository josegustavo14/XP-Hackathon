import { useState } from "react";
import { AlertTriangle, Bell, CalendarClock, TrendingUp } from "lucide-react";
import { bySeverity } from "../lib/alerts.js";
import { useStore } from "../lib/store.js";
import { AlertTable } from "../components/alerts/AlertTable.jsx";
import { Card, Metric, PageTitle, PillTabs, SectionHead, Select } from "../components/ui";

export function AlertsPage() {
  const { alerts, params } = useStore();
  const [type, setType] = useState("Todos");
  const [severity, setSeverity] = useState("Todas");
  const [status, setStatus] = useState(params?.status || "all");
  const rows = alerts
    .filter((x) => (type === "Todos" || x.type === type) && (severity === "Todas" || x.severity === severity) && (status === "all" || x.status === status))
    .sort((a, b) => (a.status === "Pendente" ? 0 : 1) - (b.status === "Pendente" ? 0 : 1) || bySeverity(a, b));
  const pending = alerts.filter((x) => x.status === "Pendente");
  const done = alerts.length - pending.length;

  // Os cards do topo aplicam o filtro correspondente na fila.
  function show(next) {
    setType(next.type || "Todos");
    setSeverity(next.severity || "Todas");
    setStatus(next.status || "all");
    document.getElementById("fila-alertas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const is = (t, sv, st) => type === t && severity === sv && status === st;

  return (
    <>
      <PageTitle kicker="Monitoramento inteligente" title="Riscos e oportunidades" lead="Alertas calculados com regras demonstrativas e revisados pelo assessor." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric onClick={() => show({ status: "Pendente" })} active={is("Todos", "Todas", "Pendente")} label="Em aberto" value={pending.length} foot="Pendentes de avaliação" icon={Bell} />
        <Metric onClick={() => show({ status: "Pendente", severity: "Alta" })} active={is("Todos", "Alta", "Pendente")} label="Alta prioridade" value={pending.filter((x) => x.severity === "Alta").length} foot="Requerem acompanhamento" icon={AlertTriangle} accent="text-red-500" />
        <Metric onClick={() => show({ type: "Vencimento" })} active={is("Vencimento", "Todas", "all")} label="Vencimentos" value={alerts.filter((x) => x.type === "Vencimento").length} foot="Monitorados pela plataforma" icon={CalendarClock} />
        <Metric onClick={() => show({ type: "Oportunidade" })} active={is("Oportunidade", "Todas", "all")} label="Oportunidades" value={alerts.filter((x) => x.type === "Oportunidade").length} foot="Sujeitas à adequação" icon={TrendingUp} accent="text-emerald-600" />
      </div>
      <Card className="mt-5 scroll-mt-24" id="fila-alertas">
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
        <PillTabs
          layoutId="alert-status"
          value={status}
          onChange={setStatus}
          className="mb-3"
          tabs={[["Pendente", `Pendentes (${pending.length})`], ["Analisado", `Analisados (${done})`], ["all", "Todos"]]}
        />
        <AlertTable rows={rows} />
      </Card>
    </>
  );
}
