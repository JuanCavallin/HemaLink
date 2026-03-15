"use client";

import { useEffect, useState } from "react";
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
  change?: number | string;
  healthy?: boolean;
};

type SummaryResponse = {
  message?: string;
  values?: Record<string, MarkerValue>;
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

  // Summary table (legacy endpoint, unchanged shape)
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load biomarker list + summary table on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    loadBiomarkers();
    loadSummary();
  }, []);

  async function loadBiomarkers() {
    try {
      const res = await apiFetch("/analysis/biomarkers");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: string[] = await res.json();
      setBiomarkers(data);
      if (data.length > 0) {
        setSelected(data[0]);
      }
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

  // -------------------------------------------------------------------------
  // Load history whenever selected biomarker changes
  // -------------------------------------------------------------------------
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
  // Derived stats
  // -------------------------------------------------------------------------
  const latestValue =
    history.length > 0 ? history[history.length - 1].value : null;
  const prevValue =
    history.length > 1 ? history[history.length - 2].value : null;
  const delta =
    latestValue !== null && prevValue !== null && prevValue !== 0
      ? (((latestValue - prevValue) / prevValue) * 100).toFixed(1)
      : null;

  const summaryEntries = summary?.values ? Object.entries(summary.values) : [];

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
                    {b}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-gray-400">
                No data yet — upload a lab report on the Dashboard.
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
                      parseFloat(delta) >= 0 ? "text-green-400" : "text-red-400"
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
                  name={selected}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          {!historyLoading && !historyError && history.length === 0 && selected && (
            <p className="text-sm text-gray-400">
              No history yet for <strong>{selected}</strong>.
            </p>
          )}
        </section>

        {/* ── Summary table section ── */}
        <section className="space-y-3">
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
          {!summaryLoading && summaryEntries.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900 p-4">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-400">
                      Biomarker
                    </th>
                    <th className="text-left px-3 py-2 text-gray-400">
                      Latest Value
                    </th>
                    <th className="text-left px-3 py-2 text-gray-400">
                      Healthy Range
                    </th>
                    <th className="text-left px-3 py-2 text-gray-400">
                      Change vs Prev
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summaryEntries.map(([key, val]) => {
                    const healthy = Boolean(val?.healthy ?? true);
                    const change =
                      val.change !== undefined ? `${val.change}%` : "N/A";
                    return (
                      <tr
                        key={key}
                        className={
                          !healthy
                            ? "border-t border-red-700/50 bg-red-900/30 text-red-300"
                            : "border-t border-gray-800"
                        }
                      >
                        <td className="px-3 py-3 font-medium text-white">
                          {key}
                        </td>
                        <td className="px-3 py-3 text-gray-200">
                          {String(val?.value ?? "N/A")}
                        </td>
                        <td className="px-3 py-3 text-gray-200">
                          {val?.range || "N/A"}
                        </td>
                        <td className="px-3 py-3 text-gray-200">{change}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
