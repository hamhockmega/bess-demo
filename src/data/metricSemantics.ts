/**
 * Metric semantics service.
 * Reads metric_catalog and metric_stage_rules from Supabase
 * to determine which stages are valid per metric and whether
 * they are database-backed or frontend-derived.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StageRule {
  metric_name: string;
  source_stage: string;
  stage_source_type: string; // 'database' | 'derived'
  derived_from_stage: string | null;
  sort_order: number;
}

export interface MetricSemanticsData {
  rules: StageRule[];
}

const VALID_SOURCE_TYPES = new Set(['database', 'derived']);

async function fetchMetricSemantics(): Promise<MetricSemanticsData> {
  const { data, error } = await supabase
    .from('metric_stage_rules')
    .select('metric_name, source_stage, stage_source_type, derived_from_stage, sort_order')
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`指标规则加载失败: ${error.message}`);

  const rules: StageRule[] = [];
  for (const row of (data ?? [])) {
    if (VALID_SOURCE_TYPES.has(row.stage_source_type)) {
      rules.push(row as StageRule);
    } else {
      console.warn(
        `[metricSemantics] 忽略未知 stage_source_type "${row.stage_source_type}" (metric: ${row.metric_name}, stage: ${row.source_stage})`
      );
    }
  }
  return { rules };
}

/** React Query hook – stale for 5 minutes */
export function useMetricSemantics() {
  return useQuery({
    queryKey: ['metricSemantics'],
    queryFn: fetchMetricSemantics,
    staleTime: 5 * 60_000,
  });
}

// ── Pure helpers (work on already-fetched data) ──

/** All valid stage rules for a metric, sorted by sort_order */
export function getStageRules(rules: StageRule[], metric: string): StageRule[] {
  return rules.filter(r => r.metric_name === metric);
}

/** Stages that exist in the DB */
export function getDbStages(rules: StageRule[], metric: string): string[] {
  return rules
    .filter(r => r.metric_name === metric && r.stage_source_type === 'database')
    .map(r => r.source_stage);
}

/** Stages that are frontend-derived */
export function getDerivedStages(rules: StageRule[], metric: string): StageRule[] {
  return rules.filter(r => r.metric_name === metric && r.stage_source_type === 'derived');
}

/** All valid stage names for a metric (DB + derived) */
export function getAllValidStages(rules: StageRule[], metric: string): string[] {
  return rules.filter(r => r.metric_name === metric).map(r => r.source_stage);
}

/** Check if a given stage is frontend-derived for a metric */
export function isDerivedStage(rules: StageRule[], metric: string, stage: string): boolean {
  return rules.some(r => r.metric_name === metric && r.source_stage === stage && r.stage_source_type === 'derived');
}

// ── Hardcoded fallback rules (used when DB rules haven't loaded yet) ──

export const FALLBACK_RULES: StageRule[] = [
  // Price metrics – only 实际 in DB, 智能预测 is derived
  { metric_name: '日前电价-发电侧均价', source_stage: '实际', stage_source_type: 'database', derived_from_stage: null, sort_order: 1 },
  { metric_name: '日前电价-发电侧均价', source_stage: '智能预测', stage_source_type: 'derived', derived_from_stage: '实际', sort_order: 2 },
  { metric_name: '实时电价-发电侧均价', source_stage: '实际', stage_source_type: 'database', derived_from_stage: null, sort_order: 1 },
  { metric_name: '实时电价-发电侧均价', source_stage: '智能预测', stage_source_type: 'derived', derived_from_stage: '实际', sort_order: 2 },
  { metric_name: '节点电价(全省平均)', source_stage: '实际', stage_source_type: 'database', derived_from_stage: null, sort_order: 1 },
  { metric_name: '节点电价(全省平均)', source_stage: '智能预测', stage_source_type: 'derived', derived_from_stage: '实际', sort_order: 2 },
  { metric_name: '统一结算价', source_stage: '实际', stage_source_type: 'database', derived_from_stage: null, sort_order: 1 },
  { metric_name: '统一结算价', source_stage: '智能预测', stage_source_type: 'derived', derived_from_stage: '实际', sort_order: 2 },
  // Load metrics – multiple DB stages
  ...['直调负荷', '全网负荷', '联络线受电负荷'].flatMap(m => [
    { metric_name: m, source_stage: '周前', stage_source_type: 'database', derived_from_stage: null, sort_order: 1 },
    { metric_name: m, source_stage: '出清前上午', stage_source_type: 'database', derived_from_stage: null, sort_order: 2 },
    { metric_name: m, source_stage: '出清后', stage_source_type: 'database', derived_from_stage: null, sort_order: 3 },
    { metric_name: m, source_stage: '实际', stage_source_type: 'database', derived_from_stage: null, sort_order: 4 },
  ]),
  // Renewable output metrics – multiple DB stages
  ...['风电出力', '光伏出力', '新能源出力'].flatMap(m => [
    { metric_name: m, source_stage: '周前', stage_source_type: 'database', derived_from_stage: null, sort_order: 1 },
    { metric_name: m, source_stage: '出清前上午', stage_source_type: 'database', derived_from_stage: null, sort_order: 2 },
    { metric_name: m, source_stage: '出清后', stage_source_type: 'database', derived_from_stage: null, sort_order: 3 },
    { metric_name: m, source_stage: '实际', stage_source_type: 'database', derived_from_stage: null, sort_order: 4 },
  ]),
  // Weather metrics – only 实际 in DB
  ...['温度(全省算术平均)', '风速(风电装机容量加权)', '辐照(光伏装机容量加权)', '降水量(全省算术平均)'].flatMap(m => [
    { metric_name: m, source_stage: '实际', stage_source_type: 'database', derived_from_stage: null, sort_order: 1 },
  ]),
];

/** Get effective rules: use DB rules if loaded, else fallback */
export function effectiveRules(dbRules: StageRule[] | undefined): StageRule[] {
  return (dbRules && dbRules.length > 0) ? dbRules : FALLBACK_RULES;
}
