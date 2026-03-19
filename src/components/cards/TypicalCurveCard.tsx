import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { KpiCard } from '../dashboard/KpiCard';
import { useDashboardStore } from '@/store/dashboardState';
import { aggregateData, computeStats } from '@/data/aggregation';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';
import { ChartInfoButton, CHART_INFO } from '@/components/charts/ChartInfoButton';
import { fetchTrendMetricPoints } from '@/data/marketMetricQueries';
import { findSeriesByMetric, type Scenario } from '@/data/mockData';
import { Loader2, AlertTriangle } from 'lucide-react';

const LOAD_METRICS = ['直调负荷', '全网负荷', '联络线受电负荷'];

/** Metrics wired to Supabase for 典型曲线 */
const SUPABASE_METRICS = new Set(['直调负荷', '全网负荷', '联络线受电负荷']);

const SCENARIO_TABS: Scenario[] = ['出清前上午', '出清前下午', '出清后', '实际', '周前', '智能预测'];

const SERIES_COLORS: Record<string, string> = {
  '出清前上午': CHART_COLORS.primary,
  '出清前下午': CHART_COLORS.amber,
  '出清后': CHART_COLORS.purple,
  '实际': CHART_COLORS.deep,
  '周前': CHART_COLORS.red,
  '智能预测': CHART_COLORS.blue,
};

export const TypicalCurveCard: React.FC = () => {
  const { selectedInterval, curveMetric, setCurveMetric, queryDate } = useDashboardStore();
  const [activeScenarios, setActiveScenarios] = useState<Scenario[]>(['出清前上午', '出清后', '实际']);

  const useSupabase = SUPABASE_METRICS.has(curveMetric);

  // ── Supabase query ──
  const { data: supabaseResult, isLoading, isError, error } = useQuery({
    queryKey: ['curveMetricPoints', curveMetric, queryDate],
    queryFn: () => fetchTrendMetricPoints(curveMetric, queryDate),
    enabled: useSupabase,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Fallback to mock data for non-wired metrics ──
  const mockSeries = useMemo(() => {
    if (useSupabase) return [];
    return findSeriesByMetric(curveMetric, '全省', queryDate);
  }, [curveMetric, queryDate, useSupabase]);

  // ── Unified series list ──
  const allSeries = useMemo(() => {
    if (useSupabase) return supabaseResult?.series ?? [];
    return mockSeries;
  }, [useSupabase, supabaseResult, mockSeries]);

  const isIncomplete = useSupabase && (supabaseResult?.isIncomplete ?? false);
  const hasNoData = useSupabase && !isLoading && !isError && allSeries.length === 0;

  // Filter to only active scenarios
  const displayedSeries = useMemo(
    () => allSeries.filter(s => activeScenarios.includes(s.scenario)),
    [allSeries, activeScenarios],
  );

  const chartData = useMemo(() => {
    if (displayedSeries.length === 0) return [];
    const firstAgg = aggregateData(displayedSeries[0].data, selectedInterval);
    return firstAgg.map((point, i) => {
      const row: Record<string, string | number> = { time: point.timeKey };
      displayedSeries.forEach(s => {
        const agg = aggregateData(s.data, selectedInterval);
        row[s.scenario] = agg[i]?.value ?? 0;
      });
      return row;
    });
  }, [displayedSeries, selectedInterval]);

  const actualSeries = allSeries.find(s => s.scenario === '实际');
  const stats = useMemo(() => {
    if (!actualSeries) return { avg: 0, max: 0, min: 0, sum: 0 };
    return computeStats(aggregateData(actualSeries.data, selectedInterval));
  }, [actualSeries, selectedInterval]);

  const toggleScenario = (s: Scenario) => {
    setActiveScenarios(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  // ── Loading state ──
  if (useSupabase && isLoading) {
    return (
      <PanelCard title="典型曲线" className="h-full">
        <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">正在加载典型曲线数据…</span>
        </div>
      </PanelCard>
    );
  }

  // ── Error state ──
  if (useSupabase && isError) {
    return (
      <PanelCard title="典型曲线" className="h-full">
        <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
          <AlertTriangle className="w-6 h-6" />
          <span className="text-sm">典型曲线数据加载失败</span>
          <span className="text-xs text-muted-foreground">{(error as Error)?.message}</span>
        </div>
      </PanelCard>
    );
  }

  // ── Empty state ──
  if (hasNoData) {
    return (
      <PanelCard title="典型曲线" className="h-full">
        <div className="flex flex-col h-full gap-3">
          <DashboardTabs tabs={LOAD_METRICS} activeTab={curveMetric} onTabChange={setCurveMetric} size="md" />
          <div className="flex items-center justify-center flex-1 text-muted-foreground">
            <span className="text-sm">未找到所选指标的场景数据</span>
          </div>
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title={`典型曲线 - ${curveMetric}`}
      headerRight={
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {SCENARIO_TABS.map(s => (
              <button
                key={s}
                onClick={() => toggleScenario(s)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  activeScenarios.includes(s)
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground bg-secondary border border-transparent hover:bg-secondary/80'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <ChartInfoButton info={CHART_INFO.typicalCurve} />
        </div>
      }
      className="h-full"
    >
      <div className="flex flex-col h-full gap-3">
        <DashboardTabs tabs={LOAD_METRICS} activeTab={curveMetric} onTabChange={setCurveMetric} size="md" />

        {isIncomplete && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            当前场景数据不完整
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="日均值" value={stats.avg} unit="MW" />
          <KpiCard label="日最大" value={stats.max} unit="MW" trend="up" />
          <KpiCard label="日最小" value={stats.min} unit="MW" trend="down" />
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="time" tick={AXIS_STYLE.tick} interval="preserveStartEnd" axisLine={AXIS_STYLE.axisLine} tickLine={false} />
              <YAxis tick={AXIS_STYLE.tick} width={60} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend {...LEGEND_STYLE} />
              {displayedSeries.map(s => (
                <Line
                  key={s.scenario}
                  type="monotone"
                  dataKey={s.scenario}
                  stroke={SERIES_COLORS[s.scenario] || CHART_COLORS.slate}
                  strokeWidth={s.scenario === '实际' ? 2.5 : 1.5}
                  dot={false}
                  animationDuration={500}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PanelCard>
  );
};
