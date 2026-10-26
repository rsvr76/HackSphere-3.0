import { Database, Loader2, Moon, Settings, Sparkles, Sun, UploadCloud, Zap } from "lucide-react";

export default function Navbar({
  apiConnected,
  isPredicting,
  predictionSource,
  theme,
  onToggleTheme,
  onOpenSettings,
  onLoadSample,
}: {
  apiConnected: boolean;
  isPredicting?: boolean;
  predictionSource?: "quickml" | "calibrated_model";
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onLoadSample: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-[#090d16]/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-sky-600 shadow-lg shadow-emerald-500/20">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              HackSphere 3.0
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Smart Microgrid Controller</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Active Inference Engine Badge */}
          <div
            className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-100/90 px-3 py-1.5 text-xs font-medium text-slate-700 sm:flex dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
            aria-label="Inference engine status"
          >
            {isPredicting ? (
              <Loader2 className="h-3 w-3 animate-spin text-sky-500 dark:text-sky-400" />
            ) : (
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    predictionSource === "quickml" ? "bg-emerald-500" : "bg-sky-500"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    predictionSource === "quickml" ? "bg-emerald-500" : "bg-sky-500"
                  }`}
                />
              </span>
            )}

            {predictionSource === "quickml" ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> QuickML Live API
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-sky-700 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" /> Stacking Ensemble (RMSE 8.85 kW)
              </span>
            )}
          </div>

          {/* Theme Switcher Toggle (Light / Dark) */}
          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12" />
            )}
          </button>

          <button
            onClick={onLoadSample}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Load Sample Data</span>
            <span className="sm:hidden">Sample</span>
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Open API settings"
            title="Configure Catalyst QuickML Endpoint"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
