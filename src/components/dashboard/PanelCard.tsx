import React from 'react';
import { cn } from '@/lib/utils';

interface PanelCardProps {
  title: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const PanelCard: React.FC<PanelCardProps> = ({
  title,
  children,
  headerRight,
  className,
  bodyClassName,
}) => {
  return (
    <div
      className={cn(
        'bg-card border border-dashboard-panel-border rounded-sm panel-glow flex flex-col',
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-dashboard-panel-border bg-secondary/20">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3.5 bg-dashboard-cyan rounded-full" />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      <div className={cn('flex-1 p-3', bodyClassName)}>{children}</div>
    </div>
  );
};
