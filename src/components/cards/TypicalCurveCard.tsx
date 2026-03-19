import React, { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { KpiCard } from '../dashboard/KpiCard';
import { useDashboardStore } from '@/store/dashboardState';
import { findSeriesByMetric, type Scenario } from '@/data/mockData';
import { aggregateData, computeStats } from '@/data/aggregation';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';
import { ChartInfoButton, CHART_INFO } from '@/components/charts/ChartInfoButton';
import { fetchTrendMetricPoints, fetchAvailableMetricStages } from '@/data/marketMetricQueries';
import { useMetricSemantics, effectiveRules, getDbStages, getAllValidStages } from '@/data/metricSemantics';
import { Loader2, AlertTriangle } from 'lucide-react';

const LOAD_METRICS = ['直调负荷', '全网负荷', '联络线受电负荷'];

/** Metrics wired to Supabase for this card */
const SUPABASE_METRICS = new Set(['直调负荷', '全网负荷', '联络线受电负荷']);

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

  const useSupabase = SUPABASE_METRICS.has(curveMetric);

  // ── Metric semantics ──
  const { data: semanticsData } = useMetricSemantics();
  const rules = effectiveRules(semanticsData?.rules);
  const dbStages = useMemo(() => getDbStages(rules, curveMetric), [rules, curveMetric]);
  const validStages = useMemo(() => getAllValidStages(rules, curveMetric), [rules, curveMetric]);

  // ── Dynamic stage detection: discover which stages actually have data for this date ──
  const { data: availableDbStages } = useQuery({
    queryKey: ['availableMetricStages', curveMetric, queryDate],
    queryFn: () => fetchAvailableMetricStages(curveMetric, queryDate),
    enabled: useSupabase,
    staleTime: 5 * 60_000,
  });

  // Valid scenario tabs – only stages that exist in rules AND have data
  const scenarioTabs = useMemo<Scenario[]>(() => {
    if (!useSupabase) return ['出清前上午', '出清后', '实际', '周前'];
    if (!availableDbStages || availableDbStages.length === 0) return validStages as Scenario[];
    // Filter to stages that actually have data for this date
    return validStages.filter(s => availableDbStages.includes(s)) as Scenario[];
  }, [useSupabase, validStages, availableDbStages]);

  const [activeScenarios, setActiveScenarios] = useState<Scenario[]>(['出清前上午', '出清后', '实际']);

  // ── Auto-switch active scenarios to available data ──
  useEffect(() => {
    if (!useSupabase || !availableDbStages || availableDbStages.length === 0) return;
    // If none of the active scenarios have data, switch to the first available
    const hasValidActive = activeScenarios.some(s => availableDbStages.includes(s));
    if (!hasValidActive) {
      setActiveScenarios(availableDbStages.slice(0, 3) as Scenario[]);
    }
  }, [availableDbStages, useSupabase]);

  // ── Supabase query – only fetch stages that exist ──
  const effectiveDbStages = useMemo(() => {
    if (availableDbStages && availableDbStages.length > 0) return availableDbStages;
    return dbStages.length > 0 ? dbStages : undefined;
  }, [availableDbStages, dbStages]);

  const { data: supabaseResult, isLoading, isError, error } = useQuery({
    queryKey: ['curveMetricPoints', curveMetric, queryDate, effectiveDbStages],
    queryFn: () => fetchTrendMetricPoints(curveMetric, queryDate, '全省', effectiveDbStages),
    enabled: useSupabase,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Fallback to mock data for non-wired metrics ──
  const mockSeries = useMemo(() => {
    if (useSupabase) return [];
    return findSeriesByMetric(curveMetric, '全省', queryDate);
  }, [curveMetric, queryDate, useSupabase]);

  // ── Unified series list (filtered by active scenarios) ──
  const allSeries = useMemo(() => {
    if (useSupabase) return supabaseResult?.series ?? [];
    return mockSeries;
  }, [useSupabase, supabaseResult, mockSeries]);

  const availableSeries = useMemo(
    () => allSeries.filter(s => activeScenarios.includes(s.scenario)),
    [allSeries, activeScenarios],
  );

  const isIncomplete = useSupabase && (supabaseResult?.isIncomplete ?? false);
  const hasNoData = useSupabase && !isLoading && !isError && allSeries.length === 0;

  const chartData = useMemo(() => {
    if (availableSeries.length === 0) return [];
    const firstAgg = aggregateData(availableSeries[0].data, selectedInterval);
    return firstAgg.map((point, i) => {
      const row: Record<string, string | number> = { time: point.timeKey };
      availableSeries.forEach(s => {
        const agg = aggregateData(s.data, selectedInterval);
        row[s.scenario] = agg[i]?.value ?? 0;
      });
      return row;
    });
  }, [availableSeries, selectedInterval]);

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

  // Available scenario set (only show stages present in data)
  const availableScenarioSet = useMemo(() => new Set(allSeries.map(s => s.scenario)), [allSeries]);

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
            <span className="text-sm">当前日期暂无该指标数据</span>
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
            {scenarioTabs.map(s => (
              <button
                key={s}
                onClick={() => toggleScenario(s)}
                disabled={!availableScenarioSet.has(s)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  activeScenarios.includes(s) && availableScenarioSet.has(s)
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : availableScenarioSet.has(s)
                      ? 'text-muted-foreground bg-secondary border border-transparent hover:bg-secondary/80'
                      : 'text-muted-foreground/40 bg-secondary/50 border border-transparent cursor-not-allowed'
                }`}
                title={!availableScenarioSet.has(s) ? '当前日期暂无该口径数据' : undefined}
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
              {availableSeries.map(s => (
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
