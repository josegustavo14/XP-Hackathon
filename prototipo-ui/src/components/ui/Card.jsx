import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Info } from "lucide-react";
import { CircleButton } from "./Button.jsx";

export function Card({ children, className = "", padding = "p-5 sm:p-6", ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`min-w-0 rounded-3xl border border-slate-200 bg-surface ${padding} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({ title, subtitle, action, onMore, moreLabel = "Ver mais" }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[17px] font-medium tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {action}
        {onMore && <CircleButton onClick={onMore} label={moreLabel} icon={ArrowUpRight} />}
      </div>
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{kicker}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-medium leading-tight tracking-[-0.03em] text-slate-900 sm:text-[38px]">{title}</h1>
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
    <div className={`flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600 ${className}`}>
      <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
