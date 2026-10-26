import type { TelemetryPoint } from "./microgridLogic";

/**
 * Generates a realistic 24-hour sample telemetry dataset starting at 00:00 today.
 * Mirrors the sample_test_input.csv schema: timestamp, ambient_temp_c, humidity_pct, solar_irradiance_wm2
 */
export function generateSampleTelemetry(seedDate: Date = new Date()): TelemetryPoint[] {
  const base = new Date(seedDate);
  base.setMinutes(0, 0, 0);
  base.setHours(0);

  const points: TelemetryPoint[] = [];

  for (let h = 0; h < 24; h++) {
    const ts = new Date(base);
    ts.setHours(h);

    // temperature: cool overnight, peaks mid-afternoon
    const temp = 21 + 9 * Math.exp(-Math.pow(h - 15, 2) / 30) - 3 * Math.exp(-Math.pow(h - 4, 2) / 10);
    // humidity: inverse of temperature roughly
    const humidity = 70 - 25 * Math.exp(-Math.pow(h - 15, 2) / 40) + 5 * Math.sin(h);
    // solar irradiance: zero at night, peak at noon
    const solar = h >= 6 && h <= 18 ? Math.max(0, 920 * Math.sin(((h - 6) / 12) * Math.PI)) : 0;

    points.push({
      timestamp: ts.toISOString(),
      ambient_temp_c: Number(temp.toFixed(1)),
      humidity_pct: Number(Math.min(95, Math.max(25, humidity)).toFixed(1)),
      solar_irradiance_wm2: Number(solar.toFixed(0)),
    });
  }

  // Inject an evening heatwave spike to guarantee an overload scenario for demo purposes
  points[20].ambient_temp_c = 38.5;
  points[20].humidity_pct = 61;
  points[19].ambient_temp_c = 36.2;

  return points;
}

export const SAMPLE_CSV_HEADER = "timestamp,ambient_temp_c,humidity_pct,solar_irradiance_wm2";

export function telemetryToCsv(points: TelemetryPoint[]): string {
  const rows = points.map(
    (p) => `${p.timestamp},${p.ambient_temp_c},${p.humidity_pct},${p.solar_irradiance_wm2}`
  );
  return [SAMPLE_CSV_HEADER, ...rows].join("\n");
}

export function parseTelemetryCsv(text: string): { data: TelemetryPoint[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { data: [], errors: ["File is empty."] };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["timestamp", "ambient_temp_c", "humidity_pct", "solar_irradiance_wm2"];
  const missing = required.filter((r) => !header.includes(r));

  if (missing.length > 0) {
    return { data: [], errors: [`Missing required column(s): ${missing.join(", ")}`] };
  }

  const idx = {
    timestamp: header.indexOf("timestamp"),
    temp: header.indexOf("ambient_temp_c"),
    humidity: header.indexOf("humidity_pct"),
    solar: header.indexOf("solar_irradiance_wm2"),
  };

  const data: TelemetryPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < required.length) {
      errors.push(`Row ${i + 1}: expected ${required.length} columns, found ${cols.length}.`);
      continue;
    }
    const ts = cols[idx.timestamp]?.trim();
    const temp = Number(cols[idx.temp]);
    const humidity = Number(cols[idx.humidity]);
    const solar = Number(cols[idx.solar]);

    if (!ts || isNaN(new Date(ts).getTime())) {
      errors.push(`Row ${i + 1}: invalid timestamp "${ts}".`);
      continue;
    }
    if (isNaN(temp) || isNaN(humidity) || isNaN(solar)) {
      errors.push(`Row ${i + 1}: non-numeric telemetry value(s).`);
      continue;
    }

    data.push({
      timestamp: new Date(ts).toISOString(),
      ambient_temp_c: temp,
      humidity_pct: humidity,
      solar_irradiance_wm2: solar,
    });
  }

  if (data.length === 0 && errors.length === 0) {
    errors.push("No valid data rows found.");
  }

  return { data, errors };
}

/**
 * Scenario Presets for 1-click demonstration of microgrid edge cases
 */
export type ScenarioId = "heatwave" | "rush_hour" | "solar_surplus" | "baseload";

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  shortDesc: string;
  badge: string;
  color: "rose" | "amber" | "emerald" | "sky";
  generate: () => TelemetryPoint[];
}

export const SCENARIO_PRESETS: ScenarioDefinition[] = [
  {
    id: "heatwave",
    title: "Extreme Summer Heatwave",
    shortDesc: "High ambient temps (>37°C) push AC loads past 200 kW critical capacity.",
    badge: "CRITICAL OVERLOAD",
    color: "rose",
    generate: generateHeatwaveScenario,
  },
  {
    id: "rush_hour",
    title: "Evening Peak Transition",
    shortDesc: "Standard workday with residential rush surge during 18:00–22:00 window.",
    badge: "RENEWABLE SWITCH",
    color: "emerald",
    generate: generateRushHourScenario,
  },
  {
    id: "solar_surplus",
    title: "Midday Solar Surplus",
    shortDesc: "Clear sky with 950+ W/m² solar output charging local battery storage.",
    badge: "SOLAR BUFFERING",
    color: "amber",
    generate: generateSolarSurplusScenario,
  },
  {
    id: "baseload",
    title: "Mild Weather Baseload",
    shortDesc: "Mild 18°C temperature with smooth demand (90–140 kW) on Main Grid.",
    badge: "MAIN GRID STABLE",
    color: "sky",
    generate: generateBaseloadScenario,
  },
];

export function generateHeatwaveScenario(seedDate: Date = new Date()): TelemetryPoint[] {
  const base = new Date(seedDate);
  base.setMinutes(0, 0, 0);
  base.setHours(0);
  const points: TelemetryPoint[] = [];

  for (let h = 0; h < 24; h++) {
    const ts = new Date(base);
    ts.setHours(h);
    // Extreme heat curve: 26°C night, peaking at 38.6°C
    const temp = 26 + 12.6 * Math.exp(-Math.pow(h - 15, 2) / 36);
    const humidity = Math.max(35, 65 - 28 * Math.exp(-Math.pow(h - 15, 2) / 45));
    const solar = h >= 6 && h <= 18 ? Math.max(0, 890 * Math.sin(((h - 6) / 12) * Math.PI)) : 0;

    points.push({
      timestamp: ts.toISOString(),
      ambient_temp_c: Number(temp.toFixed(1)),
      humidity_pct: Number(humidity.toFixed(1)),
      solar_irradiance_wm2: Number(solar.toFixed(0)),
    });
  }
  // Guarantee evening peak overload
  points[18].ambient_temp_c = 36.8;
  points[19].ambient_temp_c = 37.4;
  points[20].ambient_temp_c = 38.2;
  points[21].ambient_temp_c = 35.1;
  return points;
}

export function generateRushHourScenario(seedDate: Date = new Date()): TelemetryPoint[] {
  const base = new Date(seedDate);
  base.setMinutes(0, 0, 0);
  base.setHours(0);
  const points: TelemetryPoint[] = [];

  for (let h = 0; h < 24; h++) {
    const ts = new Date(base);
    ts.setHours(h);
    const temp = 20 + 8 * Math.exp(-Math.pow(h - 15, 2) / 32);
    const humidity = 68 - 20 * Math.exp(-Math.pow(h - 15, 2) / 40);
    const solar = h >= 6 && h <= 18 ? Math.max(0, 820 * Math.sin(((h - 6) / 12) * Math.PI)) : 0;

    points.push({
      timestamp: ts.toISOString(),
      ambient_temp_c: Number(temp.toFixed(1)),
      humidity_pct: Number(humidity.toFixed(1)),
      solar_irradiance_wm2: Number(solar.toFixed(0)),
    });
  }
  // Moderate peak load right in the 18:00-22:00 window (175-195 kW)
  points[18].ambient_temp_c = 28.5;
  points[19].ambient_temp_c = 29.8;
  points[20].ambient_temp_c = 29.2;
  points[21].ambient_temp_c = 27.0;
  return points;
}

export function generateSolarSurplusScenario(seedDate: Date = new Date()): TelemetryPoint[] {
  const base = new Date(seedDate);
  base.setMinutes(0, 0, 0);
  base.setHours(0);
  const points: TelemetryPoint[] = [];

  for (let h = 0; h < 24; h++) {
    const ts = new Date(base);
    ts.setHours(h);
    const temp = 19 + 7 * Math.exp(-Math.pow(h - 14, 2) / 30);
    const humidity = 55 - 15 * Math.sin(h);
    // High solar irradiance reaching 980 W/m²
    const solar = h >= 6 && h <= 18 ? Math.max(0, 980 * Math.sin(((h - 6) / 12) * Math.PI)) : 0;

    points.push({
      timestamp: ts.toISOString(),
      ambient_temp_c: Number(temp.toFixed(1)),
      humidity_pct: Number(humidity.toFixed(1)),
      solar_irradiance_wm2: Number(solar.toFixed(0)),
    });
  }
  return points;
}

export function generateBaseloadScenario(seedDate: Date = new Date()): TelemetryPoint[] {
  const base = new Date(seedDate);
  base.setMinutes(0, 0, 0);
  base.setHours(0);
  const points: TelemetryPoint[] = [];

  for (let h = 0; h < 24; h++) {
    const ts = new Date(base);
    ts.setHours(h);
    // Cool mild day (15-22°C), zero overload, modest evening bump
    const temp = 15 + 6 * Math.exp(-Math.pow(h - 14, 2) / 35);
    const humidity = 65 + 10 * Math.cos(h / 3);
    const solar = h >= 7 && h <= 17 ? Math.max(0, 600 * Math.sin(((h - 7) / 10) * Math.PI)) : 0;

    points.push({
      timestamp: ts.toISOString(),
      ambient_temp_c: Number(temp.toFixed(1)),
      humidity_pct: Number(Math.min(90, Math.max(30, humidity)).toFixed(1)),
      solar_irradiance_wm2: Number(solar.toFixed(0)),
    });
  }
  return points;
}

/**
 * Data Cleaning & Auto-Repair Engine:
 * Validates telemetry vectors, repairs missing values, clamps physical bounds,
 * and outputs detailed diagnostic notices for the user.
 */
export function cleanAndValidateTelemetry(rawPoints: Partial<TelemetryPoint>[]): {
  cleanedData: TelemetryPoint[];
  repairs: string[];
  warnings: string[];
  isValid: boolean;
} {
  const cleanedData: TelemetryPoint[] = [];
  const repairs: string[] = [];
  const warnings: string[] = [];

  let lastValidTemp = 22.0;
  let lastValidHumidity = 60.0;

  for (let i = 0; i < rawPoints.length; i++) {
    const raw = rawPoints[i];
    const hourLabel = `Hour ${i}`;

    let ts = raw.timestamp;
    if (!ts || isNaN(new Date(ts).getTime())) {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(i % 24);
      ts = now.toISOString();
      repairs.push(`${hourLabel}: Missing/invalid timestamp auto-reconstructed to ${ts.slice(11, 16)}.`);
    }

    let temp = Number(raw.ambient_temp_c);
    if (isNaN(temp) || raw.ambient_temp_c === undefined || raw.ambient_temp_c === null) {
      temp = lastValidTemp;
      repairs.push(`${hourLabel}: Missing ambient temperature imputed with forward-fill (${temp.toFixed(1)}°C).`);
    } else if (temp < -20 || temp > 55) {
      const clamped = Math.min(55, Math.max(-20, temp));
      repairs.push(`${hourLabel}: Out-of-bounds temperature (${temp}°C) clamped to ${clamped}°C.`);
      temp = clamped;
    } else {
      lastValidTemp = temp;
    }

    let hum = Number(raw.humidity_pct);
    if (isNaN(hum) || raw.humidity_pct === undefined || raw.humidity_pct === null) {
      hum = lastValidHumidity;
      repairs.push(`${hourLabel}: Missing relative humidity imputed with forward-fill (${hum.toFixed(0)}%).`);
    } else if (hum < 0 || hum > 100) {
      const clamped = Math.min(100, Math.max(0, hum));
      repairs.push(`${hourLabel}: Out-of-bounds humidity (${hum}%) clamped to ${clamped}%.`);
      hum = clamped;
    } else {
      lastValidHumidity = hum;
    }

    let solar = Number(raw.solar_irradiance_wm2);
    if (isNaN(solar) || raw.solar_irradiance_wm2 === undefined || raw.solar_irradiance_wm2 === null) {
      const h = new Date(ts).getHours();
      solar = h >= 6 && h <= 18 ? 500 : 0;
      repairs.push(`${hourLabel}: Missing solar irradiance synthesized from solar elevation (${solar} W/m²).`);
    } else if (solar < 0) {
      repairs.push(`${hourLabel}: Negative solar irradiance (${solar} W/m²) reset to 0 W/m².`);
      solar = 0;
    } else if (solar > 1300) {
      repairs.push(`${hourLabel}: Solar irradiance (${solar} W/m²) clamped to physical atmospheric limit (1300 W/m²).`);
      solar = 1300;
    }

    cleanedData.push({
      timestamp: ts,
      ambient_temp_c: Number(temp.toFixed(1)),
      humidity_pct: Number(hum.toFixed(1)),
      solar_irradiance_wm2: Number(solar.toFixed(0)),
    });
  }

  if (cleanedData.length === 0) {
    warnings.push("Telemetry stream is empty. Minimum 1 row required.");
  }

  return {
    cleanedData,
    repairs,
    warnings,
    isValid: cleanedData.length > 0,
  };
}
