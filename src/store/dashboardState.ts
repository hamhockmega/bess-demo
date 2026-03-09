import { create } from 'zustand';
import type { IntervalType, Scenario } from '@/data/mockData';

export type MainSection = '行情趋势' | '典型曲线' | '峰谷及杂项单价' | '市场供需情况' | '事前监管' | '出清前后对比';

interface DashboardState {
  selectedDate: string;
  queryDate: string;
  selectedInterval: IntervalType;
  mainSection: MainSection;
  trendMetric: string;
  trendScenario: Scenario;
  curveMetric: string;
  curveScenarios: Scenario[];
  supplyDemandMetric: string;
  clearingViewType: 'chart' | 'table';

  setSelectedDate: (date: string) => void;
  setSelectedInterval: (interval: IntervalType) => void;
  setMainSection: (section: MainSection) => void;
  setTrendMetric: (metric: string) => void;
  setTrendScenario: (scenario: Scenario) => void;
  setCurveMetric: (metric: string) => void;
  setSupplyDemandMetric: (metric: string) => void;
  setClearingViewType: (type: 'chart' | 'table') => void;
  executeQuery: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  selectedDate: '2026-03-08',
  queryDate: '2026-03-08',
  selectedInterval: '15分钟',
  mainSection: '行情趋势',
  trendMetric: '日前电价-发电侧均价',
  trendScenario: '实际',
  curveMetric: '直调负荷',
  curveScenarios: ['出清前上午', '出清前下午', '出清后', '实际'],
  supplyDemandMetric: '风速',
  clearingViewType: 'chart',

  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedInterval: (interval) => set({ selectedInterval: interval }),
  setMainSection: (section) => set({ mainSection: section }),
  setTrendMetric: (metric) => set({ trendMetric: metric }),
  setTrendScenario: (scenario) => set({ trendScenario: scenario }),
  setCurveMetric: (metric) => set({ curveMetric: metric }),
  setSupplyDemandMetric: (metric) => set({ supplyDemandMetric: metric }),
  setClearingViewType: (type) => set({ clearingViewType: type }),
  executeQuery: () => set({ queryDate: get().selectedDate }),
}));
