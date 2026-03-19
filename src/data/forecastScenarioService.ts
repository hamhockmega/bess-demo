/**
 * Forecast Scenario Service
 * Provides forecast-day price scenarios for strategy generation.
 *
 * Two data paths:
 * 1. Real DB path: reads from public.market_scenarios for dates that have actual data
 * 2. Deterministic mock path: generates repeatable synthetic scenarios for future dates
 *
 * DETERMINISTIC: same date always produces the same scenario, no Math.random().
 */

import { supabase } from '@/integrations/supabase/client';
import { formatIntervalTime } from '@/data/energyAccounting';

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

// ── Deterministic pseudo-random number generator (seeded) ──

/**
 * Simple seeded PRNG using a linear congruential generator.
 * Same seed always produces the same sequence.
 */
function createSeededRng(seed: number) {
  let state = seed;
  return () => {
    // LCG parameters (Numerical Recipes)
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * djb2 hash for deterministic seed from date string.
 */
function hashDateString(dateStr: string): number {
  let hash = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash + dateStr.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

// ── Deterministic mock scenario generation ──

function generateDeterministicIntervals(date: string): ForecastInterval[] {
  const rng = createSeededRng(hashDateString(date));
  const intervals: ForecastInterval[] = [];

  for (let i = 0; i < 96; i++) {
    const h = Math.floor(i / 4);
    const time = formatIntervalTime(i);

    let frontNodePrice: number;
    let userSettlementPrice: number;

    // Realistic Shandong-style price curve (deterministic)
    if (h >= 0 && h < 6) {
      // Night valley
      frontNodePrice = 100 + Math.sin(i * 0.3) * 30 + (rng() - 0.5) * 20;
      userSettlementPrice = frontNodePrice * (0.85 + rng() * 0.1);
    } else if (h >= 6 && h < 8) {
      // Morning ramp
      const m = (i % 4) * 15;
      const ramp = (h - 6 + m / 60) / 2;
      frontNodePrice = 150 + ramp * 200 + (rng() - 0.5) * 30;
      userSettlementPrice = frontNodePrice * (0.88 + rng() * 0.08);
    } else if (h >= 8 && h < 11) {
      // Morning peak
      frontNodePrice = 380 + Math.sin((i - 32) * 0.2) * 80 + (rng() - 0.5) * 40;
      userSettlementPrice = frontNodePrice * (0.90 + rng() * 0.06);
    } else if (h >= 11 && h < 14) {
      // Midday valley (solar surplus)
      frontNodePrice = 120 + Math.sin((i - 44) * 0.15) * 40 + (rng() - 0.5) * 25;
      userSettlementPrice = frontNodePrice * (0.85 + rng() * 0.1);
    } else if (h >= 14 && h < 17) {
      // Afternoon moderate
      frontNodePrice = 200 + Math.sin((i - 56) * 0.2) * 60 + (rng() - 0.5) * 30;
      userSettlementPrice = frontNodePrice * (0.88 + rng() * 0.08);
    } else if (h >= 17 && h < 21) {
      // Evening peak
      const m = (i % 4) * 15;
      const peakFactor = 1 - Math.abs((h + m / 60 - 19) / 2);
      frontNodePrice = 350 + peakFactor * 250 + (rng() - 0.5) * 50;
      userSettlementPrice = frontNodePrice * (0.90 + rng() * 0.06);
    } else {
      // Late night decline
      const m = (i % 4) * 15;
      const decay = (h - 21 + m / 60) / 3;
      frontNodePrice = 300 - decay * 150 + (rng() - 0.5) * 30;
      userSettlementPrice = frontNodePrice * (0.87 + rng() * 0.08);
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

// ── DB-backed scenario loading ──

/**
 * Try to load a scenario from public.market_scenarios for the given date.
 * Returns null if no data found (will fall back to deterministic mock).
 */
async function loadScenarioFromDb(date: string): Promise<ForecastScenario | null> {
  const { data, error } = await supabase
    .from('market_scenarios')
    .select('interval_index, front_node_price, user_settlement_price')
    .eq('scenario_date', date)
    .order('interval_index', { ascending: true });

  if (error || !data || data.length === 0) {
    return null;
  }

  const intervals: ForecastInterval[] = data.map((row) => {
    const idx = row.interval_index;
    // DB uses 1-based interval_index; convert to 0-based for engine
    const zeroIdx = idx >= 1 ? idx - 1 : idx;
    return {
      intervalIndex: zeroIdx,
      hourIndex: Math.floor(zeroIdx / 4),
      time: formatIntervalTime(zeroIdx),
      frontNodePrice: Number(row.front_node_price),
      userSettlementPrice: Number(row.user_settlement_price),
    };
  });

  return {
    date,
    label: `${date} 实际场景`,
    source: '实际市场数据',
    intervals,
  };
}

// ── Cache ──

const scenarioCache = new Map<string, ForecastScenario>();

// ── DB dates cache ──

let dbDatesCache: string[] | null = null;
let dbDatesFetchPromise: Promise<string[]> | null = null;

async function fetchDbScenarioDates(): Promise<string[]> {
  if (dbDatesCache) return dbDatesCache;
  if (dbDatesFetchPromise) return dbDatesFetchPromise;

  dbDatesFetchPromise = (async () => {
    const { data, error } = await supabase
      .from('market_scenarios')
      .select('scenario_date')
      .order('scenario_date', { ascending: false });

    if (error || !data) {
      dbDatesCache = [];
      return [];
    }

    const uniqueDates = [...new Set(data.map((r) => r.scenario_date))];
    dbDatesCache = uniqueDates;
    return uniqueDates;
  })();

  return dbDatesFetchPromise;
}

// ── Public API ──

/** List available forecast dates: real DB dates + next 7 days for mock */
export function listForecastScenarioDates(): string[] {
  const dates = new Set<string>();

  // Add next 7 days (always available as deterministic mock)
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.add(d.toISOString().slice(0, 10));
  }

  // DB dates will be added asynchronously
  if (dbDatesCache) {
    for (const d of dbDatesCache) dates.add(d);
  } else {
    // Trigger background fetch
    fetchDbScenarioDates();
  }

  return [...dates].sort();
}

/**
 * List dates including DB-backed scenario dates (async version).
 */
export async function listForecastScenarioDatesAsync(): Promise<string[]> {
  const dates = new Set<string>();
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.add(d.toISOString().slice(0, 10));
  }
  const dbDates = await fetchDbScenarioDates();
  for (const d of dbDates) dates.add(d);
  return [...dates].sort();
}

/** Load a forecast scenario for a given date (sync, uses cache or deterministic mock) */
export function getForecastScenarioByDate(date: string): ForecastScenario | null {
  if (!date) return null;
  if (scenarioCache.has(date)) return scenarioCache.get(date)!;

  // Generate deterministic mock and cache it
  const scenario: ForecastScenario = {
    date,
    label: `${date} 预测场景`,
    source: '智能预测模型',
    intervals: generateDeterministicIntervals(date),
  };
  scenarioCache.set(date, scenario);
  return scenario;
}

/**
 * Load a forecast scenario, preferring real DB data over mock.
 * Async version that tries DB first.
 */
export async function getForecastScenarioByDateAsync(date: string): Promise<ForecastScenario | null> {
  if (!date) return null;
  if (scenarioCache.has(date)) return scenarioCache.get(date)!;

  // Try DB first
  const dbScenario = await loadScenarioFromDb(date);
  if (dbScenario && dbScenario.intervals.length >= 90) {
    scenarioCache.set(date, dbScenario);
    return dbScenario;
  }

  // Fall back to deterministic mock
  return getForecastScenarioByDate(date);
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
