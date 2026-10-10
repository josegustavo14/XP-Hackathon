import React, { useState } from 'react';
import { Bell, LayoutDashboard, Sparkles, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {mobileOpen && (
        <div
          className="backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="workspace">
        <Header onToggleMobile={() => setMobileOpen((prev) => !prev)} />
        <main className="main-content">
          <Outlet />
        </main>
        <nav className="mobile-bottom-nav" aria-label="Navegação principal">
          <NavLink to="/" end><LayoutDashboard size={18} /><span>Início</span></NavLink>
          <NavLink to="/clients"><Users size={18} /><span>Clientes</span></NavLink>
          <NavLink to="/alerts"><Bell size={18} /><span>Alertas</span></NavLink>
          <NavLink to="/copilot"><Sparkles size={18} /><span>Copiloto</span></NavLink>
        </nav>
      </div>
    </div>
  );
};
