import { Activity, BarChart3, Database, FileSpreadsheet, FlaskConical, LayoutDashboard, Sliders } from "lucide-react";

export type WorkspaceTabId = "overview" | "forecast_dispatch" | "whatif" | "telemetry_model";

interface WorkspaceTabsProps {
  activeTab: WorkspaceTabId;
  onSelectTab: (tab: WorkspaceTabId) => void;
  overloadCount: number;
}

export default function WorkspaceTabs({
  activeTab,
  onSelectTab,
  overloadCount,
}: WorkspaceTabsProps) {
  const tabs = [
    {
      id: "overview" as WorkspaceTabId,
      label: "Overview",
      icon: LayoutDashboard,
      badge: overloadCount > 0 ? `${overloadCount} Alert` : undefined,
      badgeColor: "rose",
    },
    {
      id: "forecast_dispatch" as WorkspaceTabId,
      label: "Forecast & Dispatch",
      icon: FileSpreadsheet,
    },
    {
      id: "whatif" as WorkspaceTabId,
      label: "What-if Lab",
      icon: FlaskConical,
    },
    {
      id: "telemetry_model" as WorkspaceTabId,
      label: "Telemetry & Model",
      icon: Database,
    },
  ];

  return (
    <div className="flex border-b border-slate-200 dark:border-slate-800">
      <nav className="-mb-px flex space-x-2 overflow-x-auto sm:space-x-4" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group inline-flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-bold transition-all whitespace-nowrap sm:text-sm ${
                isActive
                  ? "border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                }`}
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
