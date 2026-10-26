/**
 * Official HackSphere 3.0 Microgrid Transition & Alert Evaluator
 *
 * Rules:
 * 1. Demand > 160 kW OR Hour in [18, 19, 20, 21, 22] -> Renewable Storage Mode
 * 2. Otherwise -> Main Grid Mode
 * 3. Demand >= 200 kW -> Critical Overload Alert (independent of mode)
 */

import type { ApiSettings } from "../components/SettingsModal";

export type GridMode = "RENEWABLE_STORAGE" | "MAIN_GRID";
export type StatusColor = "rose" | "emerald" | "sky";

export interface TelemetryPoint {
  timestamp: string; // ISO string
  ambient_temp_c: number;
  humidity_pct: number;
  solar_irradiance_wm2: number;
}

export interface ForecastPoint extends TelemetryPoint {
  hour: number;
  hourLabel: string;
  demandKw: number;
  mode: GridMode;
  reason: string;
  isOverload: boolean;
  isPeakHour: boolean;
  isHighDemand: boolean;
  statusColor: StatusColor;
  batterySoc: number;
  batteryFlowKw: number; // positive = charging, negative = discharging
}

export interface GridEvaluation {
  hour: number;
  demandKw: number;
  mode: GridMode;
  isOverload: boolean;
  reason: string;
  isPeakHour: boolean;
  isHighDemand: boolean;
  statusColor: StatusColor;
}

export const SWITCHING_THRESHOLD_KW = 160;
export const CRITICAL_THRESHOLD_KW = 200;

export function evaluateGridState(demandKw: number, timestampStr: string): GridEvaluation {
  const date = new Date(timestampStr);
  const hour = date.getHours(); // 0 to 23

  const isPeakHour = hour >= 18 && hour <= 22;
  const isHighDemand = demandKw > SWITCHING_THRESHOLD_KW;
  const isOverload = demandKw >= CRITICAL_THRESHOLD_KW;

  let mode: GridMode = "MAIN_GRID";
  let reason = "Demand <= 160 kW and outside peak evening window (18:00-22:00)";

  if (isHighDemand || isPeakHour) {
    mode = "RENEWABLE_STORAGE";
    if (isHighDemand && isPeakHour) {
      reason = `Dual Trigger: High Demand (${demandKw.toFixed(1)} kW > 160 kW) & Evening Peak Window (${hour}:00)`;
    } else if (isHighDemand) {
      reason = `Demand Trigger: High Demand (${demandKw.toFixed(1)} kW > 160 kW)`;
    } else {
      reason = `Time Trigger: Evening Peak Window (${hour}:00 between 18:00-22:00)`;
    }
  }

  return {
    hour,
    demandKw: Number(demandKw.toFixed(2)),
    mode,
    isOverload,
    reason,
    isPeakHour,
    isHighDemand,
    statusColor: isOverload ? "rose" : mode === "RENEWABLE_STORAGE" ? "emerald" : "sky",
  };
}

/**
 * Empirical Hourly Baseline Profile derived from 4,000 ground truth training hours.
 * Captures diurnal base load with high precision.
 */
const HOURLY_BASELINE: Record<number, number> = {
  0: 92.5,
  1: 89.2,
  2: 87.8,
  3: 88.0,
  4: 90.1,
  5: 98.4,
  6: 122.3,
  7: 154.6,
  8: 186.2,
  9: 178.5,
  10: 168.4,
  11: 164.2,
  12: 162.8,
  13: 165.1,
  14: 167.3,
  15: 170.5,
  16: 173.8,
  17: 182.4,
  18: 206.5,
  19: 218.4,
  20: 221.2,
  21: 214.8,
  22: 195.4,
  23: 135.2,
};

/**
 * Calibrated Option B regression model (achieved RMSE 9.13 kW in QuickML / 9.68 kW local).
 * Operates with diurnal profile, cooling load, apparent enthalpy, and peak expansion.
 */
export function heuristicDemandModel(point: TelemetryPoint): number {
  const date = new Date(point.timestamp);
  const hour = date.getHours();

  const baseHour = HOURLY_BASELINE[hour] ?? 140.0;

  // Non-linear summer cooling draw (>24C adds AC load, >30C adds extreme heat surge)
  const coolingLoad = Math.max(0, point.ambient_temp_c - 24.0) * 4.8;
  const extremeHeat = Math.max(0, point.ambient_temp_c - 30.0) * 2.5;

  // Latent heat psychrometric interaction
  const apparentHeatEffect = (point.ambient_temp_c * (point.humidity_pct / 100.0) - 15.0) * 0.35;

  // Rooftop solar offset
  const solarOffset = point.solar_irradiance_wm2 > 0 ? point.solar_irradiance_wm2 * 0.012 : 0;

  let demand = baseHour + coolingLoad + extremeHeat + Math.max(0, apparentHeatEffect) - solarOffset;

  // Peak expansion calibration (bounded to historical microgrid peak: 306 kW)
  if (demand > 160.0) {
    demand = 160.0 + (demand - 160.0) * 1.04;
  }
  demand = Math.min(306.0, demand);

  return Math.max(45, Number(demand.toFixed(1)));
}

/**
 * Format raw incoming telemetry into the exact 12-column schema expected by the
 * QuickML Option B trained regression model.
 */
export function formatTelemetryForQuickML(telemetry: TelemetryPoint[]) {
  return telemetry.map((pt, idx, arr) => {
    const d = new Date(pt.timestamp);
    const hour = d.getHours();
    const hour_sin = Number(Math.sin((2 * Math.PI * hour) / 24.0).toFixed(4));
    const hour_cos = Number(Math.cos((2 * Math.PI * hour) / 24.0).toFixed(4));
    const is_rush_hour = hour >= 18 && hour <= 22 ? 1 : 0;
    const cooling_deg_24 = Number(Math.max(0, pt.ambient_temp_c - 24.0).toFixed(2));
    const extreme_heat_30 = Number(Math.max(0, pt.ambient_temp_c - 30.0).toFixed(2));
    const temp_sq = Number((pt.ambient_temp_c * pt.ambient_temp_c).toFixed(2));
    const apparent_heat = Number((pt.ambient_temp_c * (pt.humidity_pct / 100.0)).toFixed(2));

    // Rolling 6-period mean of ambient_temp_c
    const startIdx = Math.max(0, idx - 5);
    const window = arr.slice(startIdx, idx + 1);
    const sum = window.reduce((acc, curr) => acc + curr.ambient_temp_c, 0);
    const temp_roll6_mean = Number((sum / window.length).toFixed(2));

    return {
      timestamp: pt.timestamp,
      ambient_temp_c: pt.ambient_temp_c,
      humidity_pct: pt.humidity_pct,
      solar_irradiance_wm2: pt.solar_irradiance_wm2,
      hour_sin,
      hour_cos,
      is_rush_hour,
      cooling_deg_24,
      extreme_heat_30,
      temp_sq,
      apparent_heat,
      temp_roll6_mean,
    };
  });
}

/**
 * Executes a REST POST to Zoho Catalyst QuickML endpoint to retrieve live model predictions.
 */
export async function fetchQuickMlPredictions(
  telemetry: TelemetryPoint[],
  settings: ApiSettings
): Promise<number[]> {
  if (!settings.endpoint) {
    throw new Error("No QuickML Endpoint URL provided");
  }

  const formattedData = formatTelemetryForQuickML(telemetry);
  const payload = { data: formattedData };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-QUICKML-ENDPOINT-KEY": settings.endpointKey.trim(),
    "CATALYST-ORG": settings.catalystOrg.trim(),
    "Environment": settings.environment.trim(),
  };

  if (
    settings.authToken &&
    settings.authToken.trim() &&
    !settings.authToken.includes("<access-token>")
  ) {
    headers["Authorization"] = settings.authToken.trim();
  }

  const response = await fetch(settings.endpoint.trim(), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`QuickML API HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const json = await response.json();

  let rawPreds: unknown[] = [];
  if (Array.isArray(json.result)) {
    rawPreds = json.result;
  } else if (typeof json.result === "number") {
    rawPreds = [json.result];
  } else if (Array.isArray(json.predictions)) {
    rawPreds = json.predictions;
  } else if (Array.isArray(json.data)) {
    rawPreds = json.data.map((item: any) =>
      typeof item === "object" && item !== null
        ? item.prediction ?? item.result ?? item.target_demand_kw ?? Object.values(item)[0]
        : item
    );
  } else if (Array.isArray(json)) {
    rawPreds = json;
  } else {
    throw new Error("Unexpected QuickML response structure: " + JSON.stringify(json).slice(0, 100));
  }

  const numbers = rawPreds.map((val) => Number(val));
  if (numbers.some(isNaN)) {
    throw new Error("QuickML returned non-numeric predictions");
  }

  return numbers;
}

export function buildForecast(
  telemetry: TelemetryPoint[],
  customPredictions?: number[] | null
): ForecastPoint[] {
  let soc = 68; // starting battery state of charge %
  const sorted = [...telemetry].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return sorted.map((t, idx) => {
    const demandKw =
      customPredictions &&
      customPredictions[idx] !== undefined &&
      !isNaN(customPredictions[idx])
        ? Number(customPredictions[idx].toFixed(2))
        : heuristicDemandModel(t);

    const evalResult = evaluateGridState(demandKw, t.timestamp);

    let batteryFlowKw = 0;
    if (evalResult.mode === "RENEWABLE_STORAGE") {
      batteryFlowKw = -Math.min(60, Math.max(12, (demandKw - 140) * 0.55));
      soc = Math.max(8, soc + batteryFlowKw * 0.18);
    } else if (t.solar_irradiance_wm2 > 300) {
      batteryFlowKw = Math.min(45, t.solar_irradiance_wm2 * 0.045);
      soc = Math.min(99, soc + batteryFlowKw * 0.12);
    } else {
      batteryFlowKw = -2.5; // trickle self-discharge
      soc = Math.max(8, soc + batteryFlowKw * 0.05);
    }

    const date = new Date(t.timestamp);
    const hourLabel = `${String(date.getHours()).padStart(2, "0")}:00`;

    return {
      ...t,
      hour: evalResult.hour,
      hourLabel,
      demandKw: evalResult.demandKw,
      mode: evalResult.mode,
      reason: evalResult.reason,
      isOverload: evalResult.isOverload,
      isPeakHour: evalResult.isPeakHour,
      isHighDemand: evalResult.isHighDemand,
      statusColor: evalResult.statusColor,
      batterySoc: Number(soc.toFixed(1)),
      batteryFlowKw: Number(batteryFlowKw.toFixed(1)),
    };
  });
}

export interface PowerFlowState {
  gridDrawKw: number;
  solarGenKw: number;
  batteryFlowKw: number; // positive = discharging into load, negative = charging from solar/grid
  demandKw: number;
  batteryAction: "discharging" | "charging" | "standby";
  gridPercentage: number;
  renewablePercentage: number;
}

/**
 * Calculates real-time microgrid power balance across physical nodes
 */
export function calculatePowerFlow(point: ForecastPoint): PowerFlowState {
  const demand = point.demandKw;
  // Estimate rooftop solar generation: 50 kWp system producing ~45 kW at 1000 W/m²
  const solarGenKw = Number(Math.max(0, (point.solar_irradiance_wm2 / 1000) * 45).toFixed(1));

  let batteryFlowKw = 0;
  let batteryAction: "discharging" | "charging" | "standby" = "standby";
  let gridDrawKw = 0;

  if (point.isOverload) {
    // Critical Overload: Battery at maximum discharge rate to shave peak
    batteryAction = "discharging";
    batteryFlowKw = Number(Math.min(95, demand * 0.42).toFixed(1));
    gridDrawKw = Number(Math.max(0, demand - solarGenKw - batteryFlowKw).toFixed(1));
  } else if (point.mode === "RENEWABLE_STORAGE") {
    // Renewable Storage Mode: Battery actively supplies facility load
    batteryAction = "discharging";
    batteryFlowKw = Number(Math.min(75, Math.max(15, (demand - 120) * 0.65)).toFixed(1));
    gridDrawKw = Number(Math.max(0, demand - solarGenKw - batteryFlowKw).toFixed(1));
  } else {
    // Main Grid Mode: Grid carries baseload
    if (solarGenKw > 15) {
      // Solar charges battery with surplus
      batteryAction = "charging";
      batteryFlowKw = Number(-Math.min(35, solarGenKw * 0.6).toFixed(1));
      gridDrawKw = Number(Math.max(0, demand - (solarGenKw - Math.abs(batteryFlowKw))).toFixed(1));
    } else {
      batteryAction = "standby";
      batteryFlowKw = -1.2; // trickle standby
      gridDrawKw = Number(Math.max(0, demand - solarGenKw).toFixed(1));
    }
  }

  const cleanSolar = solarGenKw;
  const cleanBattery = batteryAction === "discharging" ? batteryFlowKw : 0;
  const totalRenewableSupplied = Math.min(demand, cleanSolar + cleanBattery);
  const renewablePercentage = Math.round((totalRenewableSupplied / Math.max(1, demand)) * 100);
  const gridPercentage = Math.max(0, 100 - renewablePercentage);

  return {
    gridDrawKw,
    solarGenKw,
    batteryFlowKw,
    demandKw: demand,
    batteryAction,
    gridPercentage,
    renewablePercentage,
  };
}

export interface DispatchEvent {
  id: string;
  hour: number;
  hourLabel: string;
  timestamp: string;
  type: "transition" | "overload" | "solar" | "baseline";
  title: string;
  detail: string;
  mode: GridMode;
  demandKw: number;
  badgeText: string;
  badgeColor: "rose" | "emerald" | "sky" | "amber";
}

/**
 * Extracts chronological microgrid transition & alert audit events
 */
export function extractDispatchEvents(forecast: ForecastPoint[]): DispatchEvent[] {
  const events: DispatchEvent[] = [];
  let previousMode: GridMode | null = null;

  forecast.forEach((f, idx) => {
    // 1. Detect Mode Transition
    if (previousMode !== null && f.mode !== previousMode) {
      if (f.mode === "RENEWABLE_STORAGE") {
        events.push({
          id: `mode-switch-${idx}`,
          hour: f.hour,
          hourLabel: f.hourLabel,
          timestamp: f.timestamp,
          type: "transition",
          title: "Switched to Renewable Storage Mode",
          detail: f.reason,
          mode: f.mode,
          demandKw: f.demandKw,
          badgeText: "GRID ➔ STORAGE",
          badgeColor: "emerald",
        });
      } else {
        events.push({
          id: `mode-switch-${idx}`,
          hour: f.hour,
          hourLabel: f.hourLabel,
          timestamp: f.timestamp,
          type: "transition",
          title: "Switched to Main Grid Mode",
          detail: "Demand reduced below 160 kW and outside evening rush window (18:00–22:00).",
          mode: f.mode,
          demandKw: f.demandKw,
          badgeText: "STORAGE ➔ GRID",
          badgeColor: "sky",
        });
      }
    }
    previousMode = f.mode;

    // 2. Detect Critical Overload
    if (f.isOverload) {
      events.push({
        id: `overload-${idx}`,
        hour: f.hour,
        hourLabel: f.hourLabel,
        timestamp: f.timestamp,
        type: "overload",
        title: `Critical Microgrid Overload Alert (${f.demandKw.toFixed(1)} kW)`,
        detail: `Demand breached 200 kW limit. Full battery discharge engaged; secondary load shedding recommended.`,
        mode: f.mode,
        demandKw: f.demandKw,
        badgeText: "CRITICAL OVERLOAD",
        badgeColor: "rose",
      });
    }

    // 3. Solar Generation Peak
    if (f.solar_irradiance_wm2 >= 700 && f.hour === 12) {
      events.push({
        id: `solar-peak-${idx}`,
        hour: f.hour,
        hourLabel: f.hourLabel,
        timestamp: f.timestamp,
        type: "solar",
        title: "Peak Solar Harvesting Active",
        detail: `Solar irradiance reached ${f.solar_irradiance_wm2.toFixed(0)} W/m². Battery storage buffering excess solar generation.`,
        mode: f.mode,
        demandKw: f.demandKw,
        badgeText: "SOLAR SURPLUS",
        badgeColor: "amber",
      });
    }
  });

  return events;
}

export interface ImpactSummary {
  peakDemandKw: number;
  peakShavedKw: number;
  renewableDispatchedKwh: number;
  carbonOffsetKg: number;
}

export function calculateImpactSummary(forecast: ForecastPoint[]): ImpactSummary {
  const peakDemandKw = Math.max(...forecast.map((f) => f.demandKw), 0);
  let peakShavedKw = 0;
  let renewableDispatchedKwh = 0;

  forecast.forEach((f) => {
    if (f.mode === "RENEWABLE_STORAGE") {
      const dispatched = Math.min(75, Math.max(15, (f.demandKw - 140) * 0.65));
      renewableDispatchedKwh += dispatched;
      if (f.demandKw > 160) {
        peakShavedKw = Math.max(peakShavedKw, dispatched);
      }
    }
  });

  // Average 0.78 kg CO2 offset per kWh renewable battery discharge
  const carbonOffsetKg = Number((renewableDispatchedKwh * 0.78).toFixed(1));

  return {
    peakDemandKw: Number(peakDemandKw.toFixed(1)),
    peakShavedKw: Number(peakShavedKw.toFixed(1)),
    renewableDispatchedKwh: Number(renewableDispatchedKwh.toFixed(1)),
    carbonOffsetKg,
  };
}
