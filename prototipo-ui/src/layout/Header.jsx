import { motion } from "framer-motion";
import { Search, Settings as SettingsIcon } from "lucide-react";
import { CircleButton, ThemeSwitch, ThemeToggle } from "../components/ui";
import { BrandMark } from "./BrandMark.jsx";
import { NAV, SHORT } from "./navigation.js";

// Header fixo: marca, menu em pílula (desktop), busca, tema, configurações e avatar.
export function Header({ active, pending, go, theme, onToggleTheme, onSearch }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-2 px-4 sm:h-[76px] sm:gap-3 sm:px-8">
        <button onClick={() => go("dashboard")} className="rounded-full focus-visible:outline-2 focus-visible:outline-blue-600" aria-label="Ir para a visão geral">
          <BrandMark />
        </button>

        <nav aria-label="Principal" className="mx-auto hidden items-center gap-0.5 rounded-full border border-slate-200 bg-surface p-1 lg:flex">
          {NAV.filter(([id]) => id !== "settings").map(([id, , label]) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={active === id ? "page" : undefined}
              className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors xl:px-4 ${active === id ? "text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
            >
              {active === id && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-full bg-slate-100" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              <span className="relative">{SHORT[id] || label}</span>
              {id === "alerts" && pending > 0 && (
                <motion.span key={pending} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="relative rounded-full bg-gold px-1.5 text-[10px] font-bold leading-4 text-navy">{pending}</motion.span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex-1 lg:hidden" />
        <CircleButton onClick={onSearch} label="Buscar (Ctrl K)" icon={Search} aria-haspopup="dialog" />
        <ThemeSwitch theme={theme} onToggle={onToggleTheme} className="hidden xl:flex" />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="xl:hidden" />
        <CircleButton onClick={() => go("settings")} label="Configurações" icon={SettingsIcon} className="hidden lg:grid" />
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-xs font-bold text-navy" title="Assessor Demo">AD</div>
      </div>
    </header>
  );
}
