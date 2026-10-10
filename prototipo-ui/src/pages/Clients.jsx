import { useState, useMemo } from "react";
import { AlertTriangle, Search } from "lucide-react";
import MarketIntelligence from "../components/market/MarketIntelligence.jsx";
import { clients, riskProfiles } from "../data/mock.js";
import { useStore } from "../lib/store.js";
import { ClientTable } from "../components/clients/ClientTable.jsx";
import { Card, CountUp, PageTitle, SectionHead, Select } from "../components/ui";

const filterClients = (query, risk) =>
  clients.filter((x) => x.name.toLowerCase().includes(query.toLowerCase()) && (risk === "Todos" || x.risk === risk));

export function ClientsPage() {
  const { params, alerts } = useStore();
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState(params?.risk || "Todos");
  const [attention, setAttention] = useState(!!params?.attention);
  const flagged = useMemo(() => new Set(alerts.filter((a) => a.status === "Pendente").map((a) => a.cid)), [alerts]);
  const found = useMemo(() => filterClients(query, risk).filter((c) => !attention || flagged.has(c.id)), [query, risk, attention, flagged]);

  return (
    <>
      <PageTitle kicker="Base de clientes" title="Clientes" lead="Pesquise e acompanhe seus clientes em um único lugar." />
      <Card>
        <SectionHead
          title={<>Lista de clientes <span className="text-sm font-normal text-slate-500">(<CountUp key={found.length} value={found.length} duration={0.4} />)</span></>}
          action={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <label className="relative min-w-0 basis-full sm:basis-auto sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="h-10 w-full sm:w-56 rounded-full border border-slate-200 bg-surface pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <Select label="Perfil de risco" value={risk} onChange={setRisk} options={["Todos", ...riskProfiles]} />
              <button
                onClick={() => setAttention((v) => !v)}
                aria-pressed={attention}
                className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors ${attention ? "border-transparent bg-primary text-on-primary" : "border-slate-200 bg-surface text-slate-600 hover:border-slate-300"}`}
              >
                <AlertTriangle className={`h-3.5 w-3.5 ${attention ? "" : "text-amber-600"}`} /> Com alertas ({flagged.size})
              </button>
            </div>
          }
        />
        <ClientTable rows={found} />
      </Card>
      <div className="mt-5">
        <MarketIntelligence location="clients" visibleClients={found} />
      </div>
    </>
  );
}
