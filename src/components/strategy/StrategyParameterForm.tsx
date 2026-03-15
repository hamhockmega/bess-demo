import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { StrategyForm, StrategyMode, LossCostMode } from '@/data/strategyData';

interface Props {
  form: StrategyForm;
  onChange: (form: StrategyForm) => void;
}

const Field: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}> = ({ label, required, children, hint, className }) => (
  <div className={className}>
    <Label className="text-xs text-muted-foreground mb-1.5 block">
      {required && <span className="text-destructive mr-0.5">*</span>}
      {label}
    </Label>
    {children}
    {hint && <p className="text-[11px] text-primary mt-1">{hint}</p>}
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

export const StrategyParameterForm: React.FC<Props> = ({ form, onChange }) => {
  const update = (patch: Partial<StrategyForm>) => onChange({ ...form, ...patch });

  return (
    <div className="space-y-4">
      {/* 策略参数 */}
      <PanelCard title="策略参数">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="策略名称" required>
            <Input
              value={form.strategyName}
              onChange={(e) => update({ strategyName: e.target.value })}
              className="h-8 text-xs"
            />
          </Field>
          <Field label="规则模式" required>
            <Select value={form.ruleMode} onValueChange={(v) => update({ ruleMode: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="山东现货规则">山东现货规则</SelectItem>
                <SelectItem value="广东现货规则">广东现货规则</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="策略模式" required>
            <RadioGroup
              value={form.strategyMode}
              onValueChange={(v) => update({ strategyMode: v as StrategyMode })}
              className="flex items-center gap-4 pt-1"
            >
              {(['套利', '不套利', '智能选择'] as StrategyMode[]).map((mode) => (
                <div key={mode} className="flex items-center gap-1.5">
                  <RadioGroupItem value={mode} id={`mode-${mode}`} />
                  <Label htmlFor={`mode-${mode}`} className="text-xs cursor-pointer">
                    {mode}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </Field>
          <Field label="策略目标" required>
            <Select value={form.strategyObjective} onValueChange={(v) => update({ strategyObjective: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="单日收益最优">单日收益最优</SelectItem>
                <SelectItem value="风险最小化">风险最小化</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="损耗成本" required className="md:col-span-2">
            <div className="flex items-center gap-4">
              <RadioGroup
                value={form.lossCostMode}
                onValueChange={(v) => update({ lossCostMode: v as LossCostMode })}
                className="flex items-center gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="考虑" id="loss-yes" />
                  <Label htmlFor="loss-yes" className="text-xs cursor-pointer">考虑</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="不考虑" id="loss-no" />
                  <Label htmlFor="loss-no" className="text-xs cursor-pointer">不考虑</Label>
                </div>
              </RadioGroup>
              {form.lossCostMode === '考虑' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={form.lossCostValue}
                    onChange={(e) => update({ lossCostValue: Number(e.target.value) })}
                    className="h-8 text-xs w-20"
                  />
                  <span className="text-xs text-muted-foreground">元/MWh</span>
                </div>
              )}
            </div>
          </Field>
        </div>
      </PanelCard>

      {/* 运行参数 */}
      <PanelCard title="运行参数">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="运行日可用容量" required>
            <InputWithUnit value={form.availableCapacity} unit="MWh" onChange={(v) => update({ availableCapacity: v })} />
          </Field>
          <Field label="运行日可用功率" required>
            <InputWithUnit value={form.availablePower} unit="MW" onChange={(v) => update({ availablePower: v })} />
          </Field>
          <Field label="初始SOC" required hint={`基于出清规则计算，上日期末SOC为 ${form.initialSoc}%`}>
            <InputWithUnit value={form.initialSoc} unit="%" onChange={(v) => update({ initialSoc: v })} />
          </Field>
          <Field label="储能利用率">
            <InputWithUnit value={form.utilizationRate} unit="%" onChange={(v) => update({ utilizationRate: v })} />
          </Field>
          <Field label="期望达到SOC">
            <InputWithUnit value={form.expectedEndSoc} unit="%" onChange={(v) => update({ expectedEndSoc: v })} />
          </Field>
        </div>
      </PanelCard>

      {/* 其他申报参数 */}
      <PanelCard title="其他申报参数">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="充电出力上限" required>
            <InputWithUnit value={form.chargePowerLimit} unit="MW" onChange={(v) => update({ chargePowerLimit: v })} />
          </Field>
          <Field label="放电出力上限" required>
            <InputWithUnit value={form.dischargePowerLimit} unit="MW" onChange={(v) => update({ dischargePowerLimit: v })} />
          </Field>
          <Field label="最大SOC" required>
            <InputWithUnit value={form.maxSoc} unit="%" onChange={(v) => update({ maxSoc: v })} />
          </Field>
          <Field label="最小SOC" required>
            <InputWithUnit value={form.minSoc} unit="%" onChange={(v) => update({ minSoc: v })} />
          </Field>
          <Field label="最小连续充电时间" required>
            <InputWithUnit value={form.minContinuousChargeTime} unit="h" onChange={(v) => update({ minContinuousChargeTime: v })} />
          </Field>
          <Field label="最小连续放电时间" required>
            <InputWithUnit value={form.minContinuousDischargeTime} unit="h" onChange={(v) => update({ minContinuousDischargeTime: v })} />
          </Field>
        </div>
      </PanelCard>
    </div>
  );
};
