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

// Hash a date string into a numeric seed for deterministic variation
function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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
  patternFn: (i: number) => number,
  dateKey: string = '2026-03-08'
): MetricSeries {
  const data: DataPoint[] = TIME_LABELS_15MIN.map((timeKey, i) => ({
    dateKey,
    timeKey,
    timestamp: i,
    value: Math.round(patternFn(i) * 100) / 100,
    unit,
  }));
  return { metricName, metricFamily, scenario, unit, node, data };
}

// === DATA GENERATION BY DATE ===
// Generate all series for a given date — the date seed shifts patterns so each date looks different

function generateAllSeriesForDate(date: string) {
  const ds = dateSeed(date);
  const s = (base: number) => base + (ds % 37) - 18; // shift base slightly
  const a = (amp: number) => amp * (0.85 + (ds % 30) / 100); // vary amplitude

  const priceSeriesData: MetricSeries[] = [
    generateSeries('日前电价-发电侧均价', 'price', '智能预测', '元/MWh', '全省', (i) => pricePattern(i, s(320), a(120), 1 + ds), date),
    generateSeries('日前电价-发电侧均价', 'price', '出清前上午', '元/MWh', '全省', (i) => pricePattern(i, s(315), a(115), 2 + ds), date),
    generateSeries('日前电价-发电侧均价', 'price', '出清前下午', '元/MWh', '全省', (i) => pricePattern(i, s(318), a(118), 3 + ds), date),
    generateSeries('日前电价-发电侧均价', 'price', '出清后', '元/MWh', '全省', (i) => pricePattern(i, s(322), a(122), 4 + ds), date),
    generateSeries('日前电价-发电侧均价', 'price', '实际', '元/MWh', '全省', (i) => pricePattern(i, s(325), a(125), 5 + ds), date),
    generateSeries('实时电价-发电侧均价', 'price', '智能预测', '元/MWh', '全省', (i) => pricePattern(i, s(310), a(130), 6 + ds), date),
    generateSeries('实时电价-发电侧均价', 'price', '实际', '元/MWh', '全省', (i) => pricePattern(i, s(328), a(135), 7 + ds), date),
    generateSeries('全省节点电价', 'price', '统一结算价', '元/MWh', '全省', (i) => pricePattern(i, s(330), a(110), 8 + ds), date),
    generateSeries('全省节点电价', 'price', '日前市场经济出清', '元/MWh', '全省', (i) => pricePattern(i, s(325), a(115), 9 + ds), date),
    generateSeries('节点电价', 'price', '统一结算价', '元/MWh', '山东.福山站/220kV.#2母线', (i) => pricePattern(i, s(335), a(120), 10 + ds), date),
    generateSeries('节点电价', 'price', '日前市场经济出清', '元/MWh', '山东.福山站/220kV.#2母线', (i) => pricePattern(i, s(328), a(118), 11 + ds), date),
  ];

  const powerBidSeriesData: MetricSeries[] = [
    generateSeries('日前中标功率', 'powerBid', '实际', 'MW', '全省', (i) => loadPattern(i, s(450), a(200), 20 + ds), date),
    generateSeries('日前中标功率', 'powerBid', '智能预测', 'MW', '全省', (i) => loadPattern(i, s(445), a(195), 21 + ds), date),
    generateSeries('实时中标功率', 'powerBid', '实际', 'MW', '全省', (i) => loadPattern(i, s(460), a(210), 22 + ds), date),
    generateSeries('实时中标功率', 'powerBid', '智能预测', 'MW', '全省', (i) => loadPattern(i, s(455), a(205), 23 + ds), date),
  ];

  const loadSeriesData: MetricSeries[] = [
    generateSeries('直调负荷', 'load', '出清前上午', 'MW', '全省', (i) => loadPattern(i, s(35000), a(8000), 30 + ds), date),
    generateSeries('直调负荷', 'load', '出清前下午', 'MW', '全省', (i) => loadPattern(i, s(35200), a(8100), 31 + ds), date),
    generateSeries('直调负荷', 'load', '出清后', 'MW', '全省', (i) => loadPattern(i, s(35500), a(8200), 32 + ds), date),
    generateSeries('直调负荷', 'load', '实际', 'MW', '全省', (i) => loadPattern(i, s(35800), a(8500), 33 + ds), date),
    generateSeries('直调负荷', 'load', '周前', 'MW', '全省', (i) => loadPattern(i, s(34800), a(7800), 34 + ds), date),
    generateSeries('直调负荷', 'load', '智能预测', 'MW', '全省', (i) => loadPattern(i, s(35100), a(8000), 35 + ds), date),
    generateSeries('全网负荷', 'load', '出清前上午', 'MW', '全省', (i) => loadPattern(i, s(42000), a(10000), 40 + ds), date),
    generateSeries('全网负荷', 'load', '出清前下午', 'MW', '全省', (i) => loadPattern(i, s(42200), a(10100), 41 + ds), date),
    generateSeries('全网负荷', 'load', '出清后', 'MW', '全省', (i) => loadPattern(i, s(42500), a(10200), 42 + ds), date),
    generateSeries('全网负荷', 'load', '实际', 'MW', '全省', (i) => loadPattern(i, s(42800), a(10500), 43 + ds), date),
    generateSeries('全网负荷', 'load', '周前', 'MW', '全省', (i) => loadPattern(i, s(41800), a(9800), 44 + ds), date),
    generateSeries('全网负荷', 'load', '智能预测', 'MW', '全省', (i) => loadPattern(i, s(42100), a(10000), 45 + ds), date),
    generateSeries('联络线受电负荷', 'load', '出清前上午', 'MW', '全省', (i) => loadPattern(i, s(5000), a(1500), 50 + ds), date),
    generateSeries('联络线受电负荷', 'load', '出清前下午', 'MW', '全省', (i) => loadPattern(i, s(5100), a(1550), 51 + ds), date),
    generateSeries('联络线受电负荷', 'load', '出清后', 'MW', '全省', (i) => loadPattern(i, s(5200), a(1600), 52 + ds), date),
    generateSeries('联络线受电负荷', 'load', '实际', 'MW', '全省', (i) => loadPattern(i, s(5300), a(1650), 53 + ds), date),
    generateSeries('联络线受电负荷', 'load', '周前', 'MW', '全省', (i) => loadPattern(i, s(4900), a(1400), 54 + ds), date),
    generateSeries('联络线受电负荷', 'load', '智能预测', 'MW', '全省', (i) => loadPattern(i, s(5050), a(1500), 55 + ds), date),
  ];

  const marketSpaceSeriesData: MetricSeries[] = [
    generateSeries('市场竞价空间', 'marketSpace', '实际', 'MW', '全省', (i) => loadPattern(i, s(8000), a(3000), 60 + ds), date),
    generateSeries('市场竞价空间', 'marketSpace', '出清前上午', 'MW', '全省', (i) => loadPattern(i, s(7800), a(2900), 61 + ds), date),
    generateSeries('火电竞价空间', 'marketSpace', '实际', 'MW', '全省', (i) => loadPattern(i, s(6000), a(2500), 62 + ds), date),
    generateSeries('火电竞价空间', 'marketSpace', '出清前上午', 'MW', '全省', (i) => loadPattern(i, s(5800), a(2400), 63 + ds), date),
  ];

  const weatherSeriesData: MetricSeries[] = [
    generateSeries('风速', 'weather', '实际', 'm/s', '全省', (i) => Math.max(0, noise(5, 3, i, 70 + ds)), date),
    generateSeries('风速', 'weather', '智能预测', 'm/s', '全省', (i) => Math.max(0, noise(4.8, 2.8, i, 71 + ds)), date),
    generateSeries('辐照', 'weather', '实际', 'W/m²', '全省', (i) => {
      const hour = i / 4;
      return hour > 6 && hour < 18 ? Math.max(0, 600 * Math.sin((hour - 6) / 12 * Math.PI) + noise(0, 80, i, 72 + ds)) : 0;
    }, date),
    generateSeries('辐照', 'weather', '智能预测', 'W/m²', '全省', (i) => {
      const hour = i / 4;
      return hour > 6 && hour < 18 ? Math.max(0, 580 * Math.sin((hour - 6) / 12 * Math.PI) + noise(0, 70, i, 73 + ds)) : 0;
    }, date),
    generateSeries('降水', 'weather', '实际', 'mm', '全省', (i) => Math.max(0, noise(0.5, 1, i, 74 + ds)), date),
    generateSeries('降水', 'weather', '智能预测', 'mm', '全省', (i) => Math.max(0, noise(0.4, 0.9, i, 75 + ds)), date),
  ];

  const allSeries: MetricSeries[] = [
    ...priceSeriesData,
    ...powerBidSeriesData,
    ...loadSeriesData,
    ...marketSpaceSeriesData,
    ...weatherSeriesData,
  ];

  // Clearing comparison also varies by date
  const dsFactor = 0.9 + (ds % 20) / 100;
  const clearingComparison: ClearingComparisonRow[] = [
    { metric: '日前均价', unit: '元/MWh', 出清前上午: +(312.5 * dsFactor).toFixed(1), 出清前下午: +(318.2 * dsFactor).toFixed(1), 出清后: +(325.1 * dsFactor).toFixed(1), 实际: +(328.6 * dsFactor).toFixed(1) },
    { metric: '日前最高价', unit: '元/MWh', 出清前上午: +(456.2 * dsFactor).toFixed(1), 出清前下午: +(462.8 * dsFactor).toFixed(1), 出清后: +(478.3 * dsFactor).toFixed(1), 实际: +(485.1 * dsFactor).toFixed(1) },
    { metric: '日前最低价', unit: '元/MWh', 出清前上午: +(185.3 * dsFactor).toFixed(1), 出清前下午: +(188.6 * dsFactor).toFixed(1), 出清后: +(192.1 * dsFactor).toFixed(1), 实际: +(195.4 * dsFactor).toFixed(1) },
    { metric: '峰谷差', unit: '元/MWh', 出清前上午: +(270.9 * dsFactor).toFixed(1), 出清前下午: +(274.2 * dsFactor).toFixed(1), 出清后: +(286.2 * dsFactor).toFixed(1), 实际: +(289.7 * dsFactor).toFixed(1) },
    { metric: '日前总电量', unit: 'MWh', 出清前上午: Math.round(12500 * dsFactor), 出清前下午: Math.round(12650 * dsFactor), 出清后: Math.round(12800 * dsFactor), 实际: Math.round(12950 * dsFactor) },
    { metric: '最大负荷', unit: 'MW', 出清前上午: Math.round(42500 * dsFactor), 出清前下午: Math.round(42800 * dsFactor), 出清后: Math.round(43200 * dsFactor), 实际: Math.round(43500 * dsFactor) },
    { metric: '最小负荷', unit: 'MW', 出清前上午: Math.round(28500 * dsFactor), 出清前下午: Math.round(28800 * dsFactor), 出清后: Math.round(29100 * dsFactor), 实际: Math.round(29300 * dsFactor) },
  ];

  return { allSeries, clearingComparison };
}

// Cache to avoid regenerating on every render
const dataCache = new Map<string, ReturnType<typeof generateAllSeriesForDate>>();

export function getDataForDate(date: string) {
  if (!dataCache.has(date)) {
    dataCache.set(date, generateAllSeriesForDate(date));
  }
  return dataCache.get(date)!;
}

// Default exports for backward compat
const defaultData = getDataForDate('2026-03-08');
export const priceSeriesData = defaultData.allSeries.filter(s => s.metricFamily === 'price');
export const powerBidSeriesData = defaultData.allSeries.filter(s => s.metricFamily === 'powerBid');
export const loadSeriesData = defaultData.allSeries.filter(s => s.metricFamily === 'load');
export const marketSpaceSeriesData = defaultData.allSeries.filter(s => s.metricFamily === 'marketSpace');
export const weatherSeriesData = defaultData.allSeries.filter(s => s.metricFamily === 'weather');
export const allSeries = defaultData.allSeries;
export const clearingComparisonData = defaultData.clearingComparison;

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
  { month: '1月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '2月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '3月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '4月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '5月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '6月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '7月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '8月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '9月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '10月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '11月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
  { month: '12月', 深谷: 0.1, 谷: 0.3, 平: 1.0, 峰: 1.7, 尖峰: 2.0 },
];

// === MONTHLY MISC TARIFF (官方月度杂项费用) ===
export interface TariffMiscMonthlyItem {
  容量补偿电价: number | null;
  上网环节线损: number | null;
  系统运行费: number | null;
  政府性基金及附加: number | null;
}

export const tariffMiscMonthly: Record<string, TariffMiscMonthlyItem> = {
  '2026-01': { 容量补偿电价: 70.5, 上网环节线损: 11.9, 系统运行费: 54.6, 政府性基金及附加: 27.16875 },
  '2026-03': { 容量补偿电价: 70.6, 上网环节线损: 11.6, 系统运行费: 68.7, 政府性基金及附加: 27.16875 },
};

// === TRANSMISSION PRICES (输配电价按电压等级) ===
export interface TransmissionPriceRow {
  category: string;
  level: string;
  value: number;
  unit: string;
}

export const tariffTransmissionPrices: TransmissionPriceRow[] = [
  { category: '单一制', level: '不满1千伏', value: 221.9, unit: '元/MWh' },
  { category: '单一制', level: '1-10(20)千伏', value: 206.9, unit: '元/MWh' },
  { category: '单一制', level: '35千伏', value: 191.9, unit: '元/MWh' },
  { category: '两部制电量电价', level: '1-10(20)千伏', value: 149.1, unit: '元/MWh' },
  { category: '两部制电量电价', level: '35千伏', value: 134.1, unit: '元/MWh' },
  { category: '两部制电量电价', level: '110千伏', value: 119.1, unit: '元/MWh' },
  { category: '两部制电量电价', level: '220千伏及以上', value: 104.1, unit: '元/MWh' },
  { category: '两部制需量电价', level: '1-10(20)千伏', value: 38.4, unit: '元/kW·月' },
  { category: '两部制需量电价', level: '35千伏', value: 35.2, unit: '元/kW·月' },
  { category: '两部制需量电价', level: '110千伏', value: 35.2, unit: '元/kW·月' },
  { category: '两部制需量电价', level: '220千伏及以上', value: 32, unit: '元/kW·月' },
  { category: '两部制容量电价', level: '1-10(20)千伏', value: 24, unit: '元/kVA·月' },
  { category: '两部制容量电价', level: '35千伏', value: 22, unit: '元/kVA·月' },
  { category: '两部制容量电价', level: '110千伏', value: 22, unit: '元/kVA·月' },
  { category: '两部制容量电价', level: '220千伏及以上', value: 20, unit: '元/kVA·月' },
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

// Lookup helpers (date-aware)
export function findSeries(metricName: string, scenario: Scenario, node: string = '全省', date?: string): MetricSeries | undefined {
  const series = date ? getDataForDate(date).allSeries : allSeries;
  return series.find(s => s.metricName === metricName && s.scenario === scenario && s.node === node);
}

export function findSeriesByMetric(metricName: string, node: string = '全省', date?: string): MetricSeries[] {
  const series = date ? getDataForDate(date).allSeries : allSeries;
  return series.filter(s => s.metricName === metricName && s.node === node);
}
