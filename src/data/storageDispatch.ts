/**
 * Deterministic storage dispatch computation.
 *
 * Given 96 actual real-time price points and a storage asset config,
 * computes a charge/discharge power schedule using simple
 * "buy low, sell high" logic. Fully deterministic – no randomness.
 *
 * Uses energy accounting utilities for SOC / energy calculations.
 */
import {
  INTERVAL_HOURS,
  calcChargeEnergy,
  calcDischargeEnergy,
  calcSoc,
  normalizeEfficiency,
  r2,
} from './energyAccounting';

export interface StorageConfig {
  ratedPowerMw: number;
  ratedCapacityMwh: number;
  socMin: number; // %
  socMax: number; // %
  initialSoc: number; // %
  chargingEfficiency: number;
  dischargingEfficiency: number;
  minContinuousChargeIntervals: number;
  minContinuousDischargeIntervals: number;
}

export interface DispatchPoint {
  intervalIndex: number; // 1..96
  time: string;
  powerMw: number; // positive = discharge, negative = charge
  soc: number; // % after this interval
  action: 'charge' | 'discharge' | 'idle';
}

/**
 * Compute deterministic storage dispatch for one day.
 *
 * Algorithm:
 *  1. Rank all intervals by price.
 *  2. Assign cheapest N intervals to charge, most expensive M to discharge.
 *     N and M are limited by SOC bounds and continuous-interval constraints.
 *  3. Walk through intervals chronologically, updating SOC.
 */
export function computeStorageDispatch(
  prices: { intervalIndex: number; value: number }[],
  config: StorageConfig,
): DispatchPoint[] {
  const sorted = [...prices].sort((a, b) => a.value - b.value);
  const totalIntervals = sorted.length;

  // How many intervals can we charge/discharge at rated power?
  const chargeEff = normalizeEfficiency(config.chargingEfficiency);
  const energyPerChargeInterval = config.ratedPowerMw * INTERVAL_HOURS * chargeEff;
  const maxChargeableEnergy = (config.socMax - config.initialSoc) / 100 * config.ratedCapacityMwh;
  const maxChargeIntervals = Math.ceil(maxChargeableEnergy / energyPerChargeInterval);

  // Round up to satisfy min continuous constraint
  const minCharge = config.minContinuousChargeIntervals || 1;
  const minDischarge = config.minContinuousDischargeIntervals || 1;
  const chargeCount = Math.max(minCharge, Math.min(maxChargeIntervals, Math.floor(totalIntervals * 0.3)));
  const dischargeCount = Math.max(minDischarge, Math.min(chargeCount, Math.floor(totalIntervals * 0.25)));

  // Assign actions by price ranking
  const actionMap = new Map<number, 'charge' | 'discharge' | 'idle'>();
  for (let i = 0; i < totalIntervals; i++) {
    actionMap.set(sorted[i].intervalIndex, 'idle');
  }
  // Cheapest → charge
  for (let i = 0; i < Math.min(chargeCount, totalIntervals); i++) {
    actionMap.set(sorted[i].intervalIndex, 'charge');
  }
  // Most expensive → discharge
  for (let i = totalIntervals - 1; i >= Math.max(0, totalIntervals - dischargeCount); i--) {
    // Don't override charge if already assigned
    if (actionMap.get(sorted[i].intervalIndex) !== 'charge') {
      actionMap.set(sorted[i].intervalIndex, 'discharge');
    }
  }

  // Enforce minimum continuous intervals – simple pass: if a charge/discharge
  // block is shorter than the minimum, extend it
  const ordered = [...prices].sort((a, b) => a.intervalIndex - b.intervalIndex);
  const actions = ordered.map(p => ({
    intervalIndex: p.intervalIndex,
    action: actionMap.get(p.intervalIndex) || 'idle' as const,
  }));
  enforceContinuity(actions, 'charge', minCharge);
  enforceContinuity(actions, 'discharge', minDischarge);

  // Chronological SOC simulation
  let batteryMwh = (config.initialSoc / 100) * config.ratedCapacityMwh;
  const result: DispatchPoint[] = [];

  for (const item of actions) {
    const idx = item.intervalIndex;
    const zeroIdx = idx - 1;
    const h = Math.floor(zeroIdx / 4);
    const m = (zeroIdx % 4) * 15;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    let powerMw = 0;
    let action: 'charge' | 'discharge' | 'idle' = item.action;

    if (action === 'charge') {
      const cr = calcChargeEnergy(
        config.ratedPowerMw,
        config.chargingEfficiency,
        config.ratedCapacityMwh,
        batteryMwh,
        config.socMax,
      );
      if (cr.storedEnergyMwh > 0.001) {
        batteryMwh += cr.storedEnergyMwh;
        powerMw = -r2(cr.gridEnergyMwh / INTERVAL_HOURS); // negative = charging
      } else {
        action = 'idle';
      }
    } else if (action === 'discharge') {
      const dr = calcDischargeEnergy(
        config.ratedPowerMw,
        config.dischargingEfficiency,
        config.ratedCapacityMwh,
        batteryMwh,
        config.socMin,
      );
      if (dr.marketDeliveredMwh > 0.001) {
        batteryMwh -= dr.internalEnergyMwh;
        powerMw = r2(dr.marketDeliveredMwh / INTERVAL_HOURS); // positive = discharging
      } else {
        action = 'idle';
      }
    }

    const soc = calcSoc(batteryMwh, config.ratedCapacityMwh, config.socMin, config.socMax);

    result.push({ intervalIndex: idx, time, powerMw, soc, action });
  }

  return result;
}

/** Enforce minimum continuous block length for a given action type */
function enforceContinuity(
  actions: { intervalIndex: number; action: string }[],
  targetAction: string,
  minLength: number,
) {
  if (minLength <= 1) return;
  let blockStart = -1;
  for (let i = 0; i <= actions.length; i++) {
    const isTarget = i < actions.length && actions[i].action === targetAction;
    if (isTarget && blockStart < 0) {
      blockStart = i;
    } else if (!isTarget && blockStart >= 0) {
      const blockLen = i - blockStart;
      if (blockLen < minLength) {
        // Extend block forward if possible
        const extend = Math.min(minLength - blockLen, actions.length - i);
        for (let j = i; j < i + extend; j++) {
          if (actions[j].action === 'idle') {
            actions[j].action = targetAction;
          }
        }
      }
      blockStart = -1;
    }
  }
}
