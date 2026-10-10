import { useId, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

function Tooltip({ show, children, className = "", style }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4, transition: { duration: 0.1 } }}
          style={style}
          className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-[11px] leading-snug text-on-primary shadow-xl ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Barras horizontais que crescem ao entrar na tela.
 * items: [{ label, value, display, color, hint }]; onSelect torna as linhas clicáveis.
 */
export function HBarList({ items, max, labelWidth = "w-32", onSelect, valueSuffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [hover, setHover] = useState(null);
  const top = max ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div ref={ref} className="space-y-1" onMouseLeave={() => setHover(null)}>
      {items.map((item, i) => {
        const pct = (item.value / top) * 100;
        const dim = hover !== null && hover !== i;
        const Row = onSelect ? "button" : "div";
        return (
          <Row
            key={item.label}
            onClick={onSelect ? () => onSelect(item) : undefined}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className={`relative flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors ${onSelect ? "cursor-pointer hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600" : ""}`}
          >
            <span className={`${labelWidth} shrink-0 truncate text-xs font-semibold text-slate-700`}>{item.label}</span>
            <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ backgroundColor: item.color || "var(--color-chart-1)" }}
                initial={{ width: 0 }}
                animate={{ width: inView ? `${pct}%` : 0, opacity: dim ? 0.4 : 1 }}
                transition={{ width: { duration: 0.9, delay: i * 0.08, ease: EASE }, opacity: { duration: 0.15 } }}
              />
            </span>
            <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
              {item.display ?? `${item.value}${valueSuffix}`}
            </span>
            <Tooltip show={hover === i && !!item.hint} className="-top-8 left-1/2 -translate-x-1/2">
              {item.hint}
            </Tooltip>
          </Row>
        );
      })}
    </div>
  );
}

/**
 * Rosca de composição. segments: [{ label, value, color }] somando 100.
 * Passar o mouse numa fatia (ou na legenda) destaca a fatia e mostra o valor no centro.
 */
export function DonutChart({ segments, centerTitle, centerValue, format = (v) => `${v}%` }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [active, setActive] = useState(null);
  const size = 200;
  const r = 74;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const gap = 2.5;
  let offset = 0;

  const current = active !== null ? segments[active] : null;

  return (
    <div ref={ref} className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" role="img" aria-label={segments.map((s) => `${s.label} ${format(s.value)}`).join(", ")}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: "var(--color-slate-100)" }} strokeWidth="22" />
          {segments.map((s, i) => {
            const len = Math.max((s.value / total) * C - gap, 0);
            const start = offset;
            offset += (s.value / total) * C;
            const isActive = active === i;
            return (
              <motion.circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                style={{ stroke: s.color }}
                strokeLinecap="butt"
                strokeDashoffset={-start}
                initial={{ strokeDasharray: `0 ${C}`, strokeWidth: 22 }}
                animate={{
                  strokeDasharray: inView ? `${len} ${C}` : `0 ${C}`,
                  strokeWidth: isActive ? 30 : 22,
                  opacity: active !== null && !isActive ? 0.35 : 1,
                }}
                transition={{ strokeDasharray: { duration: 1, delay: 0.15 + i * 0.12, ease: EASE }, strokeWidth: { duration: 0.2 }, opacity: { duration: 0.2 } }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                className="cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div key={current ? current.label : "total"} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}>
              <div className="text-[11px] text-slate-500">{current ? current.label : centerTitle}</div>
              <div className="text-xl font-bold tracking-tight text-slate-900">{current ? format(current.value) : centerValue}</div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ul className="w-full space-y-1.5" onMouseLeave={() => setActive(null)}>
        {segments.map((s, i) => (
          <li key={s.label}>
            <button
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${active === i ? "bg-slate-100" : "hover:bg-slate-50"}`}
            >
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
              <span className="flex-1 font-medium text-slate-700">{s.label}</span>
              <span className="font-bold tabular-nums text-slate-900">{format(s.value)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Colunas com crescimento escalonado, linha de média e tooltip por coluna.
 * data: [{ month, value }]
 */
export function ColumnChart({ data, valueLabel = "Índice", height = 200 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [hover, setHover] = useState(null);
  const id = useId();
  const max = 100;
  const avg = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length);
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div ref={ref} className="mt-8 flex gap-2">
      <div className="relative w-7 shrink-0 text-right text-[10px] tabular-nums text-slate-400" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${t}%` }}>
            {t}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <div key={t} className={`absolute inset-x-0 border-t ${t === 0 ? "border-slate-300" : "border-dashed border-slate-100"}`} style={{ bottom: `${t}%` }} />
          ))}
          <motion.div
            className="absolute inset-x-0 z-10 border-t-2 border-dashed border-gold"
            initial={{ opacity: 0, bottom: 0 }}
            animate={inView ? { opacity: 1, bottom: `${(avg / max) * 100}%` } : {}}
            transition={{ duration: 0.9, delay: 0.9, ease: EASE }}
          >
            <span className="absolute -top-5 right-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Média {avg}</span>
          </motion.div>

          <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2">
            <AnimatePresence initial={false}>
              {data.map((d, i) => {
                const last = i === data.length - 1;
                const dim = hover !== null && hover !== i;
                const prev = data[i - 1]?.value;
                const delta = prev !== undefined ? d.value - prev : null;
                return (
                  <motion.div
                    layout
                    key={`${id}-${d.month}`}
                    className="relative flex h-full flex-1 cursor-pointer items-end"
                    onMouseEnter={() => setHover(i)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="w-full rounded-t"
                      style={{ backgroundColor: last ? "var(--color-chart-2)" : "var(--color-chart-1)" }}
                      initial={{ height: 0 }}
                      animate={{ height: inView ? `${(d.value / max) * 100}%` : 0, opacity: dim ? 0.35 : 1 }}
                      transition={{ height: { duration: 0.8, delay: i * 0.05, ease: EASE }, opacity: { duration: 0.15 } }}
                    />
                    <Tooltip show={hover === i} style={{ bottom: `calc(${(d.value / max) * 100}% + 8px)` }} className={i > data.length / 2 ? "right-0" : "left-0"}>
                      <div className="font-semibold">{d.month}</div>
                      <div>
                        {valueLabel}: <b>{d.value}</b>
                      </div>
                      {delta !== null && (
                        <div className={delta >= 0 ? "text-emerald-300" : "text-red-300"}>
                          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} vs. mês anterior
                        </div>
                      )}
                    </Tooltip>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-2 flex gap-1.5 sm:gap-2">
          {data.map((d, i) => (
            <span key={d.month} className={`flex-1 truncate text-center text-[10px] ${hover === i ? "font-bold text-slate-700" : "text-slate-400"}`}>
              {data.length > 8 && i % 2 === 1 && hover !== i ? "" : d.month.slice(0, 3)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
