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

/** Map Chinese direction labels to database values */
const DIRECTION_MAP: Record<string, string> = {
  '充电': 'charge',
  '放电': 'discharge',
};

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

/**
 * Validate and map quotation segments into strategy_segments insert rows.
 * Converts Chinese direction values (充电/放电) to DB values (charge/discharge).
 * Returns null if any segment has an unrecognised direction.
 */
function mapSegmentRows(snapshotId: number, segments: QuotationSegment[]): { rows: any[] } | { error: string } {
  const rows: any[] = [];
  for (const seg of segments) {
    const dbDirection = DIRECTION_MAP[seg.type];
    if (!dbDirection) {
      console.error(`[strategySaveService] Unknown segment direction: "${seg.type}"`, seg);
      return { error: '当前策略存在无法识别的分段方向，无法保存为复盘策略' };
    }
    rows.push({
      strategy_id: snapshotId,
      segment_no: seg.segmentNo,
      direction: dbDirection,
      start_power: seg.startPower,
      end_power: seg.endPower,
      offer_price: seg.offerPrice,
    });
  }
  return { rows };
}

/** Rollback: delete an orphan snapshot row if segment insert fails */
async function rollbackSnapshot(snapshotId: number) {
  const { error } = await supabase
    .from('strategy_snapshots')
    .delete()
    .eq('id', snapshotId);
  if (error) {
    console.error('[strategySaveService] Rollback delete failed for snapshot', snapshotId, error);
  } else {
    console.info('[strategySaveService] Rolled back orphan snapshot', snapshotId);
  }
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
  // Step 1: Validate segments exist
  if (!strategy.quotationSegments || strategy.quotationSegments.length === 0) {
    return { success: false, error: '当前策略缺少分段报价数据，无法保存为复盘策略' };
  }

  // Step 2: Insert snapshot
  const snapshotRow = mapSnapshotRow(form, strategy, perf);
  console.info('[strategySaveService] Inserting snapshot:', snapshotRow);
  const { data: snapshotData, error: snapshotError } = await supabase
    .from('strategy_snapshots')
    .insert(snapshotRow)
    .select('id')
    .single();

  if (snapshotError || !snapshotData) {
    console.error('[strategySaveService] strategy_snapshots insert failed:', snapshotError);
    return { success: false, error: '策略快照保存失败，请稍后重试' };
  }

  const snapshotId = snapshotData.id;

  // Step 3: Map segments (with direction validation)
  const mapped = mapSegmentRows(snapshotId, strategy.quotationSegments);
  if ('error' in mapped) {
    await rollbackSnapshot(snapshotId);
    return { success: false, error: mapped.error };
  }

  // Step 4: Insert segments
  console.info('[strategySaveService] Inserting segments for snapshot', snapshotId, mapped.rows);
  const { error: segError } = await supabase
    .from('strategy_segments')
    .insert(mapped.rows);

  if (segError) {
    console.error('[strategySaveService] strategy_segments insert failed:', segError);
    await rollbackSnapshot(snapshotId);
    return {
      success: false,
      error: '策略保存未完整完成：分段报价数据写入失败，请检查后重试',
    };
  }

  console.info('[strategySaveService] Strategy saved successfully, snapshotId =', snapshotId);
  return { success: true, snapshotId };
}
