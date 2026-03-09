import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  size = 'sm',
  className,
}) => {
  return (
    <div className={cn('flex gap-0.5', className)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            'transition-all duration-200 whitespace-nowrap border border-transparent',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            activeTab === tab
              ? 'bg-dashboard-cyan/20 text-dashboard-cyan border-dashboard-cyan/40 shadow-[0_0_8px_hsl(var(--dashboard-cyan)/0.2)]'
              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
