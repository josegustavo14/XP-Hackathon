import React from 'react';
import { Search, X } from 'lucide-react';

interface ClientFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  riskFilter: string;
  onRiskFilterChange: (risk: string) => void;
  onClear: () => void;
  isFiltered: boolean;
}

const RISK_OPTIONS = ['Todos', 'Conservador', 'Moderado', 'Arrojado'];

export const ClientFilters: React.FC<ClientFiltersProps> = ({
  query,
  onQueryChange,
  riskFilter,
  onRiskFilterChange,
  onClear,
  isFiltered,
}) => {
  return (
    <div className="filters">
      <div className="search-field-wrapper">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          id="clientSearch"
          className="field search-field"
          placeholder="Buscar cliente por nome, cidade ou objetivo..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => onQueryChange('')}
            title="Limpar busca"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="select-field-wrapper">
        <select
          id="riskFilter"
          className="field select-field"
          value={riskFilter}
          onChange={(e) => onRiskFilterChange(e.target.value)}
        >
          {RISK_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === 'Todos' ? 'Todos os perfis' : option}
            </option>
          ))}
        </select>
      </div>

      {isFiltered && (
        <button
          type="button"
          className="btn btn-secondary clear-filters-btn"
          onClick={onClear}
        >
          <X size={13} />
          Limpar filtros
        </button>
      )}
    </div>
  );
};
