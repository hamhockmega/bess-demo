import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { KpiCard } from '../dashboard/KpiCard';
import { useDashboardStore } from '@/store/dashboardState';
import { findSeriesByMetric, type Scenario } from '@/data/mockData';
import { aggregateData, computeStats } from '@/data/aggregation';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';

const METRIC_TABS = ['日前电价-发电侧均价', '实时电价-发电侧均价', '日前中标功率', '实时中标功率'];
const SCENARIO_TABS: Scenario[] = ['出清前上午', '出清前下午', '出清后', '实际', '智能预测'];

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

  const availableSeries = useMemo(() => findSeriesByMetric(trendMetric, '全省', queryDate), [trendMetric, queryDate]);
  const availableScenarios = useMemo(() => availableSeries.map(s => s.scenario), [availableSeries]);

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

  return (
    <PanelCard
      title="行情趋势"
      headerRight={
        <div className="flex items-center gap-2">
          <DashboardTabs tabs={SCENARIO_TABS.filter(s => availableScenarios.includes(s))} activeTab={trendScenario} onTabChange={(t) => setTrendScenario(t as Scenario)} />
          <ChartInfoButton info={CHART_INFO.trend} />
        </div>
      }
      className="h-full"
    >
      <div className="flex flex-col h-full gap-3">
        <DashboardTabs tabs={METRIC_TABS} activeTab={trendMetric} onTabChange={setTrendMetric} size="md" />

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
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PanelCard>
  );
};
