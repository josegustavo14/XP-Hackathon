import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export const SUGGESTIONS = ["Quais clientes precisam de atenção?", "Quais são os vencimentos próximos?", "Quais clientes têm concentração?", "Resuma a situação da Mariana Costa"];

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

export function CopilotMark({ size = "h-12 w-12", icon = "h-5 w-5", animated = true }) {
  return (
    <motion.div
      animate={animated ? { rotate: [0, 15, -10, 0], scale: [1, 1.12, 1] } : undefined}
      transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}
      className={`grid ${size} place-items-center rounded-2xl bg-navy text-gold`}
    >
      <Sparkles className={icon} />
    </motion.div>
  );
}
