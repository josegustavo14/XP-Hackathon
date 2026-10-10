import { CalendarClock, Database, Landmark, Wallet } from "lucide-react";
import { HBarList } from "../components/charts.jsx";
import { clients, institutions, money } from "../data/mock.js";
import { useStore } from "../lib/store.js";
import { ClientTable } from "../components/clients/ClientTable.jsx";
import { Button, Card, Helper, Metric, PageTitle, SectionHead } from "../components/ui";

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
