import { RotateCcw } from "lucide-react";
import { useStore } from "../lib/store.js";
import { Button, Card, Helper, PageTitle, SectionHead, useToast } from "../components/ui";

export function Settings() {
  const { logout, resetDemo } = useStore();
  const toast = useToast();
  return (
    <>
      <PageTitle kicker="Administração" title="Configurações" lead="Informações sobre o ambiente de demonstração e permissões." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
        <Card>
          <SectionHead title="Conta e acesso" />
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[["Usuário", "Assessor Demo"], ["Papel", "Assessor"], ["Ambiente", "Protótipo local"], ["Dados", "Fictícios"]].map(([l, v]) => (
              <div key={l}><dt className="mb-1 text-[11px] text-slate-500">{l}</dt><dd className="text-sm font-bold">{v}</dd></div>
            ))}
          </dl>
          <Button className="mt-6" onClick={logout}>Sair da demonstração</Button>
        </Card>
        <Card>
          <SectionHead title="Privacidade e segurança" />
          <p className="mb-4 text-sm leading-relaxed text-slate-500">Este protótipo não implementa autenticação real, integração bancária, autorização de produção nem persistência remota. As anotações e estados dos alertas são armazenados apenas no navegador atual.</p>
          <Helper className="mb-4">Não utilize dados pessoais ou financeiros verdadeiros neste ambiente.</Helper>
          <Button onClick={() => { if (confirm("Restaurar os dados da demonstração?")) { resetDemo(); toast("Dados restaurados"); } }}>
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar dados fictícios
          </Button>
        </Card>
      </div>
    </>
  );
}
