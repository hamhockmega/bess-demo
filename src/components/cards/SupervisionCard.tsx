import React from 'react';
import { PanelCard } from '../dashboard/PanelCard';
import { supervisionData } from '@/data/mockData';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  '正常': 'bg-dashboard-green-bg border-dashboard-green/20',
  '预警': 'bg-dashboard-orange-bg border-dashboard-orange/20',
  '异常': 'bg-dashboard-red-bg border-dashboard-red/20',
};

const STATUS_TEXT = {
  '正常': 'text-dashboard-green',
  '预警': 'text-dashboard-orange',
  '异常': 'text-dashboard-red',
};

const STATUS_DOT = {
  '正常': 'bg-dashboard-green',
  '预警': 'bg-dashboard-orange',
  '异常': 'bg-dashboard-red',
};

export const SupervisionCard: React.FC = () => {
  return (
    <PanelCard title="事前监管" className="h-full">
      <div className="grid grid-cols-2 gap-3 h-full content-start">
        {supervisionData.map((item) => (
          <div
            key={item.indicator}
            className={cn(
              'border rounded-lg p-3.5 transition-all hover:shadow-md',
              STATUS_STYLES[item.status]
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn('text-xs font-semibold', STATUS_TEXT[item.status])}>{item.indicator}</span>
              <div className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[item.status])} />
                <span className={cn('text-[10px] font-medium', STATUS_TEXT[item.status])}>{item.status}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className={cn('text-xl font-bold tabular-nums', STATUS_TEXT[item.status])}>{item.value}</span>
              <span className="text-[10px] text-muted-foreground">阈值: {item.threshold}</span>
            </div>
            <div className="text-[10px] mt-1.5 text-muted-foreground">{item.description}</div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
};
