/**
 * Strategy Performance Evaluation - data model and mock generator
 */

export interface StrategyPerformance {
  strategyId: string;
  expectedRevenue: number;        // 预期收益 (元)
  awardProbability: number;       // 中标概率 (%)
  chargeEnergy: number;           // 充电电量 (MWh)
  dischargeEnergy: number;        // 放电电量 (MWh)
  averageChargePrice: number;     // 平均充电电价 (元/MWh)
  averageDischargePrice: number;  // 平均放电电价 (元/MWh)
  chargingEfficiency: number;     // 充电效率 (%)
  dischargingEfficiency: number;  // 放电效率 (%)
  otherCosts: number;             // 其它成本 (元)
  // Computed
  chargingCost: number;           // 充电电费 (元)
  storedEnergy: number;           // 实际可存储电量 (MWh)
  effectiveDischargeEnergy: number; // 实际有效放电电量 (MWh)
  dischargeRevenue: number;       // 放电收益 (元)
  grossArbitrageIncome: number;   // 套利毛收益 (元)
  netProfit: number;              // 净收益 (元)
  riskLevel: '低' | '中' | '高';
}

export interface RevenueBreakdownItem {
  label: string;
  value: number;
  type: 'cost' | 'revenue' | 'net';
}

/**
 * Generate a performance evaluation for the current strategy
 * All derived values are computed from base parameters to ensure consistency.
 */
export function generateStrategyPerformance(
  strategyId: string,
  lossCostValue: number,
): StrategyPerformance {
  // Base mock values (simulating realistic BESS operation)
  const chargeEnergy = 180 + Math.round(Math.random() * 20);        // ~180-200 MWh
  const averageChargePrice = 140 + Math.round(Math.random() * 30);   // ~140-170 元/MWh
  const averageDischargePrice = 380 + Math.round(Math.random() * 80); // ~380-460 元/MWh
  const chargingEfficiency = 95;  // %
  const dischargingEfficiency = 94; // %
  const awardProbability = 72 + Math.round(Math.random() * 15);      // 72-87%
  const otherCosts = lossCostValue * chargeEnergy * 0.05; // simplified: loss cost × energy × factor

  // Computed values (严格按照物理逻辑链计算)
  const chargingCost = chargeEnergy * averageChargePrice;
  const storedEnergy = Math.round(chargeEnergy * (chargingEfficiency / 100) * 100) / 100;
  const effectiveDischargeEnergy = Math.round(storedEnergy * (dischargingEfficiency / 100) * 100) / 100;
  const dischargeRevenue = Math.round(effectiveDischargeEnergy * averageDischargePrice * 100) / 100;
  const grossArbitrageIncome = Math.round((dischargeRevenue - chargingCost) * 100) / 100;
  const netProfit = Math.round((grossArbitrageIncome - otherCosts) * 100) / 100;

  const riskLevel: '低' | '中' | '高' =
    awardProbability >= 80 ? '低' : awardProbability >= 65 ? '中' : '高';

  return {
    strategyId,
    expectedRevenue: netProfit,
    awardProbability,
    chargeEnergy,
    dischargeEnergy: effectiveDischargeEnergy,
    averageChargePrice,
    averageDischargePrice,
    chargingEfficiency,
    dischargingEfficiency,
    otherCosts: Math.round(otherCosts * 100) / 100,
    chargingCost: Math.round(chargingCost * 100) / 100,
    storedEnergy,
    effectiveDischargeEnergy,
    dischargeRevenue,
    grossArbitrageIncome,
    netProfit,
    riskLevel,
  };
}

export function getRevenueBreakdown(perf: StrategyPerformance): RevenueBreakdownItem[] {
  return [
    { label: '充电电费', value: -perf.chargingCost, type: 'cost' },
    { label: '放电收益', value: perf.dischargeRevenue, type: 'revenue' },
    { label: '峰谷价差套利毛收益', value: perf.grossArbitrageIncome, type: 'revenue' },
    { label: '其它成本（损耗修正等）', value: -perf.otherCosts, type: 'cost' },
    { label: '净收益', value: perf.netProfit, type: 'net' },
  ];
}
