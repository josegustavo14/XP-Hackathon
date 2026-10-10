import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, FileSearch, Sparkles } from "lucide-react";
import { useStore } from "../../lib/store.js";

// Fontes consultadas e atalhos que acompanham cada resposta do copiloto.
function AnswerExtras({ sources = [], actions = [], compact }) {
  const { go } = useStore();
  if (!sources.length && !actions.length) return null;
  return (
    <div className="mt-3 border-t border-slate-200 pt-2.5">
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <FileSearch className="h-3.5 w-3.5 text-slate-400" aria-label="Fontes" />
          {sources.map((s) => (
            <span key={s} className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">{s}</span>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${sources.length ? "mt-2.5" : ""}`}>
          {actions.map(([label, page, params]) => (
            <button
              key={label}
              onClick={() => go(page, params)}
              className={`inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1.5 font-semibold text-slate-800 ring-1 ring-slate-200 transition-colors hover:ring-slate-300 ${compact ? "text-[11px]" : "text-xs"}`}
            >
              {label} <ArrowRight className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Lista de mensagens com rolagem automática e indicador de "digitando".
// Usada na página do copiloto e no painel flutuante.
export function ChatThread({ chat, typing, compact = false, empty }) {
  const box = useRef(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [chat, typing]);

  return (
    <div ref={box} className={`flex-1 overflow-y-auto overscroll-contain ${compact ? "px-4 py-3" : "max-h-[460px] py-2 pr-1"}`}>
      {!chat.length && !typing && empty}
      <AnimatePresence initial={false}>
        {chat.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`mb-3 whitespace-pre-wrap rounded-2xl leading-relaxed ${compact ? "max-w-[88%] px-3.5 py-2.5 text-xs" : "max-w-[83%] px-4 py-3.5 text-[13px]"} ${
              m.who === "user" ? "ml-auto rounded-br-md bg-primary text-on-primary" : "rounded-bl-md bg-slate-100 text-slate-700"
            }`}
          >
            {m.text}
            {m.who === "bot" && <AnswerExtras sources={m.sources} actions={m.actions} compact={compact} />}
          </motion.div>
        ))}
        {typing && (
          <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-3 inline-flex gap-1.5 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3.5" aria-label="Copiloto digitando">
            {[0, 1, 2].map((d) => (
              <motion.span key={d} className="h-2 w-2 rounded-full bg-slate-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: d * 0.15 }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Onda animada do copiloto (identidade visual do assistente).
export function CopilotWave({ size = "h-9" }) {
  const bars = [10, 18, 26, 34, 22, 30, 16, 28, 20, 12];
  return (
    <div className={`copilot-wave flex items-center justify-center gap-[3px] ${size}`} aria-hidden>
      {bars.map((h, i) => (
        <i key={i} style={{ height: h, animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}

export function CopilotMark({ size = "h-12 w-12", icon = "h-5 w-5", animated = true }) {
  return (
    <motion.div
      animate={animated ? { rotate: [0, 15, -10, 0], scale: [1, 1.12, 1] } : undefined}
      transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}
      className={`grid ${size} place-items-center rounded-full bg-primary text-primary-accent`}
    >
      <Sparkles className={icon} />
    </motion.div>
  );
}
