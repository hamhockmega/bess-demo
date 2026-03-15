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
    <div className={cn('flex items-center gap-1 bg-secondary p-1 rounded-lg', className)}>
      <span className="text-xs text-muted-foreground mr-1.5 px-1 font-medium">时间粒度:</span>
      {intervals.map((interval) => (
        <button
          key={interval}
          onClick={() => onChange(interval)}
          className={cn(
            'px-3 py-1 text-xs transition-all duration-200 rounded-md font-medium',
            value === interval
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-card'
          )}
        >
          {interval}
        </button>
      ))}
    </div>
  );
};
