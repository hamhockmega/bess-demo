import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import type { ReviewResult } from '@/data/reviewData';

interface Props {
  result: ReviewResult;
}

export const StrategyReviewComparison: React.FC<Props> = ({ result }) => {
  const items = [
    {
      label: '预期收益',
      expected: result.expectedProfit != null ? `${result.expectedProfit.toLocaleString()} 元` : '—',
      reviewed: `${result.netProfit.toLocaleString()} 元`,
      color: result.expectedProfit != null && result.netProfit >= result.expectedProfit ? 'text-dashboard-green' : 'text-dashboard-red',
    },
    {
      label: '收益偏差',
      expected: '—',
      reviewed: result.profitDeviation != null
        ? `${result.profitDeviation >= 0 ? '+' : ''}${result.profitDeviation.toLocaleString()} 元`
        : '—',
      color: result.profitDeviation != null && result.profitDeviation >= 0 ? 'text-dashboard-green' : 'text-dashboard-red',
    },
    {
      label: '预期中标概率 / 复盘执行率',
      expected: result.expectedAwardProbability != null ? `${result.expectedAwardProbability}%` : '—',
      reviewed: `${result.reviewedExecutionRate}%`,
      color: result.expectedAwardProbability != null && result.reviewedExecutionRate >= result.expectedAwardProbability * 0.8
        ? 'text-dashboard-green'
        : 'text-dashboard-orange',
    },
    {
      label: '执行充电时段数',
      expected: '—',
      reviewed: `${result.chargeIntervalCount} 个时段`,
      color: 'text-foreground',
    },
    {
      label: '执行放电时段数',
      expected: '—',
      reviewed: `${result.dischargeIntervalCount} 个时段`,
      color: 'text-foreground',
    },
    {
      label: '复盘模式',
      expected: '—',
      reviewed: result.reviewMode === 'schedule-point' ? '时段策略复盘' : '触发价格复盘',
      color: 'text-foreground',
    },
  ];

  return (
    <PanelCard title="前一日策略 Review">
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-3 bg-muted/40 px-3 py-2 border-b border-border">
          <span className="text-[11px] font-semibold text-foreground">指标</span>
          <span className="text-[11px] font-semibold text-foreground text-center">策略预期</span>
          <span className="text-[11px] font-semibold text-foreground text-center">复盘结果</span>
        </div>
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-3 px-3 py-2.5 border-b border-border last:border-0">
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
            <span className="text-[11px] text-center text-dashboard-slate tabular-nums">{item.expected}</span>
            <span className={`text-[11px] text-center font-medium tabular-nums ${item.color}`}>
              {item.reviewed}
            </span>
          </div>
        ))}
      </div>
    </PanelCard>
  );
};
