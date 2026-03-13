import React from 'react';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';

const boardNavItems = [
  {
    label: '交易看板',
    path: '/spotMarketBoard',
    children: [
      { label: '价格分析', path: '/spotMarketBoard' },
      { label: '现货交易', path: '/mediumAndLongTermTradingInfo' },
    ],
  },
  { label: '收益分析', path: '/customBoard' },
];

const moduleNavItems = [
  '现货行情看板', '中长期交易信息', '自定义看板', '数据对比',
];


export const AppShell: React.FC<{children: React.ReactNode;}> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Find active top-level item (check children paths too)
  const activeParent = boardNavItems.find((item) =>
    item.children
      ? item.children.some((c) => location.pathname === c.path)
      : location.pathname === item.path
  );

  return (
    <div className="min-h-screen flex flex-col bg-dashboard-bg">
      {/* Top Header */}
      <header className="h-10 bg-dashboard-header border-b border-dashboard-panel-border flex items-center px-4 shrink-0">
        <div className="flex items-center gap-3 mr-8">
          <div className="w-2 h-2 rounded-full bg-dashboard-cyan shadow-[0_0_6px_hsl(var(--dashboard-cyan))]" />
          <h1 className="text-sm font-bold text-foreground tracking-wider">演示交易与管理系统</h1>
        </div>

        {/* Board nav */}
        <nav className="flex items-center gap-0.5 mr-auto">
          {boardNavItems.map((item) => {
            const isActive = item.children
              ? item.children.some((c) => location.pathname === c.path)
              : location.pathname === item.path;

            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={cn(
                  'px-3 py-1.5 text-xs transition-all duration-200 relative',
                  isActive
                    ? 'text-dashboard-cyan tab-active-indicator'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-dashboard-green" />
            山东 · 演示储能电站
          </span>
          <span>管理员</span>
        </div>
      </header>

      {/* Secondary nav: show children of active parent, then module items */}
      <div className="h-8 bg-dashboard-nav border-b border-dashboard-panel-border flex items-center px-4 shrink-0">
        {activeParent?.children && activeParent.children.map((child) => (
          <button
            key={child.path}
            onClick={() => navigate(child.path)}
            className={cn(
              'px-3 py-1 text-xs transition-colors',
              location.pathname === child.path
                ? 'text-dashboard-cyan'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {child.label}
          </button>
        ))}
        {activeParent?.children && (
          <span className="w-px h-3 bg-dashboard-panel-border mx-1" />
        )}
        {moduleNavItems.map((item) => (
          <button
            key={item}
            className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};