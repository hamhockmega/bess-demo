import React from 'react';
import { cn } from '@/lib/utils';

interface SummaryTableProps {
  columns: { key: string; label: string; width?: string }[];
  rows: Record<string, React.ReactNode>[];
  className?: string;
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ columns, rows, className }) => {
  return (
    <div className={cn('overflow-auto', className)}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2 text-left text-table-header-text font-medium bg-table-header-bg border-b border-table-border"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                'border-b border-border/50 hover:bg-table-hover transition-colors',
                i % 2 === 1 ? 'bg-table-alt' : ''
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-foreground">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
