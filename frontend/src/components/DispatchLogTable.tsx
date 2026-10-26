import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Filter, Leaf, PlugZap, Sun } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";
import { extractDispatchEvents } from "../utils/microgridLogic";

export default function DispatchLogTable({ forecast }: { forecast: ForecastPoint[] }) {
  const [filterType, setFilterType] = useState<"all" | "transition" | "overload" | "solar">("all");

  const events = useMemo(() => extractDispatchEvents(forecast), [forecast]);

  const filteredEvents = useMemo(() => {
    if (filterType === "all") return events;
    return events.filter((e) => e.type === filterType);
  }, [events, filterType]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "overload":
        return <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case "solar":
        return <Sun className="h-4 w-4 text-amber-500" />;
      case "transition":
        return <PlugZap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Clock className="h-4 w-4 text-sky-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filter Events:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterType("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              filterType === "all"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            onClick={() => setFilterType("transition")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              filterType === "transition"
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            Transitions
          </button>
          <button
            onClick={() => setFilterType("overload")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              filterType === "overload"
                ? "bg-rose-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            Overloads
          </button>
          <button
            onClick={() => setFilterType("solar")}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              filterType === "solar"
                ? "bg-amber-500 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            Solar
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
        {filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
            No system events matching the selected filter.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className={`flex items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${
                evt.type === "overload"
                  ? "border-rose-300 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-950/40"
                  : evt.type === "transition"
                  ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-950/30"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60"
              }`}
            >
              <div className="mt-0.5 shrink-0">{getEventIcon(evt.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{evt.hourLabel}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{evt.title}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      evt.badgeColor === "rose"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300"
                        : evt.badgeColor === "emerald"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : evt.badgeColor === "amber"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                        : "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300"
                    }`}
                  >
                    {evt.badgeText}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{evt.detail}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>Load: <strong className="font-mono text-slate-700 dark:text-slate-300">{evt.demandKw.toFixed(1)} kW</strong></span>
                  <span>·</span>
                  <span>Mode: {evt.mode === "RENEWABLE_STORAGE" ? "Renewable Storage" : "Main Utility Grid"}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
