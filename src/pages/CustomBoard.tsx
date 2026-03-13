import React, { useState, useMemo, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { Bookmark, Save, FilePlus, Filter, Search } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { format, eachDayOfInterval } from 'date-fns';
import { toast } from 'sonner';

import { DateSelector } from '@/components/custom-board/DateSelector';
import { SaveAsDialog } from '@/components/custom-board/SaveAsDialog';
import { PanelChart } from '@/components/custom-board/PanelChart';
import { PANEL_DATA_GENERATORS, ChartDataPoint } from '@/data/customBoardData';

/* ── 全部可用面板 ── */
const ALL_PANELS = [
  '节点电价(门前节点)', '系统负荷', '联络线受电负荷', '新能源出力', '抽蓄',
  '储能出力', '正负备用', '事前监管', '开停机组数量（市场化）',
  '节点电价(全省平均)', '阻塞电价(全省平均)', '出清电价(交易结果)',
  '统一结算价', '温度(全省算术平均)', '风速(风电装机容量加权)',
  '辐照(光伏装机容量加权)', '降水量(全省算术平均)',
] as const;

type PanelName = (typeof ALL_PANELS)[number];

const PANEL_SUB_ITEMS: Record<string, string[]> = {
  '节点电价(门前节点)': ['山东.福山', '山东.青岛', '山东.济南', '山东.烟台'],
  '系统负荷': ['总负荷', '工业负荷', '居民负荷'],
  '联络线受电负荷': ['各联络线', '华北联络线', '华中联络线', '江苏联络线'],
  '新能源出力': ['风电出力', '光伏出力', '合计出力'],
  '抽蓄': ['蒙阴抽蓄', '泰安抽蓄', '文登抽蓄'],
  '储能出力': ['电化学储能', '压缩空气储能', '合计出力'],
  '正负备用': ['正备用', '负备用'],
  '事前监管': ['报价偏差', '出力偏差', '容量偏差'],
  '开停机组数量（市场化）': ['开机数量', '停机数量'],
  '节点电价(全省平均)': ['加权平均', '算术平均'],
  '阻塞电价(全省平均)': ['加权平均', '算术平均'],
  '出清电价(交易结果)': ['日前出清', '实时出清'],
  '统一结算价': ['日前结算', '实时结算'],
  '温度(全省算术平均)': ['最高温', '最低温', '平均温'],
  '风速(风电装机容量加权)': ['加权风速', '最大风速'],
  '辐照(光伏装机容量加权)': ['加权辐照', '峰值辐照'],
  '降水量(全省算术平均)': ['日降水量', '累计降水量'],
};

const TIME_PERIODS = ['实时', '日前', '预测(周前)', '预测(月前)', 'D-1', 'D-2'];

/* ── 看板方案 (persisted in localStorage) ── */
const STORAGE_KEY = 'custom-board-templates';

function loadTemplates(): Record<string, PanelName[]> {
  const defaults: Record<string, PanelName[]> = {
    '通用模板': ['节点电价(门前节点)', '系统负荷', '联络线受电负荷', '新能源出力', '抽蓄'],
    '价格分析模板': ['节点电价(门前节点)', '节点电价(全省平均)', '阻塞电价(全省平均)', '出清电价(交易结果)', '统一结算价'],
    '新能源模板': ['新能源出力', '风速(风电装机容量加权)', '辐照(光伏装机容量加权)', '储能出力'],
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaults, ...JSON.parse(saved) };
  } catch {}
  return defaults;
}

function saveTemplates(templates: Record<string, PanelName[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

/* ── 小组件：面板筛选器 ── */
const PanelFilter: React.FC<{
  options: string[];
  selected: string;
  onChange: (v: string) => void;
}> = ({ options, selected, onChange }) => (
  <Select value={selected} onValueChange={onChange}>
    <SelectTrigger className="h-6 min-w-[90px] max-w-[140px] text-xs bg-secondary/40 border-border px-2 gap-1">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((opt) => (
        <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/* ── 主组件 ── */
const CustomBoard: React.FC = () => {
  // Date state
  const [dateMode, setDateMode] = useState<'多日' | '段'>('段');
  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date('2025-07-15')]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date('2025-07-01'),
    to: new Date('2025-07-31'),
  });

  // Template state
  const [templates, setTemplates] = useState(loadTemplates);
  const [template, setTemplate] = useState('通用模板');
  const [visiblePanels, setVisiblePanels] = useState<PanelName[]>(templates['通用模板']);
  const [saveAsOpen, setSaveAsOpen] = useState(false);

  // Panel filter state
  const [panelSubItem, setPanelSubItem] = useState<Record<string, string>>({});
  const [panelTimePeriod, setPanelTimePeriod] = useState<Record<string, string>>({});

  // Data selector popover
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [pendingPanels, setPendingPanels] = useState<PanelName[]>(visiblePanels);

  // Query version (incremented on 查询 click to trigger data refresh)
  const [queryVersion, setQueryVersion] = useState(0);

  // Compute date strings for data generation
  const queryDates = useMemo(() => {
    if (dateMode === '多日') {
      return selectedDates.map((d) => format(d, 'yyyy-MM-dd'));
    }
    if (dateRange?.from) {
      if (dateRange.to) {
        return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map((d) =>
          format(d, 'yyyy-MM-dd')
        );
      }
      return [format(dateRange.from, 'yyyy-MM-dd')];
    }
    return [format(new Date(), 'yyyy-MM-dd')];
  }, [dateMode, selectedDates, dateRange, queryVersion]);

  // Generate chart data per panel
  const panelData = useMemo(() => {
    const result: Record<string, ChartDataPoint[]> = {};
    visiblePanels.forEach((panel) => {
      const gen = PANEL_DATA_GENERATORS[panel];
      const sub = panelSubItem[panel] || PANEL_SUB_ITEMS[panel]?.[0] || '';
      result[panel] = gen ? gen(queryDates.length > 0 ? queryDates : ['2025-07-01'], sub) : [];
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePanels, queryVersion, queryDates]);

  // Template handlers
  const handleTemplateChange = (v: string) => {
    setTemplate(v);
    const panels = templates[v] || templates['通用模板'];
    setVisiblePanels(panels);
    setPendingPanels(panels);
  };

  const handleSave = () => {
    const updated = { ...templates, [template]: visiblePanels };
    setTemplates(updated);
    saveTemplates(updated);
    toast.success(`方案 "${template}" 已保存`);
  };

  const handleSaveAs = (name: string) => {
    if (templates[name]) {
      toast.error(`方案 "${name}" 已存在，请换一个名称`);
      return;
    }
    const updated = { ...templates, [name]: [...visiblePanels] };
    setTemplates(updated);
    saveTemplates(updated);
    setTemplate(name);
    toast.success(`新方案 "${name}" 已保存`);
  };

  // Data selector
  const openSelector = () => {
    setPendingPanels([...visiblePanels]);
    setSelectorOpen(true);
  };

  const togglePending = (p: PanelName) => {
    setPendingPanels((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const applySelection = () => {
    setVisiblePanels(pendingPanels);
    setSelectorOpen(false);
  };

  const handleQuery = () => {
    setQueryVersion((v) => v + 1);
    toast.success('数据已刷新');
  };

  const getSubItem = (panel: string) =>
    panelSubItem[panel] || (PANEL_SUB_ITEMS[panel]?.[0] ?? '');
  const getTimePeriod = (panel: string) =>
    panelTimePeriod[panel] || TIME_PERIODS[0];

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-72px)] p-3 gap-3">
        {/* ── 顶部工具栏 ── */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-sm px-3 py-2 shrink-0 flex-wrap">
          <DateSelector
            dateMode={dateMode}
            onDateModeChange={setDateMode}
            selectedDates={selectedDates}
            onSelectedDatesChange={setSelectedDates}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />

          {/* 查询 */}
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleQuery}>
            <Search className="w-3 h-3" />
            查询
          </Button>

          {/* 数据选择 */}
          <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-border"
                onClick={openSelector}
              >
                <Filter className="w-3 h-3" />
                数据选择
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3" align="start">
              <div className="text-xs font-medium text-foreground mb-2">选择展示的图表面板</div>
              <div className="grid grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto">
                {ALL_PANELS.map((panel) => (
                  <label
                    key={panel}
                    className="flex items-center gap-1.5 text-xs text-card-foreground cursor-pointer hover:text-foreground py-0.5"
                  >
                    <Checkbox
                      checked={pendingPanels.includes(panel)}
                      onCheckedChange={() => togglePending(panel)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate">{panel}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setPendingPanels([...ALL_PANELS])}
                >
                  全选
                </button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectorOpen(false)}>
                    取消
                  </Button>
                  <Button size="sm" className="h-6 text-xs" onClick={applySelection}>
                    确定
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* 看板方案 */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">看板方案：</span>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger className="h-7 w-[130px] text-xs bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(templates).map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border" onClick={handleSave}>
              <Save className="w-3 h-3" />
              保存
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border" onClick={() => setSaveAsOpen(true)}>
              <FilePlus className="w-3 h-3" />
              另存为
            </Button>
          </div>
        </div>

        {/* ── 图表面板 ── */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {visiblePanels.map((panelName) => {
            const subItems = PANEL_SUB_ITEMS[panelName] || [];
            const data = panelData[panelName] || [];
            return (
              <PanelCard
                key={panelName}
                title={panelName}
                className="min-h-[280px]"
                headerRight={
                  <div className="flex items-center gap-2">
                    {subItems.length > 0 && (
                      <PanelFilter
                        options={subItems}
                        selected={getSubItem(panelName)}
                        onChange={(v) => setPanelSubItem((prev) => ({ ...prev, [panelName]: v }))}
                      />
                    )}
                    <PanelFilter
                      options={TIME_PERIODS}
                      selected={getTimePeriod(panelName)}
                      onChange={(v) => setPanelTimePeriod((prev) => ({ ...prev, [panelName]: v }))}
                    />
                    <Bookmark className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                  </div>
                }
              >
                <div className="h-[220px]">
                  <PanelChart panelName={panelName} data={data} />
                </div>
              </PanelCard>
            );
          })}
        </div>
      </div>

      <SaveAsDialog open={saveAsOpen} onOpenChange={setSaveAsOpen} onSave={handleSaveAs} />
    </AppShell>
  );
};

export default CustomBoard;
