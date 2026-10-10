import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { env } from '../config/env';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  onToggleMobile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobile }) => {
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={onToggleMobile}
        aria-label="Abrir menu de navegação"
      >
        <Menu size={20} />
      </button>

      <div
        className="global-search"
        onClick={() => navigate('/clients')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') navigate('/clients');
        }}
      >
        <Search size={16} />
        <span>Buscar clientes e informações...</span>
      </div>

      <div style={{ flex: 1 }} />

      <Badge variant="gold">
        Fase 1 · MVP
      </Badge>

      <div className="avatar" title="Assessor XP">
        XP
      </div>
    </header>
  );
};
