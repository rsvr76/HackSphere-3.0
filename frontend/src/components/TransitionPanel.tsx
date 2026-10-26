import { BatteryFull, Leaf, PlugZap, Radar, ShieldAlert, Sparkles } from "lucide-react";
import type { ForecastPoint, ImpactSummary } from "../utils/microgridLogic";
import StatusPill from "./StatusPill";

export default function TransitionPanel({
  current,
  impact,
}: {
  current: ForecastPoint;
  impact?: ImpactSummary;
}) {
  const isRenewable = current.mode === "RENEWABLE_STORAGE";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Smart Transition Controller</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Hour {current.hourLabel}
        </span>
      </div>

      {/* Hero mode badge */}
      <div
        className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
          isRenewable
            ? "border-emerald-300 bg-emerald-50/70 shadow-xs dark:border-emerald-500/30 dark:bg-emerald-500/5"
            : "border-sky-300 bg-sky-50/70 shadow-xs dark:border-sky-500/30 dark:bg-sky-500/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              isRenewable
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400"
            }`}
          >
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${
                isRenewable ? "bg-emerald-400" : "bg-sky-400"
              }`}
            />
            {isRenewable ? (
              <Leaf className="relative h-5 w-5" />
            ) : (
              <PlugZap className="relative h-5 w-5" />
            )}
          </div>
          <div>
            <p className={`text-sm font-bold ${isRenewable ? "text-emerald-950 dark:text-emerald-300" : "text-sky-950 dark:text-sky-300"}`}>
              {isRenewable ? "Renewable Storage Mode" : "Main Grid Mode"}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isRenewable
                ? "Source: Renewable Battery Storage (Peak load shaving active)"
                : "Source: Main Utility Grid (Base load operating within safe limits)"}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-xs dark:border-transparent dark:bg-black/20 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-slate-200">Triggered by:</span> {current.reason}
        </p>
      </div>

      {/* Decision matrix */}
      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Live Decision Matrix (Hour {current.hourLabel})
        </p>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none">
          <span className="font-medium text-slate-700 dark:text-slate-400">Demand &gt; 160 kW</span>
          <StatusPill color={current.isHighDemand ? "rose" : "sky"}>
            {current.isHighDemand ? "TRUE" : "FALSE"}
          </StatusPill>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none">
          <span className="font-medium text-slate-700 dark:text-slate-400">Hour in 18:00–22:00</span>
          <StatusPill color={current.isPeakHour ? "rose" : "sky"}>
            {current.isPeakHour ? "TRUE" : "FALSE"}
          </StatusPill>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none">
          <span className="font-medium text-slate-700 dark:text-slate-400">Demand ≥ 200 kW (Overload)</span>
          <StatusPill color={current.isOverload ? "rose" : "sky"}>
            {current.isOverload ? "TRUE" : "FALSE"}
          </StatusPill>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-emerald-300/80 bg-emerald-50/80 px-3 py-2 text-xs shadow-xs dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:shadow-none">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-950 dark:text-slate-300">
            <BatteryFull className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Dispatch Signal
          </span>
          <StatusPill color={current.statusColor} pulse>
            {isRenewable ? "RENEWABLE" : "MAIN GRID"}
          </StatusPill>
        </div>
      </div>

      {/* 24h Microgrid Impact Strip */}
      {impact && (
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            24h Microgrid Peak-Shaving Impact
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-[10px] text-slate-500">Peak Shaved</p>
              <p className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {impact.peakShavedKw} <span className="text-[10px] font-normal text-slate-400">kW</span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-[10px] text-slate-500">Storage Clean</p>
              <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {impact.renewableDispatchedKwh} <span className="text-[10px] font-normal text-slate-400">kWh</span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-[10px] text-slate-500">CO₂ Avoided</p>
              <p className="font-bold tabular-nums text-sky-600 dark:text-sky-400">
                {impact.carbonOffsetKg} <span className="text-[10px] font-normal text-slate-400">kg</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
