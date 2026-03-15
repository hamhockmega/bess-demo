import React, { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { KpiCard } from '../dashboard/KpiCard';
import { useDashboardStore } from '@/store/dashboardState';
import { findSeriesByMetric } from '@/data/mockData';
import { aggregateData, computeStats } from '@/data/aggregation';
import { CHART_COLORS, CHART_PALETTE, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';

const WEATHER_METRICS = ['风速', '辐照', '降水'];
const UNIT_MAP: Record<string, string> = { '风速': 'm/s', '辐照': 'W/m²', '降水': 'mm' };
const AVG_LABEL: Record<string, string> = { '风速': '全省平均风速', '辐照': '全省平均辐照', '降水': '全省平均降水' };

export const SupplyDemandCard: React.FC = () => {
  const { selectedInterval, supplyDemandMetric, setSupplyDemandMetric, queryDate } = useDashboardStore();

  const availableSeries = useMemo(
    () => findSeriesByMetric(supplyDemandMetric, '全省', queryDate),
    [supplyDemandMetric, queryDate]
  );

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

  const actualSeries = availableSeries.find(s => s.scenario === '实际');
  const stats = useMemo(() => {
    if (!actualSeries) return { avg: 0, max: 0, min: 0, sum: 0 };
    return computeStats(aggregateData(actualSeries.data, selectedInterval));
  }, [actualSeries, selectedInterval]);

  const unit = UNIT_MAP[supplyDemandMetric] || '';

  return (
    <PanelCard title="市场供需情况" className="h-full">
      <div className="flex flex-col h-full gap-3">
        <DashboardTabs tabs={WEATHER_METRICS} activeTab={supplyDemandMetric} onTabChange={setSupplyDemandMetric} size="md" />

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label={AVG_LABEL[supplyDemandMetric] || '均值'} value={stats.avg} unit={unit} />
          <KpiCard label="最大值" value={stats.max} unit={unit} trend="up" />
          <KpiCard label="最小值" value={stats.min} unit={unit} trend="down" />
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="weatherGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="time" tick={AXIS_STYLE.tick} interval="preserveStartEnd" axisLine={AXIS_STYLE.axisLine} tickLine={false} />
              <YAxis tick={AXIS_STYLE.tick} width={50} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend {...LEGEND_STYLE} />
              {availableSeries.map((s, i) => (
                <Area
                  key={s.scenario}
                  type="monotone"
                  dataKey={s.scenario}
                  stroke={CHART_PALETTE[i] || CHART_COLORS.slate}
                  fill={i === 0 ? 'url(#weatherGrad)' : 'none'}
                  strokeWidth={1.5}
                  dot={false}
                  animationDuration={500}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PanelCard>
  );
};
