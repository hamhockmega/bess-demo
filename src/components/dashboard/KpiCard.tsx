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
    <div className={cn(
      'bg-card border border-border rounded-lg px-4 py-3 panel-card',
      className
    )}>
      <div className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn(
          'text-lg font-bold tabular-nums',
          trend === 'up' ? 'text-dashboard-red' : trend === 'down' ? 'text-dashboard-green' : 'text-foreground'
        )}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
};
