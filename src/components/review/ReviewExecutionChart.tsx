import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { ChartInfoButton, type ChartInfoContent } from '@/components/charts/ChartInfoButton';
import type { ReviewResult } from '@/data/reviewData';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE, CHART_COLORS } from '@/lib/chartTheme';

const chartInfo: ChartInfoContent = {
  title: '复盘日电价与策略执行结果',
  tradingMeaning:
    '本图展示复盘目标日的实际电价走势与策略执行动作。\n蓝色区域表示充电执行，绿色区域表示放电执行。',
  calculationLogic:
    '字段逻辑：\n\n• 门前节点电价：放电参考电价。\n• 用户侧结算电价：充电参考电价。\n• 充电功率（负值）：执行充电的功率。\n• 放电功率（正值）：执行放电的功率。',
};

interface Props {
  result: ReviewResult;
}

export const ReviewExecutionChart: React.FC<Props> = ({ result }) => {
  const data = result.intervals.map((iv) => ({
    time: iv.time,
    chargePower: iv.action === 'charge' ? -iv.powerMW : null,
    dischargePower: iv.action === 'discharge' ? iv.powerMW : null,
    frontNodePrice: iv.dischargePrice,
    settlementPrice: iv.chargePrice,
  }));

  return (
    <PanelCard
      title="复盘日电价与策略执行结果"
      headerRight={<ChartInfoButton info={chartInfo} />}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="time" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={false} interval={7} />
            <YAxis yAxisId="price" orientation="right" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={false}
              label={{ value: '元/MWh', angle: -90, position: 'insideRight', style: { fontSize: 9, fill: '#8A978F' } }} />
            <YAxis yAxisId="power" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={false}
              label={{ value: 'MW', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#8A978F' } }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend {...LEGEND_STYLE} />
            <ReferenceLine yAxisId="power" y={0} stroke="#DDE5DF" />
            <Bar yAxisId="power" dataKey="chargePower" name="充电功率" fill={CHART_COLORS.blue} opacity={0.7} barSize={4} />
            <Bar yAxisId="power" dataKey="dischargePower" name="放电功率" fill={CHART_COLORS.primary} opacity={0.7} barSize={4} />
            <Line yAxisId="price" dataKey="frontNodePrice" name="门前节点电价" stroke={CHART_COLORS.red} strokeWidth={1.5} dot={false} />
            <Line yAxisId="price" dataKey="settlementPrice" name="用户侧结算电价" stroke={CHART_COLORS.amber} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  );
};
