import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Area, AreaChart,
} from 'recharts';
import { fetchForecastData, type ForecastResult, type PriceSummary } from '@/data/priceForecastData';

type Side = 'generation' | 'consumption';

const SIDE_LABELS: Record<Side, string> = {
  generation: '发电侧',
  consumption: '用电侧',
};

const PRICE_LABELS: Record<Side, string> = {
  generation: '发电侧均价',
  consumption: '统一结算价',
};

export default function ShortTermPriceForecast() {
  const [side, setSide] = useState<Side>('generation');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date('2025-10-01'),
    to: new Date('2025-10-31'),
  });
  const [queryVersion, setQueryVersion] = useState(0);

  const data: ForecastResult = useMemo(() => {
    void queryVersion; // dependency
    return fetchForecastData(
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd'),
      side,
    );
  }, [dateRange, side, queryVersion]);

  // Chart data: pick first day for intraday chart
  const intradayData = useMemo(() => {
    if (data.points.length === 0) return [];
    const firstDate = data.points[0].date;
    return data.points.filter((p) => p.date === firstDate);
  }, [data]);

  return (
    <AppShell>
      <div className="p-4 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">日期：</span>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setQueryVersion((v) => v + 1)}
          >
            <Search className="w-3 h-3" /> 查询
          </Button>
        </div>

        {/* Side tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-0">
          {(['generation', 'consumption'] as Side[]).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`px-4 py-1.5 text-xs transition-colors relative ${
                side === s
                  ? 'text-primary tab-active-indicator'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {SIDE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Section 1: 价格预测结果 */}
        <PanelCard title={`价格预测结果(${PRICE_LABELS[side]})`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Accuracy KPI */}
            <div className="flex flex-col items-center justify-center py-6">
              <span className="text-xs text-muted-foreground mb-2">日前预测值准确率</span>
              <span className="text-3xl font-bold text-foreground tabular-nums">{data.accuracy}%</span>
              <span className="text-xs text-muted-foreground mt-1">所选时段</span>
            </div>
            {/* Intraday chart */}
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={intradayData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 20%)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 9, fill: 'hsl(215, 15%, 50%)' }}
                    interval={11}
                    axisLine={{ stroke: 'hsl(215, 25%, 20%)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'hsl(215, 15%, 50%)' }}
                    axisLine={{ stroke: 'hsl(215, 25%, 20%)' }}
                    tickLine={false}
                    width={50}
                    label={{ value: '元/MWh', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'hsl(215, 15%, 50%)' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(215, 30%, 14%)',
                      border: '1px solid hsl(215, 25%, 20%)',
                      borderRadius: '4px',
                      fontSize: 11,
                      color: 'hsl(195, 60%, 80%)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="dayAhead" name="日前电价(预测)" stroke="hsl(185, 80%, 50%)" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="realTime" name="实时电价(预测)" stroke="hsl(30, 80%, 55%)" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </PanelCard>

        {/* Section 2: 日均价 */}
        <PanelCard title="日均价 (元/MWh)">
          <div className="space-y-6">
            {/* Summary blocks — 2x2 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.summaries.map((s, i) => (
                <SummaryBlock key={i} summary={s} />
              ))}
            </div>
            {/* Daily avg bar chart */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyAvg} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 20%)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: 'hsl(215, 15%, 50%)' }}
                    interval={Math.max(0, Math.floor(data.dailyAvg.length / 10) - 1)}
                    axisLine={{ stroke: 'hsl(215, 25%, 20%)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'hsl(215, 15%, 50%)' }}
                    axisLine={{ stroke: 'hsl(215, 25%, 20%)' }}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(215, 30%, 14%)',
                      border: '1px solid hsl(215, 25%, 20%)',
                      borderRadius: '4px',
                      fontSize: 11,
                      color: 'hsl(195, 60%, 80%)',
                    }}
                    formatter={(val: number) => [`${val.toFixed(2)} 元/MWh`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="dayAheadAvg" name="日前均价" fill="hsl(185, 80%, 50%)" opacity={0.8} />
                  <Bar dataKey="realTimeAvg" name="实时均价" fill="hsl(30, 80%, 55%)" opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </PanelCard>

        {/* Section 3: 趋势分析 */}
        <PanelCard title="趋势分析">
          <div className="space-y-4">
            {/* Spread (价差) trend */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <TrendKpi label="最大价差" value={computeMaxSpread(data)} unit="元/MWh" />
              <TrendKpi label="日前均价趋势" value={computeTrend(data.dailyAvg.map((d) => d.dayAheadAvg))} unit="" trend />
              <TrendKpi label="实时均价趋势" value={computeTrend(data.dailyAvg.map((d) => d.realTimeAvg))} unit="" trend />
            </div>
            {/* Area chart: spread over time */}
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.dailyAvg.map((d) => ({
                    date: d.date,
                    spread: Math.round((d.dayAheadAvg - d.realTimeAvg) * 100) / 100,
                    dayAheadAvg: d.dayAheadAvg,
                    realTimeAvg: d.realTimeAvg,
                  }))}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 20%)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: 'hsl(215, 15%, 50%)' }}
                    interval={Math.max(0, Math.floor(data.dailyAvg.length / 10) - 1)}
                    axisLine={{ stroke: 'hsl(215, 25%, 20%)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'hsl(215, 15%, 50%)' }}
                    axisLine={{ stroke: 'hsl(215, 25%, 20%)' }}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(215, 30%, 14%)',
                      border: '1px solid hsl(215, 25%, 20%)',
                      borderRadius: '4px',
                      fontSize: 11,
                      color: 'hsl(195, 60%, 80%)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="dayAheadAvg" name="日前均价" stroke="hsl(185, 80%, 50%)" fill="hsl(185, 80%, 50%)" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="realTimeAvg" name="实时均价" stroke="hsl(30, 80%, 55%)" fill="hsl(30, 80%, 55%)" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="spread" name="日前-实时价差" stroke="hsl(270, 50%, 55%)" fill="hsl(270, 50%, 55%)" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </PanelCard>
      </div>
    </AppShell>
  );
}

/* ── Sub-components ── */

function SummaryBlock({ summary }: { summary: PriceSummary }) {
  return (
    <div className="bg-secondary/30 border border-border rounded-sm p-3 space-y-2">
      <div className="text-xs font-medium text-foreground">{summary.label}</div>
      <div className="text-2xl font-bold text-primary tabular-nums">{summary.avg.toFixed(4)}</div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="text-dashboard-red mr-1">最高</span>
          <span className="text-foreground tabular-nums">{summary.max.toFixed(4)}</span>
          <div className="text-[10px] mt-0.5">{summary.maxTime}</div>
        </div>
        <div>
          <span className="text-dashboard-green mr-1">最低</span>
          <span className="text-foreground tabular-nums">{summary.min.toFixed(4)}</span>
          <div className="text-[10px] mt-0.5">{summary.minTime}</div>
        </div>
      </div>
    </div>
  );
}

function TrendKpi({ label, value, unit, trend }: { label: string; value: number; unit: string; trend?: boolean }) {
  const color = trend
    ? value > 0 ? 'text-dashboard-red' : value < 0 ? 'text-dashboard-green' : 'text-foreground'
    : 'text-foreground';
  const display = trend
    ? `${value > 0 ? '↑' : value < 0 ? '↓' : '→'} ${Math.abs(value).toFixed(2)}%`
    : `${value.toFixed(2)} ${unit}`;
  return (
    <div className="bg-secondary/30 border border-border rounded-sm p-2">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>{display}</div>
    </div>
  );
}

function DateRangePicker({
  value,
  onChange,
}: {
  value: { from: Date; to: Date };
  onChange: (v: { from: Date; to: Date }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({ from: value.from, to: value.to });

  const handleSelect = (r: { from?: Date; to?: Date } | undefined) => {
    if (!r) return;
    setRange(r);
    if (r.from && r.to) {
      onChange({ from: r.from, to: r.to });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 font-normal border-border">
          <CalendarIcon className="w-3 h-3" />
          {format(value.from, 'yyyy-MM-dd')} 至 {format(value.to, 'yyyy-MM-dd')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range as any}
          onSelect={handleSelect as any}
          numberOfMonths={2}
          defaultMonth={value.from}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ── Computed helpers ── */

function computeMaxSpread(data: ForecastResult): number {
  if (data.dailyAvg.length === 0) return 0;
  const spreads = data.dailyAvg.map((d) => Math.abs(d.dayAheadAvg - d.realTimeAvg));
  return Math.round(Math.max(...spreads) * 100) / 100;
}

function computeTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const first = values.slice(0, Math.ceil(values.length / 3));
  const last = values.slice(-Math.ceil(values.length / 3));
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgLast = last.reduce((a, b) => a + b, 0) / last.length;
  if (avgFirst === 0) return 0;
  return Math.round(((avgLast - avgFirst) / Math.abs(avgFirst)) * 10000) / 100;
}
