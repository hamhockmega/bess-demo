import React, { useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
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
  strategySnapshotRepository,
  actualScenarioRepository,
  runReview,
  getDefaultManualStrategy,
  type StrategySnapshot,
  type ActualScenario,
  type ReviewResult,
} from '@/data/reviewData';

const ReviewQuoteStrategy: React.FC = () => {
  // Get yesterday as default date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().slice(0, 10);

  const [sourceMode, setSourceMode] = useState<StrategySourceMode>('previous');
  const [reviewDate, setReviewDate] = useState(defaultDate);
  const [loadedStrategy, setLoadedStrategy] = useState<StrategySnapshot | null>(null);
  const [manualStrategy, setManualStrategy] = useState<StrategySnapshot>(getDefaultManualStrategy());
  const [scenarioLoaded, setScenarioLoaded] = useState(false);
  const [scenario, setScenario] = useState<ActualScenario | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);

  const activeStrategy = sourceMode === 'previous' ? loadedStrategy : manualStrategy;
  const isReviewReady = !!activeStrategy && scenarioLoaded && (sourceMode === 'manual' ? !!manualStrategy.strategyName : true);

  const handleLoadStrategy = useCallback(() => {
    const snapshot = strategySnapshotRepository.getLatest();
    if (snapshot) {
      setLoadedStrategy(snapshot);
      toast.success(`已加载策略：${snapshot.strategyName}`);
    } else {
      toast.info('未找到已保存的策略，已加载演示策略');
      setLoadedStrategy(strategySnapshotRepository.getLatest());
    }
  }, []);

  const handleLoadScenario = useCallback(async () => {
    const s = await actualScenarioRepository.getByDate(reviewDate);
    if (s) {
      setScenario(s);
      setScenarioLoaded(true);
      toast.success(`已加载 ${reviewDate} 实际场景数据（${s.frontNodePrices.filter(p => p > 0).length} 个有效时段）`);
    } else {
      setScenario(null);
      setScenarioLoaded(false);
      toast.error(`未找到 ${reviewDate} 的市场场景数据，请确认日期是否正确`);
    }
  }, [reviewDate]);

  const handleStartReview = useCallback(() => {
    if (!activeStrategy || !scenario) return;
    const result = runReview(activeStrategy, scenario);
    setReviewResult(result);
    toast.success('复盘计算完成');
  }, [activeStrategy, scenario]);

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
          onLoadStrategy={handleLoadStrategy}
          onLoadScenario={handleLoadScenario}
          onStartReview={handleStartReview}
          isReviewReady={isReviewReady}
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
            {/* 2. Single-day review result */}
            <SingleDayReviewSummary result={reviewResult} />

            {/* 3. Revenue breakdown */}
            <ReviewRevenueBreakdownPanel result={reviewResult} />

            {/* 4. Strategy review comparison */}
            <StrategyReviewComparison result={reviewResult} />

            {/* 5. Review conclusion */}
            <ReviewConclusionPanel result={reviewResult} />

            {/* 6. Charts */}
            <ReviewExecutionChart result={reviewResult} />
            <ReviewSocChart result={reviewResult} />

            {/* 7. Calculation logic */}
            <ReviewCalculationLogicPanel />
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default ReviewQuoteStrategy;
