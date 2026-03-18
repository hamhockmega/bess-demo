import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import type { ReviewResult } from '@/data/reviewData';

interface Props {
  result: ReviewResult;
}

const kpis = (r: ReviewResult) => [
  { label: '单日净收益', value: `${r.netProfit.toLocaleString()} 元`, color: r.netProfit >= 0 ? 'text-dashboard-green' : 'text-dashboard-red' },
  { label: '套利毛收益', value: `${r.grossArbitrageIncome.toLocaleString()} 元`, color: r.grossArbitrageIncome >= 0 ? 'text-dashboard-green' : 'text-dashboard-red' },
  { label: '充电电费', value: `${r.chargingCost.toLocaleString()} 元`, color: 'text-dashboard-orange' },
  { label: '放电收益', value: `${r.dischargeRevenue.toLocaleString()} 元`, color: 'text-dashboard-green' },
  { label: '充电电量', value: `${r.chargeEnergy.toFixed(1)} MWh`, color: 'text-foreground' },
  { label: '放电电量', value: `${r.dischargeEnergy.toFixed(1)} MWh`, color: 'text-foreground' },
  { label: '有效放电电量', value: `${r.effectiveDischargedEnergy.toFixed(1)} MWh`, color: 'text-dashboard-slate' },
  { label: '模拟命中率', value: `${r.simulatedHitRate}%`, color: r.simulatedHitRate >= 30 ? 'text-dashboard-green' : 'text-dashboard-orange' },
  { label: '其它成本', value: `${(r.chargingCost + r.dischargeRevenue - r.grossArbitrageIncome - r.netProfit + r.grossArbitrageIncome - r.netProfit) > 0 ? '' : ''}${(r.grossArbitrageIncome - r.netProfit).toLocaleString()} 元`, color: 'text-dashboard-orange' },
];

export const SingleDayReviewSummary: React.FC<Props> = ({ result }) => {
  const items = kpis(result);

  return (
    <PanelCard title="单日策略测算结果">
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-secondary border border-border rounded-lg p-3 text-center"
          >
            <div className="text-[10px] text-muted-foreground font-medium mb-1.5">{item.label}</div>
            <div className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
};
