import { useStore } from "../lib/store.js";

const BACK_LABEL = {
  dashboard: "Voltar ao início", clients: "Voltar aos clientes", profile: "Voltar ao cliente", alerts: "Voltar à fila de alertas",
  alertDetail: "Voltar ao alerta", copilot: "Voltar ao copiloto", briefings: "Voltar aos briefings", briefing: "Voltar ao briefing",
  finance: "Voltar aos dados integrados", sources: "Voltar às fontes", settings: "Voltar às configurações",
};

// "Voltar" que leva à tela de origem (ex.: do alerta para o cliente e de volta ao alerta).
export function useBackLink() {
  const { back, prev } = useStore();
  return { label: BACK_LABEL[prev.page] || "Voltar", onClick: back };
}
