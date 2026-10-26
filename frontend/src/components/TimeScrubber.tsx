import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Zap } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";

interface TimeScrubberProps {
  forecast: ForecastPoint[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
}

export default function TimeScrubber({
  forecast,
  activeIndex,
  onSelectIndex,
  isPlaying,
  onTogglePlay,
  onReset,
}: TimeScrubberProps) {
  const current = forecast[activeIndex] ?? forecast[0];

  const handlePrev = () => {
    onSelectIndex((activeIndex - 1 + forecast.length) % forecast.length);
  };

  const handleNext = () => {
    onSelectIndex((activeIndex + 1) % forecast.length);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Play/Pause and Step Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause 24h simulation" : "Play 24h simulation"}
            title={isPlaying ? "Pause simulation" : "Simulate 24h microgrid dispatch"}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-all ${
              isPlaying
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause Simulation
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Auto-Simulate 24h
              </>
            )}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              aria-label="Previous hour"
              title="Step back 1 hour"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next hour"
              title="Step forward 1 hour"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={onReset}
              aria-label="Reset to hour 00:00"
              title="Reset to 00:00"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Center / Right: Currently Inspected Hour Tag & Live Metric Readout */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Inspecting Hour:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {current.hourLabel}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              current.isOverload
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                : current.mode === "RENEWABLE_STORAGE"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
            }`}
          >
            <Zap className="h-3 w-3" />
            {current.demandKw.toFixed(1)} kW · {current.mode === "RENEWABLE_STORAGE" ? "Renewable" : "Main Grid"}
          </span>
        </div>
      </div>

      {/* 24-Hour Timeline Bar with Visual State Indicators */}
      <div className="mt-3">
        <div className="relative flex h-3 w-full gap-0.5 overflow-hidden rounded-md bg-slate-100 p-0.5 dark:bg-slate-950">
          {forecast.map((f, i) => {
            const isSelected = i === activeIndex;
            const barColor = f.isOverload
              ? "bg-rose-500"
              : f.mode === "RENEWABLE_STORAGE"
              ? "bg-emerald-500"
              : "bg-sky-400/80";

            return (
              <button
                key={f.timestamp}
                onClick={() => onSelectIndex(i)}
                aria-label={`Jump to ${f.hourLabel} (${f.demandKw.toFixed(1)} kW)`}
                title={`${f.hourLabel}: ${f.demandKw.toFixed(1)} kW (${f.mode})`}
                className={`relative flex-1 rounded-xs transition-all ${barColor} ${
                  isSelected
                    ? "ring-2 ring-amber-400 ring-offset-1 z-10 scale-y-125 dark:ring-offset-slate-900"
                    : "opacity-80 hover:opacity-100 hover:scale-y-110"
                }`}
              />
            );
          })}
        </div>

        {/* Timeline Axis Labels (Every 3 hours) */}
        <div className="mt-1.5 flex justify-between px-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-500">
          <span>00:00</span>
          <span>03:00</span>
          <span>06:00</span>
          <span>09:00</span>
          <span>12:00</span>
          <span>15:00</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">18:00 (Rush)</span>
          <span>21:00</span>
          <span>23:00</span>
        </div>
      </div>
    </div>
  );
}
