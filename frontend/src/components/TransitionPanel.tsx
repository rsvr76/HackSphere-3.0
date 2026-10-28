import { useState } from "react";
import { BatteryFull, ChevronDown, ChevronUp, Leaf, PlugZap, Radar, ShieldAlert, Sparkles } from "lucide-react";
import type { ForecastPoint, ImpactSummary } from "../utils/microgridLogic";
import StatusPill from "./StatusPill";

export default function TransitionPanel({
  current,
  impact,
}: {
  current: ForecastPoint;
  impact?: ImpactSummary;
}) {
  const [showRuleAudit, setShowRuleAudit] = useState(false);
  const isRenewable = current.mode === "RENEWABLE_STORAGE";
  const isOverload = current.isOverload;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      {/* Header matching Mockup */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Transition controller
          </h3>
        </div>
        <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
          Hour {current.hourLabel}
        </span>
      </div>

      {/* Primary Status Card matching Mockup */}
      <div className="space-y-3">
        {/* Mode & Reason */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-black tracking-tight sm:text-xl ${
                isRenewable
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-sky-600 dark:text-sky-400"
              }`}
            >
              {isRenewable ? "Renewable Storage" : "Main Grid Mode"}
            </span>
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  isRenewable ? "bg-emerald-400" : "bg-sky-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isRenewable ? "bg-emerald-500" : "bg-sky-500"
                }`}
              />
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-700 dark:text-slate-400">Reason:</span>{" "}
            {current.reason.replace("Demand Trigger: ", "").replace("Time Trigger: ", "").replace("Dual Trigger: ", "")}
          </p>
        </div>

        {/* Overload line matching Mockup */}
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs dark:border-slate-800/80 dark:bg-slate-950/40">
          <span className="font-medium text-slate-600 dark:text-slate-400">Overload state</span>
          {isOverload ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse">
              <ShieldAlert className="h-3.5 w-3.5" /> Active at peak ({current.demandKw.toFixed(1)} kW)
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Normal operating limits
            </span>
          )}
        </div>

        {/* Collapsible Rule Decision Audit for Judges */}
        <div className="border-t border-slate-100 pt-2 dark:border-slate-800/80">
          <button
            onClick={() => setShowRuleAudit((prev) => !prev)}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <span>Inspect Rule Evaluation Matrix</span>
            {showRuleAudit ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showRuleAudit && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-slate-200/80 bg-slate-50/90 p-2.5 text-[11px] dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Rule 1a: Demand &gt; 160 kW</span>
                <span
                  className={`font-mono font-bold ${
                    current.isHighDemand ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                  }`}
                >
                  {current.isHighDemand ? "TRUE (Triggered)" : "FALSE"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Rule 1b: Hour in 18:00–22:00</span>
                <span
                  className={`font-mono font-bold ${
                    current.isPeakHour ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {current.isPeakHour ? "TRUE (Triggered)" : "FALSE"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Rule 2: Base Grid (Demand &le; 160 &amp; off-peak)</span>
                <span
                  className={`font-mono font-bold ${
                    !current.isHighDemand && !current.isPeakHour
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-slate-400"
                  }`}
                >
                  {!current.isHighDemand && !current.isPeakHour ? "TRUE (Main Grid)" : "FALSE"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/60 pt-1 text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <span>Rule 3: Critical Overload &ge; 200 kW</span>
                <span
                  className={`font-mono font-bold ${
                    current.isOverload ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                  }`}
                >
                  {current.isOverload ? "ALERT ACTIVE" : "SAFE"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
