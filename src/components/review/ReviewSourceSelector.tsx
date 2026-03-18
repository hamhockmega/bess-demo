import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Download, Play, CalendarDays } from 'lucide-react';
import type { StrategySnapshot } from '@/data/reviewData';

export type StrategySourceMode = 'previous' | 'manual';

interface Props {
  sourceMode: StrategySourceMode;
  onSourceModeChange: (mode: StrategySourceMode) => void;
  reviewDate: string;
  onReviewDateChange: (date: string) => void;
  loadedStrategy: StrategySnapshot | null;
  scenarioLoaded: boolean;
  onLoadStrategy: () => void;
  onLoadScenario: () => void;
  onStartReview: () => void;
  isReviewReady: boolean;
}

export const ReviewSourceSelector: React.FC<Props> = ({
  sourceMode,
  onSourceModeChange,
  reviewDate,
  onReviewDateChange,
  loadedStrategy,
  scenarioLoaded,
  onLoadStrategy,
  onLoadScenario,
  onStartReview,
  isReviewReady,
}) => {
  return (
    <PanelCard title="复盘对象配置">
      <div className="space-y-4">
        {/* Source mode */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">策略来源方式</Label>
          <RadioGroup
            value={sourceMode}
            onValueChange={(v) => onSourceModeChange(v as StrategySourceMode)}
            className="flex items-center gap-6"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="previous" id="src-prev" />
              <Label htmlFor="src-prev" className="text-xs cursor-pointer">使用前一日智能策略</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="manual" id="src-manual" />
              <Label htmlFor="src-manual" className="text-xs cursor-pointer">手动输入策略</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {sourceMode === 'previous' && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">策略日期</Label>
                <Input
                  type="date"
                  value={reviewDate}
                  onChange={(e) => onReviewDateChange(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">已加载策略</Label>
                <div className="flex items-center gap-2">
                  {loadedStrategy ? (
                    <Badge variant="outline" className="status-pill-success text-xs">
                      {loadedStrategy.strategyName}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">未加载</span>
                  )}
                  <Button variant="outline" size="sm" onClick={onLoadStrategy} className="h-7 text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    加载策略
                  </Button>
                </div>
              </div>
            </>
          )}

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">复盘日期（实际场景）</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={reviewDate}
                onChange={(e) => onReviewDateChange(e.target.value)}
                className="h-8 text-xs"
              />
              <Button variant="outline" size="sm" onClick={onLoadScenario} className="h-7 text-xs">
                <CalendarDays className="w-3 h-3 mr-1" />
                加载实际场景
              </Button>
              {scenarioLoaded && (
                <Badge variant="outline" className="status-pill-success text-xs">已加载</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Start review button */}
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={onStartReview}
            disabled={!isReviewReady}
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            开始复盘
          </Button>
        </div>
      </div>
    </PanelCard>
  );
};
