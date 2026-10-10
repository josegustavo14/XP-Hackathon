import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronRight, Info, Moon, Sun } from "lucide-react";

const BADGE = {
  neutral: "bg-slate-100 text-slate-600",
  gold: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
};

export function Badge({ children, tone = "neutral", className = "" }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE[tone]} ${className}`}>{children}</span>;
}

export const severityTone = (s) => (s === "Alta" ? "red" : s === "Média" ? "gold" : "green");

export function Button({ children, variant = "default", className = "", ...props }) {
  const styles = {
    default: "border-slate-200 bg-surface text-slate-800 hover:border-slate-300 hover:bg-slate-50",
    primary: "border-primary bg-primary text-on-primary hover:opacity-90",
    gold: "border-gold bg-gold text-navy hover:brightness-95",
    ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:opacity-50 ${styles[variant]} ${className}`}
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

export function Card({ children, className = "", ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`min-w-0 rounded-2xl border border-slate-200 bg-surface p-5 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageTitle({ kicker, title, lead, action, back }) {
  return (
    <div className="mb-7">
      {back && (
        <button onClick={back.onClick} className="-ml-1 mb-3 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600">
          <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
        </button>
      )}
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{kicker}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[29px]">{title}</h1>
          {lead && <p className="mt-2 text-[13px] text-slate-500">{lead}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Helper({ children, className = "" }) {
  // Aviso informativo neutro: âmbar e vermelho ficam reservados para prioridade.
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 ${className}`}>
      <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

// Número que conta a partir de zero quando entra na tela.
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("pt-BR"), duration = 1.1 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(from.current, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    from.current = value;
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return <span ref={ref}>{format(shown)}</span>;
}

export function Metric({ label, value, format, foot, icon: Icon, accent = "text-slate-400", className = "" }) {
  return (
    <Card className={`group relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        {Icon && <Icon className={`h-4 w-4 ${accent}`} aria-hidden />}
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:mt-3 sm:text-[28px]">
        {typeof value === "number" ? <CountUp value={value} format={format} /> : value}
      </div>
      <div className="mt-1 text-[11px] leading-snug text-slate-500">{foot}</div>
      <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100" />
    </Card>
  );
}

// No celular, tabelas viram uma lista de linhas tocáveis (a linha inteira é o link).
export function MobileList({ children, empty, show = true }) {
  return (
    <ul className="-mx-1 divide-y divide-slate-100 md:hidden">
      <AnimatePresence initial={false}>{children}</AnimatePresence>
      {!show && <li className="py-10 text-center text-sm text-slate-500">{empty}</li>}
    </ul>
  );
}

export function MobileRow({ onClick, children, index = 0 }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index * 0.04, 0.3) } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-1 py-3.5 text-left transition-colors active:bg-slate-100">
        <div className="min-w-0 flex-1">{children}</div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>
    </motion.li>
  );
}

export function TableWrap({ children, minWidth = "min-w-[640px]", desktopOnly = false }) {
  return (
    <div className={`overflow-x-auto ${desktopOnly ? "hidden md:block" : ""}`}>
      <table className={`w-full ${minWidth} border-collapse text-left text-xs`}>{children}</table>
    </div>
  );
}

export const Th = ({ children }) => <th className="border-b border-slate-200 px-3 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</th>;
export const Td = ({ children, className = "" }) => <td className={`whitespace-nowrap border-b border-slate-100 px-3 py-4 ${className}`}>{children}</td>;

// Linhas de tabela que entram/saem animadas ao filtrar.
export function AnimatedRow({ children, index = 0 }) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0, transition: { delay: Math.min(index * 0.04, 0.3) } }}
      exit={{ opacity: 0, x: 8, transition: { duration: 0.15 } }}
      className="hover:bg-slate-50/80"
    >
      {children}
    </motion.tr>
  );
}

export function Empty({ children, colSpan }) {
  const content = <div className="py-12 text-center text-sm text-slate-500">{children}</div>;
  return colSpan ? (
    <tr>
      <td colSpan={colSpan}>{content}</td>
    </tr>
  ) : (
    content
  );
}

// Alterna claro/escuro com o ícone girando na troca.
export function ThemeToggle({ theme, onToggle, className = "" }) {
  const dark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
      className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-surface text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.5, opacity: 0 }} transition={{ duration: 0.2 }}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((text) => {
    clearTimeout(timer.current);
    setToast({ text, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 sm:bottom-6">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-5 py-4 text-sm font-medium text-slate-50 shadow-2xl"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden />
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
