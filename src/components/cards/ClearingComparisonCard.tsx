import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { SummaryTable } from '../dashboard/SummaryTable';
import { useDashboardStore } from '@/store/dashboardState';
import { getDataForDate } from '@/data/mockData';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';

const VIEW_TABS = ['图表', '表格'];
const SCENARIOS = ['出清前上午', '出清前下午', '出清后', '实际'] as const;

const BAR_COLORS = {
  '出清前上午': CHART_COLORS.primary,
  '出清前下午': CHART_COLORS.amber,
  '出清后': CHART_COLORS.purple,
  '实际': CHART_COLORS.deep,
};

export const ClearingComparisonCard: React.FC = () => {
  const { clearingViewType, setClearingViewType, queryDate } = useDashboardStore();
  const clearingComparisonData = useMemo(() => getDataForDate(queryDate).clearingComparison, [queryDate]);
  const [selectedMetrics, setSelectedMetrics] = useState(['日前均价', '日前最高价', '日前最低价']);

  const chartData = useMemo(() => {
    return clearingComparisonData
      .filter(r => selectedMetrics.includes(r.metric))
      .map(r => ({
        metric: r.metric,
        出清前上午: r.出清前上午,
        出清前下午: r.出清前下午,
        出清后: r.出清后,
        实际: r.实际,
      }));
  }, [selectedMetrics]);

  const tableColumns = [
    { key: 'metric', label: '指标' },
    { key: 'unit', label: '单位' },
    { key: '出清前上午', label: '出清前上午' },
    { key: '出清前下午', label: '出清前下午' },
    { key: '出清后', label: '出清后' },
    { key: '实际', label: '实际' },
    { key: 'diff', label: '偏差' },
  ];

  const tableRows = clearingComparisonData.map(r => ({
    metric: r.metric,
    unit: r.unit,
    出清前上午: r.出清前上午.toLocaleString(),
    出清前下午: r.出清前下午.toLocaleString(),
    出清后: r.出清后.toLocaleString(),
    实际: <span className="text-primary font-semibold">{r.实际.toLocaleString()}</span>,
    diff: <span className={r.实际 > r.出清后 ? 'text-dashboard-red' : 'text-dashboard-green'}>
      {((r.实际 - r.出清后) / r.出清后 * 100).toFixed(1)}%
    </span>,
  }));

  return (
    <PanelCard
      title="出清前后对比"
      headerRight={
        <DashboardTabs
          tabs={VIEW_TABS}
          activeTab={clearingViewType === 'chart' ? '图表' : '表格'}
          onTabChange={(t) => setClearingViewType(t === '图表' ? 'chart' : 'table')}
        />
      }
      className="h-full"
    >
      {clearingViewType === 'chart' ? (
        <div className="h-full flex flex-col gap-3">
          <div className="flex gap-1 flex-wrap">
            {clearingComparisonData.map(r => (
              <button
                key={r.metric}
                onClick={() => setSelectedMetrics(prev =>
                  prev.includes(r.metric) ? prev.filter(m => m !== r.metric) : [...prev, r.metric]
                )}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  selectedMetrics.includes(r.metric)
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground bg-secondary border border-transparent'
                }`}
              >
                {r.metric}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="metric" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
                <YAxis tick={AXIS_STYLE.tick} width={60} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend {...LEGEND_STYLE} />
                {SCENARIOS.map(s => (
                  <Bar key={s} dataKey={s} fill={BAR_COLORS[s]} animationDuration={500} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <SummaryTable columns={tableColumns} rows={tableRows} className="h-full" />
      )}
    </PanelCard>
  );
};
