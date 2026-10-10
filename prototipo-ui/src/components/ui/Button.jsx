import { motion } from "framer-motion";

export function Button({ children, variant = "default", className = "", ...props }) {
  const styles = {
    default: "border-slate-200 bg-surface text-slate-800 hover:border-slate-300 hover:bg-slate-100",
    primary: "border-primary bg-primary text-on-primary hover:opacity-90",
    gold: "border-gold bg-gold text-navy hover:brightness-95",
    ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
    soft: "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function LinkButton({ children, className = "", ...props }) {
  return (
    <button className={`font-bold text-blue-800 hover:underline ${className}`} {...props}>
      {children}
    </button>
  );
}

// Botão redondo só com ícone (seta ↗ dos cards, busca, configurações).
export function CircleButton({ onClick, label, icon: Icon, className = "", size = "h-10 w-10", ...props }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid ${size} shrink-0 place-items-center rounded-full border border-slate-200 bg-surface text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
