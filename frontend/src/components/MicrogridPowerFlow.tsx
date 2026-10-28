import { useMemo } from "react";
import { Battery, Sun, TowerControl, Zap, ArrowDown, ArrowUp, Activity } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";
import { calculatePowerFlow } from "../utils/microgridLogic";

export default function MicrogridPowerFlow({ current }: { current: ForecastPoint }) {
  const flow = useMemo(() => calculatePowerFlow(current), [current]);
  const isOverload = current.isOverload;
  const isRenewable = current.mode === "RENEWABLE_STORAGE";

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      {/* Header matching Mockup */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-sky-500" />
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Microgrid power flow
          </h3>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span className="font-mono text-sm font-black">{flow.renewablePercentage}%</span> Clean Energy
        </span>
      </div>

      {/* 3 Primary Power Flow Rows matching Mockup */}
      <div className="space-y-2.5">
        {/* Row 1: Main grid */}
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <TowerControl className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">Main grid</p>
              <p className="text-[10px] text-slate-500">Base utility supply</p>
            </div>
          </div>
          <div className="text-right">
            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-300">
              {flow.gridDrawKw > 10 ? "Import" : "Curtailed"}
            </span>
            <p className="mt-0.5 font-mono text-sm sm:text-base font-black tabular-nums text-slate-900 dark:text-slate-100">
              {flow.gridDrawKw.toFixed(1)} <span className="text-xs font-bold text-slate-500">kW</span>
            </p>
          </div>
        </div>

        {/* Row 2: Battery */}
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-md ${
                flow.batteryAction === "discharging"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : flow.batteryAction === "charging"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-slate-500/10 text-slate-500"
              }`}
            >
              <Battery className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">Battery (BESS)</p>
              <p className="text-[11px] text-slate-500">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{current.batterySoc.toFixed(0)}%</span> State of Charge
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                flow.batteryAction === "discharging"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : flow.batteryAction === "charging"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {flow.batteryAction === "discharging"
                ? "Discharging"
                : flow.batteryAction === "charging"
                ? "Charging"
                : "Standby"}
            </span>
            <p className="mt-0.5 font-mono text-sm sm:text-base font-black tabular-nums text-slate-900 dark:text-slate-100">
              {Math.abs(flow.batteryFlowKw).toFixed(1)} <span className="text-xs font-bold text-slate-500">kW</span>
            </p>
          </div>
        </div>

        {/* Row 3: Solar PV */}
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sun className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">Solar PV</p>
              <p className="text-[11px] text-slate-500">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{current.solar_irradiance_wm2.toFixed(0)}</span> W/m² irradiance
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                flow.solarGenKw > 5
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {flow.solarGenKw > 5 ? "Generation" : "Idle (Night)"}
            </span>
            <p className="mt-0.5 font-mono text-sm sm:text-base font-black tabular-nums text-slate-900 dark:text-slate-100">
              {flow.solarGenKw.toFixed(1)} <span className="text-xs font-bold text-slate-500">kW</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
