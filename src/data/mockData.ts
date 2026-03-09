// Base 15-minute interval mock data generator
// All data is generated for a single day with 96 data points (15min intervals)

export type MetricFamily = 'price' | 'load' | 'weather' | 'marketSpace' | 'powerBid' | 'tariff';
export type Scenario = '周前' | '智能预测' | '出清前上午' | '出清前下午' | '出清后' | '实际' | '统一结算价' | '交易结果' | '日前市场经济出清';
export type IntervalType = '15分钟' | '30分钟' | '60分钟' | '日';

export interface DataPoint {
  dateKey: string;
  timeKey: string;
  timestamp: number;
  value: number;
  unit: string;
}

export interface MetricSeries {
  metricName: string;
  metricFamily: MetricFamily;
  scenario: Scenario;
  unit: string;
  node: string;
  data: DataPoint[];
}

// Generate time labels for 96 15-minute intervals
function generateTimeLabels(): string[] {
  const labels: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      labels.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return labels;
}

export const TIME_LABELS_15MIN = generateTimeLabels();
const BASE_DATE = '2026-03-08';

// Noise generator
function noise(base: number, amplitude: number, i: number, seed: number = 0): number {
  const t = (i + seed) * 0.1;
  return base + amplitude * Math.sin(t * 2.3 + seed) + amplitude * 0.3 * Math.cos(t * 5.1 + seed * 0.7)
    + (Math.sin(t * 11.3 + seed * 1.3) * amplitude * 0.15);
}

// Price pattern: low at night, peaks morning & evening
function pricePattern(i: number, base: number, amp: number, seed: number): number {
  const hour = i / 4;
  const dayPattern = -Math.cos(hour / 24 * 2 * Math.PI) * amp * 0.6;
  const morningPeak = hour > 7 && hour < 12 ? amp * 0.3 * Math.sin((hour - 7) / 5 * Math.PI) : 0;
  const eveningPeak = hour > 17 && hour < 22 ? amp * 0.4 * Math.sin((hour - 17) / 5 * Math.PI) : 0;
  return Math.max(0, base + dayPattern + morningPeak + eveningPeak + noise(0, amp * 0.1, i, seed));
}

// Load pattern: follows daily demand curve
function loadPattern(i: number, base: number, amp: number, seed: number): number {
  const hour = i / 4;
  const dayPattern = Math.sin((hour - 6) / 24 * 2 * Math.PI) * amp * 0.4;
  const morningRamp = hour > 6 && hour < 10 ? amp * 0.3 * Math.sin((hour - 6) / 4 * Math.PI) : 0;
  const eveningPeak = hour > 18 && hour < 22 ? amp * 0.2 * Math.sin((hour - 18) / 4 * Math.PI) : 0;
  return Math.max(0, base + dayPattern + morningRamp + eveningPeak + noise(0, amp * 0.08, i, seed));
}

function generateSeries(
  metricName: string,
  metricFamily: MetricFamily,
  scenario: Scenario,
  unit: string,
  node: string,
  patternFn: (i: number) => number
): MetricSeries {
  const data: DataPoint[] = TIME_LABELS_15MIN.map((timeKey, i) => ({
    dateKey: BASE_DATE,
    timeKey,
    timestamp: i,
    value: Math.round(patternFn(i) * 100) / 100,
    unit,
  }));
  return { metricName, metricFamily, scenario, unit, node, data };
}

// === PRICE SERIES ===
export const priceSeriesData: MetricSeries[] = [
  generateSeries('日前电价-发电侧均价', 'price', '智能预测', '元/MWh', '全省', (i) => pricePattern(i, 320, 120, 1)),
  generateSeries('日前电价-发电侧均价', 'price', '出清前上午', '元/MWh', '全省', (i) => pricePattern(i, 315, 115, 2)),
  generateSeries('日前电价-发电侧均价', 'price', '出清前下午', '元/MWh', '全省', (i) => pricePattern(i, 318, 118, 3)),
  generateSeries('日前电价-发电侧均价', 'price', '出清后', '元/MWh', '全省', (i) => pricePattern(i, 322, 122, 4)),
  generateSeries('日前电价-发电侧均价', 'price', '实际', '元/MWh', '全省', (i) => pricePattern(i, 325, 125, 5)),
  generateSeries('实时电价-发电侧均价', 'price', '智能预测', '元/MWh', '全省', (i) => pricePattern(i, 310, 130, 6)),
  generateSeries('实时电价-发电侧均价', 'price', '实际', '元/MWh', '全省', (i) => pricePattern(i, 328, 135, 7)),
  generateSeries('全省节点电价', 'price', '统一结算价', '元/MWh', '全省', (i) => pricePattern(i, 330, 110, 8)),
  generateSeries('全省节点电价', 'price', '日前市场经济出清', '元/MWh', '全省', (i) => pricePattern(i, 325, 115, 9)),
  generateSeries('节点电价', 'price', '统一结算价', '元/MWh', '山东.福山站/220kV.#2母线', (i) => pricePattern(i, 335, 120, 10)),
  generateSeries('节点电价', 'price', '日前市场经济出清', '元/MWh', '山东.福山站/220kV.#2母线', (i) => pricePattern(i, 328, 118, 11)),
];

// === POWER BID SERIES ===
export const powerBidSeriesData: MetricSeries[] = [
  generateSeries('日前中标功率', 'powerBid', '实际', 'MW', '全省', (i) => loadPattern(i, 450, 200, 20)),
  generateSeries('日前中标功率', 'powerBid', '智能预测', 'MW', '全省', (i) => loadPattern(i, 445, 195, 21)),
  generateSeries('实时中标功率', 'powerBid', '实际', 'MW', '全省', (i) => loadPattern(i, 460, 210, 22)),
  generateSeries('实时中标功率', 'powerBid', '智能预测', 'MW', '全省', (i) => loadPattern(i, 455, 205, 23)),
];

// === LOAD SERIES ===
export const loadSeriesData: MetricSeries[] = [
  // 直调负荷
  generateSeries('直调负荷', 'load', '出清前上午', 'MW', '全省', (i) => loadPattern(i, 35000, 8000, 30)),
  generateSeries('直调负荷', 'load', '出清前下午', 'MW', '全省', (i) => loadPattern(i, 35200, 8100, 31)),
  generateSeries('直调负荷', 'load', '出清后', 'MW', '全省', (i) => loadPattern(i, 35500, 8200, 32)),
  generateSeries('直调负荷', 'load', '实际', 'MW', '全省', (i) => loadPattern(i, 35800, 8500, 33)),
  generateSeries('直调负荷', 'load', '周前', 'MW', '全省', (i) => loadPattern(i, 34800, 7800, 34)),
  generateSeries('直调负荷', 'load', '智能预测', 'MW', '全省', (i) => loadPattern(i, 35100, 8000, 35)),
  // 全网负荷
  generateSeries('全网负荷', 'load', '出清前上午', 'MW', '全省', (i) => loadPattern(i, 42000, 10000, 40)),
  generateSeries('全网负荷', 'load', '出清前下午', 'MW', '全省', (i) => loadPattern(i, 42200, 10100, 41)),
  generateSeries('全网负荷', 'load', '出清后', 'MW', '全省', (i) => loadPattern(i, 42500, 10200, 42)),
  generateSeries('全网负荷', 'load', '实际', 'MW', '全省', (i) => loadPattern(i, 42800, 10500, 43)),
  generateSeries('全网负荷', 'load', '周前', 'MW', '全省', (i) => loadPattern(i, 41800, 9800, 44)),
  generateSeries('全网负荷', 'load', '智能预测', 'MW', '全省', (i) => loadPattern(i, 42100, 10000, 45)),
  // 联络线受电负荷
  generateSeries('联络线受电负荷', 'load', '出清前上午', 'MW', '全省', (i) => loadPattern(i, 5000, 1500, 50)),
  generateSeries('联络线受电负荷', 'load', '出清前下午', 'MW', '全省', (i) => loadPattern(i, 5100, 1550, 51)),
  generateSeries('联络线受电负荷', 'load', '出清后', 'MW', '全省', (i) => loadPattern(i, 5200, 1600, 52)),
  generateSeries('联络线受电负荷', 'load', '实际', 'MW', '全省', (i) => loadPattern(i, 5300, 1650, 53)),
  generateSeries('联络线受电负荷', 'load', '周前', 'MW', '全省', (i) => loadPattern(i, 4900, 1400, 54)),
  generateSeries('联络线受电负荷', 'load', '智能预测', 'MW', '全省', (i) => loadPattern(i, 5050, 1500, 55)),
];

// === MARKET SPACE SERIES ===
export const marketSpaceSeriesData: MetricSeries[] = [
  generateSeries('市场竞价空间', 'marketSpace', '实际', 'MW', '全省', (i) => loadPattern(i, 8000, 3000, 60)),
  generateSeries('市场竞价空间', 'marketSpace', '出清前上午', 'MW', '全省', (i) => loadPattern(i, 7800, 2900, 61)),
  generateSeries('火电竞价空间', 'marketSpace', '实际', 'MW', '全省', (i) => loadPattern(i, 6000, 2500, 62)),
  generateSeries('火电竞价空间', 'marketSpace', '出清前上午', 'MW', '全省', (i) => loadPattern(i, 5800, 2400, 63)),
];

// === WEATHER SERIES ===
export const weatherSeriesData: MetricSeries[] = [
  generateSeries('风速', 'weather', '实际', 'm/s', '全省', (i) => Math.max(0, noise(5, 3, i, 70))),
  generateSeries('风速', 'weather', '智能预测', 'm/s', '全省', (i) => Math.max(0, noise(4.8, 2.8, i, 71))),
  generateSeries('辐照', 'weather', '实际', 'W/m²', '全省', (i) => {
    const hour = i / 4;
    return hour > 6 && hour < 18 ? Math.max(0, 600 * Math.sin((hour - 6) / 12 * Math.PI) + noise(0, 80, i, 72)) : 0;
  }),
  generateSeries('辐照', 'weather', '智能预测', 'W/m²', '全省', (i) => {
    const hour = i / 4;
    return hour > 6 && hour < 18 ? Math.max(0, 580 * Math.sin((hour - 6) / 12 * Math.PI) + noise(0, 70, i, 73)) : 0;
  }),
  generateSeries('降水', 'weather', '实际', 'mm', '全省', (i) => Math.max(0, noise(0.5, 1, i, 74))),
  generateSeries('降水', 'weather', '智能预测', 'mm', '全省', (i) => Math.max(0, noise(0.4, 0.9, i, 75))),
];

// === TARIFF DATA (monthly, not time-series) ===
export interface TariffRow {
  month: string;
  深谷: number;
  谷: number;
  平: number;
  峰: number;
  尖峰: number;
}

export const tariffCoefficients: TariffRow[] = [
  { month: '1月', 深谷: 0.25, 谷: 0.45, 平: 1.0, 峰: 1.65, 尖峰: 1.85 },
  { month: '2月', 深谷: 0.25, 谷: 0.45, 平: 1.0, 峰: 1.65, 尖峰: 1.85 },
  { month: '3月', 深谷: 0.28, 谷: 0.48, 平: 1.0, 峰: 1.62, 尖峰: 1.82 },
  { month: '4月', 深谷: 0.30, 谷: 0.50, 平: 1.0, 峰: 1.58, 尖峰: 1.78 },
  { month: '5月', 深谷: 0.28, 谷: 0.48, 平: 1.0, 峰: 1.60, 尖峰: 1.80 },
  { month: '6月', 深谷: 0.22, 谷: 0.42, 平: 1.0, 峰: 1.70, 尖峰: 1.92 },
  { month: '7月', 深谷: 0.20, 谷: 0.40, 平: 1.0, 峰: 1.75, 尖峰: 1.95 },
  { month: '8月', 深谷: 0.20, 谷: 0.40, 平: 1.0, 峰: 1.75, 尖峰: 1.95 },
  { month: '9月', 深谷: 0.25, 谷: 0.45, 平: 1.0, 峰: 1.68, 尖峰: 1.88 },
  { month: '10月', 深谷: 0.28, 谷: 0.48, 平: 1.0, 峰: 1.62, 尖峰: 1.82 },
  { month: '11月', 深谷: 0.25, 谷: 0.45, 平: 1.0, 峰: 1.65, 尖峰: 1.85 },
  { month: '12月', 深谷: 0.22, 谷: 0.42, 平: 1.0, 峰: 1.72, 尖峰: 1.90 },
];

export interface TariffMiscRow {
  item: string;
  value: number;
  unit: string;
}

export const tariffMiscPrices: TariffMiscRow[] = [
  { item: '输配电价', value: 142.5, unit: '元/MWh' },
  { item: '政府性基金及附加', value: 23.8, unit: '元/MWh' },
  { item: '系统运行费', value: 15.2, unit: '元/MWh' },
  { item: '上网环节线损', value: 8.6, unit: '元/MWh' },
  { item: '容量电费', value: 35.0, unit: '元/MWh' },
  { item: '合计', value: 225.1, unit: '元/MWh' },
];

// === SUPERVISION (事前监管) DATA ===
export interface SupervisionItem {
  indicator: string;
  status: '正常' | '预警' | '异常';
  value: string;
  threshold: string;
  description: string;
}

export const supervisionData: SupervisionItem[] = [
  { indicator: '报价偏差率', status: '正常', value: '2.3%', threshold: '≤5%', description: '发电侧报价与基准价偏差' },
  { indicator: '中标率', status: '正常', value: '87.5%', threshold: '≥80%', description: '市场出清中标比例' },
  { indicator: '市场集中度HHI', status: '预警', value: '1850', threshold: '≤1800', description: '赫芬达尔指数' },
  { indicator: '价格波动率', status: '正常', value: '12.8%', threshold: '≤15%', description: '日内价格波动幅度' },
  { indicator: '容量裕度', status: '正常', value: '18.2%', threshold: '≥10%', description: '系统备用容量比例' },
  { indicator: '节点阻塞比例', status: '异常', value: '15.3%', threshold: '≤10%', description: '发生阻塞的节点占比' },
  { indicator: '负荷预测偏差', status: '正常', value: '3.1%', threshold: '≤5%', description: '负荷预测与实际偏差' },
  { indicator: '新能源消纳率', status: '正常', value: '96.8%', threshold: '≥95%', description: '风光消纳比例' },
];

// === CLEARING COMPARISON DATA ===
export interface ClearingComparisonRow {
  metric: string;
  unit: string;
  出清前上午: number;
  出清前下午: number;
  出清后: number;
  实际: number;
}

export const clearingComparisonData: ClearingComparisonRow[] = [
  { metric: '日前均价', unit: '元/MWh', 出清前上午: 312.5, 出清前下午: 318.2, 出清后: 325.1, 实际: 328.6 },
  { metric: '日前最高价', unit: '元/MWh', 出清前上午: 456.2, 出清前下午: 462.8, 出清后: 478.3, 实际: 485.1 },
  { metric: '日前最低价', unit: '元/MWh', 出清前上午: 185.3, 出清前下午: 188.6, 出清后: 192.1, 实际: 195.4 },
  { metric: '峰谷差', unit: '元/MWh', 出清前上午: 270.9, 出清前下午: 274.2, 出清后: 286.2, 实际: 289.7 },
  { metric: '日前总电量', unit: 'MWh', 出清前上午: 12500, 出清前下午: 12650, 出清后: 12800, 实际: 12950 },
  { metric: '最大负荷', unit: 'MW', 出清前上午: 42500, 出清前下午: 42800, 出清后: 43200, 实际: 43500 },
  { metric: '最小负荷', unit: 'MW', 出清前上午: 28500, 出清前下午: 28800, 出清后: 29100, 实际: 29300 },
];

// All series combined for easy lookup
export const allSeries: MetricSeries[] = [
  ...priceSeriesData,
  ...powerBidSeriesData,
  ...loadSeriesData,
  ...marketSpaceSeriesData,
  ...weatherSeriesData,
];

// Lookup helpers
export function findSeries(metricName: string, scenario: Scenario, node: string = '全省'): MetricSeries | undefined {
  return allSeries.find(s => s.metricName === metricName && s.scenario === scenario && s.node === node);
}

export function findSeriesByMetric(metricName: string, node: string = '全省'): MetricSeries[] {
  return allSeries.filter(s => s.metricName === metricName && s.node === node);
}
