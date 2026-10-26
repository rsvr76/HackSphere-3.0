import { useMemo, useState } from "react";
import { FlaskConical, Scale, Zap } from "lucide-react";
import { evaluateGridState, heuristicDemandModel } from "../utils/microgridLogic";
import StatusPill from "./StatusPill";

interface EdgeCasePreset {
  label: string;
  hour: number;
  temp: number;
  humidity: number;
  solar: number;
  tooltip: string;
}

const EDGE_CASE_PRESETS: EdgeCasePreset[] = [
  {
    label: "160 kW Boundary",
    hour: 14,
    temp: 23.5,
    humidity: 45,
    solar: 500,
    tooltip: "Tests strict > 160 kW inequality at off-peak 14:00",
  },
  {
    label: "Evening Priority (19:00)",
    hour: 19,
    temp: 14.0,
    humidity: 40,
    solar: 0,
    tooltip: "Tests 18-22h peak window triggering Renewable Mode despite lower demand",
  },
  {
    label: "Overload (≥200 kW)",
    hour: 15,
    temp: 36.5,
    humidity: 60,
    solar: 750,
    tooltip: "Tests independent Critical Overload Alert during extreme heat",
  },
  {
    label: "Night Base (88 kW)",
    hour: 3,
    temp: 16.0,
    humidity: 75,
    solar: 0,
    tooltip: "Tests standard Main Grid base load safe operation",
  },
];

export default function WhatIfSimulator() {
  const [hour, setHour] = useState(20);
  const [temp, setTemp] = useState(32);
  const [humidity, setHumidity] = useState(55);
  const [solar, setSolar] = useState(100);

  const result = useMemo(() => {
    const ts = new Date();
    ts.setHours(hour, 0, 0, 0);
    const demand = heuristicDemandModel({
      timestamp: ts.toISOString(),
      ambient_temp_c: temp,
      humidity_pct: humidity,
      solar_irradiance_wm2: solar,
    });
    return evaluateGridState(demand, ts.toISOString());
  }, [hour, temp, humidity, solar]);

  const applyPreset = (preset: EdgeCasePreset) => {
    setHour(preset.hour);
    setTemp(preset.temp);
    setHumidity(preset.humidity);
    setSolar(preset.solar);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-none">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            "What-If" Telemetry Simulator
          </h2>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <Scale className="h-3.5 w-3.5" /> Rule Auditor
        </span>
      </div>

      {/* 1-Click Rule Testing Presets */}
      <div className="mb-4">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Judge Edge-Case Tests (1-Click)
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {EDGE_CASE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              title={p.tooltip}
              className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-800 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <SliderField label="Hour of Day" value={hour} min={0} max={23} step={1} unit=":00" onChange={setHour} />
        <SliderField label="Ambient Temperature" value={temp} min={5} max={45} step={0.5} unit="°C" onChange={setTemp} />
        <SliderField label="Relative Humidity" value={humidity} min={10} max={100} step={1} unit="%" onChange={setHumidity} />
        <SliderField label="Solar Irradiance" value={solar} min={0} max={1000} step={10} unit=" W/m²" onChange={setSolar} />
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-950/50 dark:shadow-none">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-400">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Simulated Demand
          </span>
          <StatusPill color={result.statusColor} pulse>
            {result.isOverload ? "OVERLOAD" : result.mode === "RENEWABLE_STORAGE" ? "RENEWABLE" : "MAIN GRID"}
          </StatusPill>
        </div>
        <p
          className={`mt-1.5 text-2xl font-bold tabular-nums ${
            result.isOverload ? "text-rose-600 dark:text-rose-400" : "text-slate-950 dark:text-slate-50"
          }`}
        >
          {result.demandKw.toFixed(1)} <span className="text-sm font-medium text-slate-500">kW</span>
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{result.reason}</p>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-400">{label}</label>
        <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-slate-200">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600 dark:bg-slate-800 dark:accent-emerald-500"
        aria-label={label}
      />
    </div>
  );
}
