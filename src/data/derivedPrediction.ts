/**
 * Deterministic frontend-derived 智能预测 generation.
 *
 * Given an "实际" (actual) price series, produces a prediction series
 * that is fully deterministic: same inputs → same outputs, no Math.random().
 *
 * Design targets:
 *   - Average prediction accuracy ≈ 93% (average error ≈ 7%)
 *   - Pointwise error fluctuation roughly 0.1% – 35%
 */
import type { DataPoint, MetricSeries } from './mockData';

// ── Deterministic hash ──

function djb2Hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Derive a deterministic "智能预测" series from an actual series.
 *
 * The error for each point is derived from a hash of
 *   (dateKey + metricName + interval_index + actual_value)
 * so it's fully reproducible.
 *
 * Error distribution uses x^4 mapping on [0,1) so that
 *   E[error] = 0.001 + 0.349 × E[x^4] = 0.001 + 0.349/5 ≈ 7.1%
 *   → accuracy ≈ 92.9%
 */
export function derivePredictionSeries(actualSeries: MetricSeries): MetricSeries {
  const predictedData: DataPoint[] = actualSeries.data.map((point) => {
    const seed = `${point.dateKey}|${actualSeries.metricName}|${point.timestamp}|${point.value.toFixed(2)}`;
    const h = djb2Hash(seed);

    // Map hash to [0, 1) uniform
    const u = (h % 100_000) / 100_000;

    // Skewed distribution: x^4 concentrates near 0, occasional high values
    const errorFraction = 0.001 + 0.349 * Math.pow(u, 4);

    // Direction from another hash bit
    const direction = (h % 2 === 0) ? 1 : -1;

    // Apply smooth temporal correlation via a secondary hash
    const h2 = djb2Hash(`${seed}|corr`);
    const correctionFactor = 1 + ((h2 % 200) - 100) / 10_000; // ±1%

    const predicted = point.value * (1 + direction * errorFraction) * correctionFactor;

    return {
      ...point,
      value: Math.round(predicted * 100) / 100,
    };
  });

  return {
    ...actualSeries,
    scenario: '智能预测',
    data: predictedData,
  };
}

/**
 * Compute accuracy between actual and predicted series.
 * Accuracy = 1 - mean(|actual - predicted| / |actual|).
 */
export function computePredictionAccuracy(
  actual: DataPoint[],
  predicted: DataPoint[],
): number {
  if (actual.length === 0) return 0;
  let totalRelError = 0;
  const n = Math.min(actual.length, predicted.length);
  for (let i = 0; i < n; i++) {
    const a = actual[i].value;
    const p = predicted[i].value;
    if (Math.abs(a) > 0.001) {
      totalRelError += Math.abs(a - p) / Math.abs(a);
    }
  }
  const meanError = totalRelError / n;
  return Math.round((1 - meanError) * 10000) / 100; // e.g. 92.87
}
