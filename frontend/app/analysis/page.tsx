"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useApi } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HistoryPoint = { date: string; value: number };

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
  // CBC
  Hemoglobin: "CBC",
  RBC: "CBC",
  WBC: "CBC",
  Hematocrit: "CBC",
  MCV: "CBC",
  MCH: "CBC",
  MCHC: "CBC",
  Platelets: "CBC",
  // Metabolic / Diabetes
  Fasting_Blood_Glucose: "Metabolic / Diabetes",
  HbA1c: "Metabolic / Diabetes",
  Insulin_Levels: "Metabolic / Diabetes",
  HOMA_IR: "Metabolic / Diabetes",
  OGTT: "Metabolic / Diabetes",
  Fructosamine_Levels: "Metabolic / Diabetes",
  C_Peptide: "Metabolic / Diabetes",
  Proinsulin_Levels: "Metabolic / Diabetes",
  Uric_Acid_Levels: "Metabolic / Diabetes",
  // Lipid Panel
  LDL_Cholesterol: "Lipid Panel",
  HDL_Cholesterol: "Lipid Panel",
  Triglyceride_Levels: "Lipid Panel",
  // Thyroid
  TSH: "Thyroid",
  T3: "Thyroid",
  TT4: "Thyroid",
  T4U: "Thyroid",
  FTI: "Thyroid",
  TBG: "Thyroid",
  // Kidney / CKD
  Creatinine_Levels: "Kidney / CKD",
  eGFR: "Kidney / CKD",
  // Liver
  ALT: "Liver",
  AST: "Liver",
  // Inflammation
  CRP_Levels: "Inflammation",
};

const CATEGORY_ORDER = [
  "CBC",
  "Metabolic / Diabetes",
  "Lipid Panel",
  "Thyroid",
  "Kidney / CKD",
  "Liver",
  "Inflammation",
  "Other",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prettyKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

/** Returns "good" | "bad" | "neutral" | null for the change % column. */
function getChangeTone(
  val: MarkerValue
): "good" | "bad" | "neutral" | null {
  const change = val.change;
  if (change === null || change === undefined) return null;

  const healthy = val.healthy ?? true;
  const prevHealthy = val.prev_healthy;
  const current = typeof val.value === "number" ? val.value : null;
  const low = val.low ?? null;
  const high = val.high ?? null;

  // No range data — can't judge direction
  if (low === null && high === null) return null;

  // Stayed healthy across both readings
  if (healthy && prevHealthy !== false) return "neutral";

  // Moved into the healthy range
  if (healthy && prevHealthy === false) return "good";

  // Moved out of the healthy range
  if (!healthy && prevHealthy === true) return "bad";

  // Both unhealthy — judge by direction toward range
  if (!healthy && prevHealthy === false && current !== null) {
    if (high !== null && current > high) {
      return change < 0 ? "good" : "bad"; // too high → decreasing is good
    }
    if (low !== null && current < low) {
      return change > 0 ? "good" : "bad"; // too low → increasing is good
    }
  }

  return "neutral";
}

const TONE_CLASSES: Record<string, string> = {
  good: "text-green-400",
  bad: "text-red-300",
  neutral: "text-gray-400",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalysisPage() {
  const { apiFetch } = useApi();

  // Biomarker selector
  const [biomarkers, setBiomarkers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");

  // Chart data
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Summary table
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Category filter — "All" means show everything
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(["All"])
  );

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------
  useEffect(() => {
    loadBiomarkers();
    loadSummary();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadBiomarkers();
        loadSummary();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
      const res = await apiFetch(
        `/analysis/history?biomarker=${encodeURIComponent(code)}`
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setHistory(await res.json());
    } catch (err: any) {
      setHistoryError(err?.message || "Failed to load history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derived: chart stats
  // -------------------------------------------------------------------------
  const latestValue =
    history.length > 0 ? history[history.length - 1].value : null;
  const prevValue =
    history.length > 1 ? history[history.length - 2].value : null;
  const delta =
    latestValue !== null && prevValue !== null && prevValue !== 0
      ? (((latestValue - prevValue) / prevValue) * 100).toFixed(1)
      : null;

  // Color chart delta using summary data for the selected biomarker
  const selectedSummary = summary?.values?.[selected];
  const deltaTone = selectedSummary
    ? getChangeTone({ ...selectedSummary, change: delta !== null ? parseFloat(delta) : null })
    : null;

  // -------------------------------------------------------------------------
  // Derived: grouped + sorted table rows
  // -------------------------------------------------------------------------
  const summaryEntries = summary?.values ? Object.entries(summary.values) : [];

  const grouped = useMemo(() => {
    const map: Record<string, [string, MarkerValue][]> = {};
    for (const [key, val] of summaryEntries) {
      const cat = CATEGORY_MAP[key] ?? "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push([key, val]);
    }
    // Sort unhealthy first within each category
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

  const presentCategories = CATEGORY_ORDER.filter(
    (cat) => (grouped[cat]?.length ?? 0) > 0
  );

  // -------------------------------------------------------------------------
  // Category filter toggle
  // -------------------------------------------------------------------------
  function toggleCategory(cat: string) {
    if (cat === "All") {
      setActiveCategories(new Set(["All"]));
      return;
    }
    setActiveCategories((prev) => {
      const next = new Set(prev);
      next.delete("All");
      if (next.has(cat)) {
        next.delete(cat);
        if (next.size === 0) next.add("All");
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  const visibleCategories = activeCategories.has("All")
    ? presentCategories
    : presentCategories.filter((c) => activeCategories.has(c));

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-16 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-4xl space-y-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Analysis</h1>
          <button
            onClick={() => { loadBiomarkers(); loadSummary(); }}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* ── Trend chart section ── */}
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-xl font-semibold">Biomarker Trend</h2>

            {biomarkers.length > 0 ? (
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {biomarkers.map((b) => (
                  <option key={b} value={b}>
                    {prettyKey(b)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-gray-400">
                No data yet — upload a lab report on the Upload page.
              </span>
            )}
          </div>

          {/* Stats row */}
          {latestValue !== null && (
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-400">Latest</span>
                <p className="text-lg font-semibold text-white">{latestValue}</p>
              </div>
              {prevValue !== null && (
                <div>
                  <span className="text-gray-400">Previous</span>
                  <p className="text-lg font-semibold text-white">{prevValue}</p>
                </div>
              )}
              {delta !== null && (
                <div>
                  <span className="text-gray-400">Change</span>
                  <p
                    className={`text-lg font-semibold ${
                      deltaTone
                        ? TONE_CLASSES[deltaTone]
                        : parseFloat(delta) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {parseFloat(delta) >= 0 ? "+" : ""}
                    {delta}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Chart */}
          {historyLoading && (
            <p className="text-sm text-gray-400">Loading chart...</p>
          )}
          {historyError && (
            <p className="text-sm text-red-400">Error: {historyError}</p>
          )}
          {!historyLoading && !historyError && history.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={history}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9CA3AF", fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(0, 10)}
                />
                <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} width={48} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    color: "#F9FAFB",
                  }}
                  labelFormatter={(v: string) => `Date: ${String(v).slice(0, 10)}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3B82F6" }}
                  activeDot={{ r: 6 }}
                  name={prettyKey(selected)}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          {!historyLoading && !historyError && history.length === 0 && selected && (
            <p className="text-sm text-gray-400">
              No history yet for <strong>{prettyKey(selected)}</strong>.
            </p>
          )}
        </section>

        {/* ── Latest Values section ── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Latest Values</h2>

          {summaryLoading && (
            <p className="text-gray-400 text-sm">Loading...</p>
          )}
          {summaryError && (
            <p className="text-red-400 text-sm">Error: {summaryError}</p>
          )}
          {!summaryLoading && summaryEntries.length === 0 && !summaryError && (
            <p className="text-gray-400 text-sm">No results available.</p>
          )}

          {!summaryLoading && presentCategories.length > 0 && (
            <>
              {/* Category filter bar */}
              <div className="flex flex-wrap gap-2">
                {["All", ...presentCategories].map((cat) => {
                  const active = activeCategories.has(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Category blocks stacked */}
              <div className="space-y-6">
                {visibleCategories.map((cat) => {
                  const rows = grouped[cat] ?? [];
                  return (
                    <div
                      key={cat}
                      className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900"
                    >
                      {/* Category header */}
                      {(() => {
                        const allHealthy = rows.every(([, val]) => Boolean(val?.healthy ?? true));
                        return (
                          <div className="border-b border-gray-800 px-4 py-2">
                            {allHealthy ? (
                              <span className="text-sm font-semibold text-green-400">
                                {cat} values are all healthy!
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-white">
                                {cat}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      <table className="w-full table-auto text-sm">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="px-4 py-2 font-normal">Biomarker</th>
                            <th className="px-4 py-2 font-normal">Latest Value</th>
                            <th className="px-4 py-2 font-normal">Healthy Range</th>
                            <th className="px-4 py-2 font-normal">Change vs Prev</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(([key, val]) => {
                            const healthy = Boolean(val?.healthy ?? true);
                            const tone = getChangeTone(val);
                            const changeNum = val.change;
                            const hasChange =
                              changeNum !== null && changeNum !== undefined;

                            return (
                              <tr
                                key={key}
                                className={
                                  !healthy
                                    ? "border-t border-red-900/60 bg-red-950/40"
                                    : "border-t border-gray-800/60"
                                }
                              >
                                <td
                                  className={`px-4 py-3 font-medium ${
                                    !healthy ? "text-red-200" : "text-white"
                                  }`}
                                >
                                  {prettyKey(key)}
                                </td>
                                <td
                                  className={`px-4 py-3 ${
                                    !healthy ? "text-red-200" : "text-gray-200"
                                  }`}
                                >
                                  {String(val?.value ?? "N/A")}
                                </td>
                                <td
                                  className={`px-4 py-3 ${
                                    !healthy ? "text-red-300/70" : "text-gray-400"
                                  }`}
                                >
                                  {val?.range || "—"}
                                </td>
                                <td className="px-4 py-3">
                                  {hasChange ? (
                                    <span
                                      className={`font-medium ${
                                        tone ? TONE_CLASSES[tone] : "text-gray-400"
                                      }`}
                                    >
                                      {(changeNum as number) >= 0 ? "+" : ""}
                                      {changeNum}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-600">—</span>
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
