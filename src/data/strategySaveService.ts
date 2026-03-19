/**
 * Supabase persistence service for saving generated strategies
 * Used by 智能策略（报量报价） to persist into strategy_snapshots + strategy_segments
 */

import { supabase } from '@/integrations/supabase/client';
import type { StrategyForm, GeneratedStrategy, QuotationSegment } from '@/data/strategyData';
import type { StrategyPerformance } from '@/data/strategyPerformanceData';

export interface SaveStrategyResult {
  success: boolean;
  snapshotId?: number;
  error?: string;
}

/** Map page state into a strategy_snapshots insert row */
function mapSnapshotRow(form: StrategyForm, strategy: GeneratedStrategy, perf: StrategyPerformance) {
  return {
    strategy_name: strategy.strategyName,
    strategy_source_type: 'generated' as const,
    strategy_date: new Date().toISOString().slice(0, 10),
    initial_soc: form.initialSoc,
    soc_min: form.minSoc,
    soc_max: form.maxSoc,
    charge_power_limit: Math.abs(form.chargePowerLimit),
    discharge_power_limit: form.dischargePowerLimit,
    charge_price_trigger: strategy.quotationSegments.find(s => s.type === '充电')?.offerPrice ?? 200,
    discharge_price_trigger: strategy.quotationSegments.find(s => s.type === '放电')?.offerPrice ?? 350,
    charging_efficiency: perf.chargingEfficiency,
    discharging_efficiency: perf.dischargingEfficiency,
    other_costs: perf.otherCosts,
    capacity: form.availableCapacity,
    notes: `由智能策略生成，${strategy.createdAt}`,
    generated_at: new Date().toISOString(),
    expected_profit: perf.netProfit,
    expected_award_probability: perf.awardProbability,
  };
}

/** Map quotation segments into strategy_segments insert rows */
function mapSegmentRows(snapshotId: number, segments: QuotationSegment[]) {
  return segments.map((seg) => ({
    strategy_id: snapshotId,
    segment_no: seg.segmentNo,
    direction: seg.type, // '充电' or '放电'
    start_power: seg.startPower,
    end_power: seg.endPower,
    offer_price: seg.offerPrice,
  }));
}

/**
 * Save a generated strategy + its segments to Supabase.
 * Returns the new snapshot ID on success.
 */
export async function saveGeneratedStrategyToSupabase(
  form: StrategyForm,
  strategy: GeneratedStrategy,
  perf: StrategyPerformance,
): Promise<SaveStrategyResult> {
  // Step 1: Validate
  if (!strategy.quotationSegments || strategy.quotationSegments.length === 0) {
    return { success: false, error: '当前策略缺少分段报价数据，无法保存为复盘策略' };
  }

  // Step 2: Insert snapshot
  const snapshotRow = mapSnapshotRow(form, strategy, perf);
  const { data: snapshotData, error: snapshotError } = await supabase
    .from('strategy_snapshots')
    .insert(snapshotRow)
    .select('id')
    .single();

  if (snapshotError || !snapshotData) {
    console.error('strategy_snapshots insert failed:', snapshotError);
    return { success: false, error: '策略快照保存失败，请稍后重试' };
  }

  const snapshotId = snapshotData.id;

  // Step 3: Insert segments
  const segmentRows = mapSegmentRows(snapshotId, strategy.quotationSegments);
  const { error: segError } = await supabase
    .from('strategy_segments')
    .insert(segmentRows);

  if (segError) {
    console.error('strategy_segments insert failed:', segError);
    return {
      success: false,
      snapshotId,
      error: '策略保存未完整完成：分段报价数据写入失败，请检查后重试',
    };
  }

  return { success: true, snapshotId };
}
