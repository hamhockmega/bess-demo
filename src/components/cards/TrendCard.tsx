import React, { useMemo } from 'react';
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
import { fetchPriceSeries, fetchPredictedPriceSeries } from '@/data/marketPriceQueries';
import { findSeriesByMetric, type Scenario, type MetricSeries, type DataPoint } from '@/data/mockData';
import { formatIntervalTime } from '@/data/marketMetricQueries';
import { useMetricSemantics, effectiveRules, getDbStages, getDerivedStages, getAllValidStages } from '@/data/metricSemantics';
import { derivePredictionSeries } from '@/data/derivedPrediction';
import { Loader2, AlertTriangle, Info } from 'lucide-react';

const METRIC_TABS = ['日前电价-发电侧均价', '实时电价-发电侧均价', '日前中标功率', '实时中标功率'];

/** Metrics that are wired to Supabase */
const SUPABASE_METRICS = new Set(['日前电价-发电侧均价', '实时电价-发电侧均价', '直调负荷']);

/**
 * Price metrics that must be routed to market_price_points instead of market_metric_points.
 * Maps display label → { metricName in DB, priceType filter }
 */
const PRICE_METRIC_MAP: Record<string, { metricName: string; priceType: string }> = {
  '日前电价-发电侧均价': { metricName: '节点电价(全省平均)', priceType: '日前电价' },
  '实时电价-发电侧均价': { metricName: '节点电价(全省平均)', priceType: '实时电价' },
};

const SERIES_COLORS: Record<string, string> = {
  '出清前上午': CHART_COLORS.primary,
  '出清前下午': CHART_COLORS.amber,
  '出清后': CHART_COLORS.purple,
  '实际': CHART_COLORS.deep,
  '智能预测': CHART_COLORS.blue,
  '周前': CHART_COLORS.red,
  '统一结算价': CHART_COLORS.blue,
  '日前市场经济出清': CHART_COLORS.purple,
  '交易结果': CHART_COLORS.accent,
};

export const TrendCard: React.FC = () => {
  const { selectedInterval, trendMetric, trendScenario, setTrendMetric, setTrendScenario, queryDate } = useDashboardStore();

  const useSupabase = SUPABASE_METRICS.has(trendMetric);
  const priceMapping = PRICE_METRIC_MAP[trendMetric];
  const isPriceMapped = !!priceMapping;

  // ── Metric semantics ──
  const { data: semanticsData } = useMetricSemantics();
  const rules = effectiveRules(semanticsData?.rules);

  // Get valid stages from rules
  const dbStages = useMemo(() => getDbStages(rules, trendMetric), [rules, trendMetric]);
  const derivedStageRules = useMemo(() => getDerivedStages(rules, trendMetric), [rules, trendMetric]);
  const validStages = useMemo(() => getAllValidStages(rules, trendMetric), [rules, trendMetric]);

  // ── Price metric query (market_price_points) ──
  const { data: priceResult, isLoading: priceLoading, isError: priceIsError, error: priceError } = useQuery({
    queryKey: ['trendPricePoints', priceMapping?.metricName, priceMapping?.priceType, queryDate],
    queryFn: async () => {
      const result = await fetchPriceSeries(priceMapping!.metricName, priceMapping!.priceType, queryDate, '实际');
      const series: MetricSeries = {
        metricName: trendMetric,
        metricFamily: 'price',
        scenario: '实际' as Scenario,
        unit: result.unit,
        node: '全省',
        data: result.points.map(p => ({
          dateKey: queryDate,
          timeKey: p.time,
          timestamp: p.intervalIndex,
          value: p.value,
          unit: result.unit,
        })),
      };
      return {
        series: result.points.length > 0 ? [series] : [],
        isIncomplete: result.isIncomplete,
        totalRows: result.points.length,
      };
    },
    enabled: isPriceMapped,
    staleTime: 60_000,
    retry: 1,
  });

  // ── SQL-backed predicted price query (source_stage = 智能预测) ──
  const { data: sqlPredictedResult } = useQuery({
    queryKey: ['trendPredictedPrice', priceMapping?.metricName, priceMapping?.priceType, queryDate],
    queryFn: () => fetchPredictedPriceSeries(priceMapping!.metricName, priceMapping!.priceType, queryDate),
    enabled: isPriceMapped,
    staleTime: 60_000,
    retry: 1,
  });

  // ── Standard metric query (market_metric_points) ──
  const { data: supabaseResult, isLoading: metricLoading, isError: metricIsError, error: metricError } = useQuery({
    queryKey: ['trendMetricPoints', trendMetric, queryDate, dbStages],
    queryFn: () => fetchTrendMetricPoints(trendMetric, queryDate, '全省', dbStages.length > 0 ? dbStages : undefined),
    enabled: useSupabase && !isPriceMapped,
    staleTime: 60_000,
    retry: 1,
  });

  const isLoading = isPriceMapped ? priceLoading : (useSupabase ? metricLoading : false);
  const isError = isPriceMapped ? priceIsError : (useSupabase ? metricIsError : false);
  const error = isPriceMapped ? priceError : metricError;
  const queryResult = isPriceMapped ? priceResult : supabaseResult;

  // ── Fallback to mock data for non-wired metrics ──
  const mockSeries = useMemo(() => {
    if (useSupabase) return [];
    return findSeriesByMetric(trendMetric, '全省', queryDate);
  }, [trendMetric, queryDate, useSupabase]);

  // ── Unified series list with frontend-derived stages ──
  const availableSeries = useMemo(() => {
    const baseSeries = useSupabase ? (queryResult?.series ?? []) : mockSeries;

    // Add frontend-derived stages (e.g. 智能预测 for price metrics)
    const enriched = [...baseSeries];
    for (const derivedRule of derivedStageRules) {
      const sourceSeries = baseSeries.find(s => s.scenario === derivedRule.derived_from_stage);
      if (sourceSeries && !enriched.some(s => s.scenario === derivedRule.source_stage as Scenario)) {
        enriched.push(derivePredictionSeries(sourceSeries));
      }
    }
    return enriched;
  }, [useSupabase, queryResult, mockSeries, derivedStageRules]);

  const isIncomplete = useSupabase && (queryResult?.isIncomplete ?? false);
  const hasNoData = useSupabase && !isLoading && !isError && availableSeries.length === 0;

  // Dynamic scenario tabs based on rules
  const scenarioTabs = useMemo(() => {
    if (!useSupabase) {
      // For mock data, use available scenarios
      return availableSeries.map(s => s.scenario);
    }
    // For Supabase metrics, use valid stages from rules filtered to available data
    const fromRules = validStages.filter(stage =>
      availableSeries.some(s => s.scenario === stage)
    ) as Scenario[];
    // If rules yield nothing but we have data, show what's available
    if (fromRules.length === 0 && availableSeries.length > 0) {
      return availableSeries.map(s => s.scenario);
    }
    return fromRules;
  }, [useSupabase, validStages, availableSeries]);

  const hasDerived = derivedStageRules.length > 0;

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

  const stats = useMemo(() => {
    const series = availableSeries.find(s => s.scenario === trendScenario) || availableSeries[0];
    if (!series) return { avg: 0, max: 0, min: 0, sum: 0 };
    return computeStats(aggregateData(series.data, selectedInterval));
  }, [availableSeries, trendScenario, selectedInterval]);

  const unit = availableSeries[0]?.unit || '元/MWh';

  // ── Loading state ──
  if (useSupabase && isLoading) {
    return (
      <PanelCard title="行情趋势" className="h-full">
        <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">正在加载行情趋势数据…</span>
        </div>
      </PanelCard>
    );
  }

  // ── Error state ──
  if (useSupabase && isError) {
    return (
      <PanelCard title="行情趋势" className="h-full">
        <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
          <AlertTriangle className="w-6 h-6" />
          <span className="text-sm">行情趋势数据加载失败</span>
          <span className="text-xs text-muted-foreground">{(error as Error)?.message}</span>
        </div>
      </PanelCard>
    );
  }

  // ── Empty state ──
  if (hasNoData) {
    return (
      <PanelCard title="行情趋势" className="h-full">
        <div className="flex flex-col h-full gap-3">
          <DashboardTabs tabs={METRIC_TABS} activeTab={trendMetric} onTabChange={setTrendMetric} size="md" />
          <div className="flex items-center justify-center flex-1 text-muted-foreground">
            <span className="text-sm">当前日期暂无该指标数据</span>
          </div>
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="行情趋势"
      headerRight={
        <div className="flex items-center gap-2">
          <DashboardTabs
            tabs={scenarioTabs}
            activeTab={trendScenario}
            onTabChange={(t) => setTrendScenario(t as Scenario)}
          />
          <ChartInfoButton info={CHART_INFO.trend} />
        </div>
      }
      className="h-full"
    >
      <div className="flex flex-col h-full gap-3">
        <DashboardTabs tabs={METRIC_TABS} activeTab={trendMetric} onTabChange={setTrendMetric} size="md" />

        {isPriceMapped && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-600">
            <Info className="w-3.5 h-3.5" />
            数据来源：{priceMapping.metricName}（{priceMapping.priceType}）
          </div>
        )}

        {isIncomplete && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            当前场景数据不完整
          </div>
        )}

        {hasDerived && trendScenario === '智能预测' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-600">
            <Info className="w-3.5 h-3.5" />
            智能预测为前端派生展示值
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="均值" value={stats.avg} unit={unit} />
          <KpiCard label="最大值" value={stats.max} unit={unit} trend="up" />
          <KpiCard label="最小值" value={stats.min} unit={unit} trend="down" />
          <KpiCard label="累计" value={stats.sum} unit={unit} />
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="time" tick={AXIS_STYLE.tick} interval="preserveStartEnd" axisLine={AXIS_STYLE.axisLine} tickLine={false} />
              <YAxis tick={AXIS_STYLE.tick} width={55} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend {...LEGEND_STYLE} />
              {availableSeries.map(s => (
                <Line
                  key={s.scenario}
                  type="monotone"
                  dataKey={s.scenario}
                  stroke={SERIES_COLORS[s.scenario] || CHART_COLORS.slate}
                  strokeWidth={s.scenario === trendScenario ? 2.5 : 1.5}
                  dot={false}
                  animationDuration={500}
                  strokeDasharray={s.scenario === '智能预测' ? '6 3' : undefined}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PanelCard>
  );
};
