// Marca do app no header e no menu: losango dourado + "XP Advisor".
export function BrandMark() {
  return (
    <span className="flex items-center gap-2.5 whitespace-nowrap">
      <span className="h-[18px] w-[18px] rotate-45 rounded-[5px] border-[3px] border-gold" aria-hidden />
      <span className="text-[17px] font-bold tracking-tight text-slate-900">XP Advisor</span>
      <span className="hidden text-xs font-medium text-slate-500 sm:inline">Copilot</span>
    </span>
  );
}
