import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';

export const ReviewCalculationLogicPanel: React.FC = () => {
  return (
    <PanelCard title="计算逻辑说明">
      <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
        <div>
          <div className="font-semibold text-primary mb-1">为什么是"复盘"而非"预测"</div>
          <p>
            本模块将已生成的策略代入目标日期的真实历史价格场景，回溯性地计算该策略"如果当日执行"会产生的结果。
            这不是对未来的预测，而是基于已发生的市场行情对策略进行事后评估。
          </p>
        </div>
        <div>
          <div className="font-semibold text-primary mb-1">数据来源</div>
          <p>
            实际场景的电价数据来源于系统存储的历史行情记录，包括门前节点电价（放电电价）和用户侧统一结算点电价（充电电价）。
            策略快照来源于"智能策略（报量报价）"模块保存的策略参数，或用户在本页面手动输入的策略参数。
          </p>
        </div>
        <div>
          <div className="font-semibold text-primary mb-1">执行模拟逻辑</div>
          <p>
            对全天96个15分钟时段逐一判断：若当前用户侧结算电价≤充电触发价格且SOC未触上限，则执行充电；
            若当前门前节点电价≥放电触发价格且SOC未触下限，则执行放电。
            充电功率和放电功率受策略设定的功率上限约束，同时受SOC剩余空间/可用电量约束。
          </p>
        </div>
        <div>
          <div className="font-semibold text-primary mb-1">损耗修正</div>
          <p>
            充电时，从电网侧充入的电量需乘以充电效率，得到实际可存储电量（SOC增量基于此值）。
            放电时，从电池释放的内部电量需乘以放电效率，得到实际交付市场的有效放电电量（收益基于此值计算）。
            综合效率 = 充电效率 × 放电效率，反映从电网到市场的总能量转换率。
          </p>
        </div>
        <div>
          <div className="font-semibold text-primary mb-1">收益计算</div>
          <p>
            充电电费 = Σ（各充电时段电网侧充电电量 × 用户侧统一结算点电价）<br />
            放电收益 = Σ（各放电时段有效放电电量 × 门前节点电价）<br />
            套利毛收益 = 放电收益 - 充电电费<br />
            净收益 = 套利毛收益 - 其它成本
          </p>
        </div>
        <div>
          <div className="font-semibold text-primary mb-1">所有计算均在前端完成</div>
          <p>
            本页面的所有复盘计算逻辑均在浏览器前端执行，不依赖后端预计算的复盘结果。
            数据库仅提供原始策略快照和历史价格数据，确保计算过程透明可验证。
          </p>
        </div>
      </div>
    </PanelCard>
  );
};
