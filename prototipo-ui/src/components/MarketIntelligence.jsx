import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Clock, Info, Newspaper, RefreshCw, Users } from "lucide-react";

// Contrato do futuro coletor (backend): GET /news.json
// { updatedAt, items: [{ id, title, summary, source, url, publishedAt, topics, clientIds, period? }] }
// O front não faz scraping. Enquanto o feed não existir, exibe os exemplos abaixo
// sempre sinalizados como fictícios — nunca como notícias verificadas.
export const demoNews = [
  { id: "demo1", title: "Cenário ilustrativo: possível mudança na trajetória dos juros", summary: "Exemplo de resumo: a expectativa para a taxa básica pode afetar a precificação de títulos de renda fixa. O assessor deve conferir o dado em fonte primária antes de agir.", source: "Exemplo de fonte: Banco Central / Valor Econômico", url: "", publishedAt: "2026-10-10T09:00:00-03:00", topics: ["Juros", "Renda fixa"], clientIds: [1, 2, 5], period: "day" },
  { id: "demo2", title: "Cenário ilustrativo: volatilidade nas bolsas internacionais", summary: "Exemplo de resumo: movimentos no exterior podem alterar o apetite por risco e exigir acompanhamento de carteiras com maior exposição à renda variável.", source: "Exemplo de fonte: Reuters / InfoMoney", url: "", publishedAt: "2026-10-10T08:15:00-03:00", topics: ["Bolsa", "Internacional"], clientIds: [3, 4, 6], period: "day" },
  { id: "demo3", title: "Cenário ilustrativo: atenção ao mercado de crédito privado", summary: "Exemplo de resumo: mudanças de spreads e liquidez são relevantes para avaliar exposição e concentração em crédito privado.", source: "Exemplo de fonte: Valor Econômico / Exame", url: "", publishedAt: "2026-10-10T07:30:00-03:00", topics: ["Crédito privado", "Risco"], clientIds: [1, 2, 6], period: "day" },
  { id: "demo4", title: "Semana ilustrativa: tendências da renda fixa", summary: "Exemplo de panorama semanal: comparar curva de juros, inflação esperada e impacto potencial da marcação a mercado, sem antecipar recomendação.", source: "Exemplo de fonte: Banco Central / InfoMoney", url: "", publishedAt: "2026-10-09T11:00:00-03:00", topics: ["Renda fixa", "Juros"], clientIds: [1, 2, 5], period: "week" },
  { id: "demo5", title: "Semana ilustrativa: desempenho dos principais índices", summary: "Exemplo de panorama semanal: apresentar a evolução de índices, câmbio e setores para contextualizar conversas com investidores.", source: "Exemplo de fonte: Reuters / Valor Econômico", url: "", publishedAt: "2026-10-08T15:00:00-03:00", topics: ["Bolsa", "Câmbio"], clientIds: [3, 4, 6], period: "week" },
  { id: "demo6", title: "Semana ilustrativa: indicadores macroeconômicos", summary: "Exemplo de panorama semanal: reunir divulgação de inflação, atividade e cenário externo com possíveis consequências para diferentes classes de ativos.", source: "Exemplo de fonte: IBGE / Banco Central / Exame", url: "", publishedAt: "2026-10-07T10:00:00-03:00", topics: ["Macroeconomia", "Inflação"], clientIds: [1, 2, 3, 4, 5, 6], period: "week" },
];

const PERIODS = [
  { id: "day", label: "Hoje" },
  { id: "week", label: "Semana" },
];

const COPY = {
  dashboard: { title: "Inteligência de mercado", description: "Resumo dos principais acontecimentos para apoiar o assessor" },
  clients: { title: "Notícias relevantes para os clientes", description: "Conteúdo relacionado aos perfis exibidos na listagem" },
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatNewsDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Sem data" : dateFormatter.format(d);
}

// Usa o período informado pelo coletor; sem ele, classifica pela idade da notícia.
export function newsPeriodFromDate(item) {
  if (item.period === "day" || item.period === "week") return item.period;
  const t = Date.parse(item.publishedAt);
  if (!Number.isFinite(t)) return "week";
  return Date.now() - t < 24 * 60 * 60 * 1000 ? "day" : "week";
}

function normalizeFeed(payload) {
  if (!payload || !Array.isArray(payload.items)) throw new Error("Formato inválido");
  return payload.items
    .filter((n) => n && typeof n.title === "string" && typeof n.summary === "string" && typeof n.source === "string")
    .map((n) => ({
      id: String(n.id || n.title),
      title: n.title,
      summary: n.summary,
      source: n.source,
      url: typeof n.url === "string" ? n.url : "",
      publishedAt: n.publishedAt || "",
      topics: Array.isArray(n.topics) ? n.topics : [],
      clientIds: Array.isArray(n.clientIds) ? n.clientIds.map(Number) : [],
      period: n.period,
    }));
}

const isSafeUrl = (url) => /^https?:\/\//i.test(url || "");

function PeriodTabs({ value, onChange, layoutId }) {
  return (
    <div role="tablist" aria-label="Período das notícias" className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
      {PERIODS.map((p) => {
        const selected = value === p.id;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(p.id)}
            className={`relative rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              selected ? "text-on-primary" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-md bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FeedStatus({ isDemo, updatedAt }) {
  if (isDemo) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          <strong className="font-semibold">Exemplos fictícios — não são notícias reais.</strong> Substitua pelo feed coletado e validado no backend.
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
      <p>
        Feed integrado • {updatedAt ? `Atualizado em ${formatNewsDate(updatedAt)}` : "Sem horário de atualização"} · Fontes e horários devem ser conferidos.
      </p>
    </div>
  );
}

function NewsCard({ item, relatedCount, contextLabel }) {
  const topic = item.topics?.[0] || "Mercado";
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group flex min-w-0 flex-col rounded-xl border border-slate-200 bg-surface p-5 transition-shadow hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{topic}</span>
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" aria-hidden />
          <time dateTime={item.publishedAt}>{formatNewsDate(item.publishedAt)}</time>
        </span>
      </div>

      <h3 className="mt-3 text-[15px] font-semibold leading-snug text-slate-900">{item.title}</h3>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500" title={item.summary}>
        {item.summary}
      </p>

      <div className="mb-4 mt-4 flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700">
        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {item.clientIds?.length ? `Relacionada a ${relatedCount} cliente(s) ${contextLabel}` : "Notícia geral"}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <span className="min-w-0 truncate text-xs text-slate-400" title={item.source}>
          {item.source}
        </span>
        {isSafeUrl(item.url) && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
          >
            Ler fonte <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
    </motion.article>
  );
}

/**
 * Painel de notícias e inteligência de mercado.
 * @param {"dashboard"|"clients"} location  Muda título e regra de filtragem.
 * @param {{id:number}[]} [visibleClients]   Clientes visíveis; em "clients", só mostra notícias ligadas a eles.
 * @param {string} [feedUrl]                 Endpoint do feed; se falhar, exibe os exemplos fictícios.
 */
export default function MarketIntelligence({ location = "dashboard", visibleClients, feedUrl = "./news.json" }) {
  const [period, setPeriod] = useState("day");
  const [feed, setFeed] = useState({ items: demoNews, source: "demo", updatedAt: null });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const tabsLayoutId = `news-tab-${useId()}`;

  const loadFeed = useCallback(
    async (announce) => {
      setLoading(true);
      try {
        const res = await fetch(feedUrl, { cache: "no-store" });
        if (!res.ok) throw new Error("Feed indisponível");
        const payload = await res.json();
        setFeed({ items: normalizeFeed(payload), source: "api", updatedAt: payload.updatedAt || null });
        if (announce) setStatus("Feed de notícias atualizado");
      } catch {
        if (announce) setStatus("Feed não disponível. Exibindo exemplos fictícios.");
      } finally {
        setLoading(false);
      }
    },
    [feedUrl]
  );

  useEffect(() => {
    loadFeed(false);
  }, [loadFeed]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 3200);
    return () => clearTimeout(t);
  }, [status]);

  const visibleIds = useMemo(() => (visibleClients ? new Set(visibleClients.map((c) => Number(c.id))) : null), [visibleClients]);

  const list = useMemo(
    () =>
      feed.items
        .filter((n) => newsPeriodFromDate(n) === period)
        .filter((n) => location !== "clients" || !visibleIds || !n.clientIds?.length || n.clientIds.some((id) => visibleIds.has(Number(id))))
        .slice(0, 6),
    [feed.items, period, location, visibleIds]
  );

  const relatedCount = (n) => (visibleIds ? n.clientIds.filter((id) => visibleIds.has(Number(id))).length : n.clientIds.length);
  const contextLabel = location === "clients" ? "da seleção" : "da carteira";
  const copy = COPY[location] || COPY.dashboard;

  return (
    <MotionConfig reducedMotion="user">
      <section className="rounded-2xl border border-slate-200 bg-surface p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy text-gold">
              <Newspaper className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">{copy.title}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{copy.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PeriodTabs value={period} onChange={setPeriod} layoutId={tabsLayoutId} />
            <button
              onClick={() => loadFeed(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
              {loading ? "Atualizando…" : "Atualizar notícias"}
            </button>
          </div>
        </header>

        <div className="mt-4">
          <FeedStatus isDemo={feed.source === "demo"} updatedAt={feed.updatedAt} />
        </div>

        <div aria-live="polite" className="min-h-0">
          <AnimatePresence>
            {status && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 text-xs font-medium text-slate-600"
              >
                {status}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <motion.div layout className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((n) => (
              <NewsCard key={n.id} item={n} relatedCount={relatedCount(n)} contextLabel={contextLabel} />
            ))}
          </AnimatePresence>
          {!list.length && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
              Não há notícias disponíveis para este período ou seleção.
            </div>
          )}
        </motion.div>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          Monitoramento informativo. Notícias não representam recomendação de investimento; o assessor deve verificar fonte, data, impacto e adequação ao cliente.
        </p>
      </section>
    </MotionConfig>
  );
}
