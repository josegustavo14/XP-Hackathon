import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

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
