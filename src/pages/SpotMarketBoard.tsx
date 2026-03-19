import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardTabs } from '@/components/dashboard/DashboardTabs';
import { IntervalSwitch } from '@/components/dashboard/IntervalSwitch';
import { TrendCard } from '@/components/cards/TrendCard';
import { TypicalCurveCard } from '@/components/cards/TypicalCurveCard';
import { TariffCard } from '@/components/cards/TariffCard';
import { SupplyDemandCard } from '@/components/cards/SupplyDemandCard';
import { useDashboardStore, type MainSection } from '@/store/dashboardState';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAIN_SECTIONS: MainSection[] = [
  '行情趋势', '典型曲线', '峰谷及杂项单价', '市场供需情况'
];

const SectionContent: React.FC<{ section: MainSection }> = ({ section }) => {
  switch (section) {
    case '行情趋势': return <TrendCard />;
    case '典型曲线': return <TypicalCurveCard />;
    case '峰谷及杂项单价': return <TariffCard />;
    case '市场供需情况': return <SupplyDemandCard />;
  }
};

const SpotMarketBoard: React.FC = () => {
  const {
    selectedDate, selectedInterval, mainSection,
    setSelectedDate, setSelectedInterval, setMainSection, executeQuery
  } = useDashboardStore();

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-88px)] p-5 gap-4">
        {/* 顶部查询区 */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 panel-card shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">日期:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">月:</span>
            <select className="bg-card border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20">
              <option>3月</option>
              <option>2月</option>
              <option>1月</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">段:</span>
            <select className="bg-card border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20">
              <option>全天</option>
              <option>峰段</option>
              <option>谷段</option>
              <option>平段</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">至:</span>
            <input
              type="date"
              defaultValue="2026-03-08"
              className="bg-card border border-border rounded-md px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <Button
            size="sm"
            onClick={executeQuery}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Search className="w-3.5 h-3.5" />
            查询
          </Button>

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
