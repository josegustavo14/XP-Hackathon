import { Building2 } from "lucide-react";
import { dataSources } from "../data/mock.js";
import { useBackLink } from "../hooks/useBackLink.js";
import { AnimatedRow, Badge, Card, Helper, PageTitle, TableWrap, Td, Th } from "../components/ui";

export function Sources() {
  const backLink = useBackLink();
  return (
    <>
      <PageTitle kicker="Governança / Integrações" title="Fontes e qualidade dos dados" lead="Identificação das origens e do status de cada integração." back={backLink} />
      <Card>
        <TableWrap>
          <thead><tr><Th>Fonte</Th><Th>Tipo</Th><Th>Atualização</Th><Th>Status</Th></tr></thead>
          <tbody>
            {dataSources.map((r, i) => (
              <AnimatedRow key={r[0]} index={i}>
                <Td><span className="inline-flex items-center gap-2 font-semibold text-slate-800"><Building2 className="h-3.5 w-3.5 text-slate-400" />{r[0]}</span></Td>
                <Td>{r[1]}</Td>
                <Td>{r[2]}</Td>
                <Td><Badge>Demonstrativo</Badge></Td>
              </AnimatedRow>
            ))}
          </tbody>
        </TableWrap>
      </Card>
      <Helper className="mt-5">Uma versão de produção precisaria de consentimento quando aplicável, autorização de acesso, trilha de auditoria, retenção adequada e integração por fornecedores autorizados.</Helper>
    </>
  );
}
