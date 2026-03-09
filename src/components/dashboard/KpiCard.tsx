import React from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, unit, trend, className }) => {
  return (
    <div className={cn('bg-secondary/30 border border-dashboard-panel-border rounded-sm px-3 py-2', className)}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn(
          'text-lg font-bold tabular-nums',
          trend === 'up' ? 'text-dashboard-red' : trend === 'down' ? 'text-dashboard-green' : 'text-dashboard-cyan'
        )}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
};
