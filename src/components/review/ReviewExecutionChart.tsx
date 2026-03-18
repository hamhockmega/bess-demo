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
  Cell,
  ReferenceLine,
} from 'recharts';
import { AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE, CHART_COLORS } from '@/lib/chartTheme';

const chartInfo: ChartInfoContent = {
  title: '复盘日电价与策略执行结果',
  tradingMeaning:
    '本图展示复盘目标日的实际电价走势与策略执行动作。\n蓝色区域表示充电执行（电量从电网流入），绿色区域表示放电执行（电量向市场释放）。\n通过叠加门前节点电价和用户侧结算电价曲线，可以直观判断策略是否在低价时充电、高价时放电。',
  calculationLogic:
    '字段逻辑：\n\n• 门前节点电价：放电参考电价，放电收益基于此价格计算。\n• 用户侧结算电价：充电参考电价，充电成本基于此价格计算。\n• 充电功率（负值）：策略在该时段执行充电的功率。\n• 放电功率（正值）：策略在该时段执行放电的功率。\n\n如何解读：\n\n如果充电区间集中在电价低谷，放电区间集中在电价高峰，说明策略的时序匹配效果较好。\n如果高价时段未触发放电，可能是SOC已耗尽或放电触发价格设置偏高。',
};

interface Props {
  result: ReviewResult;
}

export const ReviewExecutionChart: React.FC<Props> = ({ result }) => {
  // Sample every 2nd point for readability
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
            <XAxis
              dataKey="time"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={false}
              interval={7}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={false}
              label={{ value: '元/MWh', angle: -90, position: 'insideRight', style: { fontSize: 9, fill: '#8A978F' } }}
            />
            <YAxis
              yAxisId="power"
              tick={AXIS_STYLE.tick}
              axisLine={AXIS_STYLE.axisLine}
              tickLine={false}
              label={{ value: 'MW', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#8A978F' } }}
            />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend {...LEGEND_STYLE} />
            <ReferenceLine yAxisId="power" y={0} stroke="#DDE5DF" />
            <Bar
              yAxisId="power"
              dataKey="chargePower"
              name="充电功率"
              fill={CHART_COLORS.blue}
              opacity={0.7}
              barSize={4}
            />
            <Bar
              yAxisId="power"
              dataKey="dischargePower"
              name="放电功率"
              fill={CHART_COLORS.primary}
              opacity={0.7}
              barSize={4}
            />
            <Line
              yAxisId="price"
              dataKey="frontNodePrice"
              name="门前节点电价"
              stroke={CHART_COLORS.red}
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              yAxisId="price"
              dataKey="settlementPrice"
              name="用户侧结算电价"
              stroke={CHART_COLORS.amber}
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  );
};
