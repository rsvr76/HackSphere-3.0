import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Clock, Download, ListTree, TriangleAlert } from "lucide-react";
import type { ForecastPoint } from "../utils/microgridLogic";
import StatusPill from "./StatusPill";
import DispatchLogTable from "./DispatchLogTable";

type SortKey = "hourLabel" | "demandKw" | "ambient_temp_c" | "humidity_pct" | "solar_irradiance_wm2";

export default function TelemetryTable({
  forecast,
  activeHourIndex,
  onSelectHour,
}: {
  forecast: ForecastPoint[];
  activeHourIndex?: number;
  onSelectHour?: (index: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<"schedule" | "dispatch_log">("schedule");
  const [sortKey, setSortKey] = useState<SortKey>("hourLabel");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const copy = forecast.map((f, idx) => ({ ...f, originalIndex: idx }));
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortAsc ? cmp : -cmp;
    });
    return copy;
  }, [forecast, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const downloadPredictions = () => {
    const rows = forecast.map((f) => `${f.timestamp},${f.demandKw.toFixed(2)}`);
    const csv = ["timestamp,target_demand_kw", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "predictions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTransitionSignals = () => {
    const rows = forecast.map(
      (f) =>
        `"${f.timestamp}",${f.demandKw.toFixed(2)},"${f.mode}",${f.isOverload},"${f.reason.replace(/"/g, '""')}"`
    );
    const csv = ["timestamp,demand_kw,grid_mode,is_overload,trigger_reason", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transition_dispatch_signals.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const Header = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <th
      onClick={() => toggleSort(keyName)}
      className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === keyName &&
          (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </th>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
      {/* Header with Tab Navigation */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "schedule"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <ListTree className="h-3.5 w-3.5" /> 24-Hour Forecast Schedule
          </button>
          <button
            onClick={() => setActiveTab("dispatch_log")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "dispatch_log"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-emerald-500" /> Controller Dispatch Log
          </button>
        </div>

        {activeTab === "schedule" ? (
          <button
            onClick={downloadPredictions}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
          >
            <Download className="h-3.5 w-3.5" /> Download Predictions CSV
          </button>
        ) : (
          <button
            onClick={downloadTransitionSignals}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
          >
            <Download className="h-3.5 w-3.5" /> Export Transition Signals CSV
          </button>
        )}
      </div>

      {activeTab === "schedule" ? (
        <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-100/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <tr>
                <Header label="Hour" keyName="hourLabel" />
                <Header label="Temp °C" keyName="ambient_temp_c" />
                <Header label="Humidity %" keyName="humidity_pct" />
                <Header label="Solar W/m²" keyName="solar_irradiance_wm2" />
                <Header label="Demand kW" keyName="demandKw" />
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Grid Mode
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Overload
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const isSelected = activeHourIndex === row.originalIndex;
                return (
                  <tr
                    key={row.timestamp}
                    onClick={() => onSelectHour?.(row.originalIndex)}
                    className={`cursor-pointer border-t border-slate-200/80 transition-colors ${
                      isSelected
                        ? "bg-sky-50 dark:bg-sky-950/40 ring-1 ring-inset ring-sky-500/60"
                        : row.isOverload
                        ? "bg-rose-50/70 hover:bg-rose-100/60 dark:bg-rose-500/5 dark:hover:bg-rose-500/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-bold text-slate-900 dark:text-slate-200">
                      <span className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black">
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                        {row.hourLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700 font-bold tabular-nums font-mono text-xs sm:text-sm dark:text-slate-300">
                      {row.ambient_temp_c.toFixed(1)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700 font-bold tabular-nums font-mono text-xs sm:text-sm dark:text-slate-300">
                      {row.humidity_pct.toFixed(0)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700 font-bold tabular-nums font-mono text-xs sm:text-sm dark:text-slate-300">
                      {row.solar_irradiance_wm2.toFixed(0)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 font-mono text-sm sm:text-base font-black tabular-nums ${
                        row.isOverload ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {row.demandKw.toFixed(1)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <StatusPill color={row.statusColor}>
                        {row.mode === "RENEWABLE_STORAGE" ? "Renewable" : "Main Grid"}
                      </StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {row.isOverload ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                          <TriangleAlert className="h-3.5 w-3.5" /> Alert
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <DispatchLogTable forecast={forecast} />
      )}
    </div>
  );
}
