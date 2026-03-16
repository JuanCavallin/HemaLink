"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useApi } from "@/lib/api";
import { getTipsForDisease } from "@/components/ResultsSummary";
import {
  DISEASE_COLORS,
  CHART,
  TOOLTIP_STYLE,
  TONE_CLASSES,
  CARD,
  CARD_ALERT,
  BTN_SM,
  PAGE,
  TEXT_MUTED,
  TEXT_LABEL,
  TEXT_ERROR,
  TEXT_BODY,
  TABLE_HEADER_TEXT,
  TABLE_ROW_UNHEALTHY,
  TABLE_ROW_HEALTHY,
  BORDER_MUTED,
} from "@/lib/styles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HistoryPoint  = { date: string; value: number };
type DiseasePoint  = { date: string; label: string; confidence: number | null };

type MarkerValue = {
  value?: number | string;
  range?: string;
  change?: number | null;
  healthy?: boolean;
  prev_healthy?: boolean | null;
  low?: number | null;
  high?: number | null;
};

type SummaryResponse = {
  message?: string;
  values?: Record<string, MarkerValue>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, string> = {
  Hemoglobin: "CBC", RBC: "CBC", WBC: "CBC", Hematocrit: "CBC",
  MCV: "CBC", MCH: "CBC", MCHC: "CBC", Platelets: "CBC",
  Fasting_Blood_Glucose: "Metabolic / Diabetes", HbA1c: "Metabolic / Diabetes",
  Insulin_Levels: "Metabolic / Diabetes", HOMA_IR: "Metabolic / Diabetes",
  OGTT: "Metabolic / Diabetes", Fructosamine_Levels: "Metabolic / Diabetes",
  C_Peptide: "Metabolic / Diabetes", Proinsulin_Levels: "Metabolic / Diabetes",
  Uric_Acid_Levels: "Metabolic / Diabetes",
  LDL_Cholesterol: "Lipid Panel", HDL_Cholesterol: "Lipid Panel",
  Triglyceride_Levels: "Lipid Panel",
  TSH: "Thyroid", T3: "Thyroid", TT4: "Thyroid",
  T4U: "Thyroid", FTI: "Thyroid", TBG: "Thyroid",
  Creatinine_Levels: "Kidney / CKD", eGFR: "Kidney / CKD",
  ALT: "Liver", AST: "Liver",
  CRP_Levels: "Inflammation",
};

const CATEGORY_ORDER = [
  "CBC", "Metabolic / Diabetes", "Lipid Panel", "Thyroid",
  "Kidney / CKD", "Liver", "Inflammation", "Other",
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function prettyKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

/** Normalize ML prediction to 0–100 risk scale. */
function riskScore(label: string, confidence: number | null): number | null {
  if (confidence === null) return null;
  if (label === "Positive") return confidence;
  if (label === "Negative") return 100 - confidence;
  return null;
}

/** Tone for a disease risk delta. */
function riskChangeTone(delta: number): "good" | "bad" | "neutral" {
  if (Math.abs(delta) <= 5) return "neutral";
  return delta < 0 ? "good" : "bad";
}

/** Tone for a biomarker change relative to healthy range. */
function getChangeTone(val: MarkerValue): "good" | "bad" | "neutral" | null {
  const change = val.change;
  if (change === null || change === undefined) return null;
  const healthy = val.healthy ?? true;
  const prevHealthy = val.prev_healthy;
  const current = typeof val.value === "number" ? val.value : null;
  const low = val.low ?? null;
  const high = val.high ?? null;
  if (low === null && high === null) return null;
  if (healthy && prevHealthy !== false) return "neutral";
  if (healthy && prevHealthy === false) return "good";
  if (!healthy && prevHealthy === true) return "bad";
  if (!healthy && prevHealthy === false && current !== null) {
    if (high !== null && current > high) return change < 0 ? "good" : "bad";
    if (low  !== null && current < low)  return change > 0 ? "good" : "bad";
  }
  return "neutral";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalysisPage() {
  const { apiFetch } = useApi();

  // ── Graph mode toggle ──────────────────────────────────────────────────────
  const [graphMode, setGraphMode] = useState<"disease" | "biomarker">("disease");

  // ── Biomarker chart state ──────────────────────────────────────────────────
  const [biomarkers, setBiomarkers]         = useState<string[]>([]);
  const [selected,   setSelected]           = useState<string>("");
  const [history,    setHistory]            = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError,   setHistoryError]   = useState<string | null>(null);

  // ── Disease chart state ────────────────────────────────────────────────────
  const [diseaseHistory,  setDiseaseHistory]  = useState<Record<string, DiseasePoint[]>>({});
  const [diseaseLoading,  setDiseaseLoading]  = useState(false);
  const [diseaseError,    setDiseaseError]    = useState<string | null>(null);
  const [visibleDiseases, setVisibleDiseases] = useState<Set<string>>(new Set());

  // ── Summary table state ────────────────────────────────────────────────────
  const [summary,        setSummary]        = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError,   setSummaryError]   = useState<string | null>(null);

  // ── Category filter ────────────────────────────────────────────────────────
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(["All"]));

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadBiomarkers();
    loadDiseaseHistory();
    loadSummary();
  }, []);

  async function loadBiomarkers() {
    try {
      const res = await apiFetch("/analysis/biomarkers");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: string[] = await res.json();
      setBiomarkers(data);
      if (data.length > 0) setSelected(data[0]);
    } catch (err: any) {
      console.warn("Could not load biomarkers:", err);
    }
  }

  async function loadDiseaseHistory() {
    setDiseaseLoading(true);
    setDiseaseError(null);
    try {
      const res = await apiFetch("/analysis/disease-history");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, DiseasePoint[]> = await res.json();
      setDiseaseHistory(data);
      setVisibleDiseases(new Set(Object.keys(data)));
    } catch (err: any) {
      setDiseaseError(err?.message || "Failed to load disease history");
    } finally {
      setDiseaseLoading(false);
    }
  }

  async function loadSummary() {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await apiFetch("/analyzeuserdata");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setSummary(await res.json());
    } catch (err: any) {
      setSummaryError(err?.message || "Failed to load summary");
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(() => {
    if (!selected) return;
    loadHistory(selected);
  }, [selected]);

  async function loadHistory(code: string) {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await apiFetch(`/analysis/history?biomarker=${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setHistory(await res.json());
    } catch (err: any) {
      setHistoryError(err?.message || "Failed to load history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  // ── Derived: biomarker chart stats ─────────────────────────────────────────
  const latestValue = history.length > 0 ? history[history.length - 1].value : null;
  const prevValue   = history.length > 1 ? history[history.length - 2].value : null;
  const delta =
    latestValue !== null && prevValue !== null && prevValue !== 0
      ? (((latestValue - prevValue) / prevValue) * 100).toFixed(1)
      : null;

  const selectedSummary = summary?.values?.[selected];
  const deltaTone = selectedSummary
    ? getChangeTone({ ...selectedSummary, change: delta !== null ? parseFloat(delta) : null })
    : null;

  // ── Derived: disease chart data ────────────────────────────────────────────
  // Merge all disease histories onto a shared date axis
  const diseaseChartData = useMemo(() => {
    const dateMap: Record<string, Record<string, number | null>> = {};
    for (const [disease, points] of Object.entries(diseaseHistory)) {
      for (const p of points) {
        if (!dateMap[p.date]) dateMap[p.date] = {};
        dateMap[p.date][disease] = riskScore(p.label, p.confidence);
      }
    }
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, [diseaseHistory]);

  // Per-disease latest & prev risk scores for stats row
  const diseaseStats = useMemo(() => {
    const out: Record<string, { latest: number | null; prev: number | null }> = {};
    for (const [disease, points] of Object.entries(diseaseHistory)) {
      const scores = points
        .map((p) => riskScore(p.label, p.confidence))
        .filter((s): s is number => s !== null);
      out[disease] = {
        latest: scores.length > 0 ? scores[scores.length - 1] : null,
        prev:   scores.length > 1 ? scores[scores.length - 2] : null,
      };
    }
    return out;
  }, [diseaseHistory]);

  // At-risk diseases (latest risk ≥ 50) with non-empty tips
  const atRiskDiseases = useMemo(
    () =>
      Object.keys(DISEASE_COLORS).filter((d) => {
        const s = diseaseStats[d];
        return s?.latest !== null && (s?.latest ?? 0) >= 50 && getTipsForDisease(d).length > 0;
      }),
    [diseaseStats]
  );

  // ── Derived: summary table grouping ───────────────────────────────────────
  const summaryEntries = summary?.values ? Object.entries(summary.values) : [];

  const grouped = useMemo(() => {
    const map: Record<string, [string, MarkerValue][]> = {};
    for (const [key, val] of summaryEntries) {
      const cat = CATEGORY_MAP[key] ?? "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push([key, val]);
    }
    for (const cat of Object.keys(map)) {
      map[cat].sort(([, a], [, b]) => {
        const aH = Boolean(a?.healthy ?? true);
        const bH = Boolean(b?.healthy ?? true);
        if (!aH && bH) return -1;
        if (aH && !bH) return 1;
        return 0;
      });
    }
    return map;
  }, [summaryEntries]);

  const presentCategories = CATEGORY_ORDER.filter((cat) => (grouped[cat]?.length ?? 0) > 0);

  // ── Category filter toggle ─────────────────────────────────────────────────
  const SPECIAL_FILTERS = new Set(["All", "Healthy", "Unhealthy"]);

  function toggleCategory(cat: string) {
    if (SPECIAL_FILTERS.has(cat)) {
      setActiveCategories(new Set([cat]));
      return;
    }
    setActiveCategories((prev) => {
      const next = new Set(prev);
      SPECIAL_FILTERS.forEach((s) => next.delete(s));
      if (next.has(cat)) {
        next.delete(cat);
        if (next.size === 0) next.add("All");
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  const allHealthyCategories    = presentCategories.filter((c) =>
    (grouped[c] ?? []).every(([, val]) => Boolean(val?.healthy ?? true))
  );
  const someUnhealthyCategories = presentCategories.filter(
    (c) => !allHealthyCategories.includes(c)
  );

  const visibleCategories = activeCategories.has("All")
    ? presentCategories
    : activeCategories.has("Healthy")
    ? allHealthyCategories
    : activeCategories.has("Unhealthy")
    ? someUnhealthyCategories
    : presentCategories.filter((c) => activeCategories.has(c));

  // ── Toggle disease visibility ──────────────────────────────────────────────
  function toggleDisease(d: string) {
    setVisibleDiseases((prev) => {
      const next = new Set(prev);
      if (next.has(d)) { next.delete(d); } else { next.add(d); }
      return next;
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className={PAGE}>
      <div className="w-full max-w-4xl space-y-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-bold">Analysis</h2>
          <button
            onClick={() => { loadBiomarkers(); loadDiseaseHistory(); loadSummary(); }}
            className={BTN_SM}
          >
            Refresh
          </button>
        </div>

        {/* ── Graph mode toggle ── */}
        <div className="flex gap-1 rounded-lg border border-rose-900/40 bg-rose-950/10 p-1 w-fit">
          {(["disease", "biomarker"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setGraphMode(mode)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                graphMode === mode
                  ? "bg-rose-800/70 text-white border border-rose-700/50"
                  : "text-rose-200/50 hover:text-rose-100"
              }`}
            >
              {mode === "disease" ? "Disease Risk" : "Biomarker"}
            </button>
          ))}
        </div>

        {/* ══ Disease Risk Chart ══════════════════════════════════════════════ */}
        {graphMode === "disease" && (
          <>
            <section className={`${CARD} p-6 space-y-5`}>
              <h2 className="text-xl font-semibold">Disease Risk Trend</h2>

              {diseaseLoading && <p className={TEXT_MUTED}>Loading...</p>}
              {diseaseError   && <p className={`text-sm ${TEXT_ERROR}`}>Error: {diseaseError}</p>}

              {!diseaseLoading && !diseaseError && (
                <>
                  {diseaseChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={diseaseChartData}
                        margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: CHART.axisTick, fontSize: 11 }}
                          tickFormatter={(v: string) => v.slice(0, 10)}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: CHART.axisTick, fontSize: 11 }}
                          width={48}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelFormatter={(v: string) => `Date: ${String(v).slice(0, 10)}`}
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`,
                            name,
                          ]}
                        />
                        <ReferenceLine
                          y={50}
                          stroke={CHART.referenceLine}
                          strokeDasharray="4 4"
                          label={{ value: "At Risk Threshold", fill: CHART.referenceLine, fontSize: 11, position: "insideTopLeft" }}
                        />
                        {Object.keys(DISEASE_COLORS).map((d) =>
                          visibleDiseases.has(d) ? (
                            <Line
                              key={d}
                              type="monotone"
                              dataKey={d}
                              stroke={DISEASE_COLORS[d]}
                              strokeWidth={2}
                              dot={{ r: 4, fill: DISEASE_COLORS[d] }}
                              activeDot={{ r: 6 }}
                              connectNulls
                              name={d}
                            />
                          ) : null
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className={TEXT_MUTED}>
                      No disease history yet — upload a lab report to see trends.
                    </p>
                  )}

                  {/* Disease toggle pills */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(DISEASE_COLORS).map(([d, color]) => {
                      const on = visibleDiseases.has(d);
                      return (
                        <button
                          key={d}
                          onClick={() => toggleDisease(d)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            on
                              ? "border-rose-700/60 bg-rose-900/30 text-white"
                              : "border-rose-900/30 bg-rose-950/10 text-rose-300/50"
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: on ? color : CHART.referenceLine }}
                          />
                          {d}
                        </button>
                      );
                    })}
                  </div>

                  {/* Per-disease stats row */}
                  {Object.keys(DISEASE_COLORS).some(
                    (d) => visibleDiseases.has(d) && diseaseStats[d]?.latest !== null
                  ) && (
                    <div className={`flex flex-wrap gap-6 text-sm border-t ${BORDER_MUTED} pt-4`}>
                      {Object.entries(DISEASE_COLORS).map(([d, color]) => {
                        if (!visibleDiseases.has(d)) return null;
                        const stats = diseaseStats[d];
                        if (!stats || stats.latest === null) return null;
                        const delta =
                          stats.prev !== null ? stats.latest - stats.prev : null;
                        const tone = delta !== null ? riskChangeTone(delta) : null;
                        return (
                          <div key={d} className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-rose-300/60">{d}</span>
                            </div>
                            <p className="text-lg font-semibold text-white pl-3.5">
                              {stats.latest.toFixed(1)}%
                            </p>
                            {delta !== null && (
                              <p className={`text-xs pl-3.5 font-medium ${tone ? TONE_CLASSES[tone] : "text-gray-400"}`}>
                                {delta >= 0 ? "+" : ""}
                                {delta.toFixed(1)}%
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ── Risk tips ── */}
            {atRiskDiseases.length > 0 && (
              <section className="space-y-4">
                <h2 className={`text-xl font-semibold ${TEXT_ERROR}`}>Actionable Insights & Next Steps</h2>
                <div className="space-y-4">
                  {atRiskDiseases.map((d) => {
                    const tips = getTipsForDisease(d);
                    const latest = diseaseStats[d]?.latest;
                    return (
                      <div key={d} className={`${CARD_ALERT} p-4`}>
                        <h3 className="text-md font-semibold text-red-300 mb-3">
                          {d} Signal Detected ({latest?.toFixed(1)}% Risk)
                        </h3>
                        <ul className={`list-disc ml-4 space-y-2 text-sm ${TEXT_BODY}`}>
                          {tips.map((tip, i) => (
                            <li key={i} className="pl-1">{tip}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* ══ Biomarker Chart ════════════════════════════════════════════════ */}
        {graphMode === "biomarker" && (
          <section className={`${CARD} p-6 space-y-4`}>
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-xl font-semibold">Biomarker Trend</h2>
              {biomarkers.length > 0 ? (
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="rounded-md border border-rose-900/50 bg-black/40 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-rose-700"
                >
                  {biomarkers.map((b) => (
                    <option key={b} value={b}>{prettyKey(b)}</option>
                  ))}
                </select>
              ) : (
                <span className={TEXT_MUTED}>
                  No data yet — upload a lab report on the Upload page.
                </span>
              )}
            </div>

            {latestValue !== null && (
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-rose-300/60">Latest</span>
                  <p className="text-lg font-semibold text-white">{latestValue}</p>
                </div>
                {prevValue !== null && (
                  <div>
                    <span className="text-rose-300/60">Previous</span>
                    <p className="text-lg font-semibold text-white">{prevValue}</p>
                  </div>
                )}
                {delta !== null && (
                  <div>
                    <span className="text-rose-300/60">Change</span>
                    <p className={`text-lg font-semibold ${
                      deltaTone
                        ? TONE_CLASSES[deltaTone]
                        : parseFloat(delta) >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {parseFloat(delta) >= 0 ? "+" : ""}{delta}%
                    </p>
                  </div>
                )}
              </div>
            )}

            {historyLoading && <p className={TEXT_MUTED}>Loading chart...</p>}
            {historyError   && <p className={`text-sm ${TEXT_ERROR}`}>Error: {historyError}</p>}
            {!historyLoading && !historyError && history.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: CHART.axisTick, fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(0, 10)}
                  />
                  <YAxis tick={{ fill: CHART.axisTick, fontSize: 11 }} width={48} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(v: string) => `Date: ${String(v).slice(0, 10)}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={CHART.biomarkerLine}
                    strokeWidth={2}
                    dot={{ r: 4, fill: CHART.biomarkerLine }}
                    activeDot={{ r: 6 }}
                    name={prettyKey(selected)}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {!historyLoading && !historyError && history.length === 0 && selected && (
              <p className={TEXT_MUTED}>
                No history yet for <strong>{prettyKey(selected)}</strong>.
              </p>
            )}
          </section>
        )}

        {/* ══ Latest Values Table ════════════════════════════════════════════ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Detailed Blood Test Results</h2>

          {summaryLoading && <p className={TEXT_MUTED}>Loading...</p>}
          {summaryError   && <p className={`text-sm ${TEXT_ERROR}`}>Error: {summaryError}</p>}
          {!summaryLoading && summaryEntries.length === 0 && !summaryError && (
            <p className={TEXT_MUTED}>No results available.</p>
          )}

          {!summaryLoading && presentCategories.length > 0 && (
            <>
              {/* Category filter bar */}
              <div className="flex flex-wrap items-center gap-2">
                {(["All", "Healthy", "Unhealthy"] as const).map((f) => {
                  const active = activeCategories.has(f);
                  const colorActive =
                    f === "Healthy"   ? "border-green-700/60 bg-green-900/40 text-green-300" :
                    f === "Unhealthy" ? "border-red-700/60 bg-red-900/40 text-red-300" :
                                        "border-rose-700/60 bg-rose-800/60 text-white";
                  const colorInactive =
                    f === "Healthy"   ? "border-rose-900/30 bg-rose-950/10 text-rose-300/50 hover:border-green-800/50 hover:text-green-400/70" :
                    f === "Unhealthy" ? "border-rose-900/30 bg-rose-950/10 text-rose-300/50 hover:border-red-800/50 hover:text-red-400/70" :
                                        "border-rose-900/30 bg-rose-950/10 text-rose-300/50 hover:border-rose-700/40 hover:text-rose-200";
                  return (
                    <button
                      key={f}
                      onClick={() => toggleCategory(f)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? colorActive : colorInactive}`}
                    >
                      {f}
                    </button>
                  );
                })}

                <span className="h-4 w-px bg-rose-900/40" />

                {presentCategories.map((cat) => {
                  const active = activeCategories.has(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "border-rose-700/60 bg-rose-800/60 text-white"
                          : "border-rose-900/30 bg-rose-950/10 text-rose-300/50 hover:border-rose-700/40 hover:text-rose-200"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Category blocks */}
              <div className="space-y-6">
                {visibleCategories.map((cat) => {
                  const rows = grouped[cat] ?? [];
                  const allHealthy = rows.every(([, val]) => Boolean(val?.healthy ?? true));
                  return (
                    <div key={cat} className={`overflow-x-auto ${CARD}`}>
                      <div className="border-b border-rose-900/30 px-4 py-2">
                        {allHealthy ? (
                          <span className="text-sm font-semibold text-green-400">
                            {cat} values are all healthy!
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-white">{cat}</span>
                        )}
                      </div>

                      <table className="w-full table-fixed text-sm">
                        <thead>
                          <tr className={`text-left ${TABLE_HEADER_TEXT}`}>
                            <th className="px-4 py-2 font-normal w-[25%]">Biomarker</th>
                            <th className="px-4 py-2 font-normal w-[25%]">Latest Value</th>
                            <th className="px-4 py-2 font-normal w-[25%]">Healthy Range</th>
                            <th className="px-4 py-2 font-normal w-[25%]">Change vs Prev</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(([key, val]) => {
                            const healthy = Boolean(val?.healthy ?? true);
                            const tone    = getChangeTone(val);
                            const changeNum = val.change;
                            const hasChange = changeNum !== null && changeNum !== undefined;
                            return (
                              <tr
                                key={key}
                                className={
                                  !healthy
                                    ? TABLE_ROW_UNHEALTHY
                                    : TABLE_ROW_HEALTHY
                                }
                              >
                                <td className={`px-4 py-3 font-medium ${!healthy ? "text-red-200" : "text-white"}`}>
                                  {prettyKey(key)}
                                </td>
                                <td className={`px-4 py-3 ${!healthy ? "text-red-200" : TEXT_BODY}`}>
                                  {String(val?.value ?? "N/A")}
                                </td>
                                <td className={`px-4 py-3 ${!healthy ? "text-red-300/70" : "text-rose-300/40"}`}>
                                  {val?.range || "—"}
                                </td>
                                <td className="px-4 py-3">
                                  {hasChange ? (
                                    <span className={`font-medium ${tone ? TONE_CLASSES[tone] : "text-gray-400"}`}>
                                      {(changeNum as number) >= 0 ? "+" : ""}
                                      {changeNum}%
                                    </span>
                                  ) : (
                                    <span className="text-rose-900/60">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

      </div>
    </main>
  );
}
