import { useState } from "react";
import { AlertCircle, CheckCircle2, Edit3, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import type { TelemetryPoint } from "../utils/microgridLogic";
import { cleanAndValidateTelemetry } from "../utils/sampleData";

interface ManualInputModalProps {
  open: boolean;
  onClose: () => void;
  currentTelemetry: TelemetryPoint[];
  onApplyTelemetry: (data: TelemetryPoint[]) => void;
}

export default function ManualInputModal({
  open,
  onClose,
  currentTelemetry,
  onApplyTelemetry,
}: ManualInputModalProps) {
  const [rows, setRows] = useState<Array<Partial<TelemetryPoint>>>(() =>
    currentTelemetry.length > 0
      ? currentTelemetry.slice(0, 12).map((t) => ({ ...t }))
      : [
          {
            timestamp: new Date().toISOString(),
            ambient_temp_c: 28.5,
            humidity_pct: 55,
            solar_irradiance_wm2: 600,
          },
        ]
  );

  const [repairs, setRepairs] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState(false);

  if (!open) return null;

  const handleRowChange = (index: number, field: keyof TelemetryPoint, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: field === "timestamp" ? value : Number(value),
      };
      return copy;
    });
    setValidationSuccess(false);
  };

  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    let nextDate = new Date();
    if (lastRow?.timestamp && !isNaN(new Date(lastRow.timestamp).getTime())) {
      nextDate = new Date(lastRow.timestamp);
      nextDate.setHours(nextDate.getHours() + 1);
    }
    setRows((prev) => [
      ...prev,
      {
        timestamp: nextDate.toISOString(),
        ambient_temp_c: 25.0,
        humidity_pct: 50.0,
        solar_irradiance_wm2: 400.0,
      },
    ]);
    setValidationSuccess(false);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
    setValidationSuccess(false);
  };

  const handleCleanAndValidate = () => {
    const result = cleanAndValidateTelemetry(rows);
    setRows(result.cleanedData);
    setRepairs(result.repairs);
    setWarnings(result.warnings);
    setValidationSuccess(result.isValid);
  };

  const handleApply = () => {
    const result = cleanAndValidateTelemetry(rows);
    if (result.isValid) {
      onApplyTelemetry(result.cleanedData);
      onClose();
    } else {
      setWarnings(["Cannot apply invalid telemetry stream."]);
    }
  };

  const handleLoadFull24h = () => {
    setRows(currentTelemetry.map((t) => ({ ...t })));
    setRepairs([]);
    setWarnings([]);
    setValidationSuccess(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm dark:bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-input-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900/95">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h2 id="manual-input-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Live Telemetry Form &amp; Data Cleaner
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct manual input, bounds checking, and missing-value imputation (Problem Statement Sec. 3.2)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close form"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5" /> Add Hour Row
            </button>
            <button
              onClick={handleLoadFull24h}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-500" /> Populate Full 24 Hours
            </button>
          </div>

          <button
            onClick={handleCleanAndValidate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300"
          >
            <Wand2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Clean &amp; Auto-Repair
          </button>
        </div>

        {/* Table of manual inputs */}
        <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 border-b border-slate-200 bg-slate-100/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <tr>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">#</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Timestamp</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Temp (°C)</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Humidity (%)</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Solar (W/m²)</th>
                <th className="px-3 py-2 text-center font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Del</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-t border-slate-200/80 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/30"
                >
                  <td className="px-3 py-1.5 font-mono text-slate-400">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.timestamp ?? ""}
                      onChange={(e) => handleRowChange(idx, "timestamp", e.target.value)}
                      placeholder="YYYY-MM-DDTHH:MM:SSZ"
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="0.5"
                      value={row.ambient_temp_c ?? ""}
                      onChange={(e) => handleRowChange(idx, "ambient_temp_c", e.target.value)}
                      placeholder="25.0"
                      className="w-20 rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="1"
                      value={row.humidity_pct ?? ""}
                      onChange={(e) => handleRowChange(idx, "humidity_pct", e.target.value)}
                      placeholder="50"
                      className="w-20 rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="10"
                      value={row.solar_irradiance_wm2 ?? ""}
                      onChange={(e) => handleRowChange(idx, "solar_irradiance_wm2", e.target.value)}
                      placeholder="500"
                      className="w-24 rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => handleRemoveRow(idx)}
                      disabled={rows.length <= 1}
                      aria-label="Remove row"
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-rose-500 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Diagnostic Output / Auto-Repair Feedback */}
        {(repairs.length > 0 || warnings.length > 0 || validationSuccess) && (
          <div className="mt-3 max-h-24 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
            {validationSuccess && (
              <p className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Schema Verified: {rows.length} telemetry points cleaned and ready.
              </p>
            )}
            {repairs.map((r, i) => (
              <p key={i} className="text-[11px] text-amber-700 dark:text-amber-400">
                • {r}
              </p>
            ))}
            {warnings.map((w, i) => (
              <p key={i} className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3 w-3 shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
          <span className="text-[11px] text-slate-500">
            {rows.length} row{rows.length > 1 ? "s" : ""} loaded
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Inject Into Microgrid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
