import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ClientPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
}

export const ClientPagination: React.FC<ClientPaginationProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}) => {
  if (total <= pageSize && page === 1) {
    return null;
  }

  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="pagination-bar">
      <div>
        Exibindo <strong>{startRecord}–{endRecord}</strong> de <strong>{total}</strong> clientes
        {totalPages > 1 && ` (Página ${page} de ${totalPages})`}
      </div>
      <div className="pagination-buttons">
        <button
          type="button"
          className="btn btn-secondary pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={14} />
          Anterior
        </button>
        <button
          type="button"
          className="btn btn-secondary pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Próxima página"
        >
          Próxima
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
