import { BatteryCharging, BatteryMedium, BatteryWarning, Zap } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";

export default function BatteryGauge({ current }: { current: ForecastPoint }) {
  const soc = current.batterySoc;
  const charging = current.batteryFlowKw >= 0;

  const barColor =
    soc > 50 ? "bg-emerald-500" : soc > 20 ? "bg-amber-500" : "bg-rose-500";

  const Icon = soc < 15 ? BatteryWarning : charging ? BatteryCharging : BatteryMedium;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Icon className={`h-4 w-4 ${charging ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400"}`} />
          <span className="text-xs font-medium">Battery Storage</span>
        </div>
        <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{soc.toFixed(0)}%</span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
        />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
        <Zap className={`h-3.5 w-3.5 ${charging ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400"}`} />
        <span className={`font-medium ${charging ? "text-emerald-700 dark:text-emerald-400" : "text-sky-700 dark:text-sky-400"}`}>
          {charging ? "Charging" : "Discharging"}
        </span>
        <span className="text-slate-500">· {Math.abs(current.batteryFlowKw).toFixed(1)} kW</span>
        {charging && current.solar_irradiance_wm2 > 0 && (
          <span className="text-slate-500">via Solar ({current.solar_irradiance_wm2} W/m²)</span>
        )}
      </div>
    </div>
  );
}
