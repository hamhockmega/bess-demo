import { DataPoint, IntervalType, TIME_LABELS_15MIN } from './mockData';

// Aggregate 15-minute base data to other intervals
export function aggregateData(data: DataPoint[], interval: IntervalType): DataPoint[] {
  if (interval === '15分钟') return data;

  const groupSize = interval === '30分钟' ? 2 : interval === '60分钟' ? 4 : data.length;
  const groups: DataPoint[][] = [];

  for (let i = 0; i < data.length; i += groupSize) {
    groups.push(data.slice(i, i + groupSize));
  }

  return groups.map((group, idx) => {
    const avgValue = group.reduce((sum, d) => sum + d.value, 0) / group.length;
    return {
      dateKey: group[0].dateKey,
      timeKey: getTimeLabel(interval, idx, group),
      timestamp: idx,
      value: Math.round(avgValue * 100) / 100,
      unit: group[0].unit,
    };
  });
}

function getTimeLabel(interval: IntervalType, idx: number, group: DataPoint[]): string {
  if (interval === '日') return group[0].dateKey;
  if (interval === '30分钟') {
    const baseIdx = idx * 2;
    return TIME_LABELS_15MIN[baseIdx] || `${idx}`;
  }
  if (interval === '60分钟') {
    const baseIdx = idx * 4;
    return TIME_LABELS_15MIN[baseIdx]?.substring(0, 2) + ':00' || `${idx}`;
  }
  return group[0].timeKey;
}

// Format label for display based on interval
export function formatIntervalLabel(timeKey: string, interval: IntervalType): string {
  if (interval === '日') return timeKey;
  return timeKey;
}

// Get expected data point count for interval
export function getPointCount(interval: IntervalType): number {
  switch (interval) {
    case '15分钟': return 96;
    case '30分钟': return 48;
    case '60分钟': return 24;
    case '日': return 1;
  }
}

// Compute summary statistics
export function computeStats(data: DataPoint[]): { avg: number; max: number; min: number; sum: number } {
  if (data.length === 0) return { avg: 0, max: 0, min: 0, sum: 0 };
  const values = data.map(d => d.value);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / values.length * 100) / 100,
    max: Math.round(Math.max(...values) * 100) / 100,
    min: Math.round(Math.min(...values) * 100) / 100,
    sum: Math.round(sum * 100) / 100,
  };
}
