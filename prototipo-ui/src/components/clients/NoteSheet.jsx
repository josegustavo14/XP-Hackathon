import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useStore } from "../../lib/store.js";
import { Button, Helper, useToast } from "../ui";

// Registro de interação: painel lateral no desktop, folha inferior no celular.
export function NoteSheet({ client, open, onClose, onSaved }) {
  const { addNote } = useStore();
  const toast = useToast();
  const first = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => first.current?.focus(), 200);
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function save(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    addNote({ cid: client.id, type: f.get("type"), date: String(f.get("date")).split("-").reverse().join("/"), text: f.get("text"), next: f.get("next") });
    toast("Interação registrada no histórico");
    onClose();
    onSaved?.();
  }

  const input = "h-11 w-full rounded-xl border border-slate-200 bg-surface px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden />
          <motion.section
            role="dialog"
            aria-label={`Registrar interação com ${client.name}`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-2xl md:max-h-none md:w-[440px] md:rounded-none md:border-l md:border-slate-200"
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200 md:hidden" aria-hidden />
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Registrar interação</h2>
                <p className="mt-0.5 text-xs text-slate-500">{client.name} · fica salvo no histórico do cliente</p>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </header>
            <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-slate-600">
                    Tipo
                    <select ref={first} name="type" className={`${input} mt-1.5`}>
                      {["Reunião", "Ligação", "Contato digital", "Observação"].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Data
                    <input name="date" type="date" defaultValue="2026-10-10" required className={`${input} mt-1.5`} />
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-600">
                  Resumo do atendimento
                  <textarea name="text" required placeholder="O que foi discutido?" className={`${input} mt-1.5 h-auto min-h-28 py-3`} />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  Próximos passos
                  <textarea name="next" placeholder="O que deve ser acompanhado?" className={`${input} mt-1.5 h-auto min-h-24 py-3`} />
                </label>
                <Helper>Registre somente informações pertinentes ao atendimento e autorizadas pelo cliente.</Helper>
              </div>
              <footer className="flex gap-3 border-t border-slate-200 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Button type="button" onClick={onClose} className="flex-1 md:flex-none">Cancelar</Button>
                <Button variant="primary" type="submit" className="flex-1">Salvar registro</Button>
              </footer>
            </form>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
