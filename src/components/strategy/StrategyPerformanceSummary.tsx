import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import type { StrategyPerformance } from '@/data/strategyPerformanceData';

interface Props {
  perf: StrategyPerformance;
}

const kpis = (p: StrategyPerformance) => [
  { label: '预期收益', value: `${p.expectedRevenue.toLocaleString()} 元`, color: p.netProfit >= 0 ? 'text-dashboard-green' : 'text-dashboard-red' },
  { label: '中标概率', value: `${p.awardProbability}%`, color: p.awardProbability >= 75 ? 'text-dashboard-green' : 'text-dashboard-orange' },
  { label: '充电电量', value: `${p.chargeEnergy} MWh`, color: 'text-foreground' },
  { label: '放电电量', value: `${p.effectiveDischargeEnergy} MWh`, color: 'text-foreground' },
  { label: '平均充电电价', value: `${p.averageChargePrice} 元/MWh`, color: 'text-dashboard-slate' },
  { label: '平均放电电价', value: `${p.averageDischargePrice} 元/MWh`, color: 'text-dashboard-slate' },
  { label: '其它成本', value: `${p.otherCosts.toLocaleString()} 元`, color: 'text-dashboard-orange' },
  { label: '净收益', value: `${p.netProfit.toLocaleString()} 元`, color: p.netProfit >= 0 ? 'text-dashboard-green' : 'text-dashboard-red' },
  { label: '风险等级', value: p.riskLevel, color: p.riskLevel === '低' ? 'text-dashboard-green' : p.riskLevel === '中' ? 'text-dashboard-orange' : 'text-dashboard-red' },
];

export const StrategyPerformanceSummary: React.FC<Props> = ({ perf }) => {
  const items = kpis(perf);

  return (
    <PanelCard title="策略建议与性能评估">
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
