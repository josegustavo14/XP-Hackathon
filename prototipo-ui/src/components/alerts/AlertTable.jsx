import { AnimatePresence } from "framer-motion";
import { clientById } from "../../data/mock.js";
import { useStore } from "../../lib/store.js";
import { ClientLink } from "../clients/ClientTable.jsx";
import { AnimatedRow, Badge, Empty, LinkButton, MobileList, MobileRow, severityTone, TableWrap, Td, Th } from "../ui";

export function AlertTable({ rows, compact = false }) {
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
