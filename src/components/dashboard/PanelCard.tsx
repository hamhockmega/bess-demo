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
        'bg-card border border-border rounded-lg panel-card flex flex-col',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      <div className={cn('flex-1 p-4', bodyClassName)}>{children}</div>
    </div>
  );
};
