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
  const h = Math.floor(idx / 4);
  const m = (idx % 4) * 15;
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
