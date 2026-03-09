import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { KpiCard } from '../dashboard/KpiCard';
import { useDashboardStore } from '@/store/dashboardState';
import { findSeriesByMetric, type Scenario } from '@/data/mockData';
import { aggregateData, computeStats } from '@/data/aggregation';

const LOAD_METRICS = ['直调负荷', '全网负荷', '联络线受电负荷'];
const SCENARIO_TABS: Scenario[] = ['出清前上午', '出清前下午', '出清后', '实际', '周前', '智能预测'];

const SERIES_COLORS: Record<string, string> = {
  '出清前上午': 'hsl(185, 80%, 50%)',
  '出清前下午': 'hsl(45, 90%, 60%)',
  '出清后': 'hsl(270, 50%, 55%)',
  '实际': 'hsl(145, 60%, 45%)',
  '周前': 'hsl(0, 70%, 55%)',
  '智能预测': 'hsl(30, 80%, 55%)',
};

export const TypicalCurveCard: React.FC = () => {
  const { selectedInterval, curveMetric, setCurveMetric, queryDate } = useDashboardStore();
  const [activeScenarios, setActiveScenarios] = useState<Scenario[]>(['出清前上午', '出清后', '实际']);

  const availableSeries = useMemo(
    () => findSeriesByMetric(curveMetric, '全省', queryDate),
    [curveMetric, queryDate]
  );

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

  return (
    <PanelCard
      title={`典型曲线 - ${curveMetric}`}
      headerRight={
        <div className="flex gap-1">
          {SCENARIO_TABS.map(s => (
            <button
              key={s}
              onClick={() => toggleScenario(s)}
              className={`px-2 py-0.5 text-xs rounded-sm transition-all ${
                activeScenarios.includes(s)
                  ? 'bg-dashboard-cyan/20 text-dashboard-cyan border border-dashboard-cyan/40'
                  : 'text-muted-foreground bg-secondary/30 border border-transparent hover:bg-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      }
      className="h-full"
    >
      <div className="flex flex-col h-full gap-2">
        <DashboardTabs tabs={LOAD_METRICS} activeTab={curveMetric} onTabChange={setCurveMetric} size="md" />

        <div className="grid grid-cols-3 gap-2">
          <KpiCard label="日均值" value={stats.avg} unit="MW" />
          <KpiCard label="日最大" value={stats.max} unit="MW" trend="up" />
          <KpiCard label="日最小" value={stats.min} unit="MW" trend="down" />
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 18%)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} width={60} />
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
              {activeScenarios.map(scenario => {
                const s = availableSeries.find(x => x.scenario === scenario);
                if (!s) return null;
                return (
                  <Line
                    key={scenario}
                    type="monotone"
                    dataKey={scenario}
                    stroke={SERIES_COLORS[scenario] || '#888'}
                    strokeWidth={scenario === '实际' ? 2 : 1.5}
                    dot={false}
                    animationDuration={500}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PanelCard>
  );
};
