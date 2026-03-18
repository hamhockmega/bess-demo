import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import type { ReviewResult } from '@/data/reviewData';

interface Props {
  result: ReviewResult;
}

export const ReviewConclusionPanel: React.FC<Props> = ({ result }) => {
  return (
    <PanelCard title="复盘结论">
      <div className="bg-secondary border border-border rounded-lg p-4">
        <div className="text-xs text-foreground leading-relaxed whitespace-pre-line">
          {result.reviewConclusion}
        </div>
      </div>
      <div className="mt-3 bg-secondary/50 border border-border rounded-lg p-3">
        <div className="text-[11px] font-semibold text-primary mb-1">说明</div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          本页面为策略复盘模块，即将前一日生成的智能策略（或手动输入策略）代入目标日期的实际市场价格场景，在前端完成充放电模拟与收益测算。
          复盘结果反映的是"如果按此策略执行，在实际价格下会产生怎样的收益"，属于回溯性评估而非实时预测。
          实际场景价格来源于系统存储的历史行情数据，所有计算逻辑均在前端完成。
        </p>
      </div>
    </PanelCard>
  );
};
