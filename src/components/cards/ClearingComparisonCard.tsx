import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { SummaryTable } from '../dashboard/SummaryTable';
import { useDashboardStore } from '@/store/dashboardState';
import { getDataForDate } from '@/data/mockData';

const VIEW_TABS = ['图表', '表格'];
const SCENARIOS = ['出清前上午', '出清前下午', '出清后', '实际'] as const;

const BAR_COLORS = {
  '出清前上午': 'hsl(185, 80%, 50%)',
  '出清前下午': 'hsl(45, 90%, 60%)',
  '出清后': 'hsl(270, 50%, 55%)',
  '实际': 'hsl(145, 60%, 45%)',
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
    实际: <span className="text-dashboard-cyan font-medium">{r.实际.toLocaleString()}</span>,
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
        <div className="h-full flex flex-col gap-2">
          <div className="flex gap-1 flex-wrap">
            {clearingComparisonData.map(r => (
              <button
                key={r.metric}
                onClick={() => setSelectedMetrics(prev =>
                  prev.includes(r.metric) ? prev.filter(m => m !== r.metric) : [...prev, r.metric]
                )}
                className={`px-2 py-0.5 text-xs rounded-sm transition-all ${
                  selectedMetrics.includes(r.metric)
                    ? 'bg-dashboard-cyan/20 text-dashboard-cyan border border-dashboard-cyan/40'
                    : 'text-muted-foreground bg-secondary/30 border border-transparent'
                }`}
              >
                {r.metric}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 18%)" />
                <XAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} />
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
                {SCENARIOS.map(s => (
                  <Bar key={s} dataKey={s} fill={BAR_COLORS[s]} animationDuration={500} />
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
