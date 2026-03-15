/**
 * iWatt Chart Theme - centralized chart styling constants
 * Used across all Recharts components for consistent visual language
 */

// Series colors for charts
export const CHART_COLORS = {
  primary: '#49A85A',     // brand primary - actual values
  accent: '#7BCB4E',      // brand accent - forecast values
  deep: '#1F7A46',        // deep green - baseline
  light: '#9AD97B',       // light green
  blue: '#4E7FA3',        // comparison/reference
  amber: '#E39B2E',       // warning/attention series
  red: '#D85C5C',         // risk/negative series
  purple: '#7D6FA3',      // supplementary
  slate: '#4E6572',       // neutral context
};

// Ordered palette for multi-series charts
export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.blue,
  CHART_COLORS.amber,
  CHART_COLORS.deep,
  CHART_COLORS.accent,
  CHART_COLORS.purple,
  CHART_COLORS.red,
  CHART_COLORS.light,
];

// Axis and grid styling
export const AXIS_STYLE = {
  tick: { fontSize: 10, fill: '#8A978F' },
  axisLine: { stroke: '#DDE5DF' },
  tickLine: false as const,
};

export const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: '#E7ECE8',
};

// Tooltip styling
export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #DDE5DF',
    borderRadius: '8px',
    fontSize: 11,
    color: '#1F2A24',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    padding: '8px 12px',
  },
  cursor: { stroke: '#49A85A', strokeWidth: 1, strokeDasharray: '4 4' },
};

// Legend styling
export const LEGEND_STYLE = {
  wrapperStyle: { fontSize: 11, color: '#617066' },
};

// Semantic value colors
export const VALUE_COLORS = {
  positive: '#1F8A4C',
  warning: '#C97A16',
  negative: '#C94747',
  neutral: '#4E6572',
  info: '#2F6FB3',
};
