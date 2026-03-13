import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { X, ChevronDown, Bookmark, Save, FilePlus, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

/* ── 全部可用面板 ── */
const ALL_PANELS = [
  '节点电价(门前节点)',
  '系统负荷',
  '联络线受电负荷',
  '新能源出力',
  '抽蓄',
  '储能出力',
  '正负备用',
  '事前监管',
  '开停机组数量（市场化）',
  '节点电价(全省平均)',
  '阻塞电价(全省平均)',
  '出清电价(交易结果)',
  '统一结算价',
  '温度(全省算术平均)',
  '风速(风电装机容量加权)',
  '辐照(光伏装机容量加权)',
  '降水量(全省算术平均)',
] as const;

type PanelName = (typeof ALL_PANELS)[number];

/* ── 每个面板可筛选的数据细项 ── */
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

/* ── 时间周期选项 ── */
const TIME_PERIODS = ['实时', '日前', '预测(周前)', '预测(月前)', 'D-1', 'D-2'];

/* ── 默认看板方案 ── */
const DEFAULT_TEMPLATES: Record<string, PanelName[]> = {
  '通用模板': ['节点电价(门前节点)', '系统负荷', '联络线受电负荷', '新能源出力', '抽蓄'],
  '价格分析模板': ['节点电价(门前节点)', '节点电价(全省平均)', '阻塞电价(全省平均)', '出清电价(交易结果)', '统一结算价'],
  '新能源模板': ['新能源出力', '风速(风电装机容量加权)', '辐照(光伏装机容量加权)', '储能出力'],
};

/* ── 面板筛选器下拉 ── */
const PanelFilter: React.FC<{
  label: string;
  options: string[];
  selected: string;
  onChange: (v: string) => void;
}> = ({ label, options, selected, onChange }) => (
  <Select value={selected} onValueChange={onChange}>
    <SelectTrigger className="h-6 min-w-[90px] max-w-[140px] text-xs bg-secondary/40 border-border px-2 gap-1">
      <SelectValue placeholder={label} />
    </SelectTrigger>
    <SelectContent>
      {options.map((opt) => (
        <SelectItem key={opt} value={opt} className="text-xs">
          {opt}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const CustomBoard: React.FC = () => {
  const [dateMode, setDateMode] = useState<'多日' | '段'>('段');
  const [startDate, setStartDate] = useState('2025-07-01');
  const [endDate, setEndDate] = useState('2025-07-31');
  const [template, setTemplate] = useState('通用模板');

  // visible panels driven by template
  const [visiblePanels, setVisiblePanels] = useState<PanelName[]>(
    DEFAULT_TEMPLATES['通用模板']
  );

  // per-panel sub-item & time period selections
  const [panelSubItem, setPanelSubItem] = useState<Record<string, string>>({});
  const [panelTimePeriod, setPanelTimePeriod] = useState<Record<string, string>>({});

  // data selector popover
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [pendingPanels, setPendingPanels] = useState<PanelName[]>(visiblePanels);

  const handleTemplateChange = (v: string) => {
    setTemplate(v);
    const panels = DEFAULT_TEMPLATES[v] || DEFAULT_TEMPLATES['通用模板'];
    setVisiblePanels(panels);
    setPendingPanels(panels);
  };

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

  const getSubItem = (panel: string) =>
    panelSubItem[panel] || (PANEL_SUB_ITEMS[panel]?.[0] ?? '');
  const getTimePeriod = (panel: string) =>
    panelTimePeriod[panel] || TIME_PERIODS[0];

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-72px)] p-3 gap-3">
        {/* ── 顶部工具栏 ── */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-sm px-3 py-2 shrink-0 flex-wrap">
          {/* 运行日切换 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">运行日：</span>
            <div className="flex items-center border border-border rounded-sm overflow-hidden">
              {(['多日', '段'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDateMode(mode)}
                  className={`px-3 py-0.5 text-xs transition-colors ${
                    dateMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* 日期范围 */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-secondary/50 border border-border rounded-sm px-2 py-0.5 text-xs text-foreground outline-none focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-secondary/50 border border-border rounded-sm px-2 py-0.5 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setSelectorOpen(false)}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 text-xs"
                    onClick={applySelection}
                  >
                    确定
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* 看板方案 + 保存 + 另存 */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">看板方案：</span>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger className="h-7 w-[130px] text-xs bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(DEFAULT_TEMPLATES).map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border">
              <Save className="w-3 h-3" />
              保存
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-border">
              <FilePlus className="w-3 h-3" />
              另存为
            </Button>
          </div>
        </div>

        {/* ── 图表面板 ── */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {visiblePanels.map((panelName) => {
            const subItems = PANEL_SUB_ITEMS[panelName] || [];
            return (
              <PanelCard
                key={panelName}
                title={panelName}
                className="min-h-[260px]"
                headerRight={
                  <div className="flex items-center gap-2">
                    {subItems.length > 0 && (
                      <PanelFilter
                        label="数据细项"
                        options={subItems}
                        selected={getSubItem(panelName)}
                        onChange={(v) =>
                          setPanelSubItem((prev) => ({ ...prev, [panelName]: v }))
                        }
                      />
                    )}
                    <PanelFilter
                      label="时间周期"
                      options={TIME_PERIODS}
                      selected={getTimePeriod(panelName)}
                      onChange={(v) =>
                        setPanelTimePeriod((prev) => ({ ...prev, [panelName]: v }))
                      }
                    />
                    <Bookmark className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                  </div>
                }
              >
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  暂无数据
                </div>
              </PanelCard>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};

export default CustomBoard;
