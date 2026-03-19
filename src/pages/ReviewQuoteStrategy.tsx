import React, { useState, useCallback, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { ReviewSourceSelector, type StrategySourceMode } from '@/components/review/ReviewSourceSelector';
import { ManualStrategyInputForm } from '@/components/review/ManualStrategyInputForm';
import { SingleDayReviewSummary } from '@/components/review/SingleDayReviewSummary';
import { ReviewRevenueBreakdownPanel } from '@/components/review/ReviewRevenueBreakdownPanel';
import { StrategyReviewComparison } from '@/components/review/StrategyReviewComparison';
import { ReviewConclusionPanel } from '@/components/review/ReviewConclusionPanel';
import { ReviewExecutionChart } from '@/components/review/ReviewExecutionChart';
import { ReviewSocChart } from '@/components/review/ReviewSocChart';
import { ReviewCalculationLogicPanel } from '@/components/review/ReviewCalculationLogicPanel';
import { toast } from 'sonner';
import {
  runSchedulePointReview,
  runTriggerReview,
  getDefaultManualStrategy,
  type StrategySnapshot,
  type ActualScenario,
  type ReviewResult,
} from '@/data/reviewData';
import {
  listStrategySnapshots,
  getStrategySnapshotById,
  getStrategySegmentsByStrategyId,
  getSchedulePointsByStrategyId,
  getScenarioByDate,
  type StrategySnapshotListItem,
  type StrategySegment,
  type SavedSchedulePoint,
} from '@/data/reviewSupabaseQueries';

const ReviewQuoteStrategy: React.FC = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().slice(0, 10);

  const [sourceMode, setSourceMode] = useState<StrategySourceMode>('previous');
  const [reviewDate, setReviewDate] = useState(defaultDate);

  // Strategy list from Supabase
  const [strategyList, setStrategyList] = useState<StrategySnapshotListItem[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null);
  const [loadedStrategy, setLoadedStrategy] = useState<StrategySnapshot | null>(null);
  const [loadedSegments, setLoadedSegments] = useState<StrategySegment[]>([]);
  const [loadedSchedulePoints, setLoadedSchedulePoints] = useState<SavedSchedulePoint[]>([]);
  const [strategyLoading, setStrategyLoading] = useState(false);

  // Manual mode
  const [manualStrategy, setManualStrategy] = useState<StrategySnapshot>(getDefaultManualStrategy());

  // Scenario
  const [scenarioLoaded, setScenarioLoaded] = useState(false);
  const [scenario, setScenario] = useState<ActualScenario | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // Result
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const activeStrategy = sourceMode === 'previous' ? loadedStrategy : manualStrategy;
  const isReviewReady = !!activeStrategy && scenarioLoaded && (sourceMode === 'manual' ? !!manualStrategy.strategyName : true);

  // Load strategy list on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await listStrategySnapshots();
      if (error) {
        toast.error(error);
      } else if (data.length === 0) {
        toast.info('未找到可用策略快照');
      }
      setStrategyList(data);
    })();
  }, []);

  // When user selects a strategy from dropdown
  const handleSelectStrategy = useCallback(async (id: number) => {
    setSelectedStrategyId(id);
    setStrategyLoading(true);
    setLoadedStrategy(null);
    setLoadedSegments([]);
    setLoadedSchedulePoints([]);
    setReviewResult(null);

    const [snapshotRes, segmentsRes, scheduleRes] = await Promise.all([
      getStrategySnapshotById(id),
      getStrategySegmentsByStrategyId(id),
      getSchedulePointsByStrategyId(id),
    ]);

    setStrategyLoading(false);

    if (snapshotRes.error) {
      toast.error(snapshotRes.error);
      return;
    }
    if (segmentsRes.error) {
      toast.warning(segmentsRes.error);
    }
    if (scheduleRes.error) {
      toast.warning(scheduleRes.error);
    }

    setLoadedStrategy(snapshotRes.data);
    setLoadedSegments(segmentsRes.data);
    setLoadedSchedulePoints(scheduleRes.data);

    const spCount = scheduleRes.data.length;
    const modeLabel = spCount > 0 ? '时段策略复盘模式' : '触发价格复盘模式';
    toast.success(`已加载策略：${snapshotRes.data?.strategyName}（${modeLabel}，${spCount} 个时段策略点）`);
  }, []);

  // Load scenario
  const handleLoadScenario = useCallback(async () => {
    setScenarioLoading(true);
    setScenarioLoaded(false);
    setScenario(null);
    setReviewResult(null);

    const { data, intervalCount, error } = await getScenarioByDate(reviewDate);
    setScenarioLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (intervalCount !== 96) {
      toast.warning(`所选日期的场景数据不完整，当前仅加载到 ${intervalCount} 个时段`);
    }

    setScenario(data);
    setScenarioLoaded(true);
    toast.success(`已加载 ${reviewDate} 实际场景数据（${intervalCount} 个时段）`);
  }, [reviewDate]);

  // Run review
  const handleStartReview = useCallback(() => {
    if (!activeStrategy || !scenario) return;
    setReviewLoading(true);
    setTimeout(() => {
      let result: ReviewResult;

      if (sourceMode === 'previous' && loadedSchedulePoints.length > 0) {
        // Primary: schedule-point-based review
        result = runSchedulePointReview(activeStrategy, scenario, loadedSchedulePoints);
      } else {
        // Fallback: trigger-based review (manual mode or legacy strategies)
        result = runTriggerReview(activeStrategy, scenario);
      }

      setReviewResult(result);
      setReviewLoading(false);
      toast.success(`复盘计算完成（${result.reviewMode === 'schedule-point' ? '时段策略模式' : '触发价格模式'}）`);
    }, 50);
  }, [activeStrategy, scenario, sourceMode, loadedSchedulePoints]);

  return (
    <AppShell>
      <div className="p-5 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">策略复盘（报量报价）</h1>
            {reviewResult && (
              <Badge variant="outline" className="status-pill-success text-xs">
                复盘完成
              </Badge>
            )}
            {reviewResult && (
              <Badge variant="outline" className="text-xs">
                {reviewResult.reviewMode === 'schedule-point' ? '时段策略模式' : '触发价格模式'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
            将前一日智能策略或手动输入策略代入目标日期的实际价格场景，完成单日测算与策略复盘。所有计算逻辑在前端完成。
          </p>
        </div>

        {/* 1. Configuration */}
        <ReviewSourceSelector
          sourceMode={sourceMode}
          onSourceModeChange={setSourceMode}
          reviewDate={reviewDate}
          onReviewDateChange={setReviewDate}
          loadedStrategy={loadedStrategy}
          scenarioLoaded={scenarioLoaded}
          onLoadScenario={handleLoadScenario}
          onStartReview={handleStartReview}
          isReviewReady={isReviewReady}
          strategyList={strategyList}
          selectedStrategyId={selectedStrategyId}
          onSelectStrategy={handleSelectStrategy}
          strategyLoading={strategyLoading}
          scenarioLoading={scenarioLoading}
          reviewLoading={reviewLoading}
        />

        {/* Manual input form */}
        {sourceMode === 'manual' && (
          <ManualStrategyInputForm
            strategy={manualStrategy}
            onChange={setManualStrategy}
          />
        )}

        {/* Results */}
        {reviewResult && (
          <div className="space-y-4">
            <SingleDayReviewSummary result={reviewResult} />
            <ReviewRevenueBreakdownPanel result={reviewResult} />
            <StrategyReviewComparison result={reviewResult} />
            <ReviewConclusionPanel result={reviewResult} />
            <ReviewExecutionChart result={reviewResult} />
            <ReviewSocChart result={reviewResult} />
            <ReviewCalculationLogicPanel />
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default ReviewQuoteStrategy;
