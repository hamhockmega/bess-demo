/**
 * Intelligent Strategy (Bid Quantity & Offer Price) - Data models and mock data
 * Designed for future MySQL database connection
 */

// ── Types ──

export type StrategyMode = '套利' | '不套利' | '智能选择';
export type LossCostMode = '考虑' | '不考虑';
export type UIMode = 'beforeGenerate' | 'afterGenerate' | 'editingAfterGenerate';

export interface StrategyForm {
  strategyName: string;
  ruleMode: string;
  strategyMode: StrategyMode;
  strategyObjective: string;
  lossCostMode: LossCostMode;
  lossCostValue: number; // 元/MWh
  // 运行参数
  availableCapacity: number; // MWh
  availablePower: number; // MW
  initialSoc: number; // %
  utilizationRate: number; // %
  expectedEndSoc: number; // %
  // 其他申报参数
  chargePowerLimit: number; // MW (negative)
  dischargePowerLimit: number; // MW
  maxSoc: number; // %
  minSoc: number; // %
  minContinuousChargeTime: number; // h
  minContinuousDischargeTime: number; // h
  chargingEfficiency: number; // % (e.g. 95)
  dischargingEfficiency: number; // % (e.g. 94)
}

export interface QuotationSegment {
  type: '充电' | '放电';
  segmentNo: number;
  startPower: number; // MW
  endPower: number; // MW
  offerPrice: number; // 元/MWh
}

export interface PowerPoint {
  time: string; // HH:mm
  quotationPower: number;
  awardedPower: number;
  realTimePrice: number;
}

export interface SocPoint {
  time: string;
  soc: number;
  upperBound: number;
  lowerBound: number;
}

export interface EnergyPoint {
  time: string;
  awardedEnergy: number; // MWh
  cumulativeEnergy: number;
}

export interface SchedulePoint {
  intervalIndex: number;
  hourIndex: number;
  targetAction: '充电' | '放电' | '空闲';
  targetPowerMw: number;
  chargeBidPrice: number | null;
  dischargeBidPrice: number | null;
  benchmarkPrice: number | null;
  expectedSocAfter: number;
  expectedEnergyMwh: number;
  note: string | null;
}

export interface GeneratedStrategy {
  strategyId: string;
  strategyName: string;
  status: '已生成' | '参数已调整';
  quotationSegments: QuotationSegment[];
  schedulePoints: SchedulePoint[];
  powerSeries: PowerPoint[];
  socSeries: SocPoint[];
  energySeries: EnergyPoint[];
  runtimeParameters: RuntimeParameters;
  priceBenchmark: string;
  createdAt: string;
}

export interface RuntimeParameters {
  chargePowerLimit: number;
  dischargePowerLimit: number;
  socUpperLimit: number;
  socLowerLimit: number;
  minContinuousChargeTime: number;
  minContinuousDischargeTime: number;
  utilizationRate: number;
  expectedEndSoc: number;
}

// ── Default form values ──

export const DEFAULT_STRATEGY_FORM: StrategyForm = {
  strategyName: '智能推荐策略',
  ruleMode: '山东现货规则',
  strategyMode: '不套利',
  strategyObjective: '单日收益最优',
  lossCostMode: '考虑',
  lossCostValue: 50,
  availableCapacity: 200,
  availablePower: 100,
  initialSoc: 4,
  utilizationRate: 90,
  expectedEndSoc: 4,
  chargePowerLimit: -95,
  dischargePowerLimit: 95,
  maxSoc: 94,
  minSoc: 4,
  minContinuousChargeTime: 1,
  minContinuousDischargeTime: 0.5,
  chargingEfficiency: 95,
  dischargingEfficiency: 94,
};

// ── Mock data generators ──

function generatePowerSeries(): PowerPoint[] {
  const points: PowerPoint[] = [];
  for (let i = 0; i < 96; i++) {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // Simulate BESS charging at night (low price), discharging during peaks
    let quotationPower = 0;
    let dayAheadPrice = 0;

    let realTimePrice = 0;

    if (h >= 1 && h < 6) {
      quotationPower = -(60 + Math.random() * 30);
      realTimePrice = 120 + Math.random() * 80;
    } else if (h >= 8 && h < 11) {
      quotationPower = 50 + Math.random() * 40;
      realTimePrice = 350 + Math.random() * 150;
    } else if (h >= 13 && h < 15) {
      quotationPower = -(30 + Math.random() * 40);
      realTimePrice = 150 + Math.random() * 60;
    } else if (h >= 17 && h < 21) {
      quotationPower = 60 + Math.random() * 35;
      realTimePrice = 400 + Math.random() * 200;
    } else {
      quotationPower = (Math.random() - 0.5) * 20;
      realTimePrice = 200 + Math.random() * 100;
    }

    const awardedPower = quotationPower * (0.85 + Math.random() * 0.15);

    points.push({
      time,
      quotationPower: Math.round(quotationPower * 10) / 10,
      awardedPower: Math.round(awardedPower * 10) / 10,
      dayAheadPrice: Math.round(dayAheadPrice * 100) / 100,
    });
  }
  return points;
}

function generateSocSeries(initialSoc: number, maxSoc: number, minSoc: number): SocPoint[] {
  const points: SocPoint[] = [];
  let soc = initialSoc;
  const capacity = 200; // MWh

  for (let i = 0; i < 96; i++) {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // SOC changes based on charge/discharge pattern
    if (h >= 1 && h < 6) {
      soc += (70 / 20) + (Math.random() - 0.5) * 0.5; // charging
    } else if (h >= 8 && h < 11) {
      soc -= (50 / 12) + (Math.random() - 0.5) * 0.5; // discharging
    } else if (h >= 13 && h < 15) {
      soc += (30 / 8) + (Math.random() - 0.5) * 0.3;
    } else if (h >= 17 && h < 21) {
      soc -= (55 / 16) + (Math.random() - 0.5) * 0.5;
    } else {
      soc += (Math.random() - 0.5) * 0.3;
    }

    soc = Math.max(minSoc, Math.min(maxSoc, soc));

    points.push({
      time,
      soc: Math.round(soc * 10) / 10,
      upperBound: maxSoc,
      lowerBound: minSoc,
    });
  }
  return points;
}

function generateEnergySeries(): EnergyPoint[] {
  const points: EnergyPoint[] = [];
  let cumulative = 0;

  for (let i = 0; i < 96; i++) {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    let energy = 0;
    if (h >= 1 && h < 6) {
      energy = -(15 + Math.random() * 8);
    } else if (h >= 8 && h < 11) {
      energy = 12 + Math.random() * 10;
    } else if (h >= 17 && h < 21) {
      energy = 15 + Math.random() * 8;
    } else {
      energy = (Math.random() - 0.5) * 5;
    }

    cumulative += energy;
    points.push({
      time,
      awardedEnergy: Math.round(energy * 10) / 10,
      cumulativeEnergy: Math.round(cumulative * 10) / 10,
    });
  }
  return points;
}

function generateSchedulePoints(
  powerSeries: PowerPoint[],
  socSeries: SocPoint[],
  chargePrice: number,
  dischargePrice: number,
): SchedulePoint[] {
  return powerSeries.map((p, i) => {
    const power = p.quotationPower;
    let action: '充电' | '放电' | '空闲';
    if (power < -5) action = '充电';
    else if (power > 5) action = '放电';
    else action = '空闲';

    const soc = socSeries[i]?.soc ?? 0;
    const energyMwh = Math.round(Math.abs(power) * 0.25 * 100) / 100;

    return {
      intervalIndex: i,
      hourIndex: Math.floor(i / 4),
      targetAction: action,
      targetPowerMw: Math.round(Math.abs(power) * 10) / 10,
      chargeBidPrice: action === '充电' ? chargePrice : null,
      dischargeBidPrice: action === '放电' ? dischargePrice : null,
      benchmarkPrice: Math.round(p.dayAheadPrice * 100) / 100,
      expectedSocAfter: Math.round(soc * 10) / 10,
      expectedEnergyMwh: energyMwh,
      note: null,
    };
  });
}

export function generateMockStrategy(form: StrategyForm): GeneratedStrategy {
  const powerSeries = generatePowerSeries();
  const socSeries = generateSocSeries(form.initialSoc, form.maxSoc, form.minSoc);
  const chargePrice = 150;
  const dischargePrice = 225;

  return {
    strategyId: `STR-${Date.now()}`,
    strategyName: form.strategyName,
    status: '已生成',
    quotationSegments: [
      { type: '充电', segmentNo: 1, startPower: -100, endPower: 0, offerPrice: chargePrice },
      { type: '放电', segmentNo: 1, startPower: 0, endPower: 100, offerPrice: dischargePrice },
    ],
    schedulePoints: generateSchedulePoints(powerSeries, socSeries, chargePrice, dischargePrice),
    powerSeries,
    socSeries,
    energySeries: generateEnergySeries(),
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
}
