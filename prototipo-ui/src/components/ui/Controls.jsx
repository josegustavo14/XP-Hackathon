import { motion } from "framer-motion";

// Abas em pílula com indicador animado.
export function PillTabs({ tabs, value, onChange, layoutId, className = "" }) {
  return (
    <div role="tablist" className={`flex gap-1.5 overflow-x-auto ${className}`}>
      {tabs.map(([id, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`relative whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-colors ${value === id ? "border-transparent text-on-primary" : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800"}`}
        >
          {value === id && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span className="relative z-10">{label}</span>
        </button>
      ))}
    </div>
  );
}

// Seletor em pílula usado nos filtros das listas.
export const Select = ({ value, onChange, options, label }) => (
  <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 min-w-0 flex-1 sm:min-w-40 sm:flex-none rounded-full border border-slate-200 bg-surface px-4 text-xs font-medium text-slate-700">
    {options.map((o) => (
      <option key={o}>{o}</option>
    ))}
  </select>
);
