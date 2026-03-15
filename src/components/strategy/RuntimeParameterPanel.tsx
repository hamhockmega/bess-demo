import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import type { RuntimeParameters } from '@/data/strategyData';

interface Props {
  params: RuntimeParameters;
  priceBenchmark: string;
}

const ParamRow: React.FC<{ label: string; value: string | number; unit?: string; required?: boolean }> = ({
  label,
  value,
  unit,
  required,
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
    <span className="text-xs text-muted-foreground">
      {required && <span className="text-destructive mr-0.5">*</span>}
      {label}
    </span>
    <span className="text-xs font-medium text-foreground">
      {value}
      {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
    </span>
  </div>
);

export const RuntimeParameterPanel: React.FC<Props> = ({ params, priceBenchmark }) => {
  return (
    <div className="space-y-4">
      <PanelCard title="申报运行参数">
        <ParamRow label="充电出力上限" value={params.chargePowerLimit} unit="MW" required />
        <ParamRow label="放电出力上限" value={params.dischargePowerLimit} unit="MW" required />
        <ParamRow label="荷电状态上限" value={params.socUpperLimit} unit="%" required />
        <ParamRow label="荷电状态下限" value={params.socLowerLimit} unit="%" required />
        <ParamRow label="最小连续充电时间" value={params.minContinuousChargeTime} unit="h" required />
        <ParamRow label="最小连续放电时间" value={params.minContinuousDischargeTime} unit="h" required />
        <ParamRow label="储能利用率" value={params.utilizationRate} unit="%" />
        <ParamRow label="结束时刻期望荷电状态" value={params.expectedEndSoc} unit="%" />
      </PanelCard>

      <PanelCard title="价格基准">
        <p className="text-xs text-muted-foreground">
          当前策略所选价格基准：
          <span className="text-foreground font-medium ml-1">{priceBenchmark}</span>
        </p>
        <div className="flex items-center gap-3 mt-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" className="rounded border-border" />
            尖峰平
          </label>
        </div>
      </PanelCard>
    </div>
  );
};
