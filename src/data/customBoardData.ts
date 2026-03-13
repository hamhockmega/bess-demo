/**
 * Mock data generator for Custom Board panels.
 * Structured to be easily replaced by MySQL database queries.
 * Each generator returns time-series data for Recharts.
 */

export interface ChartDataPoint {
  time: string;
  value: number;
  value2?: number;
  value3?: number;
}

/** Seed-based pseudo-random for deterministic data per date */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashDate(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (h * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Generate 96 points (15-min intervals for 24h) */
function generate96Points(
  date: string,
  base: number,
  amplitude: number,
  offset: number = 0
): ChartDataPoint[] {
  const rand = seededRandom(hashDate(date) + offset);
  const points: ChartDataPoint[] = [];
  for (let i = 0; i < 96; i++) {
    const hour = i / 4;
    const h = String(Math.floor(hour)).padStart(2, '0');
    const m = String((i % 4) * 15).padStart(2, '0');
    // Sinusoidal pattern + noise
    const sin = Math.sin(((hour - 6) / 24) * Math.PI * 2);
    const value = base + amplitude * sin + (rand() - 0.5) * amplitude * 0.4;
    points.push({ time: `${h}:${m}`, value: Math.round(value * 100) / 100 });
  }
  return points;
}

/** Generate multi-series data */
function generateMultiSeries(
  date: string,
  configs: { base: number; amplitude: number; offset: number }[]
): ChartDataPoint[] {
  const series = configs.map((c) => generate96Points(date, c.base, c.amplitude, c.offset));
  return series[0].map((p, i) => ({
    time: p.time,
    value: series[0][i].value,
    value2: series[1]?.[i]?.value ?? undefined,
    value3: series[2]?.[i]?.value ?? undefined,
  }));
}

export type PanelDataGenerator = (dates: string[], subItem: string) => ChartDataPoint[];

function mergeMultiDate(dates: string[], gen: (d: string) => ChartDataPoint[]): ChartDataPoint[] {
  if (dates.length === 1) return gen(dates[0]);
  // For multiple dates, just use first date for now (future: overlay)
  return gen(dates[0]);
}

/**
 * Panel data generators keyed by panel name.
 * In production, replace each with an API call to MySQL backend.
 * e.g., fetch(`/api/panels/node-price?dates=${dates}&subItem=${subItem}`)
 */
export const PANEL_DATA_GENERATORS: Record<string, PanelDataGenerator> = {
  '节点电价(门前节点)': (dates, sub) =>
    mergeMultiDate(dates, (d) => generate96Points(d, 350, 150, sub.length)),
  '系统负荷': (dates, sub) =>
    mergeMultiDate(dates, (d) => generate96Points(d, 45000, 15000, sub.length)),
  '联络线受电负荷': (dates, sub) =>
    mergeMultiDate(dates, (d) => generate96Points(d, 5000, 2000, sub.length)),
  '新能源出力': (dates, sub) =>
    mergeMultiDate(dates, (d) =>
      generateMultiSeries(d, [
        { base: 8000, amplitude: 6000, offset: 1 },
        { base: 12000, amplitude: 10000, offset: 2 },
        { base: 20000, amplitude: 14000, offset: 3 },
      ])
    ),
  '抽蓄': (dates, sub) =>
    mergeMultiDate(dates, (d) => generate96Points(d, 0, 1200, sub.length)),
  '储能出力': (dates, sub) =>
    mergeMultiDate(dates, (d) => generate96Points(d, 500, 800, sub.length)),
  '正负备用': (dates, sub) =>
    mergeMultiDate(dates, (d) =>
      generateMultiSeries(d, [
        { base: 3000, amplitude: 1000, offset: 10 },
        { base: -2000, amplitude: 1000, offset: 20 },
      ])
    ),
  '事前监管': (dates, sub) =>
    mergeMultiDate(dates, (d) => generate96Points(d, 50, 30, sub.length)),
  '开停机组数量（市场化）': (dates, sub) =>
    mergeMultiDate(dates, (d) =>
      generateMultiSeries(d, [
        { base: 80, amplitude: 20, offset: 5 },
        { base: 30, amplitude: 15, offset: 6 },
      ])
    ),
  '节点电价(全省平均)': (dates, sub) =>
    mergeMultiDate(dates, (d) => generate96Points(d, 320, 120, sub.length)),
  '阻塞电价(全省平均)': (dates, sub) =>
    mergeMultiDate(dates, (d) => generate96Points(d, 20, 40, sub.length)),
  '出清电价(交易结果)': (dates, sub) =>
    mergeMultiDate(dates, (d) =>
      generateMultiSeries(d, [
        { base: 340, amplitude: 130, offset: 7 },
        { base: 360, amplitude: 140, offset: 8 },
      ])
    ),
  '统一结算价': (dates, sub) =>
    mergeMultiDate(dates, (d) =>
      generateMultiSeries(d, [
        { base: 330, amplitude: 120, offset: 9 },
        { base: 350, amplitude: 130, offset: 11 },
      ])
    ),
  '温度(全省算术平均)': (dates, sub) =>
    mergeMultiDate(dates, (d) =>
      generateMultiSeries(d, [
        { base: 35, amplitude: 5, offset: 12 },
        { base: 22, amplitude: 4, offset: 13 },
        { base: 28, amplitude: 4, offset: 14 },
      ])
    ),
  '风速(风电装机容量加权)': (dates, sub) =>
    mergeMultiDate(dates, (d) =>
      generateMultiSeries(d, [
        { base: 5, amplitude: 3, offset: 15 },
        { base: 12, amplitude: 5, offset: 16 },
      ])
    ),
  '辐照(光伏装机容量加权)': (dates, sub) =>
    mergeMultiDate(dates, (d) =>
      generateMultiSeries(d, [
        { base: 400, amplitude: 350, offset: 17 },
        { base: 800, amplitude: 300, offset: 18 },
      ])
    ),
  '降水量(全省算术平均)': (dates, sub) =>
    mergeMultiDate(dates, (d) =>
      generateMultiSeries(d, [
        { base: 5, amplitude: 8, offset: 19 },
        { base: 30, amplitude: 20, offset: 20 },
      ])
    ),
};

/** Units for each panel */
export const PANEL_UNITS: Record<string, string> = {
  '节点电价(门前节点)': '元/MWh',
  '系统负荷': 'MW',
  '联络线受电负荷': 'MW',
  '新能源出力': 'MW',
  '抽蓄': 'MW',
  '储能出力': 'MW',
  '正负备用': 'MW',
  '事前监管': '%',
  '开停机组数量（市场化）': '台',
  '节点电价(全省平均)': '元/MWh',
  '阻塞电价(全省平均)': '元/MWh',
  '出清电价(交易结果)': '元/MWh',
  '统一结算价': '元/MWh',
  '温度(全省算术平均)': '°C',
  '风速(风电装机容量加权)': 'm/s',
  '辐照(光伏装机容量加权)': 'W/m²',
  '降水量(全省算术平均)': 'mm',
};

/** Sub-item labels for chart legend */
export const PANEL_SERIES_LABELS: Record<string, string[]> = {
  '新能源出力': ['风电出力', '光伏出力', '合计出力'],
  '正负备用': ['正备用', '负备用'],
  '开停机组数量（市场化）': ['开机数量', '停机数量'],
  '出清电价(交易结果)': ['日前出清', '实时出清'],
  '统一结算价': ['日前结算', '实时结算'],
  '温度(全省算术平均)': ['最高温', '最低温', '平均温'],
  '风速(风电装机容量加权)': ['加权风速', '最大风速'],
  '辐照(光伏装机容量加权)': ['加权辐照', '峰值辐照'],
  '降水量(全省算术平均)': ['日降水量', '累计降水量'],
};
