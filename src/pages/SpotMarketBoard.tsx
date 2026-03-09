import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardTabs } from '@/components/dashboard/DashboardTabs';
import { IntervalSwitch } from '@/components/dashboard/IntervalSwitch';
import { TrendCard } from '@/components/cards/TrendCard';
import { TypicalCurveCard } from '@/components/cards/TypicalCurveCard';
import { TariffCard } from '@/components/cards/TariffCard';
import { SupplyDemandCard } from '@/components/cards/SupplyDemandCard';
import { SupervisionCard } from '@/components/cards/SupervisionCard';
import { ClearingComparisonCard } from '@/components/cards/ClearingComparisonCard';
import { useDashboardStore, type MainSection } from '@/store/dashboardState';

const MAIN_SECTIONS: MainSection[] = [
  '行情趋势', '典型曲线', '峰谷及杂项单价', '市场供需情况', '事前监管', '出清前后对比'
];

const SectionContent: React.FC<{ section: MainSection }> = ({ section }) => {
  switch (section) {
    case '行情趋势': return <TrendCard />;
    case '典型曲线': return <TypicalCurveCard />;
    case '峰谷及杂项单价': return <TariffCard />;
    case '市场供需情况': return <SupplyDemandCard />;
    case '事前监管': return <SupervisionCard />;
    case '出清前后对比': return <ClearingComparisonCard />;
  }
};

const SpotMarketBoard: React.FC = () => {
  const {
    selectedDate, selectedInterval, mainSection,
    setSelectedDate, setSelectedInterval, setMainSection
  } = useDashboardStore();

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-72px)] p-3 gap-3">
        {/* 顶部查询区 */}
        <div className="flex items-center gap-3 bg-card border border-dashboard-panel-border rounded-sm px-3 py-2 panel-glow shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">日期:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-secondary/50 border border-dashboard-panel-border rounded-sm px-2 py-0.5 text-xs text-foreground outline-none focus:border-dashboard-cyan"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">月:</span>
            <select className="bg-secondary/50 border border-dashboard-panel-border rounded-sm px-2 py-0.5 text-xs text-foreground outline-none focus:border-dashboard-cyan">
              <option>3月</option>
              <option>2月</option>
              <option>1月</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">段:</span>
            <select className="bg-secondary/50 border border-dashboard-panel-border rounded-sm px-2 py-0.5 text-xs text-foreground outline-none focus:border-dashboard-cyan">
              <option>全天</option>
              <option>峰段</option>
              <option>谷段</option>
              <option>平段</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">至:</span>
            <input
              type="date"
              defaultValue="2026-03-08"
              className="bg-secondary/50 border border-dashboard-panel-border rounded-sm px-2 py-0.5 text-xs text-foreground outline-none focus:border-dashboard-cyan"
            />
          </div>

          <button className="px-3 py-1 text-xs bg-dashboard-cyan/20 text-dashboard-cyan border border-dashboard-cyan/40 rounded-sm hover:bg-dashboard-cyan/30 transition-colors">
            查询
          </button>

          <div className="ml-auto">
            <IntervalSwitch value={selectedInterval} onChange={setSelectedInterval} />
          </div>
        </div>

        {/* 主体分区 tabs */}
        <div className="shrink-0">
          <DashboardTabs
            tabs={MAIN_SECTIONS}
            activeTab={mainSection}
            onTabChange={(t) => setMainSection(t as MainSection)}
            size="md"
          />
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-h-0">
          <SectionContent section={mainSection} />
        </div>
      </div>
    </AppShell>
  );
};

export default SpotMarketBoard;
