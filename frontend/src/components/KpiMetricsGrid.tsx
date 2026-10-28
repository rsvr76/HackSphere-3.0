import { ArrowDownRight, ArrowUpRight, BatteryCharging, Gauge, Minus, PlugZap, ShieldAlert, TrendingUp, Zap } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";
import StatusPill from "./StatusPill";

export default function KpiMetricsGrid({
  forecast,
  activeHour,
}: {
  forecast: ForecastPoint[];
  activeHour?: ForecastPoint;
}) {
  if (forecast.length === 0) return null;

  const current = activeHour ?? forecast[0];
  const peak = forecast.reduce((max, p) => (p.demandKw > max.demandKw ? p : max), forecast[0]);
  const overloadCount = forecast.filter((f) => f.isOverload).length;
  const isOverloadPeak = peak.demandKw >= 200;

  return (
    <div
      aria-label="Summary KPI Row"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4"
    >
      {/* KPI 1: 24H Peak Demand */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            24H Peak Demand
          </span>
          <TrendingUp
            className={`h-4 w-4 ${
              isOverloadPeak
                ? "text-amber-500 dark:text-amber-400"
                : "text-slate-400 dark:text-slate-500"
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black tracking-tight tabular-nums sm:text-3xl text-slate-900 dark:text-slate-100">
            {peak.demandKw.toFixed(1)}
          </span>
          <span className="text-xs font-semibold text-slate-500">kW</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">@ {peak.hourLabel}</span>
          {isOverloadPeak ? (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              Peak Surge
            </span>
          ) : (
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Within Limits
            </span>
          )}
        </div>
      </div>

      {/* KPI 2: Active Dispatch Mode */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Dispatch
          </span>
          <PlugZap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="mt-2">
          <StatusPill color={current.statusColor} pulse>
            {current.mode === "RENEWABLE_STORAGE" ? "Renewable Storage" : "Main Grid"}
          </StatusPill>
        </div>
        <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
          Hour <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{current.hourLabel}</span> · <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100">{current.demandKw.toFixed(1)} kW</span> load
        </p>
      </div>

      {/* KPI 3: Critical Hours Count */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Critical Hours
          </span>
          <ShieldAlert
            className={`h-4 w-4 ${
              overloadCount > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black tracking-tight tabular-nums sm:text-3xl text-slate-900 dark:text-slate-100">
            {overloadCount}
          </span>
          <span className="text-xs font-semibold text-slate-500">hours ≥ 200 kW</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {overloadCount > 0
            ? "Automated load shedding active"
            : "Zero overloads across 24h"}
        </p>
      </div>

      {/* KPI 4: Battery Storage SoC & Flow */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Battery Storage (BESS)
          </span>
          <BatteryCharging className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tight tabular-nums text-slate-900 sm:text-3xl dark:text-slate-100">
              {current.batterySoc.toFixed(0)}%
            </span>
            <span className="text-xs font-semibold text-slate-500">SoC</span>
          </div>
          <span
            className={`text-xs font-bold tabular-nums ${
              current.batteryFlowKw < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : current.batteryFlowKw > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-400"
            }`}
          >
            {current.batteryFlowKw < 0
              ? `${Math.abs(current.batteryFlowKw).toFixed(1)} kW Discharging`
              : current.batteryFlowKw > 0
              ? `+${current.batteryFlowKw.toFixed(1)} kW Charging`
              : "Idle"}
          </span>
        </div>
        {/* Visual Mini Progress Bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              current.batterySoc > 50
                ? "bg-emerald-500"
                : current.batterySoc > 20
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, current.batterySoc))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
