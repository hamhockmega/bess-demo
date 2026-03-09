import React from 'react';
import { cn } from '@/lib/utils';
import type { IntervalType } from '@/data/mockData';

interface IntervalSwitchProps {
  value: IntervalType;
  onChange: (interval: IntervalType) => void;
  className?: string;
}

const intervals: IntervalType[] = ['15分钟', '30分钟', '60分钟', '日'];

export const IntervalSwitch: React.FC<IntervalSwitchProps> = ({ value, onChange, className }) => {
  return (
    <div className={cn('flex items-center gap-1 bg-secondary/30 p-0.5 rounded-sm', className)}>
      <span className="text-xs text-muted-foreground mr-1 px-1">时间粒度:</span>
      {intervals.map((interval) => (
        <button
          key={interval}
          onClick={() => onChange(interval)}
          className={cn(
            'px-2 py-0.5 text-xs transition-all duration-200 rounded-sm',
            value === interval
              ? 'bg-dashboard-cyan text-primary-foreground shadow-[0_0_6px_hsl(var(--dashboard-cyan)/0.4)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          {interval}
        </button>
      ))}
    </div>
  );
};
