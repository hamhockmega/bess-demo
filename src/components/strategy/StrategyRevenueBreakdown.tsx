import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { ChartInfoButton, CHART_INFO } from '@/components/charts/ChartInfoButton';
import type { StrategyPerformance } from '@/data/strategyPerformanceData';
import { getRevenueBreakdown } from '@/data/strategyPerformanceData';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, CHART_COLORS } from '@/lib/chartTheme';

interface Props {
  perf: StrategyPerformance;
}

export const StrategyRevenueBreakdown: React.FC<Props> = ({ perf }) => {
  const breakdown = getRevenueBreakdown(perf);

  const chartData = breakdown.map((item) => ({
    name: item.label,
    value: Math.round(item.value),
  }));

  const getBarColor = (value: number, type: string) => {
    if (type === 'net') return value >= 0 ? CHART_COLORS.primary : CHART_COLORS.red;
    return value >= 0 ? CHART_COLORS.accent : CHART_COLORS.amber;
  };

  return (
    <PanelCard
      title="收益测算拆解"
      headerRight={<ChartInfoButton info={CHART_INFO.revenueBreakdown} />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: table breakdown */}
        <div className="space-y-2">
          {/* Loss explanation */}
          <div className="bg-secondary border border-border rounded-lg p-3 mb-3">
            <div className="text-[11px] font-semibold text-primary mb-1">损耗修正说明</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
              <p>• 充电电量：{perf.chargeEnergy} MWh</p>
              <p>• 充电效率：{perf.chargingEfficiency}% → 实际可存储电量 = {perf.chargeEnergy} × {perf.chargingEfficiency}% = {perf.storedEnergy} MWh</p>
              <p>• 放电效率：{perf.dischargingEfficiency}% → 有效放电电量 = {perf.storedEnergy} × {perf.dischargingEfficiency}% = {perf.effectiveDischargeEnergy} MWh</p>
              <p>• 综合效率：{((perf.chargingEfficiency / 100) * (perf.dischargingEfficiency / 100) * 100).toFixed(1)}%</p>
            </div>
          </div>

          {/* Breakdown rows */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 bg-muted/40 px-3 py-2 border-b border-border">
              <span className="text-[11px] font-semibold text-foreground">项目</span>
              <span className="text-[11px] font-semibold text-foreground text-right">金额（元）</span>
            </div>
            {breakdown.map((item) => (
              <div
                key={item.label}
                className={`grid grid-cols-2 px-3 py-2 border-b border-border last:border-0 ${
                  item.type === 'net' ? 'bg-primary/5 font-semibold' : ''
                }`}
              >
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
                <span
                  className={`text-[11px] text-right tabular-nums font-medium ${
                    item.value >= 0 ? 'text-dashboard-green' : 'text-dashboard-red'
                  }`}
                >
                  {item.value >= 0 ? '+' : ''}{item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid {...GRID_STYLE} horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE.tick} axisLine={AXIS_STYLE.axisLine} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: '#617066' }}
                axisLine={AXIS_STYLE.axisLine}
                tickLine={false}
                width={120}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(val: number) => [`${val.toLocaleString()} 元`]}
              />
              <ReferenceLine x={0} stroke="#DDE5DF" />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={getBarColor(entry.value, breakdown[idx].type)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PanelCard>
  );
};
