/**
 * Scenario-driven Strategy Generation Engine
 * Heuristic SCED-like approximation for BESS spot market bidding.
 * Business logic based on 独立储能报量报价中标模型.
 */

import type { StrategyForm, GeneratedStrategy, QuotationSegment, SchedulePoint, PowerPoint, SocPoint, EnergyPoint } from '@/data/strategyData';
import type { ForecastScenario, ForecastInterval } from '@/data/forecastScenarioService';
import type { StrategyPerformance } from '@/data/strategyPerformanceData';

// ── Types ──

interface IntervalDecision {
  action: '充电' | '放电' | '空闲';
  powerMw: number;
  socAfter: number;
  energyMwh: number;
  chargeBidPrice: number | null;
  dischargeBidPrice: number | null;
}

// ── Helpers ──

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function formatTime(intervalIndex: number): string {
  const h = Math.floor(intervalIndex / 4);
  const m = (intervalIndex % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Core heuristic engine ──

function rankIntervals(intervals: ForecastInterval[]): {
  chargeIntervals: Set<number>;
  dischargeIntervals: Set<number>;
  chargeThreshold: number;
  dischargeThreshold: number;
} {
  // Sort by front_node_price to find valley / peak intervals
  const sorted = [...intervals].sort((a, b) => a.frontNodePrice - b.frontNodePrice);
  const n = sorted.length;

  // Take bottom ~25% as charge candidates, top ~25% as discharge candidates
  const chargeCount = Math.floor(n * 0.25);
  const dischargeCount = Math.floor(n * 0.25);

  const chargeIntervals = new Set(sorted.slice(0, chargeCount).map((iv) => iv.intervalIndex));
  const dischargeIntervals = new Set(sorted.slice(n - dischargeCount).map((iv) => iv.intervalIndex));

  const chargeThreshold = sorted[chargeCount - 1]?.frontNodePrice ?? 200;
  const dischargeThreshold = sorted[n - dischargeCount]?.frontNodePrice ?? 350;

  return { chargeIntervals, dischargeIntervals, chargeThreshold, dischargeThreshold };
}

function runSchedule(
  form: StrategyForm,
  intervals: ForecastInterval[],
  chargeIntervals: Set<number>,
  dischargeIntervals: Set<number>,
  chargeBidPrice: number,
  dischargeBidPrice: number,
): IntervalDecision[] {
  const capacity = form.availableCapacity; // MWh
  const chargePower = Math.abs(form.chargePowerLimit); // MW
  const dischargePower = form.dischargePowerLimit; // MW
  const chargingEff = 0.95;
  const dischargingEff = 0.94;
  const minSoc = form.minSoc;
  const maxSoc = form.maxSoc;
  const dt = 0.25; // 15 min in hours

  let soc = form.initialSoc;
  const decisions: IntervalDecision[] = [];

  // Track continuous action durations for minimum time constraints
  let lastAction: '充电' | '放电' | '空闲' = '空闲';
  let continuousCount = 0;
  const minChargeIntervals = Math.ceil(form.minContinuousChargeTime / dt);
  const minDischargeIntervals = Math.ceil(form.minContinuousDischargeTime / dt);

  for (let i = 0; i < intervals.length; i++) {
    const iv = intervals[i];
    let action: '充电' | '放电' | '空闲' = '空闲';
    let power = 0;

    // Determine candidate action
    if (chargeIntervals.has(i)) {
      // Check SOC headroom
      const gridEnergy = chargePower * dt;
      const storedEnergy = gridEnergy * chargingEff;
      const socDelta = (storedEnergy / capacity) * 100;
      if (soc + socDelta <= maxSoc) {
        action = '充电';
        power = chargePower;
      }
    } else if (dischargeIntervals.has(i)) {
      // Check SOC floor
      const internalEnergy = dischargePower * dt;
      const socDelta = (internalEnergy / capacity) * 100;
      if (soc - socDelta >= minSoc) {
        action = '放电';
        power = dischargePower;
      }
    }

    // Enforce: within same hour, don't contradict previous action
    const currentHour = Math.floor(i / 4);
    if (decisions.length > 0) {
      const prevHour = Math.floor((i - 1) / 4);
      if (currentHour === prevHour) {
        const prevAction = decisions[decisions.length - 1].action;
        if (prevAction === '充电' && action === '放电') action = '空闲';
        if (prevAction === '放电' && action === '充电') action = '空闲';
      }
    }

    // Enforce minimum continuous time: if switching action, check if previous ran long enough
    if (action !== lastAction && lastAction !== '空闲') {
      const minRequired = lastAction === '充电' ? minChargeIntervals : minDischargeIntervals;
      if (continuousCount < minRequired && continuousCount > 0) {
        // Force continuation of previous action if SOC allows
        if (lastAction === '充电') {
          const gridEnergy = chargePower * dt;
          const storedEnergy = gridEnergy * chargingEff;
          const socDelta = (storedEnergy / capacity) * 100;
          if (soc + socDelta <= maxSoc) {
            action = '充电';
            power = chargePower;
          }
        } else if (lastAction === '放电') {
          const internalEnergy = dischargePower * dt;
          const socDelta = (internalEnergy / capacity) * 100;
          if (soc - socDelta >= minSoc) {
            action = '放电';
            power = dischargePower;
          }
        }
      }
    }

    // Update SOC
    let energyMwh = 0;
    if (action === '充电') {
      const gridEnergy = power * dt;
      const storedEnergy = gridEnergy * chargingEff;
      soc += (storedEnergy / capacity) * 100;
      soc = Math.min(maxSoc, soc);
      energyMwh = gridEnergy;
    } else if (action === '放电') {
      const internalEnergy = power * dt;
      soc -= (internalEnergy / capacity) * 100;
      soc = Math.max(minSoc, soc);
      energyMwh = internalEnergy * dischargingEff;
    }

    // Track continuous action
    if (action === lastAction) {
      continuousCount++;
    } else {
      lastAction = action;
      continuousCount = 1;
    }

    decisions.push({
      action,
      powerMw: r2(power),
      socAfter: r2(soc),
      energyMwh: r2(energyMwh),
      chargeBidPrice: action === '充电' ? chargeBidPrice : null,
      dischargeBidPrice: action === '放电' ? dischargeBidPrice : null,
    });
  }

  return decisions;
}

// ── Public API ──

export function buildStrategyFromScenario(
  form: StrategyForm,
  scenario: ForecastScenario,
  forecastDate: string,
): { strategy: GeneratedStrategy; performance: StrategyPerformance } {
  const { chargeIntervals, dischargeIntervals, chargeThreshold, dischargeThreshold } =
    rankIntervals(scenario.intervals);

  // Bid prices: charge slightly above threshold to win, discharge slightly below
  const chargeBidPrice = r2(chargeThreshold * 1.05);
  const dischargeBidPrice = r2(dischargeThreshold * 0.95);

  const decisions = runSchedule(
    form,
    scenario.intervals,
    chargeIntervals,
    dischargeIntervals,
    chargeBidPrice,
    dischargeBidPrice,
  );

  // Build schedule points
  const schedulePoints: SchedulePoint[] = decisions.map((d, i) => ({
    intervalIndex: i,
    hourIndex: Math.floor(i / 4),
    targetAction: d.action,
    targetPowerMw: d.powerMw,
    chargeBidPrice: d.chargeBidPrice,
    dischargeBidPrice: d.dischargeBidPrice,
    benchmarkPrice: scenario.intervals[i].frontNodePrice,
    expectedSocAfter: d.socAfter,
    expectedEnergyMwh: d.energyMwh,
    note: null,
  }));

  // Build display series
  const powerSeries: PowerPoint[] = decisions.map((d, i) => {
    const iv = scenario.intervals[i];
    const signedPower = d.action === '充电' ? -d.powerMw : d.action === '放电' ? d.powerMw : 0;
    return {
      time: formatTime(i),
      quotationPower: signedPower,
      awardedPower: r2(signedPower * (0.90 + Math.random() * 0.10)),
      dayAheadPrice: iv.frontNodePrice,
    };
  });

  const socSeries: SocPoint[] = decisions.map((d, i) => ({
    time: formatTime(i),
    soc: d.socAfter,
    upperBound: form.maxSoc,
    lowerBound: form.minSoc,
  }));

  let cumEnergy = 0;
  const energySeries: EnergyPoint[] = decisions.map((d, i) => {
    const signed = d.action === '充电' ? -d.energyMwh : d.action === '放电' ? d.energyMwh : 0;
    cumEnergy += signed;
    return {
      time: formatTime(i),
      awardedEnergy: r2(signed),
      cumulativeEnergy: r2(cumEnergy),
    };
  });

  // Quotation segments
  const quotationSegments: QuotationSegment[] = [
    { type: '充电', segmentNo: 1, startPower: form.chargePowerLimit, endPower: 0, offerPrice: chargeBidPrice },
    { type: '放电', segmentNo: 1, startPower: 0, endPower: form.dischargePowerLimit, offerPrice: dischargeBidPrice },
  ];

  const strategy: GeneratedStrategy = {
    strategyId: `STR-${Date.now()}`,
    strategyName: form.strategyName,
    status: '已生成',
    quotationSegments,
    schedulePoints,
    powerSeries,
    socSeries,
    energySeries,
    runtimeParameters: {
      chargePowerLimit: form.chargePowerLimit,
      dischargePowerLimit: form.dischargePowerLimit,
      socUpperLimit: form.maxSoc,
      socLowerLimit: form.minSoc,
      minContinuousChargeTime: form.minContinuousChargeTime,
      minContinuousDischargeTime: form.minContinuousDischargeTime,
      utilizationRate: form.utilizationRate,
      expectedEndSoc: form.expectedEndSoc,
    },
    priceBenchmark: '智能预测-发电侧均价',
    createdAt: new Date().toLocaleString('zh-CN'),
  };

  // Derive performance from schedule and scenario
  const performance = derivePerformance(form, strategy, scenario, decisions);

  return { strategy, performance };
}

function derivePerformance(
  form: StrategyForm,
  strategy: GeneratedStrategy,
  scenario: ForecastScenario,
  decisions: IntervalDecision[],
): StrategyPerformance {
  const chargingEff = 95; // %
  const dischargingEff = 94; // %

  let totalChargeEnergy = 0;
  let totalChargeCost = 0;
  let totalDischargeEnergy = 0;
  let totalDischargeRevenue = 0;
  let chargeIntervalCount = 0;
  let dischargeIntervalCount = 0;

  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i];
    const iv = scenario.intervals[i];

    if (d.action === '充电') {
      const gridEnergy = d.energyMwh;
      totalChargeEnergy += gridEnergy;
      totalChargeCost += gridEnergy * iv.userSettlementPrice;
      chargeIntervalCount++;
    } else if (d.action === '放电') {
      const effectiveEnergy = d.energyMwh; // already efficiency-adjusted
      totalDischargeEnergy += effectiveEnergy;
      totalDischargeRevenue += effectiveEnergy * iv.frontNodePrice;
      dischargeIntervalCount++;
    }
  }

  const avgChargePrice = chargeIntervalCount > 0 ? r2(totalChargeCost / totalChargeEnergy) : 0;
  const avgDischargePrice = dischargeIntervalCount > 0 ? r2(totalDischargeRevenue / totalDischargeEnergy) : 0;

  const otherCosts = r2(form.lossCostMode === '考虑' ? form.lossCostValue * totalChargeEnergy * 0.05 : 0);
  const storedEnergy = r2(totalChargeEnergy * (chargingEff / 100));
  const effectiveDischargeEnergy = r2(totalDischargeEnergy);
  const chargingCost = r2(totalChargeCost);
  const dischargeRevenue = r2(totalDischargeRevenue);
  const grossArbitrageIncome = r2(dischargeRevenue - chargingCost);
  const netProfit = r2(grossArbitrageIncome - otherCosts);

  // Award probability proxy: ratio of active intervals to candidate intervals
  const totalActive = chargeIntervalCount + dischargeIntervalCount;
  const awardProbability = Math.min(95, Math.max(50, Math.round((totalActive / 48) * 100)));

  const riskLevel: '低' | '中' | '高' =
    awardProbability >= 80 ? '低' : awardProbability >= 65 ? '中' : '高';

  return {
    strategyId: strategy.strategyId,
    expectedRevenue: netProfit,
    awardProbability,
    chargeEnergy: r2(totalChargeEnergy),
    dischargeEnergy: effectiveDischargeEnergy,
    averageChargePrice: avgChargePrice,
    averageDischargePrice: avgDischargePrice,
    chargingEfficiency: chargingEff,
    dischargingEfficiency: dischargingEff,
    otherCosts,
    chargingCost,
    storedEnergy,
    effectiveDischargeEnergy,
    dischargeRevenue,
    grossArbitrageIncome,
    netProfit,
    riskLevel,
  };
}
