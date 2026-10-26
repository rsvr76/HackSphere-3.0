import { Sparkles, Sun, Thermometer, Zap } from "lucide-react";
import { SCENARIO_PRESETS, type ScenarioId } from "../utils/sampleData";

interface ScenarioPresetsProps {
  activeScenario: ScenarioId | "custom";
  onSelectScenario: (id: ScenarioId) => void;
}

export default function ScenarioPresets({
  activeScenario,
  onSelectScenario,
}: ScenarioPresetsProps) {
  const getIcon = (id: ScenarioId) => {
    switch (id) {
      case "heatwave":
        return <Thermometer className="h-3.5 w-3.5 text-rose-500" />;
      case "rush_hour":
        return <Zap className="h-3.5 w-3.5 text-emerald-500" />;
      case "solar_surplus":
        return <Sun className="h-3.5 w-3.5 text-amber-500" />;
      case "baseload":
        return <Sparkles className="h-3.5 w-3.5 text-sky-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Demo Scenarios:
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {SCENARIO_PRESETS.map((p) => {
          const isActive = activeScenario === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectScenario(p.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "border-emerald-500 bg-emerald-50 text-emerald-950 shadow-xs dark:border-emerald-500/50 dark:bg-emerald-950/60 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              {getIcon(p.id)}
              <span>{p.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
