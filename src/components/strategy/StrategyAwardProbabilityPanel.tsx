import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import type { StrategyPerformance } from '@/data/strategyPerformanceData';

interface Props {
  perf: StrategyPerformance;
}

export const StrategyAwardProbabilityPanel: React.FC<Props> = ({ perf }) => {
  return (
    <PanelCard title="中标概率说明">
      <div className="space-y-4">
        {/* Probability gauge */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center bg-secondary border border-border rounded-lg px-6 py-4">
            <span className="text-[10px] text-muted-foreground font-medium mb-1">当前策略中标概率</span>
            <span
              className={`text-3xl font-bold tabular-nums ${
                perf.awardProbability >= 80
                  ? 'text-dashboard-green'
                  : perf.awardProbability >= 65
                  ? 'text-dashboard-orange'
                  : 'text-dashboard-red'
              }`}
            >
              {perf.awardProbability}%
            </span>
            <span
              className={`text-[10px] mt-1 font-medium ${
                perf.riskLevel === '低'
                  ? 'text-dashboard-green'
                  : perf.riskLevel === '中'
                  ? 'text-dashboard-orange'
                  : 'text-dashboard-red'
              }`}
            >
              风险等级：{perf.riskLevel}
            </span>
          </div>

          <div className="flex-1 text-[11px] text-muted-foreground leading-relaxed space-y-2">
            <p>
              <strong className="text-foreground">中标概率</strong>指当前申报的报量报价策略在现货市场出清过程中被接受的可能性。
              系统根据历史出清数据、当前市场供需预测以及本策略的报价水平综合计算得出。
            </p>
            <p>
              中标概率越高，通常意味着当前申报价格和电量更容易被市场接受。
              但<strong className="text-foreground">中标概率高并不必然意味着收益最高</strong>，
              还需要结合价差空间、损耗和其它成本综合判断。
            </p>
            <p>
              例如，充分压低放电报价可显著提升中标率，但可能导致单位电量收益下降。
              反之，提高放电报价可增加单位收益，但中标概率会相应降低。
              智能策略在两者之间寻求最优平衡。
            </p>
          </div>
        </div>
      </div>
    </PanelCard>
  );
};
