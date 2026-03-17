import React from 'react';
import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ChartInfoContent {
  title: string;
  tradingMeaning: string;
  calculationLogic: string;
}

interface Props {
  info: ChartInfoContent;
}

export const ChartInfoButton: React.FC<Props> = ({ info }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          aria-label="查看说明"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 border-border shadow-lg"
        align="end"
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b border-border bg-secondary/50 rounded-t-md">
          <h4 className="text-xs font-semibold text-foreground">{info.title}</h4>
        </div>
        <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
          <div>
            <div className="text-[11px] font-semibold text-primary mb-1">交易意义</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
              {info.tradingMeaning}
            </p>
          </div>
          <div className="border-t border-border pt-3">
            <div className="text-[11px] font-semibold text-primary mb-1">计算逻辑</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
              {info.calculationLogic}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ── Chart info content registry ──

export const CHART_INFO: Record<string, ChartInfoContent> = {
  trend: {
    title: '现货价格趋势图',
    tradingMeaning:
      '现货价格趋势图展示日前电价与实时电价在一日内的变化走势。对于独立储能电站，该图直接反映充放电时段的电价水平，是制定套利策略的核心依据。\n\n通过观察峰谷价差分布，运营人员可判断最佳充放电时间窗口，最大化价差收益。',
    calculationLogic:
      '图中展示多场景电价曲线，包括出清前上午/下午预测、出清后结果、实际结算价格和智能预测价格。\n\n均值 = 所选时段内价格算术平均值\n最大值/最小值 = 时段内价格极值\n累计 = 各时段价格加总（用于参考总体价格水平）',
  },
  typicalCurve: {
    title: '典型曲线',
    tradingMeaning:
      '典型曲线展示电网负荷在一日内的变化规律，包括直调负荷、全网负荷和联络线受电负荷。\n\n对于储能电站，负荷曲线是预判电价走势的重要辅助信号。负荷高峰通常对应电价上涨，是放电获利的关键时段；负荷低谷则是低价充电的最佳窗口。',
    calculationLogic:
      '图中展示多个预测场景的负荷曲线，允许用户对比出清前/后预测与实际负荷的偏差。\n\n日均值 = 96个点（15分钟间隔）的算术平均\n日最大/最小 = 当日负荷峰值和谷值',
  },
  dayAheadRealTime: {
    title: '日前/实时价格对比',
    tradingMeaning:
      '日前与实时电价的对比分析是评估市场预测准确性和套利空间的关键工具。\n\n日前电价反映市场对次日供需的预期，实时电价反映实际出清结果。两者价差越大，说明市场波动越强，储能套利潜力越大。',
    calculationLogic:
      '预测准确率 = 日前预测值与实时结果偏差在阈值范围内的时段占比\n\n日前均价 = 各时段日前电价的算术平均\n实时均价 = 各时段实时电价的算术平均\n最大价差 = max(|日前均价 - 实时均价|) across all days',
  },
  soc: {
    title: 'SOC曲线',
    tradingMeaning:
      'SOC（荷电状态）曲线展示储能电池在一日内的电量变化轨迹。SOC是储能调度的核心约束指标。\n\nSOC过高意味着无法继续充电（错失低价充电机会），SOC过低则无法放电（错失高价放电收益）。合理的SOC管理是实现最优套利的基础。',
    calculationLogic:
      'SOC(t) = SOC(t-1) + ΔE(t) / 额定容量 × 100%\n\n其中 ΔE(t) 为 t 时刻的充放电电量（充电为正，放电为负）\n\n上限/下限参考线分别对应电池安全运行的最大/最小允许SOC，由运行参数设定。',
  },
  quotation: {
    title: '分段报价曲线',
    tradingMeaning:
      '分段报价曲线是储能电站向电力市场申报的核心交易数据。每一段对应一个功率区间和对应的报价水平。\n\n市场根据各电站的分段报价进行出清排序，报价越接近出清价格，中标概率越高。合理的分段报价既要保证中标，又要最大化单位电量收益。',
    calculationLogic:
      '智能策略基于以下逻辑生成分段报价：\n1. 根据日前价格预测确定充放电时段\n2. 在各时段按出力区间分段\n3. 结合中标概率模型优化各段报价\n4. 考虑SOC约束和连续充放电限制\n\n报价功率为负表示充电，为正表示放电。',
  },
  power: {
    title: '中标功率曲线',
    tradingMeaning:
      '中标功率曲线展示策略生成的报量功率与预期中标功率的对比。报量功率是电站向市场申报的意愿出力，中标功率是市场出清后实际获得的调度指令。\n\n两者差异反映市场竞争程度和策略的市场适应性。',
    calculationLogic:
      '报量功率 = 策略生成的各时段充放电申报出力\n中标功率 = 报量功率 × 中标比例（基于市场竞争模拟）\n日前价格 = 用于参考的日前出清价格预测值',
  },
  energy: {
    title: '中标电量曲线',
    tradingMeaning:
      '中标电量曲线展示各时段中标电量及累计电量变化。对于独立储能电站，累计电量直接影响日终SOC和整体收益。\n\n充电时段电量为负（从电网取电），放电时段电量为正（向电网送电）。累计电量趋势反映全天净充放电平衡。',
    calculationLogic:
      '中标电量 = 中标功率 × 时段时长（15分钟 = 0.25小时）\n累计电量 = Σ 各时段中标电量\n\n正值表示向市场放电，负值表示从市场充电。',
  },
  revenueBreakdown: {
    title: '收益构成分析',
    tradingMeaning:
      '收益构成图展示当前策略的收益来源和成本结构。对于独立储能电站，核心收益来自峰谷电价差套利，即低价时充电、高价时放电的价差收益。\n\n理解收益构成有助于评估策略质量和优化方向。',
    calculationLogic:
      '充电电费 = 充电电量 × 平均充电电价\n放电收益 = 有效放电电量 × 平均放电电价\n有效放电电量 = 充电电量 × 充电效率 × 放电效率\n套利毛收益 = 放电收益 - 充电电费\n净收益 = 套利毛收益 - 其它成本',
  },
};
