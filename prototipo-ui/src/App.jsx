import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Bell, Database, FileText, LayoutDashboard, Menu, Search, Settings as SettingsIcon, Sparkles, Users, X } from "lucide-react";
import { StoreContext, loadJSON, saveJSON } from "./store.js";
import { ThemeToggle, ToastProvider } from "./ui.jsx";
import { defaultAlerts, defaultNotes } from "./data.js";
import { copilotResponse } from "./copilot.js";
import CopilotWidget from "./CopilotWidget.jsx";
import SearchPalette from "./SearchPalette.jsx";
import {
  AlertDetail, AlertsPage, Briefing, Briefings, ClientsPage, Copilot, Dashboard, Finance, Login, Logo, Profile, Settings, Sources,
} from "./pages.jsx";

const NAV = [
  ["dashboard", LayoutDashboard, "Visão geral"],
  ["clients", Users, "Clientes"],
  ["alerts", Bell, "Alertas e oportunidades"],
  ["copilot", Sparkles, "Copiloto IA"],
  ["briefings", FileText, "Briefings"],
  ["finance", Database, "Dados integrados"],
  ["settings", SettingsIcon, "Configurações"],
];

const PAGES = { dashboard: Dashboard, clients: ClientsPage, profile: Profile, alerts: AlertsPage, alertDetail: AlertDetail, copilot: Copilot, briefings: Briefings, briefing: Briefing, finance: Finance, sources: Sources, settings: Settings };
// Atalhos da barra inferior no celular; o copiloto fica no centro.
const BOTTOM_NAV = [
  ["dashboard", LayoutDashboard, "Início"],
  ["clients", Users, "Clientes"],
  ["copilot", Sparkles, "Copiloto"],
  ["alerts", Bell, "Alertas"],
  ["briefings", FileText, "Briefings"],
];

const PAGES_TOP = new Set(NAV.map(([id]) => id));

const PARENT = { profile: "clients", alertDetail: "alerts", briefing: "briefings", sources: "finance" };

function initialTheme() {
  try {
    const saved = localStorage.getItem("xp-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* sem persistência */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readLogin() {
  try {
    return sessionStorage.getItem("xp-login") === "1";
  } catch {
    return false;
  }
}

export default function App() {
  const [logged, setLogged] = useState(readLogin);
  const [route, setRoute] = useState({ page: "dashboard", params: null });
  const [alerts, setAlerts] = useState(() => loadJSON("xp-alerts", defaultAlerts));
  const [notes, setNotes] = useState(() => loadJSON("xp-notes", defaultNotes));
  const [chat, setChat] = useState([]);
  const [typing, setTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl/⌘ + K abre a busca de qualquer tela.
  useEffect(() => {
    if (!logged) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logged]);
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("xp-theme", theme); } catch { /* sem persistência */ }
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  // Envia uma pergunta ao copiloto (regras locais). Retorna false se não aceitou.
  const ask = useCallback(
    (text) => {
      const q = (text || "").trim();
      if (!q || typing) return false;
      setChat((c) => [...c, { who: "user", text: q }]);
      setTyping(true);
      setTimeout(() => {
        setChat((c) => [...c, { who: "bot", ...copilotResponse(q, { alerts, notes }) }]);
        setTyping(false);
      }, 900);
      return true;
    },
    [typing, alerts, notes]
  );

  useEffect(() => saveJSON("xp-alerts", alerts), [alerts]);
  useEffect(() => saveJSON("xp-notes", notes), [notes]);

  // Histórico de navegação para o "Voltar" levar à tela de origem.
  // Telas do menu principal zeram o histórico; telas de detalhe empilham.
  const [history, setHistory] = useState([]);
  const routeRef = useRef(route);
  routeRef.current = route;

  const show = useCallback((next) => {
    setRoute(next);
    setMenuOpen(false);
    setCopilotOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const go = useCallback((page, params = null) => {
    const cur = routeRef.current;
    if (cur.page === page && cur.params === params) return show(cur);
    setHistory((h) => (PAGES_TOP.has(page) ? [] : [...h.slice(-19), cur]));
    show({ page, params });
  }, [show]);

  const back = useCallback(() => {
    if (history.length) {
      show(history[history.length - 1]);
      setHistory((h) => h.slice(0, -1));
    } else {
      show({ page: PARENT[routeRef.current.page] || "dashboard", params: null });
    }
  }, [history, show]);

  const login = () => {
    try { sessionStorage.setItem("xp-login", "1"); } catch { /* sem persistência */ }
    setLogged(true);
  };

  const store = useMemo(
    () => ({
      ...route,
      go,
      back,
      prev: history[history.length - 1] || { page: PARENT[route.page] || "dashboard", params: null },
      theme,
      toggleTheme,
      alerts,
      notes,
      chat,
      setChat,
      ask,
      typing,
      copilotOpen,
      setCopilotOpen,
      // Abre o painel do copiloto já com uma pergunta (ex.: a partir de um alerta).
      askCopilot: (q) => {
        setCopilotOpen(true);
        ask(q);
      },
      toggleAlert: (id) => setAlerts((list) => list.map((a) => (a.id === id ? { ...a, status: a.status === "Pendente" ? "Analisado" : "Pendente" } : a))),
      addNote: (n) => setNotes((list) => [n, ...list]),
      resetDemo: () => {
        setAlerts(structuredClone(defaultAlerts));
        setNotes(structuredClone(defaultNotes));
      },
      logout: () => {
        try { sessionStorage.removeItem("xp-login"); } catch { /* sem persistência */ }
        setLogged(false);
        setRoute({ page: "dashboard", params: null });
        setHistory([]);
      },
    }),
    [route, go, back, history, theme, toggleTheme, alerts, notes, chat, ask, typing, copilotOpen]
  );

  const Page = PAGES[route.page] || Dashboard;
  const active = PARENT[route.page] || route.page;
  const pending = alerts.filter((a) => a.status === "Pendente").length;

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <StoreContext.Provider value={store}>
          <AnimatePresence mode="wait">
            {!logged ? (
              <motion.div key="login" exit={{ opacity: 0 }}>
                <ThemeToggle theme={theme} onToggle={toggleTheme} className="fixed right-5 top-5 z-10" />
                <Login onLogin={login} />
              </motion.div>
            ) : (
              <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-slate-50 text-slate-900">
                <AnimatePresence>
                  {menuOpen && <motion.div className="fixed inset-0 z-30 bg-black/40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} />}
                </AnimatePresence>

                <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy px-4 py-7 text-white/75 transition-transform duration-200 md:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                  <div className="flex items-start justify-between">
                    <Logo />
                    <button className="p-1 text-white/55 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X className="h-5 w-5" /></button>
                  </div>
                  <nav className="mt-11 grid gap-1">
                    {NAV.map(([id, Icon, label]) => (
                      <button key={id} onClick={() => go(id)} className={`relative flex items-center gap-3 rounded-lg px-3.5 py-3 text-left text-sm font-medium transition-colors ${active === id ? "text-white" : "text-white/55 hover:text-white"}`}>
                        {active === id && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-white/10" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
                        <Icon className={`relative h-4 w-4 ${active === id ? "text-gold" : ""}`} />
                        <span className="relative flex-1">{label}</span>
                        {id === "alerts" && pending > 0 && (
                          <motion.span key={pending} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="relative rounded-full bg-gold px-1.5 text-[10px] font-bold text-navy">{pending}</motion.span>
                        )}
                      </button>
                    ))}
                  </nav>
                  <div className="mt-auto border-t border-white/10 px-3 pt-4 text-[11px] leading-relaxed text-white/60">
                    AMBIENTE DEMONSTRATIVO<br />Dados fictícios • Sem integração real<br />Hackathon XP · 2026
                  </div>
                </aside>

                <div className="md:ml-64">
                  <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200 bg-surface/90 px-4 backdrop-blur sm:h-[75px] sm:gap-3 sm:px-9">
                    <button className="shrink-0 rounded-lg border border-slate-200 p-2.5 md:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu className="h-4 w-4" /></button>
                    <div className="flex-1" />
                    <button
                      onClick={() => setSearchOpen(true)}
                      aria-haspopup="dialog"
                      aria-label="Buscar clientes, alertas ou telas"
                      title="Buscar (Ctrl K)"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-surface text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    <ThemeToggle theme={theme} onToggle={toggleTheme} />
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">XP</div>
                  </header>

                  <main className="mx-auto max-w-[1530px] px-4 pb-28 pt-8 sm:px-9">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${route.page}-${JSON.stringify(route.params)}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22 }}
                      >
                        <Page />
                      </motion.div>
                    </AnimatePresence>
                  </main>
                </div>

                {route.page !== "copilot" && <CopilotWidget />}
                <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

                <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
                  <div className="grid h-16 grid-cols-5">
                    {BOTTOM_NAV.map(([id, Icon, label]) => {
                      const on = id === "copilot" ? copilotOpen || route.page === "copilot" : active === id && !copilotOpen;
                      if (id === "copilot") {
                        return (
                          <button
                            key={id}
                            onClick={() => (route.page === "copilot" ? null : setCopilotOpen((o) => !o))}
                            aria-label={copilotOpen ? "Fechar copiloto" : "Perguntar ao Copiloto"}
                            aria-expanded={copilotOpen}
                            className="flex flex-col items-center justify-center gap-0.5"
                          >
                            <motion.span whileTap={{ scale: 0.9 }} className="-mt-6 grid h-13 w-13 place-items-center rounded-full bg-primary text-primary-accent shadow-lg shadow-black/20 ring-4 ring-slate-50">
                              {copilotOpen ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                            </motion.span>
                            <span className={`text-[11px] font-semibold ${on ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
                          </button>
                        );
                      }
                      return (
                        <button key={id} onClick={() => go(id)} aria-current={on ? "page" : undefined} className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${on ? "text-slate-900" : "text-slate-500"}`}>
                          {on && <motion.span layoutId="bottom-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-gold" />}
                          <span className="relative">
                            <Icon className={`h-5 w-5 ${on ? "text-amber-600" : ""}`} />
                            {id === "alerts" && pending > 0 && (
                              <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white dark:text-slate-50">{pending}</span>
                            )}
                          </span>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </StoreContext.Provider>
      </ToastProvider>
    </MotionConfig>
  );
}
