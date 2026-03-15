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
    <div className={cn('flex gap-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            'transition-all duration-200 whitespace-nowrap rounded-md font-medium',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            activeTab === tab
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground border border-transparent'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
