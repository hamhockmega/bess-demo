import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { KpiCard } from '../dashboard/KpiCard';
import { useDashboardStore } from '@/store/dashboardState';
import type { Scenario } from '@/data/mockData';
import { aggregateData, computeStats } from '@/data/aggregation';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';
import { ChartInfoButton, CHART_INFO } from '@/components/charts/ChartInfoButton';
import { fetchTrendMetricPoints } from '@/data/marketMetricQueries';
import { Loader2, AlertTriangle } from 'lucide-react';

const LOAD_METRICS = ['直调负荷', '全网负荷', '联络线受电负荷'];
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

  // Fetch from Supabase via fetchTrendMetricPoints
  const { data: queryResult, isLoading, isError, error } = useQuery({
    queryKey: ['typicalCurve', curveMetric, queryDate],
    queryFn: () => fetchTrendMetricPoints(curveMetric, queryDate),
    staleTime: 60_000,
  });

  const availableSeries = queryResult?.series ?? [];
  const isIncomplete = queryResult?.isIncomplete ?? false;

  const chartData = useMemo(() => {
    const displayed = availableSeries.filter(s => activeScenarios.includes(s.scenario));
    if (displayed.length === 0) return [];
    const firstAgg = aggregateData(displayed[0].data, selectedInterval);
    return firstAgg.map((point, i) => {
      const row: Record<string, string | number> = { time: point.timeKey };
      displayed.forEach(s => {
        const agg = aggregateData(s.data, selectedInterval);
        row[s.scenario] = agg[i]?.value ?? 0;
      });
      return row;
    });
  }, [availableSeries, activeScenarios, selectedInterval]);

  const actualSeries = availableSeries.find(s => s.scenario === '实际');
  const stats = useMemo(() => {
    if (!actualSeries) return { avg: 0, max: 0, min: 0, sum: 0 };
    return computeStats(aggregateData(actualSeries.data, selectedInterval));
  }, [actualSeries, selectedInterval]);

  const toggleScenario = (s: Scenario) => {
    setActiveScenarios(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <PanelCard title={`典型曲线 - ${curveMetric}`} className="h-full">
        <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">正在加载典型曲线数据…</span>
        </div>
      </PanelCard>
    );
  }

  // Error state
  if (isError) {
    return (
      <PanelCard title={`典型曲线 - ${curveMetric}`} className="h-full">
        <div className="flex items-center justify-center h-full gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">典型曲线数据加载失败：{(error as Error)?.message ?? '未知错误'}</span>
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/50 text-accent-foreground text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            当前场景数据不完整
          </div>
        )}

        {availableSeries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            未找到所选指标的场景数据
          </div>
        ) : (
          <>
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
                  {activeScenarios.map(scenario => {
                    const s = availableSeries.find(x => x.scenario === scenario);
                    if (!s) return null;
                    return (
                      <Line
                        key={scenario}
                        type="monotone"
                        dataKey={scenario}
                        stroke={SERIES_COLORS[scenario] || CHART_COLORS.slate}
                        strokeWidth={scenario === '实际' ? 2.5 : 1.5}
                        dot={false}
                        animationDuration={500}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </PanelCard>
  );
};
