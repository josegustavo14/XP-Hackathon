import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import CopilotWidget from "./components/copilot/CopilotWidget.jsx";
import SearchPalette from "./components/search/SearchPalette.jsx";
import { ThemeToggle, ToastProvider } from "./components/ui";
import { defaultAlerts, defaultNotes } from "./data/mock.js";
import { BottomNav } from "./layout/BottomNav.jsx";
import { Header } from "./layout/Header.jsx";
import { MenuSheet } from "./layout/MenuSheet.jsx";
import { PAGES_TOP, PARENT } from "./layout/navigation.js";
import { copilotResponse } from "./lib/copilot.js";
import { loadJSON, saveJSON, StoreContext } from "./lib/store.js";
import { Dashboard, Login, PAGES } from "./pages";

// Raiz do protótipo: estado global (store), tema, login e roteamento entre as telas.

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
                <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} active={active} pending={pending} go={go} />

                <Header active={active} pending={pending} go={go} theme={theme} onToggleTheme={toggleTheme} onSearch={() => setSearchOpen(true)} />

                <main className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 sm:px-8 sm:pt-8 lg:pb-14">
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

                {route.page !== "copilot" && <CopilotWidget />}
                <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

                <BottomNav active={active} pending={pending} go={go} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((o) => !o)} />
              </motion.div>
            )}
          </AnimatePresence>
        </StoreContext.Provider>
      </ToastProvider>
    </MotionConfig>
  );
}
