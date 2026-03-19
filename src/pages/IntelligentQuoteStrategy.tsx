import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StrategyParameterForm } from '@/components/strategy/StrategyParameterForm';
import { GeneratedQuotationTable } from '@/components/strategy/GeneratedQuotationTable';
import { StrategyResultChart } from '@/components/strategy/StrategyResultChart';
import { RuntimeParameterPanel } from '@/components/strategy/RuntimeParameterPanel';
import { StrategyPerformanceSummary } from '@/components/strategy/StrategyPerformanceSummary';
import { StrategyRevenueBreakdown } from '@/components/strategy/StrategyRevenueBreakdown';

import { StrategyCalculationLogicPanel } from '@/components/strategy/StrategyCalculationLogicPanel';
import { ScenarioPreviewPanel } from '@/components/strategy/ScenarioPreviewPanel';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { Zap, RotateCcw, Settings2, Download, Save, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DEFAULT_STRATEGY_FORM,
  type StrategyForm,
  type GeneratedStrategy,
  type UIMode,
} from '@/data/strategyData';
import type { StrategyPerformance } from '@/data/strategyPerformanceData';
import type { ForecastScenario } from '@/data/forecastScenarioService';
import {
  listForecastScenarioDatesAsync,
  getForecastScenarioByDateAsync,
} from '@/data/forecastScenarioService';
import { buildStrategyFromScenario } from '@/data/strategyGenerationEngine';
import { saveGeneratedStrategyToSupabase } from '@/data/strategySaveService';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const IntelligentQuoteStrategy: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [uiMode, setUiMode] = useState<UIMode>('beforeGenerate');
  const [form, setForm] = useState<StrategyForm>({ ...DEFAULT_STRATEGY_FORM });
  const [strategy, setStrategy] = useState<GeneratedStrategy | null>(null);
  const [performance, setPerformance] = useState<StrategyPerformance | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Scenario state
  const [forecastDate, setForecastDate] = useState<string>('');
  const [scenario, setScenario] = useState<ForecastScenario | null>(null);
  const [scenarioSource, setScenarioSource] = useState('智能预测模型');
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // Load available dates asynchronously (includes DB dates)
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  useEffect(() => {
    listForecastScenarioDatesAsync().then(setAvailableDates);
  }, []);

  const handleDateSelect = useCallback(
    async (date: Date | undefined) => {
      if (!date) return;
      const dateStr = format(date, 'yyyy-MM-dd');
      setForecastDate(dateStr);
      setScenarioLoading(true);
      setScenario(null);

      try {
        const loaded = await getForecastScenarioByDateAsync(dateStr);
        if (loaded) {
          setScenario(loaded);
          const sourceLabel = loaded.source === '实际市场数据' ? '实际市场数据' : '智能预测模型（确定性模拟）';
          toast.success(`已载入预测场景（来源：${sourceLabel}）`);
        } else {
          toast.error('未找到所选日期的预测场景');
        }
      } catch (e) {
        console.error('[IntelligentQuoteStrategy] scenario load error:', e);
        toast.error('载入预测场景失败');
      } finally {
        setScenarioLoading(false);
      }
    },
    [],
  );

  const handleSaveForReview = useCallback(async () => {
    if (!strategy || !performance) {
      toast.error('请先生成策略后再保存');
      return;
    }
    if (!forecastDate) {
      toast.error('缺少预测日期，无法保存');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveGeneratedStrategyToSupabase(form, strategy, performance, forecastDate);
      if (result.success) {
        toast.success('已成功保存为复盘策略');
      } else {
        toast.error(result.error ?? '保存失败，请稍后重试');
      }
    } catch (e) {
      console.error(e);
      toast.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }, [strategy, performance, form, forecastDate, saving]);

  const handleGenerate = useCallback(() => {
    if (!scenario) {
      toast.error('请先选择预测日期并载入场景');
      return;
    }
    const { strategy: gen, performance: perf } = buildStrategyFromScenario(form, scenario, forecastDate);
    setStrategy(gen);
    setPerformance(perf);
    setUiMode('afterGenerate');
    toast.success('智能策略已生成（确定性引擎）');
  }, [form, scenario, forecastDate]);

  const handleReset = useCallback(() => {
    setForm({ ...DEFAULT_STRATEGY_FORM });
    toast.info('参数已恢复默认值');
  }, []);

  const handleAdjust = useCallback(() => {
    setSheetOpen(true);
    setUiMode('editingAfterGenerate');
  }, []);

  const handleRegenerate = useCallback(() => {
    if (!scenario) {
      toast.error('请先选择预测日期并载入场景');
      return;
    }
    const { strategy: gen, performance: perf } = buildStrategyFromScenario(form, scenario, forecastDate);
    gen.status = '已生成';
    setStrategy(gen);
    setPerformance(perf);
    setUiMode('afterGenerate');
    setSheetOpen(false);
    toast.success('策略已重新生成');
  }, [form, scenario, forecastDate]);

  const handleResetInSheet = useCallback(() => {
    setForm({ ...DEFAULT_STRATEGY_FORM });
    toast.info('已恢复系统默认值');
  }, []);

  // Parse forecastDate for Calendar
  const selectedCalDate = forecastDate ? new Date(forecastDate + 'T00:00:00') : undefined;
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);

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
              基于SOC约束、运行边界与申报参数，自动生成独立储能电站现货市场报量报价推荐方案。同一场景与参数始终生成相同策略。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {uiMode === 'beforeGenerate' && (
              <>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  重置参数
                </Button>
                <Button size="sm" onClick={handleGenerate} disabled={!scenario || scenarioLoading}>
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
                <Button variant="outline" size="sm" onClick={handleSaveForReview} disabled={saving}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {saving ? '正在保存复盘策略...' : '保存为复盘策略'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Scenario Selection ── */}
        {uiMode === 'beforeGenerate' && (
          <PanelCard title="预测场景选择">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Date picker */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  <span className="text-destructive mr-0.5">*</span>预测日期
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-8 text-xs',
                        !forecastDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarDays className="w-3.5 h-3.5 mr-2" />
                      {forecastDate || '请选择预测日期'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedCalDate}
                      onSelect={(date) => {
                        if (!date) return;
                        const ds = format(date, 'yyyy-MM-dd');
                        if (!availableDateSet.has(ds)) {
                          toast.error('未开放预测价格信息权限');
                          return;
                        }
                        handleDateSelect(date);
                      }}
                      className={cn('p-3 pointer-events-auto')}
                      modifiers={{ unavailable: (date) => !availableDateSet.has(format(date, 'yyyy-MM-dd')) }}
                      modifiersClassNames={{ unavailable: 'text-muted-foreground/40 cursor-not-allowed' }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Source */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">场景来源</label>
                <Select value={scenarioSource} onValueChange={setScenarioSource}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="智能预测模型">智能预测模型</SelectItem>
                    <SelectItem value="历史均值场景">历史均值场景</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status indicator */}
              <div className="flex items-center h-8">
                {scenarioLoading ? (
                  <span className="text-xs text-muted-foreground">正在载入预测场景...</span>
                ) : scenario ? (
                  <Badge variant="outline" className="status-pill-success text-xs">
                    已载入 · {scenario.intervals.length} 个时段 · {scenario.source}
                  </Badge>
                ) : forecastDate ? (
                  <span className="text-xs text-muted-foreground">未找到预测场景</span>
                ) : (
                  <span className="text-xs text-muted-foreground">请先选择预测日期</span>
                )}
              </div>
            </div>
          </PanelCard>
        )}

        {/* ── Scenario Preview ── */}
        {scenario && uiMode === 'beforeGenerate' && (
          <ScenarioPreviewPanel scenario={scenario} />
        )}

        {/* ── State 1: Before Generation ── */}
        {uiMode === 'beforeGenerate' && (
          <div className="max-w-3xl mx-auto">
            <StrategyParameterForm form={form} onChange={setForm} />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                重置参数
              </Button>
              <Button onClick={handleGenerate} disabled={!scenario || scenarioLoading}>
                <Zap className="w-3.5 h-3.5 mr-1" />
                获取智能策略
              </Button>
            </div>
          </div>
        )}

        {/* ── State 2 & 3: After Generation ── */}
        {(uiMode === 'afterGenerate' || uiMode === 'editingAfterGenerate') && strategy && (
          <>
            {/* Scenario info bar */}
            {scenario && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
                <span>预测日期：<strong className="text-foreground">{forecastDate}</strong></span>
                <span>场景来源：<strong className="text-foreground">{scenario.source}</strong></span>
                <span>时段数：<strong className="text-foreground">{scenario.intervals.length}</strong></span>
                <span className="text-muted-foreground/60">同一场景与参数始终生成相同策略</span>
              </div>
            )}

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
