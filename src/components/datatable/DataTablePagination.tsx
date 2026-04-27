import { ChevronLeft, ChevronRight } from 'lucide-react';

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="datatable-pagination">
      <span>{`Pagina ${page} van ${totalPages}`}</span>
      <div className="toolbar-cluster">
        <button type="button" className="icon-button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Vorige pagina">
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="icon-button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="Volgende pagina">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
