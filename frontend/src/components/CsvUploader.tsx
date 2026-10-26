import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Edit3, FileSpreadsheet, UploadCloud } from "lucide-react";
import type { TelemetryPoint } from "../utils/microgridLogic";
import { parseTelemetryCsv, telemetryToCsv, generateSampleTelemetry } from "../utils/sampleData";

export default function CsvUploader({
  onDataLoaded,
  onOpenManualForm,
}: {
  onDataLoaded: (data: TelemetryPoint[]) => void;
  onOpenManualForm?: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setErrors([]);
      setSuccess(null);
      setFileName(file.name);

      if (!file.name.toLowerCase().endsWith(".csv")) {
        setErrors(["Invalid file type. Only .csv files are accepted."]);
        return;
      }

      setProgress(20);
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) setProgress(20 + Math.round((e.loaded / e.total) * 60));
      };
      reader.onload = () => {
        setProgress(90);
        const text = String(reader.result ?? "");
        const { data, errors: parseErrors } = parseTelemetryCsv(text);
        setProgress(100);

        if (parseErrors.length > 0) {
          setErrors(parseErrors.slice(0, 6));
        }
        if (data.length > 0) {
          onDataLoaded(data);
          setSuccess(`Loaded ${data.length} hourly telemetry rows — schema verified.`);
        }
        setTimeout(() => setProgress(0), 800);
      };
      reader.onerror = () => {
        setErrors(["Failed to read file."]);
        setProgress(0);
      };
      reader.readAsText(file);
    },
    [onDataLoaded]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const downloadSample = () => {
    const sample = generateSampleTelemetry();
    const csv = telemetryToCsv(sample);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_test_input.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Telemetry Ingestion</h2>
        </div>
        <div className="flex items-center gap-2">
          {onOpenManualForm && (
            <button
              onClick={onOpenManualForm}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <Edit3 className="h-3.5 w-3.5" /> Manual Form &amp; Cleaner
            </button>
          )}
          <button
            onClick={downloadSample}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            <Download className="h-3.5 w-3.5" /> Download Sample CSV
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label="CSV upload drop zone"
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging
            ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/5"
            : "border-slate-300 bg-slate-50/80 hover:border-slate-400 hover:bg-slate-100/50 dark:border-slate-700 dark:bg-slate-950/30 dark:hover:border-slate-600"
        }`}
      >
        <UploadCloud className={`h-7 w-7 ${dragging ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`} />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Drag &amp; drop CSV, or <span className="font-semibold text-emerald-600 dark:text-emerald-400">browse</span>
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          Schema: timestamp, ambient_temp_c, humidity_pct, solar_irradiance_wm2
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />
      </div>

      {progress > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-200 dark:bg-emerald-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {fileName && errors.length === 0 && success && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-900 shadow-xs dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-3 space-y-1 rounded-lg border border-rose-300 bg-rose-50/90 px-3 py-2 text-xs font-medium text-rose-900 shadow-xs dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
