import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { NAV, SHORT } from "./navigation.js";
import { CircleButton } from "../components/ui";

// Folha "Menu" (celular e tablet): todas as telas em blocos.
export function MenuSheet({ open, onClose, active, pending, go }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[45] lg:hidden">
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.section
            role="dialog"
            aria-label="Todas as telas"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-200 bg-surface px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-[17px] font-medium tracking-tight text-slate-900">Todas as telas</h2>
              <CircleButton onClick={onClose} label="Fechar" icon={X} size="h-9 w-9" />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {NAV.map(([id, Icon, label]) => {
                const on = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => go(id)}
                    aria-current={on ? "page" : undefined}
                    className={`relative flex flex-col items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${on ? "border-gold bg-amber-50" : "border-slate-200 bg-slate-100 hover:border-slate-300"}`}
                  >
                    <Icon className={`h-5 w-5 ${on ? "text-amber-700" : "text-slate-600"}`} />
                    <span className="text-xs font-semibold leading-tight text-slate-900">{SHORT[id] || label}</span>
                    {id === "alerts" && pending > 0 && <span className="absolute right-3 top-3 rounded-full bg-gold px-1.5 text-[10px] font-bold leading-4 text-navy">{pending}</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 px-1 text-[11px] text-slate-500">Ambiente demonstrativo · dados fictícios · Hackathon XP 2026</p>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
