/**
 * Supabase data access layer for the Review page (策略复盘).
 * Replaces mock repositories with real database queries.
 */
import { supabase } from '@/integrations/supabase/client';
import type { StrategySnapshot, ActualScenario } from '@/data/reviewData';

// ── Strategy Segment type ──

export interface StrategySegment {
  segmentNo: number;
  direction: string;
  startPower: number | null;
  endPower: number | null;
  offerPrice: number;
}

// ── Strategy Snapshot list item (for dropdown) ──

export interface StrategySnapshotListItem {
  id: number;
  strategyName: string;
  strategyDate: string;
  strategySourceType: string;
  createdAt: string;
}

// ── Query: list all strategy snapshots ──

export async function listStrategySnapshots(): Promise<{
  data: StrategySnapshotListItem[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('strategy_snapshots')
    .select('id, strategy_name, strategy_date, strategy_source_type, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: `加载策略列表失败：${error.message}` };
  }

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      strategyName: row.strategy_name,
      strategyDate: row.strategy_date,
      strategySourceType: row.strategy_source_type,
      createdAt: row.created_at,
    })),
    error: null,
  };
}

// ── Query: get one strategy snapshot by ID ──

export async function getStrategySnapshotById(id: number): Promise<{
  data: StrategySnapshot | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('strategy_snapshots')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return { data: null, error: `加载策略快照失败：${error.message}` };
  }
  if (!data) {
    return { data: null, error: '未找到所选策略快照' };
  }

  return {
    data: mapSnapshotRow(data),
    error: null,
  };
}

// ── Query: get strategy segments by strategy ID ──

export async function getStrategySegmentsByStrategyId(strategyId: number): Promise<{
  data: StrategySegment[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('strategy_segments')
    .select('*')
    .eq('strategy_id', strategyId)
    .order('segment_no', { ascending: true });

  if (error) {
    return { data: [], error: `加载分段报价数据失败：${error.message}` };
  }

  return {
    data: (data ?? []).map((row) => ({
      segmentNo: row.segment_no,
      direction: row.direction,
      startPower: row.start_power,
      endPower: row.end_power,
      offerPrice: row.offer_price,
    })),
    error: null,
  };
}

// ── Query: get market scenario by date ──

export async function getScenarioByDate(reviewDate: string): Promise<{
  data: ActualScenario | null;
  intervalCount: number;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('market_scenarios')
    .select('*')
    .eq('scenario_date', reviewDate)
    .order('interval_index', { ascending: true });

  if (error) {
    return { data: null, intervalCount: 0, error: `加载实际场景数据失败：${error.message}` };
  }

  if (!data || data.length === 0) {
    return { data: null, intervalCount: 0, error: `未找到 ${reviewDate} 的实际场景数据` };
  }

  const intervalCount = data.length;

  const frontNodePrices: number[] = [];
  const userSettlementPrices: number[] = [];

  for (const row of data) {
    frontNodePrices.push(Number(row.front_node_price));
    userSettlementPrices.push(Number(row.user_settlement_price));
  }

  return {
    data: {
      scenarioDate: reviewDate,
      frontNodePrices,
      userSettlementPrices,
    },
    intervalCount,
    error: null,
  };
}

// ── Mapper: DB row → StrategySnapshot ──

function mapSnapshotRow(row: any): StrategySnapshot {
  return {
    strategyId: String(row.id),
    strategyName: row.strategy_name,
    strategySourceType: row.strategy_source_type === 'manual' ? 'manual' : 'generated',
    strategyDate: row.strategy_date,
    initialSoc: Number(row.initial_soc),
    socMin: Number(row.soc_min),
    socMax: Number(row.soc_max),
    chargePowerLimit: Number(row.charge_power_limit),
    dischargePowerLimit: Number(row.discharge_power_limit),
    chargePriceTrigger: Number(row.charge_price_trigger),
    dischargePriceTrigger: Number(row.discharge_price_trigger),
    chargingEfficiency: Number(row.charging_efficiency),
    dischargingEfficiency: Number(row.discharging_efficiency),
    otherCosts: Number(row.other_costs),
    capacity: Number(row.capacity),
    notes: row.notes ?? '',
    generatedAt: row.generated_at ?? row.created_at,
    expectedProfit: row.expected_profit != null ? Number(row.expected_profit) : undefined,
    expectedAwardProbability: row.expected_award_probability != null ? Number(row.expected_award_probability) : undefined,
  };
}
