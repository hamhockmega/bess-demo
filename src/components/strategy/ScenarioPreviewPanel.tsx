import React, { useState, useMemo } from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';
import { ChartInfoButton } from '@/components/charts/ChartInfoButton';
import type { ForecastScenario } from '@/data/forecastScenarioService';
import { computeScenarioStats } from '@/data/forecastScenarioService';

interface Props {
  scenario: ForecastScenario;
}

export const ScenarioPreviewPanel: React.FC<Props> = ({ scenario }) => {
  const [expanded, setExpanded] = useState(true);
  const stats = useMemo(() => computeScenarioStats(scenario), [scenario]);

  const chartData = useMemo(
    () =>
      scenario.intervals.map((iv) => ({
        time: iv.time,
        frontNodePrice: iv.frontNodePrice,
        userSettlementPrice: iv.userSettlementPrice,
      })),
    [scenario],
  );

  return (
    <PanelCard
      title="基础价格曲线预览"
      headerRight={
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{scenario.date}</span>
          <ChartInfoButton
            info={{
              title: '场景预览说明',
              description:
                '展示所选预测日的门前节点电价和用户侧统一结算点电价基础曲线。策略生成将基于此场景进行优化。',
            }}
          />
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? (
              <>
                收起场景预览 <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                展开场景预览 <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      }
    >
      {expanded && (
        <div className="space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatBlock label="门前节点电价" min={stats.frontNodeMin} max={stats.frontNodeMax} avg={stats.frontNodeAvg} />
            <StatBlock label="用户侧结算电价" min={stats.settlementMin} max={stats.settlementMax} avg={stats.settlementAvg} />
            <div className="flex flex-col justify-center">
              <span className="text-[11px] text-muted-foreground">场景来源</span>
              <span className="text-xs font-medium text-foreground">{scenario.source}</span>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="time" {...AXIS_STYLE} interval={11} />
              <YAxis
                {...AXIS_STYLE}
                label={{
                  value: '元/MWh',
                  position: 'insideTopLeft',
                  style: { fontSize: 10, fill: '#8A978F' },
                }}
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend {...LEGEND_STYLE} />
              <Line
                dataKey="frontNodePrice"
                name="门前节点电价"
                stroke={CHART_COLORS.primary}
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                dataKey="userSettlementPrice"
                name="用户侧结算电价"
                stroke={CHART_COLORS.blue}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </PanelCard>
  );
};

const StatBlock: React.FC<{
  label: string;
  min: number;
  max: number;
  avg: number;
}> = ({ label, min, max, avg }) => (
  <div className="bg-muted/30 rounded-md p-2.5 space-y-1">
    <span className="text-[11px] text-muted-foreground block">{label}</span>
    <div className="flex items-center gap-3 text-xs">
      <span>
        最小 <strong className="text-foreground">{min}</strong>
      </span>
      <span>
        最大 <strong className="text-foreground">{max}</strong>
      </span>
      <span>
        均值 <strong className="text-foreground">{avg}</strong>
      </span>
    </div>
  </div>
);
