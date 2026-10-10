import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Send, Trash2 } from "lucide-react";
import { suggestionsFor } from "../lib/copilot.js";
import { useStore } from "../lib/store.js";
import { ChatThread, CopilotWave } from "../components/copilot/ChatThread.jsx";
import { Badge, Button, Card, Helper, PageTitle, SectionHead } from "../components/ui";

export function Copilot() {
  const { chat, setChat, ask, typing } = useStore();
  const [input, setInput] = useState("");

  function submit(q) {
    if (ask(q ?? input)) setInput("");
  }

  return (
    <>
      <PageTitle kicker="Inteligência aplicada" title="Copiloto IA" lead="Consulte os dados dos clientes usando linguagem natural e verifique as fontes." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
        <Card className="flex min-h-[520px] flex-col">
          <SectionHead title="Conversa com o assistente" subtitle="Respostas produzidas para a base fictícia" action={<Badge>Demonstração</Badge>} />
          <ChatThread
            chat={chat}
            typing={typing}
            empty={
              <div className="px-3 py-10 text-center">
                <div className="mb-4 flex justify-center"><CopilotWave /></div>
                <h2 className="text-lg font-semibold">Como posso ajudar hoje?</h2>
                <p className="mt-1 text-sm text-slate-500">Faça perguntas sobre a carteira, alertas e relacionamento com os clientes.</p>
              </div>
            }
          />
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2 border-t border-slate-200 pt-4">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte sobre seus clientes..." className="h-11 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <Button variant="primary" type="submit" disabled={typing}>Enviar <Send className="h-3.5 w-3.5" /></Button>
          </form>
        </Card>
        <Card>
          <SectionHead title="Perguntas sugeridas" subtitle="Escolha uma consulta para testar o copiloto." />
          <div className="mb-4 grid gap-2">
            {suggestionsFor("copilot").items.map((q) => (
              <motion.button key={q} whileHover={{ x: 4 }} onClick={() => submit(q)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-surface px-3.5 py-3 text-left text-xs text-slate-600 hover:border-slate-300">
                {q} <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </motion.button>
            ))}
          </div>
          <Helper className="mb-4">O copiloto consulta apenas o conjunto de dados fictício e explica as fontes. As respostas precisam ser revisadas pelo assessor.</Helper>
          <Button onClick={() => setChat([])}><Trash2 className="h-3.5 w-3.5" /> Limpar conversa</Button>
        </Card>
      </div>
    </>
  );
}
