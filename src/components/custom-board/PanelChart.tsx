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

const COLORS = [
  'hsl(185, 80%, 50%)',   // cyan
  'hsl(145, 60%, 45%)',   // green
  'hsl(30, 80%, 55%)',    // orange
  'hsl(270, 50%, 55%)',   // purple
];

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
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 20%)" />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }}
          interval={11}
          axisLine={{ stroke: 'hsl(215, 25%, 20%)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }}
          axisLine={{ stroke: 'hsl(215, 25%, 20%)' }}
          tickLine={false}
          width={55}
          label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(215, 15%, 50%)' } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(215, 30%, 14%)',
            border: '1px solid hsl(215, 25%, 20%)',
            borderRadius: '4px',
            fontSize: 11,
            color: 'hsl(195, 60%, 80%)',
          }}
          formatter={(val: number) => [`${val} ${unit}`, '']}
        />
        {hasMulti && seriesLabels && (
          <Legend
            wrapperStyle={{ fontSize: 10, color: 'hsl(215, 15%, 50%)' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          name={seriesLabels?.[0] || panelName}
          stroke={COLORS[0]}
          dot={false}
          strokeWidth={1.5}
        />
        {hasMulti && (
          <Line
            type="monotone"
            dataKey="value2"
            name={seriesLabels?.[1] || '系列2'}
            stroke={COLORS[1]}
            dot={false}
            strokeWidth={1.5}
          />
        )}
        {data.length > 0 && data[0].value3 !== undefined && (
          <Line
            type="monotone"
            dataKey="value3"
            name={seriesLabels?.[2] || '系列3'}
            stroke={COLORS[2]}
            dot={false}
            strokeWidth={1.5}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};
