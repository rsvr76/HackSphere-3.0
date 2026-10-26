import { ArrowDownRight, ArrowUpRight, Gauge, HeartPulse, Minus, PlugZap, TrendingUp } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";
import StatusPill from "./StatusPill";
import BatteryGauge from "./BatteryGauge";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700">
      {children}
    </div>
  );
}

export default function KpiMetricsGrid({
  forecast,
  activeHour,
}: {
  forecast: ForecastPoint[];
  activeHour?: ForecastPoint;
}) {
  if (forecast.length === 0) return null;

  const current = activeHour ?? forecast[0];
  const currentIndex = forecast.indexOf(current);
  const next = forecast[(currentIndex + 1) % forecast.length] ?? current;
  const pctChange = current.demandKw > 0 ? ((next.demandKw - current.demandKw) / current.demandKw) * 100 : 0;

  const peak = forecast.reduce((max, p) => (p.demandKw > max.demandKw ? p : max), forecast[0]);
  const overloadCount = forecast.filter((f) => f.isOverload).length;

  const systemHealth = overloadCount > 0 ? 92.1 : 99.4;

  return (
    <section
      aria-label="Key performance indicators"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* Card 1: Current / Next Hour Demand */}
      <Card>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Gauge className="h-3.5 w-3.5" /> Next Hour Forecast
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
            {next.demandKw.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-slate-500">kW</span>
        </div>
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
            pctChange > 0 ? "text-rose-600 dark:text-rose-400" : pctChange < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
          }`}
        >
          {pctChange > 0.1 ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : pctChange < -0.1 ? (
            <ArrowDownRight className="h-3.5 w-3.5" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
          {Math.abs(pctChange).toFixed(1)}% vs current ({current.hourLabel})
        </div>
      </Card>

      {/* Card 2: Active Grid Mode */}
      <Card>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <PlugZap className="h-3.5 w-3.5" /> Active Dispatch Mode
          </span>
        </div>
        <div className="mt-3">
          <StatusPill color={current.statusColor} pulse>
            {current.mode === "RENEWABLE_STORAGE" ? "Renewable Storage" : "Main Grid"}
          </StatusPill>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{current.reason}</p>
      </Card>

      {/* Card 3: Battery SoC */}
      <Card>
        <BatteryGauge current={current} />
      </Card>

      {/* Card 4: Peak Demand & System Health */}
      <Card>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <TrendingUp className="h-3.5 w-3.5" /> 24h Peak Demand
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold tracking-tight tabular-nums ${
              peak.isOverload ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-50"
            }`}
          >
            {peak.demandKw.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-slate-500">kW @ {peak.hourLabel}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <StatusPill color={peak.isOverload ? "rose" : "emerald"}>
            {peak.isOverload ? "Overload Warning" : "Within Capacity"}
          </StatusPill>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <HeartPulse className="h-3.5 w-3.5" /> {systemHealth}%
          </span>
        </div>
      </Card>
    </section>
  );
}
