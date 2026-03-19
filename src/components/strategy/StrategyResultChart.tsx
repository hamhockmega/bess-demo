import React, { useState } from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';
import { ChartInfoButton, CHART_INFO } from '@/components/charts/ChartInfoButton';
import type { PowerPoint, SocPoint, EnergyPoint } from '@/data/strategyData';

type ChartTab = '中标功率' | '中标电量' | 'SOC';

interface Props {
  powerSeries: PowerPoint[];
  socSeries: SocPoint[];
  energySeries: EnergyPoint[];
}

export const StrategyResultChart: React.FC<Props> = ({
  powerSeries,
  socSeries,
  energySeries,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('中标功率');

  const tabs: ChartTab[] = ['中标功率', '中标电量', 'SOC'];

  const renderChart = () => {
    const tickInterval = 11; // show every ~3 hours

    switch (activeTab) {
      case '中标功率':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={powerSeries}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="time" {...AXIS_STYLE} interval={tickInterval} />
              <YAxis {...AXIS_STYLE} label={{ value: 'MW', position: 'insideTopLeft', style: { fontSize: 10, fill: '#8A978F' } }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend {...LEGEND_STYLE} />
              <ReferenceLine y={0} stroke="#DDE5DF" />
              <Bar dataKey="quotationPower" name="报量功率" fill={CHART_COLORS.primary} opacity={0.3} barSize={4} />
              <Line dataKey="awardedPower" name="中标功率" stroke={CHART_COLORS.deep} strokeWidth={1.5} dot={false} />
              <Line dataKey="realTimePrice" name="实时价格" stroke={CHART_COLORS.amber} strokeWidth={1} dot={false} strokeDasharray="4 2" yAxisId="right" />
              <YAxis yAxisId="right" orientation="right" {...AXIS_STYLE} label={{ value: '元/MWh', position: 'insideTopRight', style: { fontSize: 10, fill: '#8A978F' } }} />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case '中标电量':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={energySeries}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="time" {...AXIS_STYLE} interval={tickInterval} />
              <YAxis {...AXIS_STYLE} label={{ value: 'MWh', position: 'insideTopLeft', style: { fontSize: 10, fill: '#8A978F' } }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend {...LEGEND_STYLE} />
              <ReferenceLine y={0} stroke="#DDE5DF" />
              <Bar dataKey="awardedEnergy" name="中标电量" fill={CHART_COLORS.blue} barSize={4} />
              <Line dataKey="cumulativeEnergy" name="累计电量" stroke={CHART_COLORS.primary} strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'SOC':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={socSeries}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="time" {...AXIS_STYLE} interval={tickInterval} />
              <YAxis {...AXIS_STYLE} domain={[0, 100]} label={{ value: '%', position: 'insideTopLeft', style: { fontSize: 10, fill: '#8A978F' } }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend {...LEGEND_STYLE} />
              <Area dataKey="upperBound" name="SOC上限" stroke="none" fill={CHART_COLORS.light} fillOpacity={0.2} />
              <Area dataKey="lowerBound" name="SOC下限" stroke="none" fill="#FFFFFF" fillOpacity={1} />
              <Line dataKey="soc" name="SOC" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              <ReferenceLine y={socSeries[0]?.upperBound} stroke={CHART_COLORS.amber} strokeDasharray="4 4" label={{ value: '上限', position: 'right', style: { fontSize: 10, fill: CHART_COLORS.amber } }} />
              <ReferenceLine y={socSeries[0]?.lowerBound} stroke={CHART_COLORS.red} strokeDasharray="4 4" label={{ value: '下限', position: 'right', style: { fontSize: 10, fill: CHART_COLORS.red } }} />
            </ComposedChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <PanelCard
      title="策略结果"
      headerRight={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1 text-xs rounded transition-all',
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <ChartInfoButton info={CHART_INFO[activeTab === '中标功率' ? 'power' : activeTab === '中标电量' ? 'energy' : 'soc']} />
        </div>
      }
    >
      {renderChart()}
    </PanelCard>
  );
};
