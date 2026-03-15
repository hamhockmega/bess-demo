import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartDataPoint, PANEL_UNITS, PANEL_SERIES_LABELS } from '@/data/customBoardData';
import { CHART_PALETTE, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE } from '@/lib/chartTheme';

interface PanelChartProps {
  panelName: string;
  data: ChartDataPoint[];
}

export const PanelChart: React.FC<PanelChartProps> = ({ panelName, data }) => {
  const unit = PANEL_UNITS[panelName] || '';
  const seriesLabels = PANEL_SERIES_LABELS[panelName];
  const hasMulti = data.length > 0 && data[0].value2 !== undefined;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis
          dataKey="time"
          tick={AXIS_STYLE.tick}
          interval={11}
          axisLine={AXIS_STYLE.axisLine}
          tickLine={false}
        />
        <YAxis
          tick={AXIS_STYLE.tick}
          axisLine={AXIS_STYLE.axisLine}
          tickLine={false}
          width={55}
          label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#8A978F' } }}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(val: number) => [`${val} ${unit}`, '']}
        />
        {hasMulti && seriesLabels && (
          <Legend {...LEGEND_STYLE} />
        )}
        <Line
          type="monotone"
          dataKey="value"
          name={seriesLabels?.[0] || panelName}
          stroke={CHART_PALETTE[0]}
          dot={false}
          strokeWidth={2}
        />
        {hasMulti && (
          <Line
            type="monotone"
            dataKey="value2"
            name={seriesLabels?.[1] || '系列2'}
            stroke={CHART_PALETTE[1]}
            dot={false}
            strokeWidth={1.5}
          />
        )}
        {data.length > 0 && data[0].value3 !== undefined && (
          <Line
            type="monotone"
            dataKey="value3"
            name={seriesLabels?.[2] || '系列3'}
            stroke={CHART_PALETTE[2]}
            dot={false}
            strokeWidth={1.5}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};
