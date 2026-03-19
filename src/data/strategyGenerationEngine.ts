/**
 * Scenario-driven Strategy Generation Engine
 * Heuristic SCED-like approximation for BESS spot market bidding.
 * Business logic based on 独立储能报量报价中标模型.
 *
 * DETERMINISTIC: For the same (form, scenario, forecastDate) the output is always identical.
 * Uses shared energy accounting from energyAccounting.ts for all energy/SOC calculations.
 */

import type { StrategyForm, GeneratedStrategy, QuotationSegment, SchedulePoint, PowerPoint, SocPoint, EnergyPoint } from '@/data/strategyData';
import type { ForecastScenario, ForecastInterval } from '@/data/forecastScenarioService';
import type { StrategyPerformance } from '@/data/strategyPerformanceData';
import {
  r2,
  formatIntervalTime,
  normalizeEfficiency,
  INTERVAL_HOURS,
  calcChargeEnergy,
  calcDischargeEnergy,
  calcSoc,
  calcProfit,
} from '@/data/energyAccounting';

// ── Types ──

interface IntervalDecision {
  action: '充电' | '放电' | '空闲';
  powerMw: number;
  socAfter: number;
  gridEnergyMwh: number;       // grid-side charge energy (> 0 for charge)
  storedEnergyMwh: number;     // stored into battery (> 0 for charge)
  internalEnergyMwh: number;   // drawn from battery (> 0 for discharge)
  marketDeliveredMwh: number;  // delivered to grid (> 0 for discharge)
  chargeBidPrice: number | null;
  dischargeBidPrice: number | null;
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
  const chargingEffPct = form.chargingEfficiency ?? 95;
  const dischargingEffPct = form.dischargingEfficiency ?? 94;
  const minSoc = form.minSoc;
  const maxSoc = form.maxSoc;

  let batteryMwh = (form.initialSoc / 100) * capacity;
  const decisions: IntervalDecision[] = [];

  // Track continuous action durations for minimum time constraints
  let lastAction: '充电' | '放电' | '空闲' = '空闲';
  let continuousCount = 0;
  const minChargeIntervals = Math.ceil(form.minContinuousChargeTime / INTERVAL_HOURS);
  const minDischargeIntervals = Math.ceil(form.minContinuousDischargeTime / INTERVAL_HOURS);

  for (let i = 0; i < intervals.length; i++) {
    let action: '充电' | '放电' | '空闲' = '空闲';
    let power = 0;

    // Determine candidate action based on price ranking
    const currentSocPct = calcSoc(batteryMwh, capacity, 0, 100);
    if (chargeIntervals.has(i)) {
      if (currentSocPct < maxSoc - 0.1) {
        action = '充电';
        power = chargePower;
      }
    } else if (dischargeIntervals.has(i)) {
      if (currentSocPct > minSoc + 0.1) {
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

    // Enforce minimum continuous time
    if (action !== lastAction && lastAction !== '空闲') {
      const minRequired = lastAction === '充电' ? minChargeIntervals : minDischargeIntervals;
      if (continuousCount < minRequired && continuousCount > 0) {
        if (lastAction === '充电') {
          const probe = calcChargeEnergy(chargePower, chargingEffPct, capacity, batteryMwh, maxSoc);
          if (probe.gridEnergyMwh > 0.001) {
            action = '充电';
            power = chargePower;
          }
        } else if (lastAction === '放电') {
          const probe = calcDischargeEnergy(dischargePower, dischargingEffPct, capacity, batteryMwh, minSoc);
          if (probe.internalEnergyMwh > 0.001) {
            action = '放电';
            power = dischargePower;
          }
        }
      }
    }

    // Compute energy flows using unified shared functions
    let gridEnergyMwh = 0;
    let storedEnergyMwh = 0;
    let internalEnergyMwh = 0;
    let marketDeliveredMwh = 0;

    if (action === '充电') {
      const result = calcChargeEnergy(power, chargingEffPct, capacity, batteryMwh, maxSoc);
      gridEnergyMwh = result.gridEnergyMwh;
      storedEnergyMwh = result.storedEnergyMwh;
      batteryMwh += result.storedEnergyMwh;
      if (result.gridEnergyMwh < 0.001) {
        action = '空闲';
        power = 0;
      }
    } else if (action === '放电') {
      const result = calcDischargeEnergy(power, dischargingEffPct, capacity, batteryMwh, minSoc);
      internalEnergyMwh = result.internalEnergyMwh;
      marketDeliveredMwh = result.marketDeliveredMwh;
      batteryMwh -= result.internalEnergyMwh;
      if (result.internalEnergyMwh < 0.001) {
        action = '空闲';
        power = 0;
      }
    }

    const socAfter = calcSoc(batteryMwh, capacity, minSoc, maxSoc);

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
      socAfter,
      gridEnergyMwh,
      storedEnergyMwh,
      internalEnergyMwh,
      marketDeliveredMwh,
      chargeBidPrice: action === '充电' ? chargeBidPrice : null,
      dischargeBidPrice: action === '放电' ? dischargeBidPrice : null,
    });
  }

  return decisions;
}

// ── Segment aggregation from schedule points ──

/**
 * Derive quotation segments from schedule-point decisions.
 * Groups charge and discharge intervals by bid price,
 * producing one segment per distinct (direction, bidPrice) group.
 *
 * This ensures segments are a consistent summary of the time-indexed strategy,
 * not independently generated static values.
 */
function deriveSegmentsFromDecisions(
  decisions: IntervalDecision[],
): QuotationSegment[] {
  // Collect charge segments grouped by bid price
  const chargePriceMap = new Map<number, { minPower: number; maxPower: number; count: number }>();
  const dischargePriceMap = new Map<number, { minPower: number; maxPower: number; count: number }>();

  for (const d of decisions) {
    if (d.action === '充电' && d.chargeBidPrice != null) {
      const price = d.chargeBidPrice;
      const existing = chargePriceMap.get(price);
      if (existing) {
        existing.minPower = Math.min(existing.minPower, d.powerMw);
        existing.maxPower = Math.max(existing.maxPower, d.powerMw);
        existing.count++;
      } else {
        chargePriceMap.set(price, { minPower: d.powerMw, maxPower: d.powerMw, count: 1 });
      }
    }
    if (d.action === '放电' && d.dischargeBidPrice != null) {
      const price = d.dischargeBidPrice;
      const existing = dischargePriceMap.get(price);
      if (existing) {
        existing.minPower = Math.min(existing.minPower, d.powerMw);
        existing.maxPower = Math.max(existing.maxPower, d.powerMw);
        existing.count++;
      } else {
        dischargePriceMap.set(price, { minPower: d.powerMw, maxPower: d.powerMw, count: 1 });
      }
    }
  }

  const segments: QuotationSegment[] = [];
  let segNo = 1;

  // Charge segments (negative power convention: startPower = -max, endPower = 0)
  for (const [price, info] of [...chargePriceMap.entries()].sort((a, b) => a[0] - b[0])) {
    segments.push({
      type: '充电',
      segmentNo: segNo++,
      startPower: -info.maxPower,
      endPower: 0,
      offerPrice: price,
    });
  }

  segNo = 1;
  // Discharge segments (positive power convention: startPower = 0, endPower = max)
  for (const [price, info] of [...dischargePriceMap.entries()].sort((a, b) => a[0] - b[0])) {
    segments.push({
      type: '放电',
      segmentNo: segNo++,
      startPower: 0,
      endPower: info.maxPower,
      offerPrice: price,
    });
  }

  return segments;
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
    expectedEnergyMwh: d.action === '充电' ? d.gridEnergyMwh : d.marketDeliveredMwh,
    note: null,
  }));

  // Build deterministic display series (no randomness)
  const powerSeries: PowerPoint[] = decisions.map((d, i) => {
    const iv = scenario.intervals[i];
    const signedPower = d.action === '充电' ? -d.powerMw : d.action === '放电' ? d.powerMw : 0;
    return {
      time: formatIntervalTime(i),
      quotationPower: signedPower,
      awardedPower: signedPower, // deterministic: awarded = quoted
      dayAheadPrice: iv.frontNodePrice,
    };
  });

  const socSeries: SocPoint[] = decisions.map((d, i) => ({
    time: formatIntervalTime(i),
    soc: d.socAfter,
    upperBound: form.maxSoc,
    lowerBound: form.minSoc,
  }));

  let cumEnergy = 0;
  const energySeries: EnergyPoint[] = decisions.map((d, i) => {
    // Use grid-side energy for charge (negative), market-delivered for discharge (positive)
    const signed = d.action === '充电' ? -d.gridEnergyMwh : d.action === '放电' ? d.marketDeliveredMwh : 0;
    cumEnergy += signed;
    return {
      time: formatIntervalTime(i),
      awardedEnergy: r2(signed),
      cumulativeEnergy: r2(cumEnergy),
    };
  });

  // Derive quotation segments from schedule decisions (aligned, not static)
  const quotationSegments = deriveSegmentsFromDecisions(decisions);

  const strategy: GeneratedStrategy = {
    strategyId: `STR-${forecastDate}-${form.strategyName}`,
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
    priceBenchmark: '预测场景价格',
    createdAt: new Date().toLocaleString('zh-CN'),
  };

  // Derive performance from schedule and scenario using unified accounting
  const performance = derivePerformance(form, strategy, scenario, decisions);

  return { strategy, performance };
}

function derivePerformance(
  form: StrategyForm,
  strategy: GeneratedStrategy,
  scenario: ForecastScenario,
  decisions: IntervalDecision[],
): StrategyPerformance {
  const chargingEffPct = form.chargingEfficiency ?? 95;
  const dischargingEffPct = form.dischargingEfficiency ?? 94;

  let totalGridCharge = 0;
  let totalStored = 0;
  let totalInternalDischarge = 0;
  let totalMarketDelivered = 0;
  let totalChargeCost = 0;
  let totalDischargeRevenue = 0;
  let chargeIntervalCount = 0;
  let dischargeIntervalCount = 0;

  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i];
    const iv = scenario.intervals[i];

    if (d.action === '充电') {
      totalGridCharge += d.gridEnergyMwh;
      totalStored += d.storedEnergyMwh;
      // Charge cost: grid energy × settlement price
      totalChargeCost += d.gridEnergyMwh * iv.userSettlementPrice;
      chargeIntervalCount++;
    } else if (d.action === '放电') {
      totalInternalDischarge += d.internalEnergyMwh;
      totalMarketDelivered += d.marketDeliveredMwh;
      // Discharge revenue: market delivered energy × front node price
      totalDischargeRevenue += d.marketDeliveredMwh * iv.frontNodePrice;
      dischargeIntervalCount++;
    }
  }

  const avgChargePrice = chargeIntervalCount > 0 && totalGridCharge > 0 ? r2(totalChargeCost / totalGridCharge) : 0;
  const avgDischargePrice = dischargeIntervalCount > 0 && totalMarketDelivered > 0 ? r2(totalDischargeRevenue / totalMarketDelivered) : 0;

  // Other costs: use form lossCostValue with total grid charge
  const otherCosts = r2(form.lossCostMode === '考虑' ? form.lossCostValue * totalGridCharge * 0.05 : 0);

  // Use unified profit calculation
  const profit = calcProfit(totalChargeCost, totalDischargeRevenue, otherCosts);

  // Award probability proxy: ratio of active intervals to candidate intervals
  const totalActive = chargeIntervalCount + dischargeIntervalCount;
  const awardProbability = Math.min(95, Math.max(50, Math.round((totalActive / 48) * 100)));

  const riskLevel: '低' | '中' | '高' =
    awardProbability >= 80 ? '低' : awardProbability >= 65 ? '中' : '高';

  return {
    strategyId: strategy.strategyId,
    expectedRevenue: profit.netProfit,
    awardProbability,
    chargeEnergy: r2(totalGridCharge),
    dischargeEnergy: r2(totalMarketDelivered),
    averageChargePrice: avgChargePrice,
    averageDischargePrice: avgDischargePrice,
    chargingEfficiency: chargingEffPct,
    dischargingEfficiency: dischargingEffPct,
    otherCosts,
    chargingCost: profit.chargingCost,
    storedEnergy: r2(totalStored),
    effectiveDischargeEnergy: r2(totalMarketDelivered),
    dischargeRevenue: profit.dischargeRevenue,
    grossArbitrageIncome: profit.grossArbitrageIncome,
    netProfit: profit.netProfit,
    riskLevel,
  };
}
