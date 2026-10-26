import { useMemo } from "react";
import { Battery, Building2, Cpu, Sun, TowerControl, Zap } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";
import { calculatePowerFlow } from "../utils/microgridLogic";

export default function PowerFlowDiagram({ current }: { current: ForecastPoint }) {
  const flow = useMemo(() => calculatePowerFlow(current), [current]);

  const isRenewable = current.mode === "RENEWABLE_STORAGE";
  const isOverload = current.isOverload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Microgrid Power Flow Topology
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-slate-500 dark:text-slate-400">Hour {current.hourLabel}:</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              isOverload
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                : isRenewable
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
            }`}
          >
            {flow.renewablePercentage}% Clean Energy
          </span>
        </div>
      </div>

      {/* Synoptic Grid of 4 Physical Power Nodes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Node 1: Main Utility Grid */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-3 transition-all ${
            flow.gridDrawKw > 10
              ? "border-sky-300 bg-sky-50/70 dark:border-sky-500/30 dark:bg-sky-950/40"
              : "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-950/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Utility Grid</span>
            <TowerControl className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {flow.gridDrawKw.toFixed(1)}{" "}
              <span className="text-xs font-medium text-slate-500">kW</span>
            </p>
            <p className="text-[10px] text-slate-500">
              {flow.gridDrawKw > 10 ? "Supplying Baseload" : "Standby / Curtailed"}
            </p>
          </div>
        </div>

        {/* Node 2: Solar PV Generation */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-3 transition-all ${
            flow.solarGenKw > 5
              ? "border-amber-300 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-950/40"
              : "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-950/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Rooftop Solar</span>
            <Sun className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {flow.solarGenKw.toFixed(1)}{" "}
              <span className="text-xs font-medium text-slate-500">kW</span>
            </p>
            <p className="text-[10px] text-slate-500">
              {flow.solarGenKw > 5 ? `${current.solar_irradiance_wm2.toFixed(0)} W/m² active` : "Night / Zero Irradiance"}
            </p>
          </div>
        </div>

        {/* Node 3: Battery Storage (BESS) */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-3 transition-all ${
            flow.batteryAction === "discharging"
              ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-950/40"
              : flow.batteryAction === "charging"
              ? "border-amber-300 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-950/40"
              : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Battery BESS</span>
            <Battery
              className={`h-4 w-4 ${
                flow.batteryAction === "discharging"
                  ? "text-emerald-600 dark:text-emerald-400 animate-pulse"
                  : flow.batteryAction === "charging"
                  ? "text-amber-500 animate-pulse"
                  : "text-slate-400"
              }`}
            />
          </div>
          <div className="mt-2">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {flow.batteryAction === "charging"
                ? `+${Math.abs(flow.batteryFlowKw).toFixed(1)}`
                : `${flow.batteryFlowKw.toFixed(1)}`}{" "}
              <span className="text-xs font-medium text-slate-500">kW</span>
            </p>
            <p className="text-[10px] text-slate-500">
              SoC: {current.batterySoc.toFixed(1)}% · {flow.batteryAction.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Node 4: Facility Demand Load */}
        <div
          className={`relative flex flex-col justify-between rounded-lg border p-3 transition-all ${
            isOverload
              ? "border-rose-400 bg-rose-50/90 shadow-xs dark:border-rose-500/40 dark:bg-rose-950/50"
              : "border-slate-300 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-800/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Facility Load</span>
            <Building2 className={`h-4 w-4 ${isOverload ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"}`} />
          </div>
          <div className="mt-2">
            <p className={`text-lg font-bold tabular-nums ${isOverload ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
              {flow.demandKw.toFixed(1)}{" "}
              <span className="text-xs font-medium text-slate-500">kW</span>
            </p>
            <p className={`text-[10px] ${isOverload ? "font-bold text-rose-600 dark:text-rose-400" : "text-slate-500"}`}>
              {isOverload ? "CAPACITY EXCEEDED" : "Normal Operation"}
            </p>
          </div>
        </div>
      </div>

      {/* Live Power Distribution Progress Bar */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-950/40">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Real-Time Power Source Dispatch
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            Grid: {flow.gridPercentage}% · Clean: {flow.renewablePercentage}%
          </span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="bg-sky-500 transition-all duration-300"
            style={{ width: `${flow.gridPercentage}%` }}
            title={`Utility Grid Draw: ${flow.gridPercentage}%`}
          />
          <div
            className="bg-amber-400 transition-all duration-300"
            style={{ width: `${Math.round((flow.solarGenKw / Math.max(1, flow.demandKw)) * 100)}%` }}
            title={`Direct Solar Generation: ${flow.solarGenKw} kW`}
          />
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.round((Math.max(0, flow.batteryFlowKw) / Math.max(1, flow.demandKw)) * 100)}%` }}
            title={`Battery Storage Discharge: ${flow.batteryFlowKw} kW`}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> Grid ({flow.gridDrawKw.toFixed(1)} kW)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Solar ({flow.solarGenKw.toFixed(1)} kW)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Battery ({flow.batteryFlowKw.toFixed(1)} kW)
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            = Total Load ({flow.demandKw.toFixed(1)} kW)
          </span>
        </div>
      </div>
    </div>
  );
}
