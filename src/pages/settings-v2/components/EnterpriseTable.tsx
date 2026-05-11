import React from 'react';

interface EnterpriseTableProps<T> {
  rows: T[];
  columns: {
    key: keyof T;
    label: string;
  }[];
}

export default function EnterpriseTable<T extends Record<string, any>>({
  rows,
  columns,
}: EnterpriseTableProps<T>) {
  return (
    <div className="enterprise-table-wrapper">
      <table className="enterprise-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex}>
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {String(row[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
