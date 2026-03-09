import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { KpiCard } from '../dashboard/KpiCard';
import { useDashboardStore } from '@/store/dashboardState';
import { findSeriesByMetric, type Scenario } from '@/data/mockData';
import { aggregateData, computeStats } from '@/data/aggregation';

const METRIC_TABS = ['日前电价-发电侧均价', '实时电价-发电侧均价', '日前中标功率', '实时中标功率'];
const SCENARIO_TABS: Scenario[] = ['出清前上午', '出清前下午', '出清后', '实际', '智能预测'];

const SERIES_COLORS: Record<string, string> = {
  '出清前上午': 'hsl(185, 80%, 50%)',
  '出清前下午': 'hsl(45, 90%, 60%)',
  '出清后': 'hsl(270, 50%, 55%)',
  '实际': 'hsl(145, 60%, 45%)',
  '智能预测': 'hsl(30, 80%, 55%)',
  '周前': 'hsl(0, 70%, 55%)',
  '统一结算价': 'hsl(200, 70%, 55%)',
  '日前市场经济出清': 'hsl(320, 50%, 55%)',
  '交易结果': 'hsl(160, 50%, 55%)',
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
        <DashboardTabs tabs={SCENARIO_TABS.filter(s => availableScenarios.includes(s))} activeTab={trendScenario} onTabChange={(t) => setTrendScenario(t as Scenario)} />
      }
      className="h-full"
    >
      <div className="flex flex-col h-full gap-2">
        <DashboardTabs tabs={METRIC_TABS} activeTab={trendMetric} onTabChange={setTrendMetric} size="md" />

        <div className="grid grid-cols-4 gap-2">
          <KpiCard label="均值" value={stats.avg} unit={unit} />
          <KpiCard label="最大值" value={stats.max} unit={unit} trend="up" />
          <KpiCard label="最小值" value={stats.min} unit={unit} trend="down" />
          <KpiCard label="累计" value={stats.sum} unit={unit} />
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 18%)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} width={55} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(215, 30%, 12%)',
                  border: '1px solid hsl(215, 30%, 22%)',
                  borderRadius: '4px',
                  fontSize: 11,
                  color: 'hsl(195, 60%, 80%)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {availableSeries.map(s => (
                <Line
                  key={s.scenario}
                  type="monotone"
                  dataKey={s.scenario}
                  stroke={SERIES_COLORS[s.scenario] || '#888'}
                  strokeWidth={s.scenario === trendScenario ? 2 : 1}
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
