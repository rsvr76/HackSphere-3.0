import { useMemo, useState } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Droplets,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Thermometer,
  Zap,
} from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";
import {
  CRITICAL_THRESHOLD_KW,
  SWITCHING_THRESHOLD_KW,
} from "../utils/microgridLogic";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d: ForecastPoint = payload[0].payload;

  const modeLabel =
    d.mode === "RENEWABLE_STORAGE" ? "Renewable Storage Mode" : "Main Grid Mode";
  const modeColor = d.isOverload
    ? "text-rose-600 dark:text-rose-400"
    : d.mode === "RENEWABLE_STORAGE"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-sky-600 dark:text-sky-400";

  return (
    <div className="min-w-[250px] rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur transition-colors dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
          {d.hourLabel}
        </span>
        <span className={`text-xs font-bold ${modeColor}`}>{modeLabel}</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold">
            <Zap className="h-3.5 w-3.5" /> Demand (kW)
          </span>
          <span
            className={`font-bold tabular-nums ${
              d.isOverload
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {d.demandKw.toFixed(1)} kW
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-semibold">
            <Thermometer className="h-3.5 w-3.5" /> Temperature
          </span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {d.ambient_temp_c.toFixed(1)}°C
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-semibold">
            <Sun className="h-3.5 w-3.5" /> Solar Irradiance
          </span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {d.solar_irradiance_wm2.toFixed(0)} W/m²
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
            <Droplets className="h-3.5 w-3.5" /> Humidity
          </span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {d.humidity_pct.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="mt-2.5 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-600 dark:border-slate-800 dark:text-slate-400">
        {d.reason}
      </div>
    </div>
  );
}

interface ForecastChartProps {
  forecast: ForecastPoint[];
  theme?: "dark" | "light";
  activeHourIndex?: number;
  onSelectHour?: (index: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
}

export default function ForecastChart({
  forecast,
  theme = "dark",
  activeHourIndex = 0,
  onSelectHour,
  isPlaying = false,
  onTogglePlay,
  onReset,
}: ForecastChartProps) {
  // Multi-parameter visibility states (Demand, Temperature, and Solar active by default!)
  const [params, setParams] = useState({
    demand: true,
    temp: true,
    solar: true,
    humidity: false,
  });

  const isDark = theme === "dark";

  // Calculations for thresholds and peak
  const maxDemand = useMemo(() => {
    if (!forecast || forecast.length === 0) return 320;
    return Math.max(...forecast.map((f) => f.demandKw), CRITICAL_THRESHOLD_KW + 20);
  }, [forecast]);

  const ceilingKw = useMemo(() => {
    return Math.max(320, Math.ceil(maxDemand / 20) * 20);
  }, [maxDemand]);

  const peakPoint = useMemo(() => {
    if (!forecast || forecast.length === 0) return null;
    return forecast.reduce(
      (max, p) => (p.demandKw > max.demandKw ? p : max),
      forecast[0]
    );
  }, [forecast]);

  const peakIndex = useMemo(() => {
    if (!forecast || !peakPoint) return -1;
    return forecast.findIndex((p) => p.timestamp === peakPoint.timestamp);
  }, [forecast, peakPoint]);

  const activePoint = forecast[activeHourIndex] ?? forecast[0];

  const gridStroke = isDark ? "#1e293b" : "#e2e8f0";
  const tickStroke = isDark ? "#94a3b8" : "#475569";
  const axisLineStroke = isDark ? "#1e293b" : "#cbd5e1";
  const cursorStroke = isDark ? "#475569" : "#94a3b8";

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-6 dark:border-slate-800 dark:bg-[#070b13] dark:shadow-none">
      {/* Top Header matching reference mockup */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        {/* Left: Max Ceiling & Threshold Legend */}
        <div className="space-y-1.5">
          <div className="font-mono text-sm font-black tracking-tight text-slate-800 dark:text-slate-200">
            {ceilingKw} kW Max Capacity
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/80 bg-rose-50/90 px-2.5 py-1 font-mono text-xs font-bold text-rose-700 shadow-2xs dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
              <span>Threshold: 200 kW Critical Overload</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/80 bg-amber-50/90 px-2.5 py-1 font-mono text-xs font-bold text-amber-700 shadow-2xs dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
              <span>Threshold: 160 kW Grid Switching</span>
            </span>
          </div>
        </div>

        {/* Right: Peak Badge & Playback Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {peakPoint && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-1 font-mono text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Peak:
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
                  {peakPoint.demandKw.toFixed(0)}
                </span>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  kW
                </span>
              </div>
              <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {peakPoint.hourLabel}
              </span>
            </div>
          )}

          {/* Interactive Play/Pause Simulation Controls */}
          {onTogglePlay && (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2.5 dark:border-slate-800">
              <button
                onClick={onTogglePlay}
                aria-label={isPlaying ? "Pause simulation" : "Run simulation"}
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all ${
                  isPlaying
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
                }`}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>

              {onReset && (
                <button
                  onClick={onReset}
                  aria-label="Reset simulation to 00:00"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  title="Reset to 00:00"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Parameter Color Selector Strip */}
      <div className="mb-2 flex flex-wrap items-center gap-2 border-y border-slate-100 py-2 dark:border-slate-800/80">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          Parameters:
        </span>

        {/* 1. Demand (Cyan) */}
        <button
          onClick={() => setParams((p) => ({ ...p, demand: !p.demand }))}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border transition-all cursor-pointer ${
            params.demand
              ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 shadow-xs"
              : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-600"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span>Demand (kW)</span>
        </button>

        {/* 2. Temperature (Coral Orange) */}
        <button
          onClick={() => setParams((p) => ({ ...p, temp: !p.temp }))}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border transition-all cursor-pointer ${
            params.temp
              ? "border-orange-400/60 bg-orange-500/15 text-orange-600 dark:text-orange-300 shadow-xs"
              : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-600"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span>Temperature (°C)</span>
        </button>

        {/* 3. Solar Irradiance (Sun Yellow) */}
        <button
          onClick={() => setParams((p) => ({ ...p, solar: !p.solar }))}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border transition-all cursor-pointer ${
            params.solar
              ? "border-yellow-400/70 bg-yellow-400/15 text-yellow-600 dark:text-yellow-300 shadow-xs"
              : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-600"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-yellow-400" />
          <span>Solar (W/m²)</span>
        </button>

        {/* 4. Humidity (Soft Purple) */}
        <button
          onClick={() => setParams((p) => ({ ...p, humidity: !p.humidity }))}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border transition-all cursor-pointer ${
            params.humidity
              ? "border-purple-400/60 bg-purple-500/15 text-purple-600 dark:text-purple-300 shadow-xs"
              : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-600"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-purple-400" />
          <span>Humidity (%)</span>
        </button>
      </div>

      {/* Main Multi-Colored Graph Canvas */}
      <div className="h-[270px] w-full md:h-[310px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={forecast}
            margin={{ top: 24, right: 16, left: 0, bottom: 0 }}
            onClick={(e: any) => {
              if (e && e.activeTooltipIndex !== undefined && onSelectHour) {
                onSelectHour(e.activeTooltipIndex);
              }
            }}
          >
            <defs>
              <linearGradient id="demandCurveGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d2ff" stopOpacity={isDark ? 0.22 : 0.15} />
                <stop offset="100%" stopColor="#00d2ff" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />

            {/* Shaded evening peak window 18:00-22:00 */}
            <ReferenceArea
              x1="18:00"
              x2="22:00"
              fill="#f59e0b"
              fillOpacity={isDark ? 0.05 : 0.08}
              strokeOpacity={0}
            />

            {/* 200 kW Critical Overload Threshold Line */}
            <ReferenceLine
              yAxisId="demand"
              y={CRITICAL_THRESHOLD_KW}
              stroke="#f43f5e"
              strokeDasharray="6 4"
              strokeWidth={2.5}
              label={({ viewBox }: any) => {
                if (!viewBox) return null;
                const x = (viewBox.x ?? 0) + 12;
                const y = (viewBox.y ?? 0) - 11;
                return (
                  <g key="label-crit-200">
                    <rect
                      x={x}
                      y={y}
                      width={184}
                      height={20}
                      rx={4}
                      fill={isDark ? "#2a1217" : "#fff1f2"}
                      stroke="#f43f5e"
                      strokeWidth={1.5}
                    />
                    <text
                      x={x + 8}
                      y={y + 14}
                      fill="#f43f5e"
                      fontSize={11}
                      fontWeight={900}
                      fontFamily="monospace"
                    >
                      ▲ 200 kW OVERLOAD LIMIT
                    </text>
                  </g>
                );
              }}
            />

            {/* 160 kW Switching Threshold Line */}
            <ReferenceLine
              yAxisId="demand"
              y={SWITCHING_THRESHOLD_KW}
              stroke="#f59e0b"
              strokeDasharray="6 4"
              strokeWidth={2.5}
              label={({ viewBox }: any) => {
                if (!viewBox) return null;
                const x = (viewBox.x ?? 0) + 12;
                const y = (viewBox.y ?? 0) - 11;
                return (
                  <g key="label-switch-160">
                    <rect
                      x={x}
                      y={y}
                      width={188}
                      height={20}
                      rx={4}
                      fill={isDark ? "#2a1e09" : "#fef3c7"}
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                    />
                    <text
                      x={x + 8}
                      y={y + 14}
                      fill={isDark ? "#fbbf24" : "#b45309"}
                      fontSize={11}
                      fontWeight={900}
                      fontFamily="monospace"
                    >
                      ⚡ 160 kW SWITCH THRESHOLD
                    </text>
                  </g>
                );
              }}
            />

            <XAxis
              dataKey="hourLabel"
              ticks={["00:00", "06:00", "12:00", "18:00", "23:00"]}
              tick={{ fill: tickStroke, fontSize: 13, fontWeight: 700 }}
              axisLine={{ stroke: axisLineStroke }}
              tickLine={false}
              padding={{ left: 16, right: 16 }}
            />

            {/* Y-Axis for Demand (kW) with prominent numerical scale */}
            <YAxis
              yAxisId="demand"
              domain={[0, ceilingKw]}
              ticks={ceilingKw === 320 ? [0, 80, 160, 200, 240, 320] : [0, 100, 160, 200, ceilingKw]}
              stroke={axisLineStroke}
              tick={{ fill: tickStroke, fontSize: 13, fontWeight: 800, fontFamily: "monospace" }}
              tickLine={{ stroke: axisLineStroke, strokeWidth: 1 }}
              axisLine={{ stroke: axisLineStroke }}
              tickFormatter={(val) => `${val}`}
              width={48}
            />
            <YAxis yAxisId="temp" orientation="right" domain={[0, 48]} hide />
            <YAxis yAxisId="solar" orientation="right" domain={[0, 1100]} hide />
            <YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} hide />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: cursorStroke, strokeDasharray: "3 3" }}
            />

            {/* 1. Demand Curve (Electric Cyan) */}
            {params.demand && (
              <Area
                yAxisId="demand"
                type="monotone"
                dataKey="demandKw"
                stroke="#00d2ff"
                strokeWidth={3.5}
                fill="url(#demandCurveGlow)"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  const isPeak = index === peakIndex;
                  const isSelected = activeHourIndex === index;

                  // Peak Marker matching reference mockup
                  if (isPeak) {
                    return (
                      <g key={`dot-peak-${index}`}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={7.5}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth={3}
                        />
                        <text
                          x={cx}
                          y={cy - 12}
                          textAnchor="middle"
                          fill={isDark ? "#f87171" : "#dc2626"}
                          fontSize={15}
                          fontWeight={900}
                          fontFamily="monospace"
                        >
                          {Math.round(payload.demandKw)} kW
                        </text>
                      </g>
                    );
                  }

                  // Active Selected Hour Ring
                  if (isSelected) {
                    return (
                      <g key={`dot-sel-${index}`}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5.5}
                          fill={payload.isOverload ? "#ef4444" : "#0284c7"}
                          stroke="#38bdf8"
                          strokeWidth={2.5}
                        />
                      </g>
                    );
                  }

                  // Overload point dots
                  if (payload.isOverload) {
                    return (
                      <circle
                        key={`dot-ov-${index}`}
                        cx={cx}
                        cy={cy}
                        r={3.5}
                        fill="#ef4444"
                      />
                    );
                  }

                  return null;
                }}
                activeDot={{
                  r: 6.5,
                  stroke: "#38bdf8",
                  strokeWidth: 2.5,
                  fill: "#0ea5e9",
                }}
              />
            )}

            {/* 2. Temperature Parameter (Vibrant Coral/Orange) */}
            {params.temp && (
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="ambient_temp_c"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={false}
              />
            )}

            {/* 3. Solar Irradiance Parameter (Sun Yellow) */}
            {params.solar && (
              <Line
                yAxisId="solar"
                type="monotone"
                dataKey="solar_irradiance_wm2"
                stroke="#facc15"
                strokeWidth={2}
                dot={false}
              />
            )}

            {/* 4. Humidity Parameter (Cool Violet) */}
            {params.humidity && (
              <Line
                yAxisId="humidity"
                type="monotone"
                dataKey="humidity_pct"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* "Power mode by hour" Segmented Strip directly beneath the chart */}
      <div className="mt-5 border-t border-slate-200/80 pt-4 dark:border-slate-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Power mode by hour
          </h3>
        </div>

        {/* 24 Segmented Hourly Capsules with Respective Hour Labels */}
        <div
          className="gap-1 py-1 sm:gap-1.5"
          style={{ display: "grid", gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        >
          {forecast.map((point, index) => {
            const isSelected = index === activeHourIndex;
            const isRenewable = point.mode === "RENEWABLE_STORAGE";
            const hourNum = point.hourLabel.split(":")[0];

            return (
              <div key={`mode-col-${index}`} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => onSelectHour && onSelectHour(index)}
                  title={`${point.hourLabel} — ${point.demandKw.toFixed(1)} kW (${
                    isRenewable ? "Renewable Storage" : "Main Grid"
                  }${point.isOverload ? ", OVERLOAD" : ""})`}
                  className={`h-2.5 w-full rounded-full transition-all cursor-pointer ${
                    isRenewable
                      ? "bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-400 dark:hover:bg-emerald-300"
                      : "bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
                  } ${
                    isSelected
                      ? "ring-2 ring-slate-900 scale-y-125 shadow-sm dark:ring-white"
                      : "opacity-85 hover:opacity-100"
                  }`}
                />
                <span
                  onClick={() => onSelectHour && onSelectHour(index)}
                  className={`cursor-pointer font-mono text-[10px] sm:text-[11px] transition-colors select-none ${
                    isSelected
                      ? "font-black text-slate-900 dark:text-white"
                      : "font-semibold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  }`}
                >
                  {hourNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mode Strip Legend */}
        <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500" />
            <span>Main Grid</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span>Renewable Storage</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Overload indicator on demand curve</span>
          </span>
        </div>
      </div>

    </div>
  );
}
