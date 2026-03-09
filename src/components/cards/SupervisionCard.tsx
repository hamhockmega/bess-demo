import React from 'react';
import { PanelCard } from '../dashboard/PanelCard';
import { supervisionData } from '@/data/mockData';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  '正常': 'bg-dashboard-green/10 text-dashboard-green border-dashboard-green/30',
  '预警': 'bg-dashboard-orange/10 text-dashboard-orange border-dashboard-orange/30',
  '异常': 'bg-dashboard-red/10 text-dashboard-red border-dashboard-red/30',
};

const STATUS_DOT = {
  '正常': 'bg-dashboard-green',
  '预警': 'bg-dashboard-orange',
  '异常': 'bg-dashboard-red',
};

export const SupervisionCard: React.FC = () => {
  return (
    <PanelCard title="事前监管" className="h-full">
      <div className="grid grid-cols-2 gap-2 h-full content-start">
        {supervisionData.map((item) => (
          <div
            key={item.indicator}
            className={cn(
              'border rounded-sm p-2.5 transition-all hover:shadow-md',
              STATUS_STYLES[item.status]
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium">{item.indicator}</span>
              <div className="flex items-center gap-1">
                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[item.status])} />
                <span className="text-[10px]">{item.status}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold tabular-nums">{item.value}</span>
              <span className="text-[10px] opacity-70">阈值: {item.threshold}</span>
            </div>
            <div className="text-[10px] mt-1 opacity-60">{item.description}</div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
};
