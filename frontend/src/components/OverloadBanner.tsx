import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";
import { CRITICAL_THRESHOLD_KW } from "../utils/microgridLogic";

export default function OverloadBanner({ forecast }: { forecast: ForecastPoint[] }) {
  const [expanded, setExpanded] = useState(false);

  const overloadHours = forecast.filter((f) => f.isOverload);

  if (overloadHours.length === 0) return null;

  const peak = overloadHours.reduce((max, p) => (p.demandKw > max.demandKw ? p : max), overloadHours[0]);

  return (
    <div
      role="alert"
      className="relative overflow-hidden rounded-xl border border-rose-300 bg-gradient-to-r from-rose-100/90 via-rose-50 to-rose-100/90 shadow-sm transition-all dark:border-rose-500/40 dark:bg-gradient-to-r dark:from-rose-950/70 dark:via-rose-900/40 dark:to-rose-950/70 dark:shadow-[0_0_24px_-4px_rgba(244,63,94,0.25)]"
    >
      <div className="absolute inset-0 animate-pulse bg-rose-500/10 dark:bg-rose-500/5 pointer-events-none" />
      <div className="relative flex flex-col gap-3 p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-200 dark:bg-rose-500/20">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/40 dark:bg-rose-500/40" />
              <AlertTriangle className="relative h-5 w-5 text-rose-700 dark:text-rose-400" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-950 dark:text-rose-300">
                  CRITICAL OVERLOAD ALERT
                </span>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              </div>
              <p className="mt-0.5 text-sm text-rose-900 dark:text-rose-100/90">
                Predicted demand peaks at{" "}
                <span className="font-bold text-rose-950 dark:text-rose-300">{peak.demandKw.toFixed(1)} kW</span> at hour{" "}
                <span className="font-bold text-rose-950 dark:text-rose-300">{peak.hourLabel}</span>. Microgrid capacity
                threshold ({CRITICAL_THRESHOLD_KW} kW) breached!
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <button
              onClick={() => setExpanded((e) => !e)}
              aria-label="Expand incident log"
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-200/80 bg-white/80 px-2.5 text-xs font-semibold text-rose-900 transition-colors hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-950/60 dark:text-rose-200 dark:hover:bg-rose-900/60"
            >
              <span>{expanded ? "Hide Details" : "Inspect Hours"}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Informative telemetry status badges with indicator dots */}
        <div className="flex flex-wrap items-center gap-2 border-t border-rose-200/60 pt-3 text-xs dark:border-rose-500/20">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-rose-950 dark:border-rose-500/25 dark:bg-rose-950/60 dark:text-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Action: Full Battery Discharge Enabled
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-rose-950 dark:border-rose-500/25 dark:bg-rose-950/60 dark:text-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Secondary Load Shedding Recommended
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-rose-950 dark:border-rose-500/25 dark:bg-rose-950/60 dark:text-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            {overloadHours.length} overloaded hour{overloadHours.length > 1 ? "s" : ""} detected
          </span>
        </div>

        {expanded && (
          <div className="border-t border-rose-200/60 pt-3 dark:border-rose-500/20">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-rose-900 dark:text-rose-400">
              Incident Log — Overloaded Hours
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {overloadHours.map((h) => (
                <div
                  key={h.timestamp}
                  className="rounded-lg border border-rose-200/80 bg-white/90 px-3 py-2 text-xs shadow-xs dark:border-rose-500/25 dark:bg-rose-950/60"
                >
                  <p className="font-mono font-bold text-rose-950 dark:text-rose-300">{h.hourLabel}</p>
                  <p className="font-semibold text-rose-700 dark:text-rose-200">{h.demandKw.toFixed(1)} kW</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
