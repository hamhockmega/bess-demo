/**
 * Strategy Review (策略复盘) — Data models, repositories, and review engine
 * 
 * Architecture:
 * - Repositories provide raw data (strategy snapshots + actual market scenarios)
 * - ReviewEngine computes all results in the frontend
 */

// ── Types ──

export interface StrategySnapshot {
  strategyId: string;
  strategyName: string;
  strategySourceType: 'generated' | 'manual';
  strategyDate: string; // YYYY-MM-DD
  initialSoc: number; // %
  socMin: number; // %
  socMax: number; // %
  chargePowerLimit: number; // MW (positive value)
  dischargePowerLimit: number; // MW
  chargePriceTrigger: number; // 元/MWh — charge when price <= this
  dischargePriceTrigger: number; // 元/MWh — discharge when price >= this
  chargingEfficiency: number; // %
  dischargingEfficiency: number; // %
  otherCosts: number; // 元
  capacity: number; // MWh — rated capacity
  notes: string;
  generatedAt: string;
  // Original expected performance (from strategy generation)
  expectedProfit?: number;
  expectedAwardProbability?: number;
}

export interface ActualScenario {
  scenarioDate: string; // YYYY-MM-DD
  /** 门前节点电价 (放电电价), 96 values for 15-min intervals */
  frontNodePrices: number[];
  /** 用户侧统一结算点电价 (充电电价), 96 values */
  userSettlementPrices: number[];
}

export interface IntervalResult {
  index: number;
  time: string;
  action: 'charge' | 'discharge' | 'idle';
  powerMW: number;
  gridEnergyMWh: number; // energy exchanged with grid
  effectiveEnergyMWh: number; // after efficiency
  socBefore: number;
  socAfter: number;
  chargePrice: number;
  dischargePrice: number;
  intervalRevenue: number; // positive = revenue, negative = cost
}

export interface ReviewResult {
  strategyId: string;
  reviewDate: string;
  intervals: IntervalResult[];
  chargeIntervalCount: number;
  dischargeIntervalCount: number;
  chargeEnergy: number; // MWh from grid
  dischargeEnergy: number; // MWh delivered to market
  effectiveStoredEnergy: number;
  effectiveDischargedEnergy: number;
  chargingCost: number;
  dischargeRevenue: number;
  grossArbitrageIncome: number;
  netProfit: number;
  simulatedHitRate: number; // % of intervals where strategy was triggered
  expectedProfit: number;
  profitDeviation: number;
  expectedAwardProbability: number;
  reviewedHitRate: number;
  reviewConclusion: string;
  socSeries: { time: string; soc: number; upperBound: number; lowerBound: number }[];
}

// ── Strategy Snapshot Repository ──

const STORAGE_KEY = 'iwatt_strategy_snapshots';

function getStoredSnapshots(): StrategySnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const strategySnapshotRepository = {
  save(snapshot: StrategySnapshot) {
    const all = getStoredSnapshots();
    // Replace if same strategyId exists
    const idx = all.findIndex(s => s.strategyId === snapshot.strategyId);
    if (idx >= 0) all[idx] = snapshot;
    else all.push(snapshot);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  getAll(): StrategySnapshot[] {
    return getStoredSnapshots();
  },

  getLatest(): StrategySnapshot | null {
    const all = getStoredSnapshots();
    if (all.length === 0) return getMockSnapshot();
    return all[all.length - 1];
  },

  getByDate(date: string): StrategySnapshot | null {
    const all = getStoredSnapshots();
    const found = all.find(s => s.strategyDate === date);
    return found || null;
  },
};

function getMockSnapshot(): StrategySnapshot {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10);

  return {
    strategyId: 'STR-MOCK-001',
    strategyName: '智能推荐策略（前一日）',
    strategySourceType: 'generated',
    strategyDate: dateStr,
    initialSoc: 4,
    socMin: 4,
    socMax: 94,
    chargePowerLimit: 95,
    dischargePowerLimit: 95,
    chargePriceTrigger: 200,
    dischargePriceTrigger: 350,
    chargingEfficiency: 95,
    dischargingEfficiency: 94,
    otherCosts: 450,
    capacity: 200,
    notes: '系统智能生成策略',
    generatedAt: new Date(yesterday).toLocaleString('zh-CN'),
    expectedProfit: 38500,
    expectedAwardProbability: 78,
  };
}

// ── Actual Scenario Repository ──

function generateMockPrices(date: string): ActualScenario {
  // Seed-based on date for deterministic results
  const seed = date.split('-').reduce((a, b) => a + parseInt(b), 0);
  const rand = (i: number) => {
    const x = Math.sin(seed * 9301 + i * 49297 + 233280) * 233280;
    return x - Math.floor(x);
  };

  const frontNodePrices: number[] = [];
  const userSettlementPrices: number[] = [];

  for (let i = 0; i < 96; i++) {
    const h = Math.floor(i / 4);
    let basePrice = 250;

    // Low valley: 0-6h
    if (h >= 0 && h < 6) basePrice = 100 + rand(i * 3) * 80;
    // Morning ramp: 6-8h
    else if (h >= 6 && h < 8) basePrice = 200 + rand(i * 3) * 100;
    // Morning peak: 8-11h
    else if (h >= 8 && h < 11) basePrice = 380 + rand(i * 3) * 120;
    // Midday valley: 11-14h (solar surplus)
    else if (h >= 11 && h < 14) basePrice = 120 + rand(i * 3) * 100;
    // Afternoon: 14-17h
    else if (h >= 14 && h < 17) basePrice = 250 + rand(i * 3) * 80;
    // Evening peak: 17-21h
    else if (h >= 17 && h < 21) basePrice = 420 + rand(i * 3) * 180;
    // Night: 21-24h
    else basePrice = 180 + rand(i * 3) * 80;

    frontNodePrices.push(Math.round(basePrice * 100) / 100);
    // User settlement price is typically lower with some spread
    userSettlementPrices.push(Math.round((basePrice * (0.85 + rand(i * 7) * 0.1)) * 100) / 100);
  }

  return { scenarioDate: date, frontNodePrices, userSettlementPrices };
}

export const actualScenarioRepository = {
  getByDate(date: string): ActualScenario {
    return generateMockPrices(date);
  },
};

// ── Review Engine (all computation in frontend) ──

export function runReview(
  strategy: StrategySnapshot,
  scenario: ActualScenario,
): ReviewResult {
  const intervalHours = 0.25; // 15 minutes
  const intervals: IntervalResult[] = [];
  let soc = strategy.initialSoc;
  const socSeries: ReviewResult['socSeries'] = [];

  let totalChargeEnergy = 0;
  let totalDischargeEnergy = 0;
  let totalEffectiveStored = 0;
  let totalEffectiveDischarged = 0;
  let totalChargingCost = 0;
  let totalDischargeRevenue = 0;
  let chargeCount = 0;
  let dischargeCount = 0;
  let triggeredCount = 0;

  for (let i = 0; i < 96; i++) {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const chargePrice = scenario.userSettlementPrices[i];
    const dischargePrice = scenario.frontNodePrices[i];
    const socBefore = soc;

    let action: 'charge' | 'discharge' | 'idle' = 'idle';
    let powerMW = 0;
    let gridEnergyMWh = 0;
    let effectiveEnergyMWh = 0;
    let intervalRevenue = 0;

    // Check charge condition
    if (chargePrice <= strategy.chargePriceTrigger && soc < strategy.socMax) {
      const maxChargeByPower = strategy.chargePowerLimit * intervalHours; // MWh from grid
      const roomInSoc = ((strategy.socMax - soc) / 100) * strategy.capacity;
      // Room accounts for efficiency: to add roomInSoc to battery, need roomInSoc / efficiency from grid
      const maxChargeByRoom = roomInSoc / (strategy.chargingEfficiency / 100);
      const gridEnergy = Math.min(maxChargeByPower, maxChargeByRoom);

      if (gridEnergy > 0.01) {
        action = 'charge';
        gridEnergyMWh = gridEnergy;
        effectiveEnergyMWh = gridEnergy * (strategy.chargingEfficiency / 100);
        powerMW = gridEnergy / intervalHours;
        intervalRevenue = -(gridEnergy * chargePrice);
        soc += (effectiveEnergyMWh / strategy.capacity) * 100;
        totalChargeEnergy += gridEnergy;
        totalEffectiveStored += effectiveEnergyMWh;
        totalChargingCost += gridEnergy * chargePrice;
        chargeCount++;
        triggeredCount++;
      }
    }

    // Check discharge condition (only if not charging)
    if (action === 'idle' && dischargePrice >= strategy.dischargePriceTrigger && soc > strategy.socMin) {
      const maxDischargeByPower = strategy.dischargePowerLimit * intervalHours; // MWh internal
      const availableSocEnergy = ((soc - strategy.socMin) / 100) * strategy.capacity;
      const internalEnergy = Math.min(maxDischargeByPower, availableSocEnergy);

      if (internalEnergy > 0.01) {
        action = 'discharge';
        const marketDelivered = internalEnergy * (strategy.dischargingEfficiency / 100);
        gridEnergyMWh = marketDelivered;
        effectiveEnergyMWh = marketDelivered;
        powerMW = internalEnergy / intervalHours;
        intervalRevenue = marketDelivered * dischargePrice;
        soc -= (internalEnergy / strategy.capacity) * 100;
        totalDischargeEnergy += internalEnergy;
        totalEffectiveDischarged += marketDelivered;
        totalDischargeRevenue += marketDelivered * dischargePrice;
        dischargeCount++;
        triggeredCount++;
      }
    }

    soc = Math.max(strategy.socMin, Math.min(strategy.socMax, soc));

    intervals.push({
      index: i,
      time,
      action,
      powerMW: Math.round(powerMW * 100) / 100,
      gridEnergyMWh: Math.round(gridEnergyMWh * 1000) / 1000,
      effectiveEnergyMWh: Math.round(effectiveEnergyMWh * 1000) / 1000,
      socBefore: Math.round(socBefore * 100) / 100,
      socAfter: Math.round(soc * 100) / 100,
      chargePrice,
      dischargePrice,
      intervalRevenue: Math.round(intervalRevenue * 100) / 100,
    });

    socSeries.push({
      time,
      soc: Math.round(soc * 100) / 100,
      upperBound: strategy.socMax,
      lowerBound: strategy.socMin,
    });
  }

  const grossArbitrageIncome = Math.round((totalDischargeRevenue - totalChargingCost) * 100) / 100;
  const netProfit = Math.round((grossArbitrageIncome - strategy.otherCosts) * 100) / 100;
  const simulatedHitRate = Math.round((triggeredCount / 96) * 10000) / 100;

  const expectedProfit = strategy.expectedProfit ?? 38500;
  const profitDeviation = Math.round((netProfit - expectedProfit) * 100) / 100;
  const expectedAwardProbability = strategy.expectedAwardProbability ?? 78;
  const reviewedHitRate = simulatedHitRate;

  const reviewConclusion = buildReviewConclusion(
    netProfit, expectedProfit, profitDeviation,
    reviewedHitRate, expectedAwardProbability,
    chargeCount, dischargeCount,
    totalChargingCost, totalDischargeRevenue, strategy.otherCosts,
  );

  return {
    strategyId: strategy.strategyId,
    reviewDate: scenario.scenarioDate,
    intervals,
    chargeIntervalCount: chargeCount,
    dischargeIntervalCount: dischargeCount,
    chargeEnergy: Math.round(totalChargeEnergy * 100) / 100,
    dischargeEnergy: Math.round(totalDischargeEnergy * 100) / 100,
    effectiveStoredEnergy: Math.round(totalEffectiveStored * 100) / 100,
    effectiveDischargedEnergy: Math.round(totalEffectiveDischarged * 100) / 100,
    chargingCost: Math.round(totalChargingCost * 100) / 100,
    dischargeRevenue: Math.round(totalDischargeRevenue * 100) / 100,
    grossArbitrageIncome,
    netProfit,
    simulatedHitRate,
    expectedProfit,
    profitDeviation,
    expectedAwardProbability,
    reviewedHitRate,
    reviewConclusion,
    socSeries,
  };
}

// ── Conclusion Builder ──

function buildReviewConclusion(
  netProfit: number,
  expectedProfit: number,
  deviation: number,
  reviewedHitRate: number,
  expectedAwardProbability: number,
  chargeCount: number,
  dischargeCount: number,
  chargingCost: number,
  dischargeRevenue: number,
  otherCosts: number,
): string {
  const parts: string[] = [];

  // Overall assessment
  if (deviation >= 0) {
    parts.push(
      `本次复盘净收益为 ${netProfit.toLocaleString()} 元，高于策略生成时的预期收益 ${expectedProfit.toLocaleString()} 元，偏差 +${deviation.toLocaleString()} 元。实际价差条件优于预期，策略执行效果良好。`
    );
  } else {
    const absDeviation = Math.abs(deviation);
    parts.push(
      `本次复盘净收益为 ${netProfit.toLocaleString()} 元，低于策略生成时的预期收益 ${expectedProfit.toLocaleString()} 元，偏差 -${absDeviation.toLocaleString()} 元。`
    );

    // Diagnose cause
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

  // Hit rate assessment
  if (reviewedHitRate < expectedAwardProbability * 0.7) {
    parts.push(
      `模拟命中率为 ${reviewedHitRate}%，显著低于预期中标概率 ${expectedAwardProbability}%，表明实际价格场景触发的可执行时段少于预期。建议适当放宽充放电触发价格阈值。`
    );
  } else if (reviewedHitRate >= expectedAwardProbability) {
    parts.push(
      `模拟命中率为 ${reviewedHitRate}%，达到或超过预期中标概率 ${expectedAwardProbability}%，策略与实际行情的匹配度较高。`
    );
  } else {
    parts.push(
      `模拟命中率为 ${reviewedHitRate}%，接近预期中标概率 ${expectedAwardProbability}%，策略整体适配性合理。`
    );
  }

  // Execution summary
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
