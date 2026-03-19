import React, { useState } from 'react';
import { PanelCard } from '../dashboard/PanelCard';
import { DashboardTabs } from '../dashboard/DashboardTabs';
import { SummaryTable } from '../dashboard/SummaryTable';
import { tariffCoefficients, tariffMiscMonthly, tariffTransmissionPrices } from '@/data/mockData';
import type { TariffMiscMonthlyItem } from '@/data/mockData';

const MONTHS = tariffCoefficients.map(r => r.month);
const PERIOD_COLORS: Record<string, string> = {
  '深谷': 'text-dashboard-purple',
  '谷': 'text-dashboard-blue',
  '平': 'text-foreground',
  '峰': 'text-dashboard-orange',
  '尖峰': 'text-dashboard-red',
};

const MISC_ITEMS: (keyof TariffMiscMonthlyItem)[] = [
  '容量补偿电价', '上网环节线损', '系统运行费', '政府性基金及附加',
];

const MONTH_TO_KEY: Record<string, string> = {
  '1月': '2026-01', '2月': '2026-02', '3月': '2026-03', '4月': '2026-04',
  '5月': '2026-05', '6月': '2026-06', '7月': '2026-07', '8月': '2026-08',
  '9月': '2026-09', '10月': '2026-10', '11月': '2026-11', '12月': '2026-12',
};

// Group transmission prices by category
const transmissionCategories = [...new Set(tariffTransmissionPrices.map(r => r.category))];

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

  const monthKey = MONTH_TO_KEY[selectedMonth];
  const monthData = monthKey ? tariffMiscMonthly[monthKey] ?? null : null;

  const miscMonthlyColumns = [
    { key: 'item', label: '项目' },
    { key: 'value', label: '单价' },
    { key: 'unit', label: '单位' },
  ];

  const miscMonthlyRows = MISC_ITEMS.map(item => ({
    item,
    value: monthData && monthData[item] != null
      ? <span>{monthData[item]}</span>
      : <span className="text-muted-foreground">待补充</span>,
    unit: '元/MWh',
  }));

  const transmissionColumns = [
    { key: 'category', label: '类型' },
    { key: 'level', label: '电压等级' },
    { key: 'value', label: '价格' },
    { key: 'unit', label: '单位' },
  ];

  const transmissionRows = tariffTransmissionPrices.map((r, i) => {
    const isFirstInGroup = i === 0 || tariffTransmissionPrices[i - 1].category !== r.category;
    return {
      category: isFirstInGroup
        ? <span className="font-medium text-foreground">{r.category}</span>
        : <span className="text-muted-foreground/50">{r.category}</span>,
      level: r.level,
      value: r.value,
      unit: r.unit,
    };
  });

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
      <div className="flex flex-col h-full gap-3 overflow-y-auto">
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
            <div className="text-[11px] text-muted-foreground mt-1">
              2026年山东峰谷系数全年统一，月度差异主要体现在分时时段划分。
            </div>
          </>
        ) : (
          <>
            {/* Block A: 月度杂项费用 */}
            <div className="text-xs text-muted-foreground font-medium mb-1">
              月度杂项费用（{selectedMonth}）
            </div>
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
            {!monthData && (
              <div className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2 mb-1">
                当前月份暂无已核实的官方数据，显示为「待补充」。
              </div>
            )}
            <SummaryTable columns={miscMonthlyColumns} rows={miscMonthlyRows} />

            {/* Block B: 输配电价 */}
            <div className="text-xs text-muted-foreground font-medium mt-3 mb-1">
              输配电价（按电压等级）
            </div>
            <SummaryTable columns={transmissionColumns} rows={transmissionRows} />
          </>
        )}
      </div>
    </PanelCard>
  );
};
