export const BADGE = {
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
