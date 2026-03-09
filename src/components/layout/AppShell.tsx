import React from 'react';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';

const boardNavItems = [
  { label: '交易看板', path: '/tradingBoard' },
  { label: '现货行情看板', path: '/spotMarketBoard' },
  { label: '中长期交易信息', path: '/longTermTrading' },
  { label: '自定义看板', path: '/customBoard' },
];

const moduleNavItems = [
  '数据对比', '价格分析', '省间交易', '现货交易', '中长期交易', '收益分析', '系统管理'
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-dashboard-bg">
      {/* Top Header */}
      <header className="h-10 bg-dashboard-header border-b border-dashboard-panel-border flex items-center px-4 shrink-0">
        <div className="flex items-center gap-3 mr-8">
          <div className="w-2 h-2 rounded-full bg-dashboard-cyan shadow-[0_0_6px_hsl(var(--dashboard-cyan))]" />
          <h1 className="text-sm font-bold text-foreground tracking-wider">ETRM交易与风险管理系统</h1>
        </div>

        {/* Board nav */}
        <nav className="flex items-center gap-0.5 mr-auto">
          {boardNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'px-3 py-1.5 text-xs transition-all duration-200 relative',
                location.pathname === item.path
                  ? 'text-dashboard-cyan tab-active-indicator'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-dashboard-green" />
            山东电网 · 某风电场
          </span>
          <span>管理员</span>
        </div>
      </header>

      {/* Secondary module nav */}
      <div className="h-8 bg-dashboard-nav border-b border-dashboard-panel-border flex items-center px-4 shrink-0">
        {moduleNavItems.map((item, i) => (
          <button
            key={item}
            className={cn(
              'px-3 py-1 text-xs transition-colors',
              i === 3 ? 'text-dashboard-cyan' : 'text-muted-foreground hover:text-foreground'
            )}
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
