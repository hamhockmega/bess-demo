import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { ChartInfoButton, type ChartInfoContent } from '@/components/charts/ChartInfoButton';
import type { ReviewResult } from '@/data/reviewData';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE, CHART_COLORS } from '@/lib/chartTheme';

const chartInfo: ChartInfoContent = {
  title: 'SOC 轨迹复盘',
  tradingMeaning:
    'SOC轨迹复盘图展示在实际价格场景下，按照策略执行充放电后的电池荷电状态变化。\n当有策略目标SOC时，可对比实际与预期轨迹的偏差。',
  calculationLogic:
    '字段逻辑：\n\n• 实际SOC轨迹：基于实际场景复盘计算的SOC。\n• 策略目标SOC轨迹：策略生成时的预期SOC（如有）。\n• SOC上限/下限：策略设定的安全运行边界。\n\n充电时：入库电量 = 电网充电量 × 充电效率，SOC增加。\n放电时：电池内部放电量直接减少SOC。',
};

interface Props {
  result: ReviewResult;
}

export const ReviewSocChart: React.FC<Props> = ({ result }) => {
  const hasExpected = result.socSeries.some((s) => s.expectedSoc != null);

  return (
    <PanelCard
      title="SOC 轨迹复盘"
      headerRight={<ChartInfoButton info={chartInfo} />}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={result.socSeries} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="time"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={false}
              interval={7}
            />
            <YAxis
              domain={[0, 100]}
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={false}
              label={{ value: 'SOC %', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#8A978F' } }}
            />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend {...LEGEND_STYLE} />
            <Area
              dataKey="soc"
              name="实际SOC轨迹"
              stroke={CHART_COLORS.primary}
              fill={CHART_COLORS.primary}
              fillOpacity={0.15}
              strokeWidth={2}
            />
            {hasExpected && (
              <Line
                dataKey="expectedSoc"
                name="策略目标SOC轨迹"
                stroke={CHART_COLORS.blue}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="6 3"
                connectNulls
              />
            )}
            <Line
              dataKey="upperBound"
              name="SOC上限"
              stroke={CHART_COLORS.red}
              strokeWidth={1}
              strokeDasharray="4 3"
              dot={false}
            />
            <Line
              dataKey="lowerBound"
              name="SOC下限"
              stroke={CHART_COLORS.amber}
              strokeWidth={1}
              strokeDasharray="4 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  );
};
