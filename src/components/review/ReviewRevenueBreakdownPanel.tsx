import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import type { ReviewResult } from '@/data/reviewData';

interface Props {
  result: ReviewResult;
}

export const ReviewRevenueBreakdownPanel: React.FC<Props> = ({ result }) => {
  const otherCosts = result.grossArbitrageIncome - result.netProfit;

  const rows = [
    { label: '充电电费', value: -result.chargingCost, desc: '充电电量 × 用户侧统一结算点电价（各时段加权求和）' },
    { label: '放电收益', value: result.dischargeRevenue, desc: '有效放电电量 × 门前节点电价（各时段加权求和）' },
    { label: '峰谷价差套利毛收益', value: result.grossArbitrageIncome, desc: '放电收益 - 充电电费' },
    { label: '其它成本', value: -otherCosts, desc: '包含损耗修正、运维、辅助服务等综合成本' },
    { label: '净收益', value: result.netProfit, desc: '套利毛收益 - 其它成本' },
  ];

  return (
    <PanelCard title="收益测算拆解">
      <div className="space-y-3">
        {/* Loss explanation */}
        <div className="bg-secondary border border-border rounded-lg p-3">
          <div className="text-[11px] font-semibold text-primary mb-1">损耗修正说明</div>
          <div className="text-[11px] text-muted-foreground leading-relaxed space-y-0.5">
            <p>本次复盘中，充电电量从电网侧充入后需经过充电效率折减，得到实际可存储电量；</p>
            <p>放电时，储存电量再经过放电效率折减，最终形成可交付市场的有效放电电量。</p>
            <p>• 充电电量（电网侧）：{result.chargeEnergy.toFixed(1)} MWh</p>
            <p>• 实际可存储电量：{result.effectiveStoredEnergy.toFixed(1)} MWh</p>
            <p>• 有效放电电量（市场侧）：{result.effectiveDischargedEnergy.toFixed(1)} MWh</p>
          </div>
        </div>

        {/* Breakdown table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_120px] bg-muted/40 px-3 py-2 border-b border-border">
            <span className="text-[11px] font-semibold text-foreground">项目</span>
            <span className="text-[11px] font-semibold text-foreground text-right">金额（元）</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_120px] px-3 py-2.5 border-b border-border last:border-0 ${
                row.label === '净收益' ? 'bg-primary/5 font-semibold' : ''
              }`}
            >
              <div>
                <span className="text-[11px] text-foreground">{row.label}</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">{row.desc}</p>
              </div>
              <span
                className={`text-[11px] text-right tabular-nums font-medium self-center ${
                  row.value >= 0 ? 'text-dashboard-green' : 'text-dashboard-red'
                }`}
              >
                {row.value >= 0 ? '+' : ''}{row.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  );
};
