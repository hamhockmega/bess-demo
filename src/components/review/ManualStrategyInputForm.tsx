import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StrategySnapshot } from '@/data/reviewData';

interface Props {
  strategy: StrategySnapshot;
  onChange: (s: StrategySnapshot) => void;
}

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div>
    <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
    {children}
  </div>
);

const InputWithUnit: React.FC<{
  value: number;
  unit: string;
  onChange: (v: number) => void;
}> = ({ value, unit, onChange }) => (
  <div className="flex items-center gap-2">
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 text-xs"
    />
    <span className="text-xs text-muted-foreground whitespace-nowrap">{unit}</span>
  </div>
);

export const ManualStrategyInputForm: React.FC<Props> = ({ strategy, onChange }) => {
  const update = (patch: Partial<StrategySnapshot>) => onChange({ ...strategy, ...patch });

  return (
    <PanelCard title="手动输入策略参数">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="策略名称">
          <Input
            value={strategy.strategyName}
            onChange={(e) => update({ strategyName: e.target.value })}
            className="h-8 text-xs"
            placeholder="例：手动测试策略"
          />
        </Field>
        <Field label="初始SOC（%）">
          <InputWithUnit value={strategy.initialSoc} unit="%" onChange={(v) => update({ initialSoc: v })} />
        </Field>
        <Field label="SOC下限（%）">
          <InputWithUnit value={strategy.socMin} unit="%" onChange={(v) => update({ socMin: v })} />
        </Field>
        <Field label="SOC上限（%）">
          <InputWithUnit value={strategy.socMax} unit="%" onChange={(v) => update({ socMax: v })} />
        </Field>
        <Field label="充电功率上限（MW）">
          <InputWithUnit value={strategy.chargePowerLimit} unit="MW" onChange={(v) => update({ chargePowerLimit: v })} />
        </Field>
        <Field label="放电功率上限（MW）">
          <InputWithUnit value={strategy.dischargePowerLimit} unit="MW" onChange={(v) => update({ dischargePowerLimit: v })} />
        </Field>
        <Field label="充电触发价格（元/MWh）">
          <InputWithUnit value={strategy.chargePriceTrigger} unit="元/MWh" onChange={(v) => update({ chargePriceTrigger: v })} />
        </Field>
        <Field label="放电触发价格（元/MWh）">
          <InputWithUnit value={strategy.dischargePriceTrigger} unit="元/MWh" onChange={(v) => update({ dischargePriceTrigger: v })} />
        </Field>
        <Field label="充电效率">
          <InputWithUnit value={strategy.chargingEfficiency} unit="%" onChange={(v) => update({ chargingEfficiency: v })} />
        </Field>
        <Field label="放电效率">
          <InputWithUnit value={strategy.dischargingEfficiency} unit="%" onChange={(v) => update({ dischargingEfficiency: v })} />
        </Field>
        <Field label="其它成本（元）">
          <InputWithUnit value={strategy.otherCosts} unit="元" onChange={(v) => update({ otherCosts: v })} />
        </Field>
        <Field label="额定容量（MWh）">
          <InputWithUnit value={strategy.capacity} unit="MWh" onChange={(v) => update({ capacity: v })} />
        </Field>
      </div>
    </PanelCard>
  );
};
