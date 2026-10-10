import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  Database,
  FileText,
  LayoutDashboard,
  Settings as SettingsIcon,
  Sparkles,
  Users,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/alerts', label: 'Alertas e oportunidades', icon: Bell },
  { to: '/copilot', label: 'Copiloto IA', icon: Sparkles },
  { to: '/briefings', label: 'Briefings', icon: FileText },
  { to: '/finance', label: 'Dados integrados', icon: Database },
  { to: '/settings', label: 'Configurações', icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        XP <b>/</b> ADVISOR
        <small>COPILOT</small>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <strong>AMBIENTE DEMONSTRATIVO</strong>
        Hackathon XP · 2026
        <div style={{ fontSize: 10, color: '#6d7785', marginTop: 4 }}>
          Plataforma do Assessor
        </div>
      </div>
    </aside>
  );
};
