import React, { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { KpiCard } from '../dashboard/KpiCard';
import { useDashboardStore } from '@/store/dashboardState';
import { findSeriesByMetric } from '@/data/mockData';
import { aggregateData, computeStats } from '@/data/aggregation';
import { fetchCustomBoardMetric, formatIntervalTime } from '@/data/marketMetricQueries';
import { CHART_COLORS, CHART_PALETTE, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';
import { Loader2, AlertTriangle } from 'lucide-react';

const WEATHER_METRICS = ['风速', '辐照', '降水'];
const UNIT_MAP: Record<string, string> = { '风速': 'm/s', '辐照': 'W/m²', '降水': 'mm' };
const AVG_LABEL: Record<string, string> = { '风速': '全省平均风速', '辐照': '全省平均辐照', '降水': '全省平均降水' };

/**
 * Map display weather labels to real DB metric names in market_metric_points
 */
const WEATHER_DB_MAP: Record<string, string> = {
  '风速': '风速(风电装机容量加权)',
  '辐照': '辐照(光伏装机容量加权)',
  '降水': '降水量(全省算术平均)',
};

export const SupplyDemandCard: React.FC = () => {
  const { selectedInterval, supplyDemandMetric, setSupplyDemandMetric, queryDate } = useDashboardStore();

  const dbMetricName = WEATHER_DB_MAP[supplyDemandMetric];

  // ── Real data query from market_metric_points ──
  const { data: dbResult, isLoading, isError } = useQuery({
    queryKey: ['supplyDemandWeather', dbMetricName, queryDate],
    queryFn: () => fetchCustomBoardMetric(dbMetricName!, queryDate, '实际'),
    enabled: !!dbMetricName,
    staleTime: 60_000,
    retry: 1,
  });

  // Check if real data is available
  const hasRealData = !!dbResult && dbResult.points.length > 0;

  // ── Fallback to mock data if no real data ──
  const mockSeries = useMemo(() => {
    if (hasRealData) return [];
    return findSeriesByMetric(supplyDemandMetric, '全省', queryDate);
  }, [supplyDemandMetric, queryDate, hasRealData]);

  // Build chart data from real or mock
  const chartData = useMemo(() => {
    if (hasRealData) {
      return dbResult.points.map(p => ({
        time: p.time,
        '实际': p.value,
      }));
    }
    // Mock fallback
    if (mockSeries.length === 0) return [];
    const firstAgg = aggregateData(mockSeries[0].data, selectedInterval);
    return firstAgg.map((point, i) => {
      const row: Record<string, string | number> = { time: point.timeKey };
      mockSeries.forEach(s => {
        const agg = aggregateData(s.data, selectedInterval);
        row[s.scenario] = agg[i]?.value ?? 0;
      });
      return row;
    });
  }, [hasRealData, dbResult, mockSeries, selectedInterval]);

  // Stats
  const stats = useMemo(() => {
    if (hasRealData) {
      const vals = dbResult.points.map(p => p.value);
      const sum = vals.reduce((a, b) => a + b, 0);
      return {
        avg: Math.round((sum / vals.length) * 100) / 100,
        max: Math.round(Math.max(...vals) * 100) / 100,
        min: Math.round(Math.min(...vals) * 100) / 100,
        sum: Math.round(sum * 100) / 100,
      };
    }
    const actualSeries = mockSeries.find(s => s.scenario === '实际');
    if (!actualSeries) return { avg: 0, max: 0, min: 0, sum: 0 };
    return computeStats(aggregateData(actualSeries.data, selectedInterval));
  }, [hasRealData, dbResult, mockSeries, selectedInterval]);

  const unit = UNIT_MAP[supplyDemandMetric] || '';

  // Determine series keys for chart
  const seriesKeys = useMemo(() => {
    if (hasRealData) return ['实际'];
    return mockSeries.map(s => s.scenario);
  }, [hasRealData, mockSeries]);

  return (
    <PanelCard title="市场供需情况" className="h-full">
      <div className="flex flex-col h-full gap-3">
        <DashboardTabs tabs={WEATHER_METRICS} activeTab={supplyDemandMetric} onTabChange={setSupplyDemandMetric} size="md" />

        <div className="grid grid-cols-3 gap-3">
          <KpiCard label={AVG_LABEL[supplyDemandMetric] || '均值'} value={stats.avg} unit={unit} />
          <KpiCard label="最大值" value={stats.max} unit={unit} trend="up" />
          <KpiCard label="最小值" value={stats.min} unit={unit} trend="down" />
        </div>

        {isLoading && (
          <div className="flex-1 min-h-0 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">正在加载数据…</span>
          </div>
        )}

        {isError && (
          <div className="flex-1 min-h-0 flex items-center justify-center gap-1 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">数据加载失败</span>
          </div>
        )}

        {!isLoading && !isError && chartData.length === 0 && (
          <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground">
            <span className="text-xs">当前日期暂无气象数据</span>
          </div>
        )}

        {!isLoading && !isError && chartData.length > 0 && (
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
                {seriesKeys.map((key, i) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
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
        )}
      </div>
    </PanelCard>
  );
};
