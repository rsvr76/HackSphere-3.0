import { Play, Pause, RotateCcw, Clock } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";

interface DispatchTimelineProps {
  forecast: ForecastPoint[];
  activeHourIndex: number;
  onSelectHour: (index: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
}

export default function DispatchTimeline({
  forecast,
  activeHourIndex,
  onSelectHour,
  isPlaying = false,
  onTogglePlay,
  onReset,
}: DispatchTimelineProps) {
  if (forecast.length === 0) return null;

  const activePoint = forecast[activeHourIndex] ?? forecast[0];

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            24-hour dispatch timeline
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Select an hour or inspect state:
          </span>
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
            {activePoint.hourLabel} ({activePoint.demandKw.toFixed(1)} kW)
          </span>

          {onTogglePlay && (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 dark:border-slate-800">
              <button
                onClick={onTogglePlay}
                aria-label={isPlaying ? "Pause simulation playback" : "Play simulation playback"}
                className={`flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-all ${
                  isPlaying
                    ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                    : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                }`}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>

              {onReset && (
                <button
                  onClick={onReset}
                  aria-label="Reset simulation playback to 00:00"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 24 Segmented Hourly Bars */}
      <div
        className="gap-1 py-1.5 sm:gap-1.5"
        style={{ display: "grid", gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
      >
        {forecast.map((point, index) => {
          const isSelected = index === activeHourIndex;
          const isOverload = point.isOverload;
          const isRenewable = point.mode === "RENEWABLE_STORAGE";

          // Exact color token standard:
          // Red for critical overloads, Emerald for renewable dispatch, Blue for main grid
          const barColor = isOverload
            ? "bg-rose-500 hover:bg-rose-400"
            : isRenewable
            ? "bg-emerald-500 hover:bg-emerald-400"
            : "bg-sky-500 hover:bg-sky-400";

          return (
            <button
              key={point.timestamp}
              onClick={() => onSelectHour(index)}
              title={`${point.hourLabel}: ${point.demandKw.toFixed(1)} kW (${
                isOverload
                  ? "CRITICAL OVERLOAD ≥ 200 kW"
                  : isRenewable
                  ? "RENEWABLE STORAGE"
                  : "MAIN GRID"
              })`}
              className={`group relative flex h-7 sm:h-8 flex-col items-center justify-end rounded-md transition-all ${barColor} ${
                isSelected
                  ? "ring-2 ring-slate-900 ring-offset-2 scale-110 z-10 dark:ring-white dark:ring-offset-slate-900 shadow-md"
                  : "opacity-85 hover:opacity-100 hover:scale-105"
              }`}
            >
              {isSelected && (
                <span className="absolute -top-1.5 h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-white animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* Time Legend Bar */}
      <div className="mt-1 flex items-center justify-between px-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>

      {/* Color Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-sky-500" /> Main Grid (&le; 160 kW)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" /> Renewable Storage (&gt; 160 kW or 18:00–22:00)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" /> Critical Overload (&ge; 200 kW)
          </span>
        </div>
        <span className="italic text-[10px] text-slate-400">Click any hour bar to inspect</span>
      </div>
    </div>
  );
}
