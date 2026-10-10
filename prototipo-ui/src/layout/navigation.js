import { Bell, Database, FileText, House, LayoutDashboard, LayoutGrid, Settings as SettingsIcon, Sparkles, Users } from "lucide-react";

export const NAV = [
  ["dashboard", LayoutDashboard, "Visão geral"],
  ["clients", Users, "Clientes"],
  ["alerts", Bell, "Alertas e oportunidades"],
  ["copilot", Sparkles, "Copiloto IA"],
  ["briefings", FileText, "Briefings"],
  ["finance", Database, "Dados integrados"],
  ["settings", SettingsIcon, "Configurações"],
];

// Barra inferior no celular: telas principais + "Menu" com todas as telas.
export const BOTTOM_NAV = [
  ["dashboard", House, "Início"],
  ["clients", Users, "Clientes"],
  ["alerts", Bell, "Alertas"],
  ["briefings", FileText, "Briefings"],
  ["menu", LayoutGrid, "Menu"],
];

export const BOTTOM_IDS = new Set(BOTTOM_NAV.map(([id]) => id));

// Rótulos curtos para o menu em pílula do topo.
export const SHORT = { alerts: "Alertas", finance: "Dados integrados" };

export const PAGES_TOP = new Set(NAV.map(([id]) => id));

export const PARENT = { profile: "clients", alertDetail: "alerts", briefing: "briefings", sources: "finance" };
