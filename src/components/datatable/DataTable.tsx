import { ReactNode, useEffect, useMemo, useState } from 'react';
import { CheckSquare2, ChevronDown, ChevronUp, Settings2, Square } from 'lucide-react';
import { cn } from '@/utils/cn';
import { DataTablePagination } from '@/components/datatable/DataTablePagination';

export type ColumnDef<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  hiddenByDefault?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDirection,
  onSort,
  empty,
  selectable,
  selectedRowKeys,
  onToggleRow,
  onToggleAll,
  pageSize = 10,
  page,
  total,
  onPageChange,
  rowActionsLabel = 'Acties',
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  empty?: ReactNode;
  selectable?: boolean;
  selectedRowKeys?: string[];
  onToggleRow?: (key: string) => void;
  onToggleAll?: () => void;
  pageSize?: number;
  page?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  rowActionsLabel?: string;
}) {
  const [internalPage, setInternalPage] = useState(page || 1);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>(() => columns.filter((column) => column.hiddenByDefault).map((column) => column.key));

  const visibleColumns = useMemo(() => columns.filter((column) => !hiddenKeys.includes(column.key)), [columns, hiddenKeys]);
  const controlledPage = page ?? internalPage;
  const totalRows = total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(controlledPage, totalPages);
  const pagedRows = useMemo(() => onPageChange ? rows : rows.slice((safePage - 1) * pageSize, safePage * pageSize), [onPageChange, pageSize, rows, safePage]);

  useEffect(() => {
    if (page !== undefined) return;
    setInternalPage((current) => Math.min(current, Math.max(1, Math.ceil(totalRows / pageSize))));
  }, [page, totalRows, pageSize]);

  if (!rows.length) return <>{empty}</>;

  const allSelected = selectable && pagedRows.length > 0 && pagedRows.every((row) => selectedRowKeys?.includes(rowKey(row)));

  return (
    <div className="table-shell">
      <div className="table-meta">
        <span>{`${rows.length} resultaat/resultaten`}</span>
        <div className="table-column-toggle-wrap">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setColumnMenuOpen((current) => !current)}>
            <Settings2 size={16} /> Kolommen
          </button>
          {columnMenuOpen ? (
            <div className="table-column-menu">
              <strong>{rowActionsLabel}</strong>
              {columns.map((column) => (
                <label key={column.key} className="table-column-option">
                  <input
                    type="checkbox"
                    checked={!hiddenKeys.includes(column.key)}
                    onChange={() => {
                      setHiddenKeys((current) => current.includes(column.key) ? current.filter((key) => key !== column.key) : [...current, column.key]);
                    }}
                  />
                  <span>{column.header}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="table-mobile-list">
        {pagedRows.map((row) => {
          const key = rowKey(row);
          const selected = selectedRowKeys?.includes(key);
          return (
            <article key={key} className={cn('table-mobile-card', selected && 'is-selected')}>
              <div className="table-mobile-card-header">
                {selectable ? (
                  <button type="button" className="icon-button" onClick={() => onToggleRow?.(key)} aria-label="Selecteer rij">
                    {selected ? <CheckSquare2 size={16} /> : <Square size={16} />}
                  </button>
                ) : null}
                <div className="table-mobile-card-meta">
                  <strong>{visibleColumns[0]?.cell(row)}</strong>
                  <span>{visibleColumns[1]?.cell(row) ?? rowActionsLabel}</span>
                </div>
              </div>
              <div className="table-mobile-card-grid">
                {visibleColumns.slice(1).map((column) => (
                  <div key={column.key} className="table-mobile-field">
                    <span>{column.header}</span>
                    <strong>{column.cell(row)}</strong>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            {selectable ? (
              <th className="checkbox-column">
                <button type="button" className="icon-button" onClick={onToggleAll} aria-label="Selecteer alles">
                  {allSelected ? <CheckSquare2 size={16} /> : <Square size={16} />}
                </button>
              </th>
            ) : null}
            {visibleColumns.map((column) => (
              <th key={column.key} className={column.className}>
                {column.sortable && onSort ? (
                  <button type="button" className="sort-button" onClick={() => onSort(column.key)}>
                    <span>{column.header}</span>
                    {sortKey === column.key ? sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} /> : null}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((row) => {
            const key = rowKey(row);
            const selected = selectedRowKeys?.includes(key);
            return (
              <tr key={key} className={selected ? 'is-selected' : ''}>
                {selectable ? (
                  <td className="checkbox-column">
                    <button type="button" className="icon-button" onClick={() => onToggleRow?.(key)} aria-label="Selecteer rij">
                      {selected ? <CheckSquare2 size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                ) : null}
                {visibleColumns.map((column) => (
                  <td key={column.key} className={cn(column.className)}>{column.cell(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <DataTablePagination page={safePage} pageSize={pageSize} total={totalRows} onPageChange={onPageChange || setInternalPage} />
    </div>
  );
}
