/**
 * Shared energy accounting utilities.
 * Single source of truth for efficiency, cost, and profit calculations
 * used by both generation engine and review engine.
 *
 * Physical model:
 *   Charging:   gridEnergy = power × dt;  stored = gridEnergy × η_charge;  battery += stored
 *   Discharging: internalEnergy = power × dt;  delivered = internalEnergy × η_discharge;  battery -= internalEnergy
 *   Revenue:    chargingCost = Σ(gridEnergy × settlementPrice);  dischargeRevenue = Σ(delivered × nodePrice)
 *   Profit:     gross = dischargeRevenue − chargingCost;  net = gross − otherCosts
 */

// ── Constants ──

/** 15-minute interval duration in hours */
export const INTERVAL_HOURS = 0.25;

/** Number of intervals per day */
export const INTERVALS_PER_DAY = 96;

// ── Rounding ──

export function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ── Time formatting ──

export function formatIntervalTime(intervalIndex: number): string {
  const h = Math.floor(intervalIndex / 4);
  const m = (intervalIndex % 4) * 15;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Efficiency normalization ──

/**
 * Ensure efficiency is in decimal form (0–1).
 * Accepts both percentage (e.g. 95) and decimal (e.g. 0.95).
 */
export function normalizeEfficiency(eff: number): number {
  return eff > 1 ? eff / 100 : eff;
}

// ── Single-interval energy calculations ──

export interface ChargeResult {
  gridEnergyMwh: number;
  storedEnergyMwh: number;
}

/**
 * Calculate charging energy for one interval.
 * @param powerMw Charging power in MW (positive)
 * @param chargingEfficiency Efficiency (percentage or decimal)
 * @param capacityMwh Battery capacity in MWh
 * @param currentBatteryMwh Current battery energy in MWh
 * @param socMaxPct Maximum SOC in %
 */
export function calcChargeEnergy(
  powerMw: number,
  chargingEfficiency: number,
  capacityMwh: number,
  currentBatteryMwh: number,
  socMaxPct: number,
): ChargeResult {
  const eff = normalizeEfficiency(chargingEfficiency);
  const gridEnergy = Math.abs(powerMw) * INTERVAL_HOURS;
  const stored = gridEnergy * eff;
  const maxStorable = (socMaxPct / 100) * capacityMwh - currentBatteryMwh;

  if (maxStorable <= 0.001) {
    return { gridEnergyMwh: 0, storedEnergyMwh: 0 };
  }

  const actualStored = Math.min(stored, maxStorable);
  const actualGrid = actualStored / eff;
  return { gridEnergyMwh: r2(actualGrid), storedEnergyMwh: r2(actualStored) };
}

export interface DischargeResult {
  internalEnergyMwh: number;
  marketDeliveredMwh: number;
}

/**
 * Calculate discharging energy for one interval.
 * @param powerMw Discharging power in MW (positive)
 * @param dischargingEfficiency Efficiency (percentage or decimal)
 * @param capacityMwh Battery capacity in MWh
 * @param currentBatteryMwh Current battery energy in MWh
 * @param socMinPct Minimum SOC in %
 */
export function calcDischargeEnergy(
  powerMw: number,
  dischargingEfficiency: number,
  capacityMwh: number,
  currentBatteryMwh: number,
  socMinPct: number,
): DischargeResult {
  const eff = normalizeEfficiency(dischargingEfficiency);
  const internalEnergy = Math.abs(powerMw) * INTERVAL_HOURS;
  const available = currentBatteryMwh - (socMinPct / 100) * capacityMwh;

  if (available <= 0.001) {
    return { internalEnergyMwh: 0, marketDeliveredMwh: 0 };
  }

  const actualInternal = Math.min(internalEnergy, available);
  const delivered = actualInternal * eff;
  return { internalEnergyMwh: r2(actualInternal), marketDeliveredMwh: r2(delivered) };
}

// ── SOC calculation ──

export function calcSoc(batteryEnergyMwh: number, capacityMwh: number, socMin: number, socMax: number): number {
  const raw = (batteryEnergyMwh / capacityMwh) * 100;
  return r2(Math.max(socMin, Math.min(socMax, raw)));
}

// ── Profit aggregation ──

export interface ProfitSummary {
  chargingCost: number;
  dischargeRevenue: number;
  grossArbitrageIncome: number;
  netProfit: number;
}

export function calcProfit(
  totalChargeCost: number,
  totalDischargeRevenue: number,
  otherCosts: number,
): ProfitSummary {
  const gross = r2(totalDischargeRevenue - totalChargeCost);
  return {
    chargingCost: r2(totalChargeCost),
    dischargeRevenue: r2(totalDischargeRevenue),
    grossArbitrageIncome: gross,
    netProfit: r2(gross - otherCosts),
  };
}
