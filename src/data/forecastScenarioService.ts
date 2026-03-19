/**
 * Forecast Scenario Service
 * Provides forecast-day price scenarios for strategy generation.
 * Currently uses mock data; designed to be replaced with real DB reads later.
 */

export interface ForecastScenario {
  date: string; // YYYY-MM-DD
  label: string;
  source: string;
  intervals: ForecastInterval[];
}

export interface ForecastInterval {
  intervalIndex: number;
  hourIndex: number;
  time: string; // HH:mm
  frontNodePrice: number;       // 门前节点电价 (放电电价)
  userSettlementPrice: number;  // 用户侧统一结算点电价 (充电电价)
}

export interface ScenarioStats {
  frontNodeMin: number;
  frontNodeMax: number;
  frontNodeAvg: number;
  settlementMin: number;
  settlementMax: number;
  settlementAvg: number;
}

// ── Mock scenario generation ──

function generateMockIntervals(): ForecastInterval[] {
  const intervals: ForecastInterval[] = [];
  for (let i = 0; i < 96; i++) {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    let frontNodePrice: number;
    let userSettlementPrice: number;

    // Realistic Shandong-style price curve
    if (h >= 0 && h < 6) {
      // Night valley
      frontNodePrice = 100 + Math.sin(i * 0.3) * 30 + (Math.random() - 0.5) * 20;
      userSettlementPrice = frontNodePrice * (0.85 + Math.random() * 0.1);
    } else if (h >= 6 && h < 8) {
      // Morning ramp
      const ramp = (h - 6 + m / 60) / 2;
      frontNodePrice = 150 + ramp * 200 + (Math.random() - 0.5) * 30;
      userSettlementPrice = frontNodePrice * (0.88 + Math.random() * 0.08);
    } else if (h >= 8 && h < 11) {
      // Morning peak
      frontNodePrice = 380 + Math.sin((i - 32) * 0.2) * 80 + (Math.random() - 0.5) * 40;
      userSettlementPrice = frontNodePrice * (0.90 + Math.random() * 0.06);
    } else if (h >= 11 && h < 14) {
      // Midday valley (solar surplus)
      frontNodePrice = 120 + Math.sin((i - 44) * 0.15) * 40 + (Math.random() - 0.5) * 25;
      userSettlementPrice = frontNodePrice * (0.85 + Math.random() * 0.1);
    } else if (h >= 14 && h < 17) {
      // Afternoon moderate
      frontNodePrice = 200 + Math.sin((i - 56) * 0.2) * 60 + (Math.random() - 0.5) * 30;
      userSettlementPrice = frontNodePrice * (0.88 + Math.random() * 0.08);
    } else if (h >= 17 && h < 21) {
      // Evening peak
      const peakFactor = 1 - Math.abs((h + m / 60 - 19) / 2);
      frontNodePrice = 350 + peakFactor * 250 + (Math.random() - 0.5) * 50;
      userSettlementPrice = frontNodePrice * (0.90 + Math.random() * 0.06);
    } else {
      // Late night decline
      const decay = (h - 21 + m / 60) / 3;
      frontNodePrice = 300 - decay * 150 + (Math.random() - 0.5) * 30;
      userSettlementPrice = frontNodePrice * (0.87 + Math.random() * 0.08);
    }

    frontNodePrice = Math.max(50, Math.round(frontNodePrice * 100) / 100);
    userSettlementPrice = Math.max(40, Math.round(userSettlementPrice * 100) / 100);

    intervals.push({
      intervalIndex: i,
      hourIndex: h,
      time,
      frontNodePrice,
      userSettlementPrice,
    });
  }
  return intervals;
}

// Cache mock scenarios so same date returns same data within session
const scenarioCache = new Map<string, ForecastScenario>();

function getOrCreateMockScenario(date: string): ForecastScenario {
  if (scenarioCache.has(date)) return scenarioCache.get(date)!;
  const scenario: ForecastScenario = {
    date,
    label: `${date} 预测场景`,
    source: '智能预测模型',
    intervals: generateMockIntervals(),
  };
  scenarioCache.set(date, scenario);
  return scenario;
}

// ── Public API ──

/** List available forecast dates (mock: next 7 days from today) */
export function listForecastScenarioDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Load a forecast scenario for a given date */
export function getForecastScenarioByDate(date: string): ForecastScenario | null {
  if (!date) return null;
  return getOrCreateMockScenario(date);
}

/** Compute summary stats for a scenario */
export function computeScenarioStats(scenario: ForecastScenario): ScenarioStats {
  const fnp = scenario.intervals.map((iv) => iv.frontNodePrice);
  const usp = scenario.intervals.map((iv) => iv.userSettlementPrice);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    frontNodeMin: Math.round(Math.min(...fnp) * 100) / 100,
    frontNodeMax: Math.round(Math.max(...fnp) * 100) / 100,
    frontNodeAvg: Math.round(avg(fnp) * 100) / 100,
    settlementMin: Math.round(Math.min(...usp) * 100) / 100,
    settlementMax: Math.round(Math.max(...usp) * 100) / 100,
    settlementAvg: Math.round(avg(usp) * 100) / 100,
  };
}
