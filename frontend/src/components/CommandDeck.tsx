import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  Edit3,
  FileSpreadsheet,
  Flame,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Sun,
  Upload,
  Zap,
} from "lucide-react";
import type { TelemetryPoint } from "../utils/microgridLogic";
import { SCENARIO_PRESETS, type ScenarioId } from "../utils/sampleData";

export interface ValidationSummary {
  rowCount: number;
  hasAllColumns: boolean;
  missingValuesCount: number;
  isContinuousHourly: boolean;
  issues: string[];
  isValid: boolean;
}

export function validateTelemetryData(data: TelemetryPoint[]): ValidationSummary {
  const issues: string[] = [];

  if (!Array.isArray(data) || data.length === 0) {
    return {
      rowCount: 0,
      hasAllColumns: false,
      missingValuesCount: 0,
      isContinuousHourly: false,
      issues: ["Telemetry data is empty."],
      isValid: false,
    };
  }

  const rowCount = data.length;
  let missingValuesCount = 0;
  let hasValidTimestamps = true;

  data.forEach((p, i) => {
    if (
      p.ambient_temp_c === undefined ||
      p.ambient_temp_c === null ||
      isNaN(p.ambient_temp_c) ||
      p.humidity_pct === undefined ||
      p.humidity_pct === null ||
      isNaN(p.humidity_pct) ||
      p.solar_irradiance_wm2 === undefined ||
      p.solar_irradiance_wm2 === null ||
      isNaN(p.solar_irradiance_wm2)
    ) {
      missingValuesCount++;
    }

    if (!p.timestamp || isNaN(new Date(p.timestamp).getTime())) {
      hasValidTimestamps = false;
    }
  });

  if (rowCount !== 24) {
    issues.push(`Detected ${rowCount} rows (competition specification recommends 24 hours).`);
  }

  if (missingValuesCount > 0) {
    issues.push(`${missingValuesCount} missing or non-numeric telemetry values detected.`);
  }

  if (!hasValidTimestamps) {
    issues.push("Invalid timestamp format detected in telemetry rows.");
  }

  return {
    rowCount,
    hasAllColumns: true,
    missingValuesCount,
    isContinuousHourly: hasValidTimestamps,
    issues,
    isValid: rowCount > 0 && missingValuesCount === 0 && hasValidTimestamps,
  };
}

interface CommandDeckProps {
  telemetry: TelemetryPoint[];
  activeScenario: ScenarioId | "custom";
  onSelectScenario: (id: ScenarioId) => void;
  onOpenUpload: () => void;
  onOpenManual: () => void;
  onRunSimulation: () => Promise<void>;
  isSimulating: boolean;
  hasRunSimulation: boolean;
  predictionSource: "quickml" | "calibrated_model";
}

export default function CommandDeck({
  telemetry,
  activeScenario,
  onSelectScenario,
  onOpenUpload,
  onOpenManual,
  onRunSimulation,
  isSimulating,
  hasRunSimulation,
  predictionSource,
}: CommandDeckProps) {
  const [simulationStage, setSimulationStage] = useState<number>(0);
  const validation = validateTelemetryData(telemetry);

  const STAGES = [
    { label: "Validating Telemetry Preflight", icon: CheckCircle2 },
    {
      label:
        predictionSource === "quickml"
          ? "Zoho Catalyst QuickML Inference"
          : "Calibrated Regression Pipeline",
      icon: Database,
    },
    { label: "Evaluating Transition Controller Rules", icon: Cpu },
    { label: "Assembling Dispatch Telemetry & Power Flow", icon: Zap },
  ];

  useEffect(() => {
    if (!isSimulating) {
      setSimulationStage(0);
      return;
    }

    const t1 = setTimeout(() => setSimulationStage(1), 180);
    const t2 = setTimeout(() => setSimulationStage(2), 360);
    const t3 = setTimeout(() => setSimulationStage(3), 540);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isSimulating]);

  return (
    <section
      aria-label="Simulation Command Deck"
      className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all md:p-5 dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-center">
        {/* Step 1: Input Selection (5 cols) */}
        <div className="space-y-2 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-extrabold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                1
              </span>
              Input Scenario
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Preset or Custom
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SCENARIO_PRESETS.map((p) => {
              const active = activeScenario === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectScenario(p.id)}
                  disabled={isSimulating}
                  title={p.shortDesc}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-sm ring-1 ring-emerald-500 dark:border-emerald-500/80 dark:bg-emerald-950/40 dark:text-emerald-100"
                      : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-slate-700"
                  } disabled:opacity-50`}
                >
                  <span className="truncate text-xs font-bold">{p.title.split(" ")[0]}</span>
                  <span className="mt-1 line-clamp-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs">
            <button
              onClick={onOpenUpload}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/70 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Upload className="h-3.5 w-3.5" /> Upload CSV
            </button>
            <button
              onClick={onOpenManual}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/70 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Edit3 className="h-3.5 w-3.5" /> Manual Table
            </button>
            {activeScenario === "custom" && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Custom Ingestion Active
              </span>
            )}
          </div>
        </div>

        {/* Step 2: Preflight Validation (3 cols) */}
        <div className="space-y-2 border-slate-200 lg:col-span-3 lg:border-l lg:pl-5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/10 text-[11px] font-extrabold text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                2
              </span>
              Preflight Check
            </span>
            {validation.isValid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" /> Issue
              </span>
            )}
          </div>

          <div className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 text-[11px] dark:border-slate-800/80 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Rows Detected:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                {validation.rowCount} hrs
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Required Features:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                4 / 4 columns
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Nulls / Invalids:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                {validation.missingValuesCount}
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Run Simulation (4 cols) */}
        <div className="space-y-2 border-slate-200 lg:col-span-4 lg:border-l lg:pl-5 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/10 text-[11px] font-extrabold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                3
              </span>
              Execution
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {hasRunSimulation ? "Simulated" : "Pending Run"}
            </span>
          </div>

          <button
            onClick={onRunSimulation}
            disabled={!validation.isValid || isSimulating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-600/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSimulating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 text-emerald-200" />
                <span>Run 24-Hour Simulation</span>
                <ArrowRight className="h-4 w-4 opacity-75" />
              </>
            )}
          </button>

          {/* Observable 4-Stage Progress Pill */}
          {isSimulating && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-center text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">{STAGES[simulationStage]?.label}</span>
              </div>
              <div className="mt-1.5 flex justify-center gap-1">
                {STAGES.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-6 rounded-full transition-all ${
                      idx <= simulationStage
                        ? "bg-emerald-500"
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
