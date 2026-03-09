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
          <tr className="border-b border-dashboard-panel-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-2 py-1.5 text-left text-muted-foreground font-medium bg-secondary/20"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-dashboard-panel-border/50 hover:bg-secondary/20 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-2 py-1.5 text-foreground">
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
