import { useState, useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Card } from "./Card.jsx";

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

// Valores em reais com "R$" e centavos esmaecidos, como no restante da identidade.
export function moneyParts(text) {
  if (typeof text !== "string" || !text.startsWith("R$")) return text;
  return (
    <>
      <span className="mr-1 text-[0.72em] font-normal text-slate-500">R$</span>
      {text.replace(/^R\$\s*/, "")}
      <span className="font-medium text-slate-400">,00</span>
    </>
  );
}

// Métrica; com onClick vira um atalho (card inteiro clicável, seta ↗ como pista visual).
export function Metric({ label, value, format, foot, icon: Icon, accent = "text-slate-400", className = "", compact = false, onClick, active = false }) {
  const link = onClick
    ? {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()),
        whileTap: { scale: 0.98 },
      }
    : {};
  return (
    <Card
      padding={compact ? "p-4 sm:p-6" : undefined}
      className={`group relative flex flex-col overflow-hidden ${onClick ? "cursor-pointer transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" : ""} ${active ? "border-gold! ring-1 ring-gold" : ""} ${className}`}
      aria-pressed={onClick && active ? true : undefined}
      {...link}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={compact ? "line-clamp-2 min-h-[2lh] text-[11px] leading-snug text-slate-500 sm:min-h-0 sm:text-xs" : "text-xs text-slate-500"}>{label}</span>
        {onClick && <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-900 ${Icon ? "sm:hidden" : ""}`} aria-hidden />}
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${accent} ${compact || onClick ? "hidden sm:block" : ""}`} aria-hidden />}
      </div>
      <div className={`font-semibold tracking-[-0.03em] text-slate-900 sm:mt-3 sm:text-[30px] ${compact ? "mt-auto pt-1.5 text-2xl" : "mt-2 text-2xl"}`}>
        {typeof value === "number" ? <CountUp value={value} format={format ? (n) => moneyParts(format(n)) : undefined} /> : value}
      </div>
      <div className={`mt-1 text-[11px] leading-snug text-slate-500 ${compact ? "hidden sm:block" : ""}`}>{foot}</div>
      <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100" />
    </Card>
  );
}
