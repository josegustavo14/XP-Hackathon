import { FileText } from "lucide-react";
import { daysUntil } from "../lib/dates.js";
import { useStore } from "../lib/store.js";
import { ClientLink } from "../components/clients/ClientTable.jsx";
import { AnimatedRow, Badge, Button, Card, MobileList, MobileRow, PageTitle, SectionHead, TableWrap, Td, Th } from "../components/ui";
import { clients } from "../data/mock.js";

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
