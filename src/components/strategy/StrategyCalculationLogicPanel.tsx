import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import type { StrategyPerformance } from '@/data/strategyPerformanceData';

interface Props {
  perf: StrategyPerformance;
}

export const StrategyCalculationLogicPanel: React.FC<Props> = ({ perf }) => {
  return (
    <div className="space-y-4">
      <PanelCard title="计算逻辑说明">
        <div className="text-[11px] text-muted-foreground leading-relaxed space-y-3">
          <div>
            <div className="text-xs font-semibold text-foreground mb-1">1. 充电电费计算</div>
            <p>充电电价 = 用户侧统一结算点电价（该价格为储能电站充电时的结算价格）</p>
            <p className="mt-1 text-foreground font-medium">
              充电电费 = 充电电量 × 平均充电电价 = {perf.chargeEnergy} MWh × {perf.averageChargePrice} 元/MWh = {perf.chargingCost.toLocaleString()} 元
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground mb-1">2. BESS损耗修正</div>
            <p>电池从电网侧充入的电量需要考虑充电效率，实际可存储电量低于充入电量。</p>
            <p className="mt-1">实际可存储电量 = 充电电量 × 充电效率 = {perf.chargeEnergy} × {perf.chargingEfficiency}% = <strong className="text-foreground">{perf.storedEnergy} MWh</strong></p>
            <p className="mt-1">最终可释放到市场侧的放电电量需要进一步考虑放电效率。</p>
            <p>实际有效放电电量 = 实际可存储电量 × 放电效率 = {perf.storedEnergy} × {perf.dischargingEfficiency}% = <strong className="text-foreground">{perf.effectiveDischargeEnergy} MWh</strong></p>
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground mb-1">3. 放电收益计算</div>
            <p>放电电价 = 门前节点电价（该价格为储能电站放电时按所在节点出清的结算价格）</p>
            <p className="mt-1 text-foreground font-medium">
              放电收益 = 有效放电电量 × 平均放电电价 = {perf.effectiveDischargeEnergy} MWh × {perf.averageDischargePrice} 元/MWh = {perf.dischargeRevenue.toLocaleString()} 元
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground mb-1">4. 套利毛收益</div>
            <p className="text-foreground font-medium">
              套利毛收益 = 放电收益 - 充电电费 = {perf.dischargeRevenue.toLocaleString()} - {perf.chargingCost.toLocaleString()} = {perf.grossArbitrageIncome.toLocaleString()} 元
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground mb-1">5. 净收益</div>
            <p>其它成本包括设备折旧分摊、运维费用、损耗补偿等。</p>
            <p className="mt-1 text-foreground font-medium">
              净收益 = 套利毛收益 - 其它成本 = {perf.grossArbitrageIncome.toLocaleString()} - {perf.otherCosts.toLocaleString()} = {perf.netProfit.toLocaleString()} 元
            </p>
          </div>
        </div>
      </PanelCard>

      <PanelCard title="演示讲解参考">
        <div className="text-[11px] text-muted-foreground leading-relaxed bg-secondary border border-border rounded-lg p-4">
          <p className="mb-2">
            "本策略基于日前价格预测，在低价时段安排充电 <strong className="text-foreground">{perf.chargeEnergy} MWh</strong>，
            平均充电电价为 <strong className="text-foreground">{perf.averageChargePrice} 元/MWh</strong>；
            在高价时段安排放电，平均放电电价为 <strong className="text-foreground">{perf.averageDischargePrice} 元/MWh</strong>。"
          </p>
          <p className="mb-2">
            "考虑到电池系统的充电效率 {perf.chargingEfficiency}% 和放电效率 {perf.dischargingEfficiency}%，
            综合效率约为 {((perf.chargingEfficiency / 100) * (perf.dischargingEfficiency / 100) * 100).toFixed(1)}%，
            实际有效放电电量为 <strong className="text-foreground">{perf.effectiveDischargeEnergy} MWh</strong>。"
          </p>
          <p className="mb-2">
            "预计峰谷价差套利毛收益为 <strong className="text-foreground">{perf.grossArbitrageIncome.toLocaleString()} 元</strong>，
            扣除其它成本 {perf.otherCosts.toLocaleString()} 元后，
            净收益为 <strong className={perf.netProfit >= 0 ? 'text-dashboard-green' : 'text-dashboard-red'}>{perf.netProfit.toLocaleString()} 元</strong>。"
          </p>
          <p>
            "当前策略中标概率为 <strong className="text-foreground">{perf.awardProbability}%</strong>，
            风险等级为<strong className="text-foreground">{perf.riskLevel}</strong>。
            整体策略在收益和安全性之间取得了合理平衡。"
          </p>
        </div>
      </PanelCard>
    </div>
  );
};
