import React, { useState, useCallback, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StrategyParameterForm } from '@/components/strategy/StrategyParameterForm';
import { GeneratedQuotationTable } from '@/components/strategy/GeneratedQuotationTable';
import { StrategyResultChart } from '@/components/strategy/StrategyResultChart';
import { RuntimeParameterPanel } from '@/components/strategy/RuntimeParameterPanel';
import { StrategyPerformanceSummary } from '@/components/strategy/StrategyPerformanceSummary';
import { StrategyRevenueBreakdown } from '@/components/strategy/StrategyRevenueBreakdown';
import { StrategyAwardProbabilityPanel } from '@/components/strategy/StrategyAwardProbabilityPanel';
import { StrategyCalculationLogicPanel } from '@/components/strategy/StrategyCalculationLogicPanel';
import { Zap, RotateCcw, Settings2, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_STRATEGY_FORM,
  generateMockStrategy,
  type StrategyForm,
  type GeneratedStrategy,
  type UIMode,
} from '@/data/strategyData';
import { generateStrategyPerformance, type StrategyPerformance } from '@/data/strategyPerformanceData';
import { strategySnapshotRepository, type StrategySnapshot } from '@/data/reviewData';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const IntelligentQuoteStrategy: React.FC = () => {
  const navigate = useNavigate();
  const [uiMode, setUiMode] = useState<UIMode>('beforeGenerate');
  const [form, setForm] = useState<StrategyForm>({ ...DEFAULT_STRATEGY_FORM });
  const [strategy, setStrategy] = useState<GeneratedStrategy | null>(null);
  const [performance, setPerformance] = useState<StrategyPerformance | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSaveForReview = useCallback(() => {
    if (!strategy || !performance) return;
    const snapshot: StrategySnapshot = {
      strategyId: strategy.strategyId,
      strategyName: strategy.strategyName,
      strategySourceType: 'generated',
      strategyDate: new Date().toISOString().slice(0, 10),
      initialSoc: form.initialSoc,
      socMin: form.minSoc,
      socMax: form.maxSoc,
      chargePowerLimit: Math.abs(form.chargePowerLimit),
      dischargePowerLimit: form.dischargePowerLimit,
      chargePriceTrigger: strategy.quotationSegments.find(s => s.type === '充电')?.offerPrice ?? 200,
      dischargePriceTrigger: strategy.quotationSegments.find(s => s.type === '放电')?.offerPrice ?? 350,
      chargingEfficiency: performance.chargingEfficiency,
      dischargingEfficiency: performance.dischargingEfficiency,
      otherCosts: performance.otherCosts,
      capacity: form.availableCapacity,
      notes: `由智能策略生成，${strategy.createdAt}`,
      generatedAt: strategy.createdAt,
      expectedProfit: performance.netProfit,
      expectedAwardProbability: performance.awardProbability,
    };
    strategySnapshotRepository.save(snapshot);
    toast.success('策略已保存，可在"策略复盘"中使用');
  }, [strategy, performance, form]);

  const handleGenerate = useCallback(() => {
    const result = generateMockStrategy(form);
    setStrategy(result);
    setPerformance(generateStrategyPerformance(result.strategyId, form.lossCostValue));
    setUiMode('afterGenerate');
    toast.success('智能策略已生成');
  }, [form]);

  const handleReset = useCallback(() => {
    setForm({ ...DEFAULT_STRATEGY_FORM });
    toast.info('参数已恢复默认值');
  }, []);

  const handleAdjust = useCallback(() => {
    setSheetOpen(true);
    setUiMode('editingAfterGenerate');
  }, []);

  const handleRegenerate = useCallback(() => {
    const result = generateMockStrategy(form);
    result.status = '已生成';
    setStrategy(result);
    setPerformance(generateStrategyPerformance(result.strategyId, form.lossCostValue));
    setUiMode('afterGenerate');
    setSheetOpen(false);
    toast.success('策略已重新生成');
  }, [form]);

  const handleResetInSheet = useCallback(() => {
    setForm({ ...DEFAULT_STRATEGY_FORM });
    toast.info('已恢复系统默认值');
  }, []);

  return (
    <AppShell>
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-foreground">智能策略(报量报价)</h1>
              {uiMode === 'afterGenerate' && strategy && (
                <Badge variant="outline" className="status-pill-success text-xs">
                  {strategy.status}
                </Badge>
              )}
              {uiMode === 'editingAfterGenerate' && (
                <Badge variant="outline" className="status-pill-warning text-xs">
                  参数已调整，待重新生成
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              基于SOC约束、运行边界与申报参数，自动生成独立储能电站现货市场报量报价推荐方案。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {uiMode === 'beforeGenerate' && (
              <>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  重置参数
                </Button>
                <Button size="sm" onClick={handleGenerate}>
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  获取智能策略
                </Button>
              </>
            )}
            {(uiMode === 'afterGenerate' || uiMode === 'editingAfterGenerate') && (
              <>
                <Button variant="outline" size="sm" onClick={handleAdjust}>
                  <Settings2 className="w-3.5 h-3.5 mr-1" />
                  调整策略参数
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-3.5 h-3.5 mr-1" />
                  下载申报方案
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── State 1: Before Generation ── */}
        {uiMode === 'beforeGenerate' && (
          <div className="max-w-3xl mx-auto">
            <StrategyParameterForm form={form} onChange={setForm} />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                重置参数
              </Button>
              <Button onClick={handleGenerate}>
                <Zap className="w-3.5 h-3.5 mr-1" />
                获取智能策略
              </Button>
            </div>
          </div>
        )}

        {/* ── State 2 & 3: After Generation ── */}
        {(uiMode === 'afterGenerate' || uiMode === 'editingAfterGenerate') && strategy && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
              {/* Left column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {strategy.strategyName}
                </div>

                {/* Quotation table */}
                <GeneratedQuotationTable segments={strategy.quotationSegments} />

                {/* Chart */}
                <StrategyResultChart
                  powerSeries={strategy.powerSeries}
                  socSeries={strategy.socSeries}
                  energySeries={strategy.energySeries}
                />
              </div>

              {/* Right column */}
              <div>
                <RuntimeParameterPanel
                  params={strategy.runtimeParameters}
                  priceBenchmark={strategy.priceBenchmark}
                />
              </div>
            </div>

            {/* ── Performance Evaluation Section ── */}
            {performance && (
              <div className="space-y-4 pt-2">
                <StrategyPerformanceSummary perf={performance} />
                <StrategyRevenueBreakdown perf={performance} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <StrategyAwardProbabilityPanel perf={performance} />
                  <StrategyCalculationLogicPanel perf={performance} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── State 3: Editing Sheet ── */}
        <Sheet open={sheetOpen} onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open && uiMode === 'editingAfterGenerate') {
            setUiMode('afterGenerate');
          }
        }}>
          <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-base">调整策略参数</SheetTitle>
            </SheetHeader>
            <div className="mt-4 pr-1">
              <div className="flex justify-end mb-3">
                <button
                  onClick={handleResetInSheet}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  恢复系统默认值
                </button>
              </div>
              <StrategyParameterForm form={form} onChange={setForm} />
              <div className="flex justify-end mt-6 pb-6">
                <Button onClick={handleRegenerate}>
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  重新获取智能策略
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppShell>
  );
};

export default IntelligentQuoteStrategy;
