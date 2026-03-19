/**
 * Supabase queries for market_price_points table.
 * Separate from market_metric_points queries.
 *
 * price_type semantics:
 *   - '日前电价' = 日前市场经济出清电价
 *   - '实时电价' = 实时电价
 */
import { supabase } from '@/integrations/supabase/client';
import { formatIntervalTime } from './marketMetricQueries';

/* ── Shared types ── */

export interface PriceSeriesPoint {
  intervalIndex: number;
  time: string;
  value: number;
}

export interface PriceSeriesResult {
  points: PriceSeriesPoint[];
  unit: string;
  sourceStage: string;
  isIncomplete: boolean;
}

/**
 * Fetch a single price series from market_price_points.
 */
export async function fetchPriceSeries(
  metricName: string,
  priceType: string,
  scenarioDate: string,
  sourceStage: string = '实际',
  nodeName?: string,
): Promise<PriceSeriesResult> {
  let query = supabase
    .from('market_price_points')
    .select('interval_index, value, unit')
    .eq('metric_name', metricName)
    .eq('price_type', priceType)
    .eq('scenario_date', scenarioDate)
    .eq('source_stage', sourceStage)
    .order('interval_index', { ascending: true });

  if (nodeName) {
    query = query.eq('node_name', nodeName);
  }

  const { data, error } = await query;
  if (error) throw new Error(`${metricName}(${priceType}) 数据加载失败: ${error.message}`);

  const rows = data ?? [];
  return {
    points: rows.map(r => ({
      intervalIndex: r.interval_index,
      time: formatIntervalTime(r.interval_index),
      value: Number(r.value),
    })),
    unit: rows[0]?.unit || '元/MWh',
    sourceStage,
    isIncomplete: rows.length > 0 && rows.length < 96,
  };
}

/* ── Forecast page: dual price-type query ── */

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

export interface ForecastPriceQueryResult {
  accuracy: number;
  period: string;
  points: ForecastPointRow[];
  dailyAvg: ForecastDailyAvg[];
  summaries: ForecastPriceSummary[];
  isIncomplete: boolean;
  totalRows: number;
}

/**
 * Fetch day-ahead and real-time price data from market_price_points
 * for the ShortTermPriceForecast page.
 *
 * metric_name: 发电侧均价 (or whatever the DB stores)
 * price_type: '日前电价' / '实时电价'
 * source_stage: '实际'
 */
export async function fetchForecastActualPriceData(
  startDate: string,
  endDate: string,
  metricName: string = '发电侧均价',
): Promise<ForecastPriceQueryResult> {
  const sourceStage = '实际';

  const [dayAheadRes, realTimeRes] = await Promise.all([
    supabase
      .from('market_price_points')
      .select('scenario_date, interval_index, value, unit')
      .eq('metric_name', metricName)
      .eq('price_type', '日前电价')
      .eq('source_stage', sourceStage)
      .gte('scenario_date', startDate)
      .lte('scenario_date', endDate)
      .order('scenario_date', { ascending: true })
      .order('interval_index', { ascending: true }),
    supabase
      .from('market_price_points')
      .select('scenario_date, interval_index, value, unit')
      .eq('metric_name', metricName)
      .eq('price_type', '实时电价')
      .eq('source_stage', sourceStage)
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

  function buildIndex(rows: typeof dayAheadRows): Map<string, number> {
    const idx = new Map<string, number>();
    for (const r of rows) {
      idx.set(`${r.scenario_date}|${r.interval_index}`, Number(r.value));
    }
    return idx;
  }

  const dayAheadIdx = buildIndex(dayAheadRows);
  const realTimeIdx = buildIndex(realTimeRows);

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

    for (let i = 1; i <= 96; i++) {
      const key = `${date}|${i}`;
      const da = dayAheadIdx.get(key);
      const rt = realTimeIdx.get(key);

      if (da === undefined && rt === undefined) {
        dateHasGap = true;
        continue;
      }

      const daVal = da ?? 0;
      const rtVal = rt ?? 0;

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

  // Accuracy: how close dayAhead is to realTime
  const threshold = 150;
  const accurate = allPoints.filter(p => Math.abs(p.dayAhead - p.realTime) < threshold).length;
  const accuracy = allPoints.length > 0
    ? Math.round((accurate / allPoints.length) * 10000) / 100
    : 0;

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
    buildSummary('日前电价(实际)', allPoints.map(p => ({ val: p.dayAhead, date: p.date, time: p.time }))),
    buildSummary('实时电价(实际)', allPoints.map(p => ({ val: p.realTime, date: p.date, time: p.time }))),
    buildSummary('日前电价-日均价', dailyAvg.map(d => ({ val: d.dayAheadAvg, date: d.date, time: '' }))),
    buildSummary('实时电价-日均价', dailyAvg.map(d => ({ val: d.realTimeAvg, date: d.date, time: '' }))),
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
