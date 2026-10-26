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
import { Droplets, Sun, Thermometer, Zap } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";
import { CRITICAL_THRESHOLD_KW, SWITCHING_THRESHOLD_KW } from "../utils/microgridLogic";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d: ForecastPoint = payload[0].payload;

  const modeLabel = d.mode === "RENEWABLE_STORAGE" ? "Renewable Storage Mode" : "Main Grid Mode";
  const modeColor = d.isOverload
    ? "text-rose-600 dark:text-rose-400"
    : d.mode === "RENEWABLE_STORAGE"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-sky-600 dark:text-sky-400";

  return (
    <div className="min-w-[240px] rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur transition-colors dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{d.hourLabel}</span>
        <span className={`text-xs font-bold ${modeColor}`}>{modeLabel}</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Demand
          </span>
          <span
            className={`font-bold tabular-nums ${
              d.isOverload ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {d.demandKw.toFixed(1)} kW
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Thermometer className="h-3.5 w-3.5 text-orange-500" /> Temperature
          </span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {d.ambient_temp_c.toFixed(1)}°C
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Droplets className="h-3.5 w-3.5 text-sky-500" /> Humidity
          </span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {d.humidity_pct.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Sun className="h-3.5 w-3.5 text-amber-500" /> Solar Irradiance
          </span>
          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {d.solar_irradiance_wm2.toFixed(0)} W/m²
          </span>
        </div>
      </div>
      <div className="mt-2.5 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-600 dark:border-slate-800 dark:text-slate-400">
        {d.reason}
      </div>
    </div>
  );
}

export default function ForecastChart({
  forecast,
  theme = "dark",
  activeHourIndex,
  onSelectHour,
}: {
  forecast: ForecastPoint[];
  theme?: "dark" | "light";
  activeHourIndex?: number;
  onSelectHour?: (index: number) => void;
}) {
  const [showTemp, setShowTemp] = useState(false);
  const [showSolar, setShowSolar] = useState(false);

  const isDark = theme === "dark";

  const areaColor = useMemo(() => {
    const hasOverload = forecast.some((f) => f.isOverload);
    return hasOverload ? "#ef4444" : "#10b981";
  }, [forecast]);

  const maxDemand = Math.max(...forecast.map((f) => f.demandKw), CRITICAL_THRESHOLD_KW + 20);

  const gridStroke = isDark ? "#1e293b" : "#e2e8f0";
  const tickStroke = isDark ? "#94a3b8" : "#64748b";
  const axisLineStroke = isDark ? "#1e293b" : "#cbd5e1";
  const labelFill = isDark ? "#64748b" : "#475569";
  const cursorStroke = isDark ? "#475569" : "#94a3b8";

  const activeLabel =
    activeHourIndex !== undefined && forecast[activeHourIndex]
      ? forecast[activeHourIndex].hourLabel
      : undefined;

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">24-Hour Demand Forecast</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Click chart to inspect hour
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Hourly load prediction with switching &amp; critical thresholds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemp((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              showTemp
                ? "border-orange-500/50 bg-orange-100 text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300"
                : "border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Thermometer className="h-3 w-3" /> Temp
          </button>
          <button
            onClick={() => setShowSolar((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              showSolar
                ? "border-amber-500/50 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                : "border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Sun className="h-3 w-3" /> Solar
          </button>
        </div>
      </div>

      <div className="h-[340px] w-full flex-1 md:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={forecast}
            margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
            onClick={(e: any) => {
              if (e && e.activeTooltipIndex !== undefined && onSelectHour) {
                onSelectHour(e.activeTooltipIndex);
              }
            }}
          >
            <defs>
              <linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={areaColor} stopOpacity={isDark ? 0.45 : 0.35} />
                <stop offset="100%" stopColor={areaColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={gridStroke} strokeDasharray="3 6" vertical={false} />

            {/* Shaded evening peak window 18:00-22:00 */}
            <ReferenceArea
              x1="18:00"
              x2="22:00"
              fill="#f59e0b"
              fillOpacity={isDark ? 0.08 : 0.12}
              strokeOpacity={0}
            />

            {/* Active Inspected Hour Vertical Indicator */}
            {activeLabel && (
              <ReferenceLine
                x={activeLabel}
                stroke="#0284c7"
                strokeDasharray="3 2"
                strokeWidth={2}
                label={{
                  value: "▲ Inspecting",
                  position: "top",
                  fill: "#0284c7",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}

            <XAxis
              dataKey="hourLabel"
              tick={{ fill: tickStroke, fontSize: 11 }}
              axisLine={{ stroke: axisLineStroke }}
              tickLine={false}
              interval={2}
            />
            <YAxis
              yAxisId="demand"
              domain={[0, Math.ceil(maxDemand / 20) * 20]}
              tick={{ fill: tickStroke, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
              label={{ value: "kW", angle: -90, position: "insideLeft", fill: labelFill, fontSize: 11 }}
            />
            {(showTemp || showSolar) && (
              <YAxis
                yAxisId="weather"
                orientation="right"
                tick={{ fill: tickStroke, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
            )}

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: cursorStroke, strokeDasharray: "3 3" }} />

            <ReferenceLine
              yAxisId="demand"
              y={SWITCHING_THRESHOLD_KW}
              stroke="#d97706"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{
                value: `Switching 160kW`,
                position: "insideTopLeft",
                fill: "#d97706",
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              yAxisId="demand"
              y={CRITICAL_THRESHOLD_KW}
              stroke="#e11d48"
              strokeWidth={1.5}
              label={{
                value: `Critical 200kW`,
                position: "insideTopLeft",
                fill: "#e11d48",
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            <Area
              yAxisId="demand"
              type="monotone"
              dataKey="demandKw"
              stroke={areaColor}
              strokeWidth={2.5}
              fill="url(#demandFill)"
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                const isSelected = activeHourIndex === index;
                if (!payload.isOverload && !isSelected) return <circle key={`dot-${index}`} cx={cx} cy={cy} r={0} />;
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4}
                    fill={payload.isOverload ? "#ef4444" : "#0284c7"}
                    stroke={isSelected ? "#38bdf8" : isDark ? "#090d16" : "#ffffff"}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                );
              }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: isDark ? "#090d16" : "#ffffff" }}
            />

            {showTemp && (
              <Line
                yAxisId="weather"
                type="monotone"
                dataKey="ambient_temp_c"
                stroke="#ea580c"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="2 2"
              />
            )}
            {showSolar && (
              <Line
                yAxisId="weather"
                type="monotone"
                dataKey="solar_irradiance_wm2"
                stroke="#d97706"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="2 2"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-0.5 w-3 rounded-full bg-amber-500" /> Switching Threshold (160 kW)
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-0.5 w-3 rounded-full bg-rose-500" /> Critical Threshold (200 kW)
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-2 w-2 rounded-full bg-amber-500/30" /> Evening Peak Window (18:00–22:00)
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-2 w-2 rounded-full border-2 border-white bg-rose-500 shadow-xs" /> Overload Hour
        </span>
      </div>
    </div>
  );
}
