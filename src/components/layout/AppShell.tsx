import React from 'react';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import iwattLogo from '@/assets/iwatt-logo.png';

const headerNavItems = [
  {
    label: '交易看板',
    path: '/spotMarketBoard',
    children: [
      { label: '现货行情看板', path: '/spotMarketBoard' },
      { label: '中长期交易信息', path: '/mediumAndLongTermTradingInfo' },
      { label: '自定义看板', path: '/customBoard' },
    ],
  },
  {
    label: '价格分析',
    path: '/shortTermPriceForecast',
    children: [
      { label: '短期价格预测', path: '/shortTermPriceForecast' },
    ],
  },
  {
    label: '现货交易',
    path: '/spotTrading/intelligentQuoteStrategy',
    children: [
      { label: '智能策略(报量报价)', path: '/spotTrading/intelligentQuoteStrategy' },
    ],
  },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeParent = headerNavItems.find((item) =>
    item.children.some((c) => location.pathname === c.path)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header — dark green enterprise bar */}
      <header
        className="h-12 shrink-0 flex items-center px-5"
        style={{
          background: 'linear-gradient(135deg, hsl(155, 53%, 22%), hsl(150, 59%, 30%))',
        }}
      >
        {/* Logo + Brand */}
        <div className="flex items-center gap-2.5 mr-10">
          <img src={iwattLogo} alt="iWatt" className="h-7 w-7 object-contain" />
          <span className="text-sm font-semibold text-white tracking-wide">iWatt ETRM</span>
        </div>

        {/* Primary nav */}
        <nav className="flex items-center gap-1 mr-auto">
          {headerNavItems.map((item) => {
            const isActive = item.children.some((c) => location.pathname === c.path);
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={cn(
                  'px-4 py-1.5 text-sm rounded-md transition-all duration-200',
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right side — user info */}
        <div className="flex items-center gap-4 text-xs text-white/80">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-accent" />
            山东 · 演示储能电站
          </span>
          <span className="text-white/60">|</span>
          <span>管理员</span>
        </div>
      </header>

      {/* Secondary nav — light surface tabs */}
      <div className="h-10 bg-card border-b border-border flex items-center px-5 shrink-0">
        {activeParent?.children.map((child) => {
          const isActive = location.pathname === child.path;
          return (
            <button
              key={child.path}
              onClick={() => navigate(child.path)}
              className={cn(
                'px-4 py-2 text-sm transition-all duration-200 relative',
                isActive
                  ? 'text-primary font-medium tab-active-indicator'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {child.label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};
