/**
 * Supabase queries for market_metric_points table.
 * Used by the 行情趋势 module on SpotMarketBoard.
 */
import { supabase } from '@/integrations/supabase/client';
import type { DataPoint, MetricSeries, Scenario } from './mockData';

/** Map source_stage values from DB to the Scenario type used in the UI */
const SOURCE_STAGE_TO_SCENARIO: Record<string, Scenario> = {
  '智能预测': '智能预测',
  '出清前上午': '出清前上午',
  '出清前下午': '出清前下午',
  '出清后': '出清后',
  '实际': '实际',
  '周前': '周前',
  '统一结算价': '统一结算价',
  '日前市场经济出清': '日前市场经济出清',
  '交易结果': '交易结果',
};

function formatIntervalTime(idx: number): string {
  // interval_index is 1-based (1..96), convert to 0-based for time calc
  const zeroBasedIdx = idx - 1;
  const h = Math.floor(zeroBasedIdx / 4);
  const m = (zeroBasedIdx % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface TrendQueryResult {
  series: MetricSeries[];
  isIncomplete: boolean;
  totalRows: number;
}

/**
 * Fetch metric points from Supabase for the 行情趋势 card.
 * Returns data grouped by source_stage as MetricSeries[].
 */
export async function fetchTrendMetricPoints(
  metricName: string,
  scenarioDate: string,
  node: string = '全省',
): Promise<TrendQueryResult> {
  const { data, error } = await supabase
    .from('market_metric_points')
    .select('interval_index, value, unit, source_stage')
    .eq('metric_name', metricName)
    .eq('scenario_date', scenarioDate)
    .order('interval_index', { ascending: true });

  if (error) {
    throw new Error(`行情趋势数据加载失败: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { series: [], isIncomplete: false, totalRows: 0 };
  }

  // Group rows by source_stage
  const grouped: Record<string, typeof data> = {};
  for (const row of data) {
    const key = row.source_stage;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  const series: MetricSeries[] = [];
  let isIncomplete = false;

  for (const [stage, rows] of Object.entries(grouped)) {
    const scenario = SOURCE_STAGE_TO_SCENARIO[stage];
    if (!scenario) continue; // skip unknown stages

    if (rows.length < 96) {
      isIncomplete = true;
    }

    const dataPoints: DataPoint[] = rows.map((r) => ({
      dateKey: scenarioDate,
      timeKey: formatIntervalTime(r.interval_index),
      timestamp: r.interval_index,
      value: Number(r.value),
      unit: r.unit,
    }));

    series.push({
      metricName,
      metricFamily: 'price',
      scenario,
      unit: rows[0]?.unit || '元/MWh',
      node,
      data: dataPoints,
    });
  }

  return { series, isIncomplete, totalRows: data.length };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Forecast page: fetch price data for a date range from market_metric_points.
 * Used by ShortTermPriceForecast.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ForecastPointRow {
  date: string;
  time: string;
  timestamp: number;
  dayAhead: number;
  realTime: number;
}

export interface ForecastDailyAvg {
  date: string;
  dayAheadAvg: number;
  realTimeAvg: number;
}

export interface ForecastPriceSummary {
  label: string;
  avg: number;
  max: number;
  maxTime: string;
  min: number;
  minTime: string;
}

export interface ForecastQueryResult {
  accuracy: number;
  period: string;
  points: ForecastPointRow[];
  dailyAvg: ForecastDailyAvg[];
  summaries: ForecastPriceSummary[];
  isIncomplete: boolean;
  totalRows: number;
}

/**
 * Fetch price forecast data from Supabase for the ShortTermPriceForecast page.
 * Queries two metrics (日前电价-发电侧均价, 实时电价-发电侧均价) for the given
 * date range and merges them into the chart format expected by the page.
 */
export async function fetchForecastPriceData(
  startDate: string,
  endDate: string,
): Promise<ForecastQueryResult> {
  const dayAheadMetric = '日前电价-发电侧均价';
  const realTimeMetric = '实时电价-发电侧均价';

  // Fetch both metrics in parallel
  const [dayAheadRes, realTimeRes] = await Promise.all([
    supabase
      .from('market_metric_points')
      .select('scenario_date, interval_index, value, unit, source_stage')
      .eq('metric_name', dayAheadMetric)
      .gte('scenario_date', startDate)
      .lte('scenario_date', endDate)
      .order('scenario_date', { ascending: true })
      .order('interval_index', { ascending: true }),
    supabase
      .from('market_metric_points')
      .select('scenario_date, interval_index, value, unit, source_stage')
      .eq('metric_name', realTimeMetric)
      .gte('scenario_date', startDate)
      .lte('scenario_date', endDate)
      .order('scenario_date', { ascending: true })
      .order('interval_index', { ascending: true }),
  ]);

  if (dayAheadRes.error) throw new Error(`日前电价数据加载失败: ${dayAheadRes.error.message}`);
  if (realTimeRes.error) throw new Error(`实时电价数据加载失败: ${realTimeRes.error.message}`);

  const dayAheadRows = dayAheadRes.data ?? [];
  const realTimeRows = realTimeRes.data ?? [];
  const totalRows = dayAheadRows.length + realTimeRows.length;

  if (totalRows === 0) {
    return {
      accuracy: 0,
      period: `${startDate} 至 ${endDate}`,
      points: [],
      dailyAvg: [],
      summaries: [],
      isIncomplete: false,
      totalRows: 0,
    };
  }

  // Index rows by "date|interval_index" for fast lookup
  // Prefer source_stage priority: 实际 > 出清前上午 > 智能预测
  const STAGE_PRIORITY: Record<string, number> = { '实际': 3, '出清前上午': 2, '智能预测': 1 };

  type IndexedVal = { value: number; stage: string; priority: number };

  function buildIndex(rows: typeof dayAheadRows): Map<string, IndexedVal> {
    const idx = new Map<string, IndexedVal>();
    for (const r of rows) {
      const key = `${r.scenario_date}|${r.interval_index}`;
      const priority = STAGE_PRIORITY[r.source_stage] ?? 0;
      const existing = idx.get(key);
      if (!existing || priority > existing.priority) {
        idx.set(key, { value: Number(r.value), stage: r.source_stage, priority });
      }
    }
    return idx;
  }

  const dayAheadIdx = buildIndex(dayAheadRows);
  const realTimeIdx = buildIndex(realTimeRows);

  // Collect all unique dates
  const dateSet = new Set<string>();
  for (const r of dayAheadRows) dateSet.add(String(r.scenario_date));
  for (const r of realTimeRows) dateSet.add(String(r.scenario_date));
  const dates = [...dateSet].sort();

  let isIncomplete = false;
  const allPoints: ForecastPointRow[] = [];
  const dailyAvg: ForecastDailyAvg[] = [];

  for (const date of dates) {
    let dayDaSum = 0, dayRtSum = 0, dayCount = 0;
    let dateHasGap = false;

    for (let i = 0; i < 96; i++) {
      const key = `${date}|${i}`;
      const da = dayAheadIdx.get(key);
      const rt = realTimeIdx.get(key);

      if (!da && !rt) {
        dateHasGap = true;
        continue;
      }

      const daVal = da?.value ?? 0;
      const rtVal = rt?.value ?? 0;

      allPoints.push({
        date,
        time: formatIntervalTime(i),
        timestamp: i,
        dayAhead: daVal,
        realTime: rtVal,
      });

      dayDaSum += daVal;
      dayRtSum += rtVal;
      dayCount++;
    }

    if (dateHasGap) isIncomplete = true;

    if (dayCount > 0) {
      dailyAvg.push({
        date,
        dayAheadAvg: Math.round((dayDaSum / dayCount) * 10000) / 10000,
        realTimeAvg: Math.round((dayRtSum / dayCount) * 10000) / 10000,
      });
    }
  }

  // Accuracy: ratio of points where |dayAhead - realTime| < threshold
  const threshold = 150;
  const accurate = allPoints.filter((p) => Math.abs(p.dayAhead - p.realTime) < threshold).length;
  const accuracy = allPoints.length > 0
    ? Math.round((accurate / allPoints.length) * 10000) / 100
    : 0;

  // Build summaries from queried data
  function buildSummary(label: string, vals: { val: number; date: string; time: string }[]): ForecastPriceSummary {
    if (vals.length === 0) return { label, avg: 0, max: 0, maxTime: '', min: 0, minTime: '' };
    let max = -Infinity, min = Infinity, maxTime = '', minTime = '', sum = 0;
    for (const v of vals) {
      sum += v.val;
      if (v.val > max) { max = v.val; maxTime = v.time ? `${v.date} ${v.time}` : v.date; }
      if (v.val < min) { min = v.val; minTime = v.time ? `${v.date} ${v.time}` : v.date; }
    }
    return {
      label,
      avg: Math.round((sum / vals.length) * 10000) / 10000,
      max: Math.round(max * 10000) / 10000,
      maxTime,
      min: Math.round(min * 10000) / 10000,
      minTime,
    };
  }

  const summaries: ForecastPriceSummary[] = [
    buildSummary('日前电价(预测)-智能预测', allPoints.map(p => ({ val: p.dayAhead, date: p.date, time: p.time }))),
    buildSummary('实时电价(预测)-智能预测', allPoints.map(p => ({ val: p.realTime, date: p.date, time: p.time }))),
    buildSummary('日前电价-发电侧均价', dailyAvg.map(d => ({ val: d.dayAheadAvg, date: d.date, time: '' }))),
    buildSummary('实时电价-发电侧均价', dailyAvg.map(d => ({ val: d.realTimeAvg, date: d.date, time: '' }))),
  ];

  return {
    accuracy,
    period: `${startDate} 至 ${endDate}`,
    points: allPoints,
    dailyAvg,
    summaries,
    isIncomplete,
    totalRows,
  };
}
