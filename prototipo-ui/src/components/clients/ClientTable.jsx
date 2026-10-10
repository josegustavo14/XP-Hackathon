import { AnimatePresence } from "framer-motion";
import { clientById, money } from "../../data/mock.js";
import { useStore } from "../../lib/store.js";
import { AnimatedRow, Badge, Empty, LinkButton, MobileList, MobileRow, TableWrap, Td, Th } from "../ui";

export function ClientLink({ id }) {
  const { go } = useStore();
  return <LinkButton onClick={() => go("profile", id)}>{clientById(id).name}</LinkButton>;
}

export function ClientTable({ rows }) {
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
