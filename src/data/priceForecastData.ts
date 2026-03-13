// 短期价格预测 mock data — designed for future MySQL replacement
// Each function simulates an API call that returns time-series price data

export interface PricePoint {
  date: string;       // e.g. "2025-10-01"
  time: string;       // e.g. "00:15"
  timestamp: number;  // period index 0-95
  dayAhead: number;   // 日前电价
  realTime: number;   // 实时电价
}

export interface DailyAvgRow {
  date: string;
  dayAheadAvg: number;
  realTimeAvg: number;
}

export interface PriceSummary {
  label: string;
  avg: number;
  max: number;
  maxTime: string;
  min: number;
  minTime: string;
}

export interface ForecastResult {
  accuracy: number;          // 预测值准确率 %
  period: string;            // 所选时段 label
  points: PricePoint[];      // 96-point intraday curve per day
  dailyAvg: DailyAvgRow[];   // daily averages
  summaries: PriceSummary[]; // computed KPI blocks
}

// Seed-based pseudo-random for reproducibility
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TIME_LABELS_96 = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0');
  const m = String((i % 4) * 15).padStart(2, '0');
  return `${h}:${m}`;
});

function generateDayPrices(date: string, side: 'generation' | 'consumption', rand: () => number): PricePoint[] {
  // Base profile: higher during morning & evening peaks
  return TIME_LABELS_96.map((time, i) => {
    const hour = i / 4;
    // Peak pattern
    const morningPeak = Math.exp(-((hour - 10) ** 2) / 8) * 300;
    const eveningPeak = Math.exp(-((hour - 18) ** 2) / 6) * 400;
    const base = side === 'generation' ? 320 : 350;
    const noise = (rand() - 0.5) * 200;

    const dayAhead = Math.round((base + morningPeak + eveningPeak * 0.8 + noise) * 100) / 100;
    const realTime = Math.round((base + morningPeak * 0.9 + eveningPeak + (rand() - 0.5) * 250) * 100) / 100;

    return {
      date,
      time,
      timestamp: i,
      dayAhead: Math.max(-100, Math.min(1500, dayAhead)),
      realTime: Math.max(-100, Math.min(1500, realTime)),
    };
  });
}

function computeSummary(label: string, values: { val: number; date: string; time: string }[]): PriceSummary {
  let max = -Infinity, min = Infinity, maxTime = '', minTime = '', sum = 0;
  for (const v of values) {
    sum += v.val;
    if (v.val > max) { max = v.val; maxTime = v.time ? `${v.date} ${v.time}` : v.date; }
    if (v.val < min) { min = v.val; minTime = v.time ? `${v.date} ${v.time}` : v.date; }
  }
  return {
    label,
    avg: Math.round(sum / values.length * 10000) / 10000,
    max: Math.round(max * 10000) / 10000,
    maxTime,
    min: Math.round(min * 10000) / 10000,
    minTime,
  };
}

/**
 * Main entry: fetch forecast data for a date range and side.
 * Replace this function body with a MySQL API call in the future.
 */
export function fetchForecastData(
  startDate: string,
  endDate: string,
  side: 'generation' | 'consumption',
): ForecastResult {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const seed = start.getTime() + (side === 'generation' ? 0 : 7777);
  const rand = seededRandom(seed);

  const allPoints: PricePoint[] = [];
  const dailyAvg: DailyAvgRow[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const dayPoints = generateDayPrices(dateStr, side, rand);
    allPoints.push(...dayPoints);

    const daSum = dayPoints.reduce((s, p) => s + p.dayAhead, 0);
    const rtSum = dayPoints.reduce((s, p) => s + p.realTime, 0);
    dailyAvg.push({
      date: dateStr,
      dayAheadAvg: Math.round(daSum / 96 * 10000) / 10000,
      realTimeAvg: Math.round(rtSum / 96 * 10000) / 10000,
    });
  }

  // Compute accuracy from mock: ratio of points where |dayAhead - realTime| < threshold
  const threshold = 150;
  const accurate = allPoints.filter((p) => Math.abs(p.dayAhead - p.realTime) < threshold).length;
  const accuracy = Math.round((accurate / allPoints.length) * 10000) / 100;

  const priceLabel = side === 'generation' ? '发电侧均价' : '统一结算价';

  // 4 summary blocks computed from data
  const dayAheadPredVals = allPoints.map((p) => ({ val: p.dayAhead, date: p.date, time: p.time }));
  const realTimePredVals = allPoints.map((p) => ({ val: p.realTime, date: p.date, time: p.time }));
  const dayAheadDailyVals = dailyAvg.map((d) => ({ val: d.dayAheadAvg, date: d.date, time: '' }));
  const realTimeDailyVals = dailyAvg.map((d) => ({ val: d.realTimeAvg, date: d.date, time: '' }));

  const summaries: PriceSummary[] = [
    computeSummary('日前电价(预测)-智能预测', dayAheadPredVals),
    computeSummary('实时电价(预测)-智能预测', realTimePredVals),
    computeSummary(`日前电价-${priceLabel}`, dayAheadDailyVals),
    computeSummary(`实时电价-${priceLabel}`, realTimeDailyVals),
  ];

  return {
    accuracy,
    period: `${startDate} 至 ${endDate}`,
    points: allPoints,
    dailyAvg,
    summaries,
  };
}
