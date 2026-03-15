import React, { useState } from 'react';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { SummaryTable } from '../dashboard/SummaryTable';
import { tariffCoefficients, tariffMiscPrices } from '@/data/mockData';

const MONTHS = tariffCoefficients.map(r => r.month);
const PERIOD_COLORS: Record<string, string> = {
  '深谷': 'text-dashboard-purple',
  '谷': 'text-dashboard-blue',
  '平': 'text-foreground',
  '峰': 'text-dashboard-orange',
  '尖峰': 'text-dashboard-red',
};

export const TariffCard: React.FC = () => {
  const [activeView, setActiveView] = useState<'系数' | '杂项'>('系数');
  const [selectedMonth, setSelectedMonth] = useState('3月');

  const coeffColumns = [
    { key: 'month', label: '月份', width: '60px' },
    { key: '深谷', label: '深谷' },
    { key: '谷', label: '谷' },
    { key: '平', label: '平' },
    { key: '峰', label: '峰' },
    { key: '尖峰', label: '尖峰' },
  ];

  const coeffRows = tariffCoefficients.map(r => ({
    month: <span className={r.month === selectedMonth ? 'text-primary font-semibold' : ''}>{r.month}</span>,
    深谷: <span className={PERIOD_COLORS['深谷']}>{r.深谷}</span>,
    谷: <span className={PERIOD_COLORS['谷']}>{r.谷}</span>,
    平: <span className={PERIOD_COLORS['平']}>{r.平}</span>,
    峰: <span className={PERIOD_COLORS['峰']}>{r.峰}</span>,
    尖峰: <span className={PERIOD_COLORS['尖峰']}>{r.尖峰}</span>,
  }));

  const miscColumns = [
    { key: 'item', label: '项目' },
    { key: 'value', label: '单价' },
    { key: 'unit', label: '单位' },
  ];

  const miscRows = tariffMiscPrices.map(r => ({
    item: r.item === '合计' ? <span className="font-semibold text-primary">{r.item}</span> : r.item,
    value: r.item === '合计' ? <span className="font-semibold text-primary">{r.value}</span> : r.value,
    unit: r.unit,
  }));

  return (
    <PanelCard
      title="峰谷及杂项单价"
      headerRight={
        <DashboardTabs
          tabs={['系数', '杂项']}
          activeTab={activeView}
          onTabChange={(t) => setActiveView(t as '系数' | '杂项')}
        />
      }
      className="h-full"
    >
      <div className="flex flex-col h-full gap-3">
        {activeView === '系数' ? (
          <>
            <div className="text-xs text-muted-foreground font-medium mb-1">用户侧分时电价峰谷系数</div>
            <div className="flex gap-1 mb-2 flex-wrap">
              {MONTHS.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
                    selectedMonth === m
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <SummaryTable columns={coeffColumns} rows={coeffRows} className="flex-1" />
          </>
        ) : (
          <>
            <div className="text-xs text-muted-foreground font-medium mb-1">用户侧杂项电费单价合计 (元/MWh)</div>
            <SummaryTable columns={miscColumns} rows={miscRows} className="flex-1" />
          </>
        )}
      </div>
    </PanelCard>
  );
};
