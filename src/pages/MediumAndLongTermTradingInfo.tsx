import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { toast } from 'sonner';
import { PanelCard } from '@/components/dashboard/PanelCard';
import {
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ComposedChart,
} from 'recharts';

/* ───── trade types ───── */
const TRADE_TYPES = [
  { key: 'rolling', label: '滚动撮合交易' },
  { key: 'centralBid', label: '集中竞价交易' },
  { key: 'bilateral', label: '双边协商交易' },
  { key: 'green', label: '绿电交易' },
  { key: 'govAuth', label: '政府授权合约' },
  { key: 'listing', label: '市场挂牌交易' },
] as const;

type TradeKey = (typeof TRADE_TYPES)[number]['key'];
type TimeMode = '年' | '月' | '段';

/* ───── mock data ───── */
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s & 0x7fffffff) / 0x7fffffff; };
}

function generateMockData(timeMode: TimeMode, dateStr: string) {
  const seed = dateStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRandom(seed + 1);

  const summaries: Record<TradeKey, { totalVolume: number; avgPrice: number }> = {} as any;
  TRADE_TYPES.forEach(({ key }) => {
    summaries[key] = {
      totalVolume: Math.round(rng() * 60000000 + 400000),
      avgPrice: key === 'bilateral' || key === 'govAuth' ? 0 : Math.round((rng() * 300 + 100) * 10000) / 10000,
    };
  });

  let labels: string[] = [];
  if (timeMode === '月') {
    const parts = dateStr.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1] || 7);
    const days = new Date(y, m, 0).getDate();
    for (let d = 1; d <= days; d++) labels.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  } else if (timeMode === '年') {
    const y = dateStr.slice(0, 4);
    for (let m = 1; m <= 12; m++) labels.push(`${y}-${String(m).padStart(2, '0')}`);
  } else {
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().slice(0, 10));
    }
  }

  const series: Record<TradeKey, { date: string; volume: number; avgPrice: number }[]> = {} as any;
  TRADE_TYPES.forEach(({ key }) => {
    series[key] = labels.map((label) => ({
      date: label,
      volume: Math.round(rng() * 50000 + 500),
      avgPrice: Math.round((rng() * 300 + 50) * 100) / 100,
    }));
  });

  return { summaries, series };
}

function formatVolume(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(3)} MWh`;
  return `${v.toLocaleString()} MWh`;
}

/* ───── sub-components ───── */

const TimeModeSwitch: React.FC<{ mode: TimeMode; onChange: (m: TimeMode) => void }> = ({ mode, onChange }) => (
  <div className="flex items-center gap-0.5">
    {(['年', '月', '段'] as TimeMode[]).map((m) => (
      <button
        key={m}
        onClick={() => onChange(m)}
        className={`px-3 py-1 text-xs border transition-colors ${
          mode === m
            ? 'bg-dashboard-cyan/20 text-dashboard-cyan border-dashboard-cyan/40'
            : 'border-dashboard-panel-border text-muted-foreground hover:text-foreground'
        }`}
      >
        {m}
      </button>
    ))}
  </div>
);

const TradeChart: React.FC<{
  title: string;
  data: { date: string; volume: number; avgPrice: number }[];
}> = ({ title, data }) => {
  const chartData = data.map((d) => ({ ...d, shortDate: d.date.length > 7 ? d.date.slice(5) : d.date }));
  return (
    <PanelCard title={title} className="mb-4">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 50, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 20%)" />
            <XAxis dataKey="shortDate" tick={{ fill: 'hsl(215 15% 50%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(215 25% 20%)' }} tickLine={false} interval="preserveStartEnd" angle={-30} textAnchor="end" height={45} />
            <YAxis yAxisId="left" tick={{ fill: 'hsl(215 15% 50%)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: '(成交均价：元/MWh)', position: 'insideTopLeft', fill: 'hsl(215 15% 50%)', fontSize: 10, offset: -5 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(215 15% 50%)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: '(成交电量：MWh)', position: 'insideTopRight', fill: 'hsl(215 15% 50%)', fontSize: 10, offset: -5 }} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(215 30% 12%)', border: '1px solid hsl(215 30% 22%)', borderRadius: 4, fontSize: 11 }} labelStyle={{ color: 'hsl(195 100% 85%)' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => <span className="text-muted-foreground">{v}</span>} />
            <Bar yAxisId="right" dataKey="volume" name="成交电量" fill="hsl(145 60% 45%)" barSize={14} />
            <Line yAxisId="left" type="monotone" dataKey="avgPrice" name="成交均价" stroke="hsl(210 80% 60%)" dot={false} strokeWidth={1.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  );
};

/* ───── sidebar ───── */
const SidebarGroup: React.FC<{ title: string; items: { label: string; path: string }[] }> = ({ title, items }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-xs font-medium text-foreground py-1.5 px-1 hover:bg-secondary/40 rounded-sm">
        <span className="text-dashboard-cyan text-[10px]">◆</span>
        {title}
        <span className="ml-auto text-muted-foreground text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-0.5">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`text-xs py-1.5 px-2 text-left rounded-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-dashboard-cyan/15 text-dashboard-cyan'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ label: string }> = ({ label }) => (
  <button className="flex items-center gap-2 w-full text-xs text-muted-foreground py-1.5 px-1 hover:bg-secondary/40 hover:text-foreground rounded-sm">
    <span className="text-[10px]">◆</span>
    {label}
    <span className="ml-auto text-[10px]">▼</span>
  </button>
);

/* ───── page ───── */
const MediumAndLongTermTradingInfo: React.FC = () => {
  const [timeMode, setTimeMode] = useState<TimeMode>('月');
  const [dateStr, setDateStr] = useState('2025-07');
  const [visible, setVisible] = useState<Record<TradeKey, boolean>>(
    Object.fromEntries(TRADE_TYPES.map(({ key }) => [key, true])) as Record<TradeKey, boolean>
  );

  const toggleVisible = (key: TradeKey) => setVisible((p) => ({ ...p, [key]: !p[key] }));
  const toggleAll = () => {
    const allOn = Object.values(visible).every(Boolean);
    setVisible(Object.fromEntries(TRADE_TYPES.map(({ key }) => [key, !allOn])) as Record<TradeKey, boolean>);
  };

  const { summaries, series } = useMemo(() => generateMockData(timeMode, dateStr), [timeMode, dateStr]);

  return (
    <AppShell>
      <div className="flex h-full">
        {/* Left sidebar */}
        <aside className="w-[180px] shrink-0 border-r border-dashboard-panel-border bg-card overflow-y-auto py-2 px-2 flex flex-col gap-0.5">
          <SidebarGroup
            title="交易看板"
            items={[
              { label: '现货行情看板', path: '/spotMarketBoard' },
              { label: '中长期交易信息', path: '/mediumAndLongTermTradingInfo' },
              { label: '自定义看板', path: '/customBoard' },
              { label: '数据对比', path: '/dataCompare' },
            ]}
          />
          <SidebarItem label="价格分析" />
          <SidebarItem label="省间交易" />
          <SidebarItem label="现货交易" />
          <SidebarItem label="中长期交易" />
          <SidebarItem label="收益分析" />
          <SidebarItem label="专业版功能" />
          <SidebarItem label="系统管理" />
        </aside>

        {/* Main */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Filter bar */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">标的时间：</span>
            <TimeModeSwitch mode={timeMode} onChange={setTimeMode} />
            <input
              type={timeMode === '年' ? 'number' : 'month'}
              value={timeMode === '年' ? dateStr.slice(0, 4) : dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="bg-secondary/50 border border-dashboard-panel-border text-foreground text-xs px-2 py-1 rounded-sm w-36"
            />
          </div>

          {/* Checkboxes + summary cards */}
          <div className="flex gap-4">
            <div className="shrink-0 pt-1 space-y-1.5">
              <label className="flex items-center gap-2 text-xs cursor-pointer text-dashboard-cyan font-medium">
                <input type="checkbox" checked={Object.values(visible).every(Boolean)} onChange={toggleAll} className="accent-[hsl(var(--dashboard-cyan))] w-3.5 h-3.5" />
                全部
              </label>
              {TRADE_TYPES.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer text-foreground">
                  <input type="checkbox" checked={visible[key]} onChange={() => toggleVisible(key)} className="accent-[hsl(var(--dashboard-cyan))] w-3.5 h-3.5" />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-3 xl:grid-cols-6 gap-3">
              {TRADE_TYPES.filter(({ key }) => visible[key]).map(({ key, label }) => (
                <div key={key} className="bg-secondary/30 border border-dashboard-panel-border rounded-sm p-3">
                  <h4 className="text-xs font-bold text-foreground mb-2">{label}</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>成交总量：<span className="text-foreground">{formatVolume(summaries[key].totalVolume)}</span></div>
                    <div>成交均价：<span className="text-foreground">{summaries[key].avgPrice > 0 ? `${summaries[key].avgPrice} 元/MWh` : '- 元/MWh'}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          {TRADE_TYPES.filter(({ key }) => visible[key]).map(({ key, label }) => (
            <TradeChart key={key} title={label} data={series[key]} />
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default MediumAndLongTermTradingInfo;
