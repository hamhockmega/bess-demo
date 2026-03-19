/**
 * Strategy Review (策略复盘) — Data models and review engine
 * 
 * Two review modes:
 * 1. Schedule-point-based (primary): uses saved strategy_schedule_points
 * 2. Trigger-based (fallback for manual/legacy strategies without schedule points)
 */

import type { SavedSchedulePoint } from '@/data/reviewSupabaseQueries';

// ── Types ──

export interface StrategySnapshot {
  strategyId: string;
  strategyName: string;
  strategySourceType: 'generated' | 'manual';
  strategyDate: string;
  initialSoc: number;
  socMin: number;
  socMax: number;
  chargePowerLimit: number;
  dischargePowerLimit: number;
  chargePriceTrigger: number;
  dischargePriceTrigger: number;
  chargingEfficiency: number;
  dischargingEfficiency: number;
  otherCosts: number;
  capacity: number;
  notes: string;
  generatedAt: string;
  expectedProfit?: number;
  expectedAwardProbability?: number;
}

export interface ActualScenario {
  scenarioDate: string;
  frontNodePrices: number[];
  userSettlementPrices: number[];
}

export interface IntervalResult {
  index: number;
  time: string;
  action: 'charge' | 'discharge' | 'idle';
  strategyIntent: 'charge' | 'discharge' | 'idle';
  powerMW: number;
  gridChargeEnergyMWh: number;
  effectiveStoredEnergyMWh: number;
  internalDischargeEnergyMWh: number;
  marketDeliveredEnergyMWh: number;
  socBefore: number;
  socAfter: number;
  chargePrice: number;
  dischargePrice: number;
  intervalRevenue: number;
}

export interface ReviewResult {
  strategyId: string;
  reviewDate: string;
  intervals: IntervalResult[];
  chargeIntervalCount: number;
  dischargeIntervalCount: number;
  // Explicit energy quantities
  gridChargeEnergy: number;
  effectiveStoredEnergy: number;
  internalDischargeEnergy: number;
  marketDeliveredEnergy: number;
  // Financial
  chargingCost: number;
  dischargeRevenue: number;
  grossArbitrageIncome: number;
  otherCosts: number;
  netProfit: number;
  // Execution metrics
  executionRate: number;
  // Expected vs reviewed
  expectedProfit: number | null;
  profitDeviation: number | null;
  expectedAwardProbability: number | null;
  reviewedExecutionRate: number;
  reviewConclusion: string;
  // SOC series
  socSeries: { time: string; soc: number; expectedSoc: number | null; upperBound: number; lowerBound: number }[];
  // Mode used
  reviewMode: 'schedule-point' | 'trigger-fallback';
}

// ── Helpers ──

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function formatTime(i: number): string {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Schedule-point-based review engine (primary) ──

export function runSchedulePointReview(
  strategy: StrategySnapshot,
  scenario: ActualScenario,
  schedulePoints: SavedSchedulePoint[],
): ReviewResult {
  const dt = 0.25;
  const chargingEff = strategy.chargingEfficiency / 100;
  const dischargingEff = strategy.dischargingEfficiency / 100;
  const capacity = strategy.capacity;
  const intervals: IntervalResult[] = [];
  const socSeries: ReviewResult['socSeries'] = [];

  let batteryEnergyMwh = (strategy.initialSoc / 100) * capacity;
  let totalGridCharge = 0;
  let totalEffectiveStored = 0;
  let totalInternalDischarge = 0;
  let totalMarketDelivered = 0;
  let totalChargeCost = 0;
  let totalDischargeRevenue = 0;
  let chargeCount = 0;
  let dischargeCount = 0;
  let matchedCount = 0;

  // Build index map for schedule points
  const spMap = new Map<number, SavedSchedulePoint>();
  for (const sp of schedulePoints) {
    spMap.set(sp.intervalIndex, sp);
  }

  const intervalCount = Math.min(96, scenario.frontNodePrices.length);

  console.info(`[reviewEngine] Running schedule-point review: ${intervalCount} intervals, ${schedulePoints.length} schedule points`);

  for (let i = 0; i < intervalCount; i++) {
    const chargePrice = scenario.userSettlementPrices[i] ?? 0;
    const dischargePrice = scenario.frontNodePrices[i] ?? 0;
    const socBefore = r2((batteryEnergyMwh / capacity) * 100);
    const sp = spMap.get(i);

    const strategyIntent: 'charge' | 'discharge' | 'idle' = sp?.targetAction ?? 'idle';
    let action: 'charge' | 'discharge' | 'idle' = 'idle';
    let powerMW = 0;
    let gridChargeEnergy = 0;
    let effectiveStored = 0;
    let internalDischarge = 0;
    let marketDelivered = 0;
    let intervalRevenue = 0;

    if (strategyIntent === 'charge') {
      const targetPower = sp ? Math.min(sp.targetPowerMw, strategy.chargePowerLimit) : strategy.chargePowerLimit;
      const gridEnergy = targetPower * dt;
      const stored = gridEnergy * chargingEff;
      const maxStorable = ((strategy.socMax / 100) * capacity) - batteryEnergyMwh;

      if (maxStorable > 0.001) {
        const actualStored = Math.min(stored, maxStorable);
        const actualGrid = actualStored / chargingEff;

        action = 'charge';
        powerMW = r2(actualGrid / dt);
        gridChargeEnergy = r2(actualGrid);
        effectiveStored = r2(actualStored);
        batteryEnergyMwh += actualStored;
        intervalRevenue = -(actualGrid * chargePrice);

        totalGridCharge += actualGrid;
        totalEffectiveStored += actualStored;
        totalChargeCost += actualGrid * chargePrice;
        chargeCount++;
        matchedCount++;
      }
    } else if (strategyIntent === 'discharge') {
      const targetPower = sp ? Math.min(sp.targetPowerMw, strategy.dischargePowerLimit) : strategy.dischargePowerLimit;
      const internalEnergy = targetPower * dt;
      const available = batteryEnergyMwh - ((strategy.socMin / 100) * capacity);

      if (available > 0.001) {
        const actualInternal = Math.min(internalEnergy, available);
        const delivered = actualInternal * dischargingEff;

        action = 'discharge';
        powerMW = r2(actualInternal / dt);
        internalDischarge = r2(actualInternal);
        marketDelivered = r2(delivered);
        batteryEnergyMwh -= actualInternal;
        intervalRevenue = delivered * dischargePrice;

        totalInternalDischarge += actualInternal;
        totalMarketDelivered += delivered;
        totalDischargeRevenue += delivered * dischargePrice;
        dischargeCount++;
        matchedCount++;
      }
    }
    // idle: no action

    const socAfter = r2(Math.max(strategy.socMin, Math.min(strategy.socMax, (batteryEnergyMwh / capacity) * 100)));

    intervals.push({
      index: i,
      time: formatTime(i),
      action,
      strategyIntent,
      powerMW,
      gridChargeEnergyMWh: gridChargeEnergy,
      effectiveStoredEnergyMWh: effectiveStored,
      internalDischargeEnergyMWh: internalDischarge,
      marketDeliveredEnergyMWh: marketDelivered,
      socBefore,
      socAfter,
      chargePrice,
      dischargePrice,
      intervalRevenue: r2(intervalRevenue),
    });

    socSeries.push({
      time: formatTime(i),
      soc: socAfter,
      expectedSoc: sp?.expectedSocAfter ?? null,
      upperBound: strategy.socMax,
      lowerBound: strategy.socMin,
    });
  }

  const grossArbitrage = r2(totalDischargeRevenue - totalChargeCost);
  const netProfit = r2(grossArbitrage - strategy.otherCosts);
  const intentedCount = schedulePoints.filter(sp => sp.targetAction !== 'idle').length || 1;
  const executionRate = r2((matchedCount / intentedCount) * 100);

  const expectedProfit = strategy.expectedProfit ?? null;
  const profitDeviation = expectedProfit != null ? r2(netProfit - expectedProfit) : null;
  const expectedAwardProbability = strategy.expectedAwardProbability ?? null;

  const reviewConclusion = buildReviewConclusion(
    netProfit, expectedProfit, profitDeviation,
    executionRate, expectedAwardProbability,
    chargeCount, dischargeCount,
    r2(totalChargeCost), r2(totalDischargeRevenue), strategy.otherCosts,
  );

  return {
    strategyId: strategy.strategyId,
    reviewDate: scenario.scenarioDate,
    intervals,
    chargeIntervalCount: chargeCount,
    dischargeIntervalCount: dischargeCount,
    gridChargeEnergy: r2(totalGridCharge),
    effectiveStoredEnergy: r2(totalEffectiveStored),
    internalDischargeEnergy: r2(totalInternalDischarge),
    marketDeliveredEnergy: r2(totalMarketDelivered),
    chargingCost: r2(totalChargeCost),
    dischargeRevenue: r2(totalDischargeRevenue),
    grossArbitrageIncome: grossArbitrage,
    otherCosts: strategy.otherCosts,
    netProfit,
    executionRate,
    expectedProfit,
    profitDeviation,
    expectedAwardProbability,
    reviewedExecutionRate: executionRate,
    reviewConclusion,
    socSeries,
    reviewMode: 'schedule-point',
  };
}

// ── Trigger-based fallback review (for manual or legacy strategies) ──

export function runTriggerReview(
  strategy: StrategySnapshot,
  scenario: ActualScenario,
): ReviewResult {
  const dt = 0.25;
  const chargingEff = strategy.chargingEfficiency / 100;
  const dischargingEff = strategy.dischargingEfficiency / 100;
  const capacity = strategy.capacity;
  const intervals: IntervalResult[] = [];
  const socSeries: ReviewResult['socSeries'] = [];

  let batteryEnergyMwh = (strategy.initialSoc / 100) * capacity;
  let totalGridCharge = 0;
  let totalEffectiveStored = 0;
  let totalInternalDischarge = 0;
  let totalMarketDelivered = 0;
  let totalChargeCost = 0;
  let totalDischargeRevenue = 0;
  let chargeCount = 0;
  let dischargeCount = 0;
  let triggeredCount = 0;

  const intervalCount = Math.min(96, scenario.frontNodePrices.length);

  for (let i = 0; i < intervalCount; i++) {
    const chargePrice = scenario.userSettlementPrices[i] ?? 0;
    const dischargePrice = scenario.frontNodePrices[i] ?? 0;
    const socBefore = r2((batteryEnergyMwh / capacity) * 100);

    let action: 'charge' | 'discharge' | 'idle' = 'idle';
    let powerMW = 0;
    let gridChargeEnergy = 0;
    let effectiveStored = 0;
    let internalDischarge = 0;
    let marketDelivered = 0;
    let intervalRevenue = 0;

    // Charge when settlement price <= trigger
    if (chargePrice <= strategy.chargePriceTrigger && socBefore < strategy.socMax) {
      const gridEnergy = strategy.chargePowerLimit * dt;
      const stored = gridEnergy * chargingEff;
      const maxStorable = ((strategy.socMax / 100) * capacity) - batteryEnergyMwh;

      if (maxStorable > 0.001) {
        const actualStored = Math.min(stored, maxStorable);
        const actualGrid = actualStored / chargingEff;

        action = 'charge';
        powerMW = r2(actualGrid / dt);
        gridChargeEnergy = r2(actualGrid);
        effectiveStored = r2(actualStored);
        batteryEnergyMwh += actualStored;
        intervalRevenue = -(actualGrid * chargePrice);

        totalGridCharge += actualGrid;
        totalEffectiveStored += actualStored;
        totalChargeCost += actualGrid * chargePrice;
        chargeCount++;
        triggeredCount++;
      }
    }

    // Discharge when node price >= trigger (only if not charging)
    if (action === 'idle' && dischargePrice >= strategy.dischargePriceTrigger && socBefore > strategy.socMin) {
      const internalEnergy = strategy.dischargePowerLimit * dt;
      const available = batteryEnergyMwh - ((strategy.socMin / 100) * capacity);

      if (available > 0.001) {
        const actualInternal = Math.min(internalEnergy, available);
        const delivered = actualInternal * dischargingEff;

        action = 'discharge';
        powerMW = r2(actualInternal / dt);
        internalDischarge = r2(actualInternal);
        marketDelivered = r2(delivered);
        batteryEnergyMwh -= actualInternal;
        intervalRevenue = delivered * dischargePrice;

        totalInternalDischarge += actualInternal;
        totalMarketDelivered += delivered;
        totalDischargeRevenue += delivered * dischargePrice;
        dischargeCount++;
        triggeredCount++;
      }
    }

    const socAfter = r2(Math.max(strategy.socMin, Math.min(strategy.socMax, (batteryEnergyMwh / capacity) * 100)));

    intervals.push({
      index: i,
      time: formatTime(i),
      action,
      strategyIntent: action, // In trigger mode, intent = executed action
      powerMW,
      gridChargeEnergyMWh: gridChargeEnergy,
      effectiveStoredEnergyMWh: effectiveStored,
      internalDischargeEnergyMWh: internalDischarge,
      marketDeliveredEnergyMWh: marketDelivered,
      socBefore,
      socAfter,
      chargePrice,
      dischargePrice,
      intervalRevenue: r2(intervalRevenue),
    });

    socSeries.push({
      time: formatTime(i),
      soc: socAfter,
      expectedSoc: null,
      upperBound: strategy.socMax,
      lowerBound: strategy.socMin,
    });
  }

  const grossArbitrage = r2(totalDischargeRevenue - totalChargeCost);
  const netProfit = r2(grossArbitrage - strategy.otherCosts);
  const executionRate = r2((triggeredCount / intervalCount) * 100);

  const expectedProfit = strategy.expectedProfit ?? null;
  const profitDeviation = expectedProfit != null ? r2(netProfit - expectedProfit) : null;
  const expectedAwardProbability = strategy.expectedAwardProbability ?? null;

  const reviewConclusion = buildReviewConclusion(
    netProfit, expectedProfit, profitDeviation,
    executionRate, expectedAwardProbability,
    chargeCount, dischargeCount,
    r2(totalChargeCost), r2(totalDischargeRevenue), strategy.otherCosts,
  );

  return {
    strategyId: strategy.strategyId,
    reviewDate: scenario.scenarioDate,
    intervals,
    chargeIntervalCount: chargeCount,
    dischargeIntervalCount: dischargeCount,
    gridChargeEnergy: r2(totalGridCharge),
    effectiveStoredEnergy: r2(totalEffectiveStored),
    internalDischargeEnergy: r2(totalInternalDischarge),
    marketDeliveredEnergy: r2(totalMarketDelivered),
    chargingCost: r2(totalChargeCost),
    dischargeRevenue: r2(totalDischargeRevenue),
    grossArbitrageIncome: grossArbitrage,
    otherCosts: strategy.otherCosts,
    netProfit,
    executionRate,
    expectedProfit,
    profitDeviation,
    expectedAwardProbability,
    reviewedExecutionRate: executionRate,
    reviewConclusion,
    socSeries,
    reviewMode: 'trigger-fallback',
  };
}

// ── Conclusion Builder ──

function buildReviewConclusion(
  netProfit: number,
  expectedProfit: number | null,
  deviation: number | null,
  executionRate: number,
  expectedAwardProbability: number | null,
  chargeCount: number,
  dischargeCount: number,
  chargingCost: number,
  dischargeRevenue: number,
  otherCosts: number,
): string {
  const parts: string[] = [];

  if (expectedProfit != null && deviation != null) {
    if (deviation >= 0) {
      parts.push(
        `本次复盘净收益为 ${netProfit.toLocaleString()} 元，高于策略预期收益 ${expectedProfit.toLocaleString()} 元，偏差 +${deviation.toLocaleString()} 元。实际价差条件优于预期，策略执行效果良好。`
      );
    } else {
      const absDeviation = Math.abs(deviation);
      parts.push(
        `本次复盘净收益为 ${netProfit.toLocaleString()} 元，低于策略预期收益 ${expectedProfit.toLocaleString()} 元，偏差 -${absDeviation.toLocaleString()} 元。`
      );

      if (dischargeRevenue / Math.max(chargingCost, 1) < 1.5) {
        parts.push('主要原因为实际市场峰谷价差收窄，高价放电时段的电价低于预期，导致套利空间压缩。');
      } else if (dischargeCount < 10) {
        parts.push('高价放电时段数量较少，策略放电触发条件在实际行情中匹配窗口有限。');
      } else if (chargeCount < 10) {
        parts.push('低价充电窗口不足，充电触发价格设置可能偏低，导致充电量未达预期。');
      } else {
        parts.push('损耗与其它成本对收益形成一定压缩。');
      }
    }
  } else {
    parts.push(
      `本次复盘净收益为 ${netProfit.toLocaleString()} 元。`
    );
    if (netProfit > 0) {
      parts.push('策略在实际市场场景下实现正收益。');
    } else {
      parts.push('策略在实际市场场景下未能实现正收益，建议检查触发价格参数设置。');
    }
  }

  if (expectedAwardProbability != null) {
    if (executionRate < expectedAwardProbability * 0.7) {
      parts.push(
        `复盘执行率为 ${executionRate}%，显著低于预期中标概率 ${expectedAwardProbability}%，表明实际可执行时段少于预期。`
      );
    } else if (executionRate >= expectedAwardProbability) {
      parts.push(
        `复盘执行率为 ${executionRate}%，达到或超过预期中标概率 ${expectedAwardProbability}%，策略与实际行情匹配度较高。`
      );
    } else {
      parts.push(
        `复盘执行率为 ${executionRate}%，接近预期中标概率 ${expectedAwardProbability}%，策略整体适配性合理。`
      );
    }
  }

  parts.push(
    `全天共执行充电 ${chargeCount} 个时段、放电 ${dischargeCount} 个时段。`
  );

  return parts.join('\n\n');
}

// ── Default manual strategy template ──

export function getDefaultManualStrategy(): StrategySnapshot {
  return {
    strategyId: `STR-MANUAL-${Date.now()}`,
    strategyName: '',
    strategySourceType: 'manual',
    strategyDate: new Date().toISOString().slice(0, 10),
    initialSoc: 10,
    socMin: 5,
    socMax: 95,
    chargePowerLimit: 95,
    dischargePowerLimit: 95,
    chargePriceTrigger: 200,
    dischargePriceTrigger: 350,
    chargingEfficiency: 95,
    dischargingEfficiency: 94,
    otherCosts: 500,
    capacity: 200,
    notes: '',
    generatedAt: new Date().toLocaleString('zh-CN'),
    expectedProfit: 0,
    expectedAwardProbability: 0,
  };
}
