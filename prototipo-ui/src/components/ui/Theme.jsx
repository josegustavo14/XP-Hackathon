import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

// Alterna claro/escuro com o ícone girando na troca.
export function ThemeToggle({ theme, onToggle, className = "" }) {
  const dark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
      className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-surface text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.5, opacity: 0 }} transition={{ duration: 0.2 }}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function ThemeSwitch({ theme, onToggle, className = "" }) {
  const opts = [["light", Sun, "Claro"], ["dark", Moon, "Escuro"]];
  return (
    <div role="group" aria-label="Tema" className={`flex rounded-full border border-slate-200 bg-surface p-1 ${className}`}>
      {opts.map(([id, Icon, label]) => {
        const on = theme === id;
        return (
          <button
            key={id}
            onClick={() => !on && onToggle()}
            aria-pressed={on}
            className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${on ? "text-slate-900" : "text-slate-500 hover:text-slate-800"}`}
          >
            {on && <motion.span layoutId="theme-switch" className="absolute inset-0 rounded-full bg-slate-100" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <Icon className="relative h-3.5 w-3.5" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
