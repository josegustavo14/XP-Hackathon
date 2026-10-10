import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import GoldFibers from "../components/backgrounds/GoldFibers.jsx";
import { Button } from "../components/ui";

export function Logo() {
  return (
    <div className="px-3 text-[21px] font-extrabold tracking-tight text-white">
      XP <b className="text-gold">/</b> ADVISOR
      <small className="mt-0.5 block text-[10px] font-semibold tracking-[0.23em] text-white/55">COPILOT</small>
    </div>
  );
}

export function Login({ onLogin }) {
  const field = "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-surface px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="relative hidden w-[41%] flex-col justify-between overflow-hidden bg-navy p-16 text-white md:flex">
        <div className="absolute inset-0" aria-hidden>
          <GoldFibers variant="dark" scale={1.8} speed={0.18} glow={1.6} brightness={1.3} />
        </div>
        <div className="relative"><Logo /></div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative">
          <h1 className="max-w-md text-5xl font-bold leading-tight tracking-tight">Mais contexto.<br /><span className="text-gold">Melhores conversas.</span></h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">Inteligência aplicada ao relacionamento entre assessores e investidores.</p>
        </motion.div>
        <div className="relative text-xs tracking-widest text-white/45">PROTÓTIPO DE HACKATHON • OUTUBRO 2026</div>
      </div>
      <div className="grid flex-1 place-items-center p-6">
        <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} onSubmit={(e) => { e.preventDefault(); onLogin(); }} className="w-full max-w-md">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Acesso à demonstração</p>
          <h2 className="mt-2 text-[28px] font-bold tracking-tight">Bem-vindo ao Advisor Copilot</h2>
          <p className="mt-1 text-sm text-slate-500">Entre para explorar os fluxos com informações fictícias.</p>
          <label className="mt-6 block text-xs font-bold">E-mail<input type="email" defaultValue="assessor@demo.com" required className={field} /></label>
          <label className="mt-5 block text-xs font-bold">Senha<input type="password" defaultValue="demonstracao" required className={field} /></label>
          <Button variant="primary" type="submit" className="mt-7 h-12 w-full text-sm">Entrar na plataforma <ArrowRight className="h-4 w-4" /></Button>
          <p className="mt-3 text-xs text-slate-500">Acesso demonstrativo. Nenhuma credencial é validada por servidor.</p>
        </motion.form>
      </div>
    </div>
  );
}
