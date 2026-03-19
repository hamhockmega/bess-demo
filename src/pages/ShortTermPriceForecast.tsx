import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search, Loader2, AlertTriangle, Info } from 'lucide-react';
import { ChartInfoButton, CHART_INFO } from '@/components/charts/ChartInfoButton';
import { format } from 'date-fns';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Area, AreaChart,
} from 'recharts';
import { fetchForecastPriceData, type ForecastQueryResult, type ForecastPriceSummary } from '@/data/marketMetricQueries';
import { fetchForecastData as fetchMockForecastData, type ForecastResult, type PriceSummary } from '@/data/priceForecastData';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';

type Side = 'generation' | 'consumption';

const SIDE_LABELS: Record<Side, string> = {
  generation: '发电侧',
  consumption: '用电侧',
};

const PRICE_LABELS: Record<Side, string> = {
  generation: '发电侧均价',
  consumption: '统一结算价',
};

/** Sides wired to Supabase; others fall back to mock */
const SUPABASE_SIDES = new Set<Side>(['generation']);

export default function ShortTermPriceForecast() {
  const [side, setSide] = useState<Side>('generation');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date('2025-10-01'),
    to: new Date('2025-10-31'),
  });
  const [queryVersion, setQueryVersion] = useState(0);

  const startStr = format(dateRange.from, 'yyyy-MM-dd');
  const endStr = format(dateRange.to, 'yyyy-MM-dd');
  const useSupabase = SUPABASE_SIDES.has(side);

  // ── Supabase query (source_stage = '实际' only) ──
  const { data: supabaseData, isLoading, isError, error } = useQuery({
    queryKey: ['forecastPriceData', startStr, endStr, queryVersion],
    queryFn: () => fetchForecastPriceData(startStr, endStr),
    enabled: useSupabase,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Mock fallback for consumption side ──
  const mockData: ForecastResult = useMemo(() => {
    if (useSupabase) return { accuracy: 0, period: '', points: [], dailyAvg: [], summaries: [] };
    void queryVersion;
    return fetchMockForecastData(startStr, endStr, side);
  }, [startStr, endStr, side, queryVersion, useSupabase]);

  // ── Unified data shape ──
  const data = useMemo(() => {
    if (!useSupabase) return mockData;
    if (!supabaseData) return { accuracy: 0, period: `${startStr} 至 ${endStr}`, points: [] as any[], dailyAvg: [] as any[], summaries: [] as any[], isIncomplete: false };
    return supabaseData;
  }, [useSupabase, supabaseData, mockData, startStr, endStr]);

  const isIncomplete = useSupabase && (supabaseData?.isIncomplete ?? false);
  const hasNoData = useSupabase && !isLoading && !isError && data.points.length === 0;

  const intradayData = useMemo(() => {
    if (data.points.length === 0) return [];
    const firstDate = data.points[0].date;
    return data.points.filter((p) => p.date === firstDate);
  }, [data]);

  // ── Loading state ──
  if (useSupabase && isLoading) {
    return (
      <AppShell>
        <div className="p-5 flex items-center justify-center h-[60vh] gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">正在加载价格分析数据…</span>
        </div>
      </AppShell>
    );
  }

  // ── Error state ──
  if (useSupabase && isError) {
    return (
      <AppShell>
        <div className="p-5 flex flex-col items-center justify-center h-[60vh] gap-2 text-destructive">
          <AlertTriangle className="w-6 h-6" />
          <span className="text-sm">价格分析数据加载失败</span>
          <span className="text-xs text-muted-foreground">{(error as Error)?.message}</span>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-5 space-y-5">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">短期价格预测</h1>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap bg-card border border-border rounded-lg px-4 py-3 panel-card">
          <span className="text-xs text-muted-foreground font-medium">日期：</span>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setQueryVersion((v) => v + 1)}
          >
            <Search className="w-3.5 h-3.5" /> 查询
          </Button>

          {/* Side toggle */}
          <div className="flex items-center gap-1 ml-auto bg-secondary p-1 rounded-lg">
            {(['generation', 'consumption'] as Side[]).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  side === s
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card'
                }`}
              >
                {SIDE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Data source notice */}
        {useSupabase && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-600">
            <Info className="w-3.5 h-3.5" />
            数据来源：实际结算数据（source_stage = 实际）
          </div>
        )}

        {/* Incomplete data warning */}
        {isIncomplete && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            当前场景数据不完整
          </div>
        )}

        {/* Empty state */}
        {hasNoData && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <span className="text-sm">未找到所选指标的场景数据</span>
          </div>
        )}

        {/* Only render charts when there is data */}
        {data.points.length > 0 && (
          <>
            {/* Section 1: 价格预测结果 */}
            <PanelCard title={`价格分析结果 (${PRICE_LABELS[side]})`} headerRight={<ChartInfoButton info={CHART_INFO.dayAheadRealTime} />}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Accuracy KPI */}
                <div className="flex flex-col items-center justify-center py-8 bg-secondary rounded-lg">
                  <span className="text-xs text-muted-foreground mb-2 font-medium">日前与实时价格一致率</span>
                  <span className="text-4xl font-bold text-primary tabular-nums">{data.accuracy}%</span>
                  <span className="text-xs text-muted-foreground mt-2">所选时段</span>
                </div>
                {/* Intraday chart */}
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={intradayData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid {...GRID_STYLE} />
                      <XAxis dataKey="time" tick={AXIS_STYLE.tick} interval={11} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
                      <YAxis tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={false} width={50}
                        label={{ value: '元/MWh', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#8A978F' } }}
                      />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend {...LEGEND_STYLE} />
                      <Line type="monotone" dataKey="dayAhead" name="日前电价(实际)" stroke={CHART_COLORS.deep} dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="realTime" name="实时电价(实际)" stroke={CHART_COLORS.amber} dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </PanelCard>

            {/* Section 2: 日均价 */}
            <PanelCard title="日均价 (元/MWh)">
              <div className="space-y-6">
                {/* Summary blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.summaries.map((s, i) => (
                    <SummaryBlock key={i} summary={s} />
                  ))}
                </div>
                {/* Daily avg bar chart */}
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailyAvg} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid {...GRID_STYLE} />
                      <XAxis dataKey="date" tick={AXIS_STYLE.tick} interval={Math.max(0, Math.floor(data.dailyAvg.length / 10) - 1)} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
                      <YAxis tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={false} width={50} />
                      <Tooltip {...TOOLTIP_STYLE} formatter={(val: number) => [`${val.toFixed(2)} 元/MWh`]} />
                      <Legend {...LEGEND_STYLE} />
                      <Bar dataKey="dayAheadAvg" name="日前均价" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="realTimeAvg" name="实时均价" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </PanelCard>

            {/* Section 3: 趋势分析 */}
            <PanelCard title="趋势分析">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <TrendKpi label="最大价差" value={computeMaxSpread(data)} unit="元/MWh" />
                  <TrendKpi label="日前均价趋势" value={computeTrend(data.dailyAvg.map((d) => d.dayAheadAvg))} unit="" trend />
                  <TrendKpi label="实时均价趋势" value={computeTrend(data.dailyAvg.map((d) => d.realTimeAvg))} unit="" trend />
                </div>
                <div className="h-56">
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
                      <CartesianGrid {...GRID_STYLE} />
                      <XAxis dataKey="date" tick={AXIS_STYLE.tick} interval={Math.max(0, Math.floor(data.dailyAvg.length / 10) - 1)} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
                      <YAxis tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={false} width={50} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend {...LEGEND_STYLE} />
                      <Area type="monotone" dataKey="dayAheadAvg" name="日前均价" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.1} />
                      <Area type="monotone" dataKey="realTimeAvg" name="实时均价" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.1} />
                      <Area type="monotone" dataKey="spread" name="日前-实时价差" stroke={CHART_COLORS.purple} fill={CHART_COLORS.purple} fillOpacity={0.08} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </PanelCard>
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ── Sub-components ── */

function SummaryBlock({ summary }: { summary: ForecastPriceSummary | PriceSummary }) {
  return (
    <div className="bg-secondary border border-border rounded-lg p-4 space-y-3">
      <div className="text-sm font-semibold text-foreground">{summary.label}</div>
      <div className="text-2xl font-bold text-primary tabular-nums">{summary.avg.toFixed(4)}</div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-card rounded-md p-2 border border-border">
          <span className="text-dashboard-red font-medium mr-1">最高</span>
          <span className="text-foreground tabular-nums font-semibold">{summary.max.toFixed(4)}</span>
          <div className="text-[10px] mt-0.5 text-muted-foreground">{summary.maxTime}</div>
        </div>
        <div className="bg-card rounded-md p-2 border border-border">
          <span className="text-dashboard-green font-medium mr-1">最低</span>
          <span className="text-foreground tabular-nums font-semibold">{summary.min.toFixed(4)}</span>
          <div className="text-[10px] mt-0.5 text-muted-foreground">{summary.minTime}</div>
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
    <div className="bg-card border border-border rounded-lg p-3 panel-card">
      <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">{label}</div>
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
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-normal border-border bg-card">
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
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

function computeMaxSpread(data: { dailyAvg: { dayAheadAvg: number; realTimeAvg: number }[] }): number {
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
