import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Send, Sparkles, X } from "lucide-react";
import { useStore } from "./store.js";
import { Badge } from "./ui.jsx";
import { ChatThread, CopilotMark, SUGGESTIONS } from "./chat.jsx";

// Botão flutuante no canto inferior direito que abre um chat rápido com o copiloto
// sem sair da tela atual. A conversa é a mesma da página "Copiloto IA".
export default function CopilotWidget() {
  const { chat, ask, typing, go, copilotOpen: open, setCopilotOpen: setOpen } = useStore();
  const [hover, setHover] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function submit(q) {
    if (ask(q ?? input)) setInput("");
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Copiloto IA"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-[min(560px,calc(100dvh-10rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-2xl shadow-black/20 sm:inset-x-auto sm:right-6 sm:w-[380px] md:bottom-24"
          >
            <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <CopilotMark size="h-9 w-9" icon="h-4 w-4" animated={false} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Copiloto IA</h2>
                  <Badge>Demonstração</Badge>
                </div>
                <p className="truncate text-[11px] text-slate-500">Consulta apenas a base fictícia</p>
              </div>
              <button
                onClick={() => { setOpen(false); go("copilot"); }}
                title="Abrir em tela cheia"
                aria-label="Abrir em tela cheia"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </header>

            <ChatThread
              compact
              chat={chat}
              typing={typing}
              empty={
                <div className="pt-4">
                  <p className="text-sm font-semibold text-slate-900">Como posso ajudar?</p>
                  <p className="mb-4 mt-1 text-xs text-slate-500">Escolha uma pergunta ou escreva a sua.</p>
                  <div className="grid gap-2">
                    {SUGGESTIONS.map((q, i) => (
                      <motion.button
                        key={q}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        onClick={() => submit(q)}
                        className="rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </div>
              }
            />

            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2 border-t border-slate-200 p-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre seus clientes..."
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button type="submit" disabled={typing || !input.trim()} aria-label="Enviar" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-on-primary transition-opacity disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-40 hidden items-center gap-3 md:flex">
        <AnimatePresence>
          {hover && !open && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="pointer-events-none hidden rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-lg sm:block"
            >
              Perguntar ao Copiloto
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-label={open ? "Fechar copiloto" : "Perguntar ao Copiloto"}
          aria-expanded={open}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="relative grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-accent shadow-xl shadow-black/25 ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {!open && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full ring-2 ring-gold"
              animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: 2, repeatDelay: 0.6 }}
            />
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={open ? "x" : "spark"} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.5, opacity: 0 }} transition={{ duration: 0.18 }}>
              {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
