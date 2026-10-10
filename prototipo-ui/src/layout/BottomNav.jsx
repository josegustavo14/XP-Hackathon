import { motion } from "framer-motion";
import { BOTTOM_IDS, BOTTOM_NAV } from "./navigation.js";

// Barra inferior (celular e tablet): telas principais e "Menu" com todas as telas.
export function BottomNav({ active, pending, go, menuOpen, onToggleMenu }) {
  return (
    <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-[46] border-t border-slate-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid h-[68px] max-w-lg grid-cols-5 px-2">
        {BOTTOM_NAV.map(([id, Icon, label]) => {
          const on = id === "menu" ? menuOpen || !BOTTOM_IDS.has(active) : active === id && !menuOpen;
          return (
            <button
              key={id}
              onClick={() => (id === "menu" ? onToggleMenu() : go(id))}
              aria-current={on && id !== "menu" ? "page" : undefined}
              aria-expanded={id === "menu" ? menuOpen : undefined}
              aria-label={label}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${on ? "text-slate-900" : "text-slate-500"}`}
            >
              <span className="relative grid h-11 w-11 place-items-center">
                {on && <motion.span layoutId="bottom-active" className="absolute inset-0 rounded-2xl bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon className={`relative h-5 w-5 ${on ? "text-primary-accent" : ""}`} />
                {id === "alerts" && pending > 0 && (
                  <span className="absolute -right-0.5 top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white ring-2 ring-surface dark:text-slate-50">{pending}</span>
                )}
              </span>
              <span className={on ? "sr-only" : ""}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
