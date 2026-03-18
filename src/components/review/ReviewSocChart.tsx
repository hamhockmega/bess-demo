import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { ChartInfoButton, type ChartInfoContent } from '@/components/charts/ChartInfoButton';
import type { ReviewResult } from '@/data/reviewData';
import {
  ResponsiveContainer,
  AreaChart,
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
    'SOC轨迹复盘图展示在实际价格场景下，按照策略规则执行充放电后的电池荷电状态变化。\n通过观察SOC曲线是否频繁触及上下限，可以判断策略的容量利用效率和执行合理性。',
  calculationLogic:
    '字段逻辑：\n\n• SOC：当前时段结束后的电池荷电状态百分比。\n• SOC上限/下限：策略设定的安全运行边界。\n\n如何解读：\n\n如果SOC长时间停留在下限附近，说明放电过度或充电不足，高价时段可能无电可放。\n如果SOC长时间停留在上限附近，说明充电过多，低价时段的充电机会可能被浪费。\n理想的SOC轨迹应呈现明显的"充-放"交替节奏。',
};

interface Props {
  result: ReviewResult;
}

export const ReviewSocChart: React.FC<Props> = ({ result }) => {
  return (
    <PanelCard
      title="SOC 轨迹复盘"
      headerRight={<ChartInfoButton info={chartInfo} />}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={result.socSeries} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
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
              name="SOC"
              stroke={CHART_COLORS.primary}
              fill={CHART_COLORS.primary}
              fillOpacity={0.15}
              strokeWidth={2}
            />
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  );
};
