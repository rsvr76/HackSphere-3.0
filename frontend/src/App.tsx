import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import CommandDeck from "./components/CommandDeck";
import WorkspaceTabs, { type WorkspaceTabId } from "./components/WorkspaceTabs";
import OverloadBanner from "./components/OverloadBanner";
import KpiMetricsGrid from "./components/KpiMetricsGrid";
import ForecastChart from "./components/ForecastChart";
import TransitionPanel from "./components/TransitionPanel";
import MicrogridPowerFlow from "./components/MicrogridPowerFlow";
import DispatchTimeline from "./components/DispatchTimeline";
import TelemetryTable from "./components/TelemetryTable";
import WhatIfSimulator from "./components/WhatIfSimulator";
import CsvUploader from "./components/CsvUploader";
import ManualInputModal from "./components/ManualInputModal";
import SettingsModal, {
  DEFAULT_API_SETTINGS,
  type ApiSettings,
} from "./components/SettingsModal";
import {
  buildForecast,
  calculateImpactSummary,
  fetchQuickMlPredictions,
  type TelemetryPoint,
  type ForecastPoint,
} from "./utils/microgridLogic";
import {
  generateSampleTelemetry,
  SCENARIO_PRESETS,
  type ScenarioId,
} from "./utils/sampleData";
import { CheckCircle2, Database, Info, Sparkles, AlertCircle } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "info" | "error";
}

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("hacksphere_theme");
    return saved === "light" ? "light" : "dark";
  });

  // Telemetry Input State
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(() =>
    generateSampleTelemetry()
  );
  const [activeScenario, setActiveScenario] = useState<ScenarioId | "custom">("heatwave");

  // Simulation & Inference State
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("overview");
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasRunSimulation, setHasRunSimulation] = useState(true);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // Time Scrubbing & Active Inspection Point
  const [activeHourIndex, setActiveHourIndex] = useState(19); // Default to 19:00 peak
  const [isPlaying, setIsPlaying] = useState(false);

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // API Credentials
  const [apiSettings, setApiSettings] = useState<ApiSettings>(() => {
    const saved = localStorage.getItem("hacksphere_quickml_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return DEFAULT_API_SETTINGS;
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [quickMlPredictions, setQuickMlPredictions] = useState<number[] | null>(null);
  const [predictionSource, setPredictionSource] = useState<"quickml" | "calibrated_model">(
    "calibrated_model"
  );

  const pushToast = (message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  };

  // Run simulation handler (Step 3)
  const runSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationError(null);

    try {
      if (!apiSettings.mockMode && apiSettings.endpoint) {
        // Attempt live QuickML call
        try {
          const preds = await fetchQuickMlPredictions(telemetry, apiSettings);
          setQuickMlPredictions(preds);
          setPredictionSource("quickml");
          pushToast(
            `QuickML Cloud Inference Complete: Successfully generated ${preds.length} hourly predictions!`,
            "success"
          );
        } catch (apiErr: unknown) {
          // Graceful fallback to Option B calibrated model
          setQuickMlPredictions(null);
          setPredictionSource("calibrated_model");
          const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          pushToast(
            `QuickML Notice: Using Calibrated Stacking Model (RMSE 8.85 kW). [${msg}]`,
            "info"
          );
        }
      } else {
        // High-accuracy calibrated model fallback
        await new Promise((resolve) => setTimeout(resolve, 600)); // Observable execution delay
        setQuickMlPredictions(null);
        setPredictionSource("calibrated_model");
        pushToast(
          "24-Hour Simulation Complete: High-accuracy calibrated pipeline evaluated.",
          "success"
        );
      }

      setHasRunSimulation(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSimulationError(msg);
      pushToast(`Simulation Failed: ${msg}`, "error");
    } finally {
      setIsSimulating(false);
    }
  };

  // Calculate forecast from telemetry and predictions
  const forecast: ForecastPoint[] = useMemo(
    () => buildForecast(telemetry, quickMlPredictions),
    [telemetry, quickMlPredictions]
  );

  const impact = useMemo(() => calculateImpactSummary(forecast), [forecast]);

  // Automated 24-hour simulation timer
  useEffect(() => {
    if (!isPlaying || forecast.length === 0) return;
    const interval = setInterval(() => {
      setActiveHourIndex((prev) => (prev + 1) % forecast.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, forecast.length]);

  const apiConnected = !apiSettings.mockMode && apiSettings.endpoint.length > 0;

  // Scenario & Data handlers
  const handleSelectScenario = (id: ScenarioId) => {
    setActiveScenario(id);
    const preset = SCENARIO_PRESETS.find((p) => p.id === id);
    if (preset) {
      const data = preset.generate();
      setTelemetry(data);
      pushToast(`Scenario Preset Loaded: ${preset.title}`, "info");

      // Auto-set inspection to evening peak (19:00) if available
      const peakIdx = data.findIndex((d) => new Date(d.timestamp).getHours() === 19);
      if (peakIdx >= 0) setActiveHourIndex(peakIdx);
      else setActiveHourIndex(0);
    }
  };

  const handleCsvData = (data: TelemetryPoint[]) => {
    setTelemetry(data);
    setActiveScenario("custom");
    pushToast(`Ingested ${data.length} telemetry rows from CSV. Ready for simulation.`, "success");
  };

  const handleManualData = (data: TelemetryPoint[]) => {
    setTelemetry(data);
    setActiveScenario("custom");
    pushToast(`Injected ${data.length} cleaned telemetry rows. Ready for simulation.`, "success");
  };

  const handleSaveSettings = (newSettings: ApiSettings) => {
    setApiSettings(newSettings);
    localStorage.setItem("hacksphere_quickml_settings", JSON.stringify(newSettings));
    pushToast("QuickML settings updated successfully.", "success");
  };

  // Title & Theme management
  useEffect(() => {
    document.title = "HackSphere 3.0 — Smart Microgrid Controller";
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("hacksphere_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const activePoint = forecast[activeHourIndex] ?? forecast[0];
  const overloadCount = forecast.filter((f) => f.isOverload).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased transition-colors dark:bg-[#090d16] dark:text-slate-200">
      {/* Header */}
      <Navbar
        apiConnected={apiConnected}
        isPredicting={isSimulating}
        predictionSource={predictionSource}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onLoadSample={() => handleSelectScenario("heatwave")}
      />

      <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6 lg:p-8">
        {/* Model & Endpoint Sub-header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-700 shadow-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-300 dark:shadow-none">
          <div className="flex items-center gap-2">
            {predictionSource === "quickml" ? (
              <>
                <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong className="text-emerald-700 dark:text-emerald-400">Live Catalyst QuickML Endpoint Active</strong> ·
                  Project: <code className="font-mono text-slate-600 dark:text-slate-400">104872000000013051</code> · Org:{" "}
                  <code className="font-mono text-slate-600 dark:text-slate-400">60093159850</code>
                </span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>
                  <strong className="text-sky-700 dark:text-sky-400">Version 2 Stacking Ensemble Active</strong> ·
                  Benchmark Verified: <code className="font-mono font-medium text-slate-800 dark:text-slate-300">RMSE 8.85 kW (R² 0.9695)</code>
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-xs font-semibold text-sky-600 underline underline-offset-2 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Configure Endpoint &amp; Keys
          </button>
        </div>

        {/* Phase 2: Guided Workflow Command Deck (Steps 1, 2, 3) */}
        <CommandDeck
          telemetry={telemetry}
          activeScenario={activeScenario}
          onSelectScenario={handleSelectScenario}
          onOpenUpload={() => setActiveTab("telemetry_model")}
          onOpenManual={() => setManualModalOpen(true)}
          onRunSimulation={runSimulation}
          isSimulating={isSimulating}
          hasRunSimulation={hasRunSimulation}
          predictionSource={predictionSource}
        />

        {/* Error notification if simulation fails */}
        {simulationError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-300 bg-rose-50/90 p-3 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{simulationError}</span>
          </div>
        )}

        {/* Phase 3: Workspace Tabs Navigation */}
        <WorkspaceTabs
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          overloadCount={overloadCount}
        />

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW — The Main Coordinated Workspace (Phase 1) */}
        {/* ========================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Overload Incident Alert (if any overload exists) */}
            <OverloadBanner forecast={forecast} />

            {/* Component 1: Summary KPI Row */}
            <KpiMetricsGrid forecast={forecast} activeHour={activePoint} />

            {/* Components 2 & 3: Two-Column Main Workspace */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left Column (7 cols): 24-Hour Demand Forecast Chart */}
              <div className="lg:col-span-7">
                <ForecastChart
                  forecast={forecast}
                  theme={theme}
                  activeHourIndex={activeHourIndex}
                  onSelectHour={setActiveHourIndex}
                />
              </div>

              {/* Right Column (5 cols): Transition Controller & Microgrid Power Flow */}
              <div className="space-y-4 lg:col-span-5">
                {activePoint && <TransitionPanel current={activePoint} impact={impact} />}
                {activePoint && <MicrogridPowerFlow current={activePoint} />}
              </div>
            </section>

            {/* Component 4: 24-Hour Dispatch Timeline directly below main workspace */}
            <DispatchTimeline
              forecast={forecast}
              activeHourIndex={activeHourIndex}
              onSelectHour={setActiveHourIndex}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onReset={() => {
                setIsPlaying(false);
                setActiveHourIndex(0);
              }}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FORECAST & DISPATCH — 24-Row Table & Audit Log    */}
        {/* ========================================================= */}
        {activeTab === "forecast_dispatch" && (
          <div className="space-y-5">
            <TelemetryTable
              forecast={forecast}
              activeHourIndex={activeHourIndex}
              onSelectHour={setActiveHourIndex}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: WHAT-IF LAB — Parameter Sliders & Boundary Tests  */}
        {/* ========================================================= */}
        {activeTab === "whatif" && (
          <div className="space-y-5">
            <WhatIfSimulator />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TELEMETRY & MODEL — CSV Ingestion & Preflight      */}
        {/* ========================================================= */}
        {activeTab === "telemetry_model" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <CsvUploader
                onDataLoaded={handleCsvData}
                onOpenManualForm={() => setManualModalOpen(true)}
              />
            </div>
            <div className="space-y-4 lg:col-span-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Zoho Catalyst QuickML Deployment Status
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Published
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <p className="text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-200">Endpoint URL:</strong>{" "}
                    <code className="font-mono text-[11px] text-slate-500 break-all">
                      {apiSettings.endpoint || "Not configured"}
                    </code>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-200">Organization:</strong>{" "}
                    <code className="font-mono">{apiSettings.catalystOrg}</code> (Environment:{" "}
                    <code className="font-mono">{apiSettings.environment}</code>)
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-200">Active Pipeline:</strong>{" "}
                    Version 2 Stacking Regression (RMSE = 8.8562 kW, R² = 0.9695, MAPE = 5.07%)
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
                  >
                    Edit API Credentials
                  </button>
                  <button
                    onClick={() => setManualModalOpen(true)}
                    className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Open Live Manual Editor
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="pb-4 pt-2 text-center text-[11px] text-slate-500">
          HackSphere 3.0 — Smart Energy Microgrid &amp; Demand Forecasting Engine · Zoho Catalyst
          Slate Deployment · QuickML Pipeline
        </footer>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={apiSettings}
        onSave={handleSaveSettings}
      />

      {/* Manual Input Modal */}
      <ManualInputModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        currentTelemetry={telemetry}
        onApplyTelemetry={handleManualData}
      />

      {/* Toast Notifications */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm shadow-xl backdrop-blur transition-all ${
              t.type === "success"
                ? "border-emerald-300 bg-emerald-50/95 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/90 dark:text-emerald-200"
                : t.type === "error"
                ? "border-rose-300 bg-rose-50/95 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/90 dark:text-rose-200"
                : "border-sky-300 bg-sky-50/95 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/90 dark:text-sky-200"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : t.type === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            ) : (
              <Info className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
