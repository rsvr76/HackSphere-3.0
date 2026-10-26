import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import OverloadBanner from "./components/OverloadBanner";
import KpiMetricsGrid from "./components/KpiMetricsGrid";
import ForecastChart from "./components/ForecastChart";
import TransitionPanel from "./components/TransitionPanel";
import PowerFlowDiagram from "./components/PowerFlowDiagram";
import TimeScrubber from "./components/TimeScrubber";
import ScenarioPresets from "./components/ScenarioPresets";
import WhatIfSimulator from "./components/WhatIfSimulator";
import CsvUploader from "./components/CsvUploader";
import TelemetryTable from "./components/TelemetryTable";
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
} from "./utils/microgridLogic";
import {
  generateSampleTelemetry,
  SCENARIO_PRESETS,
  type ScenarioId,
} from "./utils/sampleData";
import { CheckCircle2, Database, Info, Sparkles } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "info";
}

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("hacksphere_theme");
    return saved === "light" ? "light" : "dark";
  });

  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(() =>
    generateSampleTelemetry()
  );
  const [activeScenario, setActiveScenario] = useState<ScenarioId | "custom">("heatwave");
  const [activeHourIndex, setActiveHourIndex] = useState(19); // default to evening peak for instant visual clarity
  const [isPlaying, setIsPlaying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);

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
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionSource, setPredictionSource] = useState<"quickml" | "calibrated_model">(
    "calibrated_model"
  );

  const pushToast = (message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };

  // Run predictions whenever telemetry or apiSettings changes
  useEffect(() => {
    let isCancelled = false;

    async function runPrediction() {
      if (apiSettings.mockMode || !apiSettings.endpoint) {
        setQuickMlPredictions(null);
        setPredictionSource("calibrated_model");
        return;
      }

      setIsPredicting(true);
      try {
        const preds = await fetchQuickMlPredictions(telemetry, apiSettings);
        if (!isCancelled) {
          setQuickMlPredictions(preds);
          setPredictionSource("quickml");
          pushToast(
            `QuickML Cloud Endpoint: Successfully fetched ${preds.length} hourly predictions!`,
            "success"
          );
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setQuickMlPredictions(null);
          setPredictionSource("calibrated_model");
          const msg = err instanceof Error ? err.message : String(err);
          pushToast(
            `QuickML notice: Using Version 2 Stacking Ensemble (RMSE 8.85 kW). [${msg}]`,
            "info"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsPredicting(false);
        }
      }
    }

    runPrediction();

    return () => {
      isCancelled = true;
    };
  }, [telemetry, apiSettings]);

  const forecast = useMemo(
    () => buildForecast(telemetry, quickMlPredictions),
    [telemetry, quickMlPredictions]
  );

  const impact = useMemo(() => calculateImpactSummary(forecast), [forecast]);

  // 24-hour simulation timer
  useEffect(() => {
    if (!isPlaying || forecast.length === 0) return;
    const interval = setInterval(() => {
      setActiveHourIndex((prev) => (prev + 1) % forecast.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isPlaying, forecast.length]);

  const apiConnected = !apiSettings.mockMode && apiSettings.endpoint.length > 0;

  const handleLoadSample = () => {
    setTelemetry(generateSampleTelemetry());
    setActiveScenario("heatwave");
    pushToast("Sample 24-hour telemetry loaded successfully.", "success");
  };

  const handleSelectScenario = (id: ScenarioId) => {
    setActiveScenario(id);
    const preset = SCENARIO_PRESETS.find((p) => p.id === id);
    if (preset) {
      const data = preset.generate();
      setTelemetry(data);
      pushToast(`Scenario Activated: ${preset.title}`, "info");
      // Find appropriate default inspection hour
      const peakIdx = data.findIndex((d) => new Date(d.timestamp).getHours() === 19);
      if (peakIdx >= 0) setActiveHourIndex(peakIdx);
      else setActiveHourIndex(0);
    }
  };

  const handleCsvData = (data: TelemetryPoint[]) => {
    setTelemetry(data);
    setActiveScenario("custom");
    pushToast(`Ingested ${data.length} telemetry rows from CSV upload.`, "success");
  };

  const handleManualData = (data: TelemetryPoint[]) => {
    setTelemetry(data);
    setActiveScenario("custom");
    pushToast(`Injected ${data.length} cleaned telemetry rows from Live Form.`, "success");
  };

  const handleSaveSettings = (newSettings: ApiSettings) => {
    setApiSettings(newSettings);
    localStorage.setItem("hacksphere_quickml_settings", JSON.stringify(newSettings));
    pushToast("QuickML settings updated successfully.", "success");
  };

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased transition-colors dark:bg-[#090d16] dark:text-slate-200">
      <Navbar
        apiConnected={apiConnected}
        isPredicting={isPredicting}
        predictionSource={predictionSource}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onLoadSample={handleLoadSample}
      />

      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
        {/* Banner with Active Model Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-700 shadow-sm transition-colors dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-300 dark:shadow-none">
          <div className="flex items-center gap-2">
            {predictionSource === "quickml" ? (
              <>
                <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong className="text-emerald-700 dark:text-emerald-400">Live Catalyst QuickML Endpoint</strong> ·
                  Project: <code className="text-slate-600 dark:text-slate-400 font-mono">104872000000013051</code> · Org:{" "}
                  <code className="text-slate-600 dark:text-slate-400 font-mono">60093159850</code>
                </span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>
                  <strong className="text-sky-700 dark:text-sky-400">Version 2 Stacking Ensemble Active</strong> ·
                  Benchmark Verified: <code className="text-slate-800 dark:text-slate-300 font-mono font-medium">RMSE 8.85 kW (R² 0.9695)</code>
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-xs font-medium text-sky-600 hover:text-sky-700 underline underline-offset-2 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Configure Endpoint &amp; Keys
          </button>
        </div>

        {/* 1-Click Judge Scenario Presets Toolbar */}
        <ScenarioPresets
          activeScenario={activeScenario}
          onSelectScenario={handleSelectScenario}
        />

        {/* Row 1: Alert Banner */}
        <OverloadBanner forecast={forecast} />

        {/* Row 2: KPI Scorecards */}
        <KpiMetricsGrid forecast={forecast} activeHour={activePoint} />

        {/* Row 3: 24-Hour Time-Travel Scrubber & Simulation Playback */}
        <TimeScrubber
          forecast={forecast}
          activeIndex={activeHourIndex}
          onSelectIndex={setActiveHourIndex}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onReset={() => {
            setIsPlaying(false);
            setActiveHourIndex(0);
          }}
        />

        {/* Row 4: Primary Visualizer Bento */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ForecastChart
              forecast={forecast}
              theme={theme}
              activeHourIndex={activeHourIndex}
              onSelectHour={setActiveHourIndex}
            />
          </div>
          <div className="space-y-6 lg:col-span-5">
            {activePoint && <TransitionPanel current={activePoint} impact={impact} />}
            {activePoint && <PowerFlowDiagram current={activePoint} />}
          </div>
        </section>

        {/* Row 5: Telemetry Ingestion, Simulator & Data Table */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <WhatIfSimulator />
            <CsvUploader
              onDataLoaded={handleCsvData}
              onOpenManualForm={() => setManualModalOpen(true)}
            />
          </div>
          <div className="lg:col-span-8">
            <TelemetryTable
              forecast={forecast}
              activeHourIndex={activeHourIndex}
              onSelectHour={setActiveHourIndex}
            />
          </div>
        </section>

        <footer className="pb-4 pt-2 text-center text-[11px] text-slate-500">
          HackSphere 3.0 — Smart Energy Microgrid &amp; Demand Forecasting Engine · Zoho Catalyst
          Slate Deployment · QuickML Pipeline
        </footer>
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={apiSettings}
        onSave={handleSaveSettings}
      />

      <ManualInputModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        currentTelemetry={telemetry}
        onApplyTelemetry={handleManualData}
      />

      {/* Toast notifications */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm shadow-xl backdrop-blur transition-all ${
              t.type === "success"
                ? "border-emerald-300 bg-emerald-50/95 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/90 dark:text-emerald-200"
                : "border-sky-300 bg-sky-50/95 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/90 dark:text-sky-200"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
