import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bell, CornerDownLeft, FileText, LayoutDashboard, Search, Sparkles, User } from "lucide-react";
import { useStore } from "../../lib/store.js";
import { Badge, severityTone } from "../ui";
import { clientById, clients, money } from "../../data/mock.js";

// Busca global: clientes, alertas e telas, com atalho para perguntar ao copiloto.
// Abre pelo campo do header ou por Ctrl/⌘ + K.

const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const PAGES = [
  ["dashboard", "Visão geral"],
  ["clients", "Clientes"],
  ["alerts", "Alertas e oportunidades"],
  ["copilot", "Copiloto IA"],
  ["briefings", "Briefings"],
  ["finance", "Dados integrados"],
  ["sources", "Fontes de dados"],
  ["settings", "Configurações"],
];

function buildResults(query, alerts) {
  const q = norm(query.trim());
  const pending = alerts.filter((a) => a.status === "Pendente");
  if (!q) {
    return [
      { group: "Alertas pendentes", items: pending.slice(0, 3).map((a) => ({ kind: "alert", a })) },
      { group: "Clientes", items: clients.slice(0, 4).map((c) => ({ kind: "client", c })) },
    ];
  }
  const found = (...fields) => fields.some((f) => norm(String(f)).includes(q));
  const groups = [
    { group: "Clientes", items: clients.filter((c) => found(c.name, c.city, c.risk, c.objective)).map((c) => ({ kind: "client", c })) },
    { group: "Alertas", items: alerts.filter((a) => found(a.title, a.type, a.severity, clientById(a.cid).name)).map((a) => ({ kind: "alert", a })) },
    { group: "Telas", items: PAGES.filter(([, label]) => found(label)).map(([id, label]) => ({ kind: "page", id, label })) },
  ];
  return [...groups.filter((g) => g.items.length), { group: "Copiloto", items: [{ kind: "ask", text: query.trim() }] }];
}

function ResultRow({ item, active, onPick, onHover }) {
  const base = `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${active ? "bg-slate-100" : ""}`;
  const icon = "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500";
  let body;
  if (item.kind === "client") {
    const c = item.c;
    body = (
      <>
        <span className={icon}><User className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">{c.name}</span>
          <span className="block truncate text-xs text-slate-500">{c.risk} · {c.city}</span>
        </span>
        <span className="hidden shrink-0 text-xs font-semibold text-slate-600 sm:block">{money(c.wealth)}</span>
      </>
    );
  } else if (item.kind === "alert") {
    const a = item.a;
    body = (
      <>
        <span className={icon}><Bell className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">{a.title}</span>
          <span className="block truncate text-xs text-slate-500">{clientById(a.cid).name} · {a.status}</span>
        </span>
        <Badge tone={severityTone(a.severity)}>{a.severity}</Badge>
      </>
    );
  } else if (item.kind === "page") {
    body = (
      <>
        <span className={icon}>{item.id === "briefings" ? <FileText className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}</span>
        <span className="flex-1 text-sm font-semibold text-slate-900">{item.label}</span>
      </>
    );
  } else {
    body = (
      <>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-accent"><Sparkles className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
          Perguntar ao copiloto: <b className="font-semibold text-slate-900">“{item.text}”</b>
        </span>
      </>
    );
  }
  return (
    <button role="option" aria-selected={active} onClick={onPick} onMouseMove={onHover} className={base}>
      {body}
      {active && <CornerDownLeft className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" aria-hidden />}
    </button>
  );
}

export default function SearchPalette({ open, onClose }) {
  const { alerts, go, askCopilot } = useStore();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const groups = useMemo(() => buildResults(query, alerts), [query, alerts]);
  const flat = groups.flatMap((g) => g.items);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function pick(item) {
    onClose();
    if (item.kind === "client") go("profile", item.c.id);
    else if (item.kind === "alert") go("alertDetail", item.a.id);
    else if (item.kind === "page") go(item.id);
    else askCopilot(item.text);
  }

  function onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[index]) {
      e.preventDefault();
      pick(flat[index]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  let n = -1;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-start justify-center sm:px-4 sm:pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-label="Buscar"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="relative flex h-dvh w-full flex-col overflow-hidden bg-surface shadow-2xl shadow-black/30 sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-slate-200"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 sm:px-4">
              <button onClick={onClose} aria-label="Fechar busca" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 sm:hidden">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Search className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Buscar clientes, alertas ou telas..."
                role="combobox"
                aria-expanded="true"
                aria-controls="search-results"
                className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <kbd className="font-sans hidden rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:block">Esc</kbd>
            </div>

            <div ref={listRef} id="search-results" role="listbox" className="flex-1 overflow-y-auto overscroll-contain p-2">
              {groups.map((g) => (
                <div key={g.group} className="mb-1">
                  <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{g.group}</p>
                  {g.items.map((item) => {
                    n += 1;
                    const i = n;
                    return <ResultRow key={`${g.group}-${i}`} item={item} active={i === index} onPick={() => pick(item)} onHover={() => setIndex(i)} />;
                  })}
                </div>
              ))}
            </div>

            <div className="hidden items-center gap-4 border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-500 sm:flex">
              <span><kbd className="font-sans font-semibold">↑↓</kbd> navegar</span>
              <span><kbd className="font-sans font-semibold">Enter</kbd> abrir</span>
              <span><kbd className="font-sans font-semibold">Ctrl K</kbd> buscar de qualquer tela</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
