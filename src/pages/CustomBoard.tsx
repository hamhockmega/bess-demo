import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { X, ChevronDown, Bookmark } from 'lucide-react';

interface TagItem {
  label: string;
  removable?: boolean;
}

interface ChartPanelConfig {
  title: string;
  tags: TagItem[][];
  bookmarkable?: boolean;
}

const TagGroup: React.FC<{ tags: TagItem[]; extra?: number }> = ({ tags, extra }) => (
  <div className="flex items-center gap-1 bg-secondary/40 border border-border rounded-sm px-2 py-0.5">
    {tags.map((tag, i) => (
      <span key={i} className="flex items-center gap-1 text-xs text-foreground">
        {tag.label}
        {tag.removable !== false && (
          <X className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-foreground" />
        )}
      </span>
    ))}
    {extra !== undefined && extra > 0 && (
      <span className="text-xs text-muted-foreground">+{extra}</span>
    )}
    <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
  </div>
);

const PANELS: ChartPanelConfig[] = [
  {
    title: '节点电价(门前节点)',
    tags: [
      [{ label: '山东.福山...' }],
      [{ label: '实时' }],
    ],
    bookmarkable: true,
  },
  {
    title: '联络线受电负荷',
    tags: [
      [{ label: '各联络线...' }],
      [{ label: '预测(周前)' }],
    ],
  },
  {
    title: '抽蓄',
    tags: [
      [{ label: '预测(周前)' }],
    ],
  },
];

const tagExtras = [0, [5, 4], [3]];

const CustomBoard: React.FC = () => {
  const [dateMode, setDateMode] = useState<'多日' | '段'>('段');
  const [startDate, setStartDate] = useState('2025-07-01');
  const [endDate, setEndDate] = useState('2025-07-31');
  const [template, setTemplate] = useState('通用模板');

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-72px)] p-3 gap-3">
        {/* 顶部工具栏 */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-sm px-3 py-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">运行日：</span>
            <div className="flex items-center border border-border rounded-sm overflow-hidden">
              <button
                onClick={() => setDateMode('多日')}
                className={`px-3 py-0.5 text-xs transition-colors ${
                  dateMode === '多日'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                多日
              </button>
              <button
                onClick={() => setDateMode('段')}
                className={`px-3 py-0.5 text-xs transition-colors ${
                  dateMode === '段'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                段
              </button>
            </div>
          </div>

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

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">看板方案：</span>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="bg-secondary/50 border border-border rounded-sm px-2 py-0.5 text-xs text-foreground outline-none focus:border-primary"
            >
              <option>通用模板</option>
              <option>自定义模板1</option>
              <option>自定义模板2</option>
            </select>
          </div>
        </div>

        {/* 图表面板区域 */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {PANELS.map((panel, idx) => {
            const extras = tagExtras[idx];
            return (
              <PanelCard
                key={panel.title}
                title={panel.title}
                className="min-h-[280px]"
                headerRight={
                  <div className="flex items-center gap-2">
                    {panel.tags.map((tagGroup, gi) => (
                      <TagGroup
                        key={gi}
                        tags={tagGroup}
                        extra={
                          Array.isArray(extras)
                            ? (extras as number[])[gi]
                            : gi === 0
                            ? (extras as number)
                            : undefined
                        }
                      />
                    ))}
                    {panel.bookmarkable && (
                      <Bookmark className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                    )}
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
