import React, { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { KpiCard } from '../dashboard/KpiCard';
import { useDashboardStore } from '@/store/dashboardState';
import { supabase } from '@/integrations/supabase/client';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';
import { Loader2, AlertTriangle } from 'lucide-react';

const WEATHER_METRICS = ['风速', '辐照', '降水'];
const UNIT_MAP: Record<string, string> = { '风速': 'm/s', '辐照': 'W/m²', '降水': 'mm' };
const AVG_LABEL: Record<string, string> = { '风速': '全省平均风速', '辐照': '全省平均辐照', '降水': '全省平均降水' };

const WEATHER_DB_MAP: Record<string, string> = {
  '风速': '风速(风电装机容量加权)',
  '辐照': '辐照(光伏装机容量加权)',
  '降水': '降水量(全省算术平均)',
};

function formatIntervalLabel(idx: number): string {
  const h = Math.floor(idx / 4);
  const m = (idx % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const SupplyDemandCard: React.FC = () => {
  const { supplyDemandMetric, setSupplyDemandMetric, queryDate } = useDashboardStore();

  const dbMetricName = WEATHER_DB_MAP[supplyDemandMetric];

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ['supplyDemandReal', dbMetricName, queryDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_metric_points')
        .select('interval_index, value')
        .eq('metric_name', dbMetricName)
        .eq('scenario_date', queryDate)
        .eq('source_stage', '实际')
        .order('interval_index', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!dbMetricName,
    staleTime: 60_000,
    retry: 1,
  });

  const hasData = !!rows && rows.length > 0;
  const isIncomplete = hasData && rows.length < 96;

  const chartData = useMemo(() => {
    if (!hasData) return [];
    return rows.map(r => ({
      time: formatIntervalLabel(r.interval_index),
      '实际': Number(r.value),
    }));
  }, [rows, hasData]);

  const stats = useMemo(() => {
    if (!hasData) return { avg: 0, max: 0, min: 0 };
    const vals = rows.map(r => Number(r.value));
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      avg: Math.round((sum / vals.length) * 100) / 100,
      max: Math.round(Math.max(...vals) * 100) / 100,
      min: Math.round(Math.min(...vals) * 100) / 100,
    };
  }, [rows, hasData]);

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

        {isIncomplete && (
          <div className="text-xs text-amber-500 text-center">当前场景数据不完整（{rows.length}/96）</div>
        )}

        {isLoading && (
          <div className="flex-1 min-h-0 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">正在加载市场供需数据…</span>
          </div>
        )}

        {isError && (
          <div className="flex-1 min-h-0 flex items-center justify-center gap-1 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">市场供需数据加载失败</span>
          </div>
        )}

        {!isLoading && !isError && !hasData && (
          <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground">
            <span className="text-xs">当前指标暂无可用场景数据</span>
          </div>
        )}

        {!isLoading && !isError && hasData && (
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
                <Area
                  type="monotone"
                  dataKey="实际"
                  stroke={CHART_COLORS.primary}
                  fill="url(#weatherGrad)"
                  strokeWidth={1.5}
                  dot={false}
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </PanelCard>
  );
};
