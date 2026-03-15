'use client';

import { useEffect, useMemo, useState } from 'react';
import ResultsSummary, { UploadResponse } from '@/components/ResultsSummary';
import Link from 'next/link';

// Simple local storage keys
const HISTORY_KEY = 'hemalink:resultsHistory';

type HistoryItem = {
  id: string; // ISO date string
  createdAt: string; // ISO
  label: string; // Filenames or custom title
  payload: UploadResponse;
};

function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as HistoryItem[];
    return [];
  } catch {
    return [];
  }
}

export default function SummaryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    if (h.length && !activeId) setActiveId(h[0].id); // most recent first
  }, []);

  const activeItem = useMemo(() => history.find((h) => h.id === activeId) || null, [history, activeId]);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-16 bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Your Results</h1>
          <Link href="/upload" className="text-sm text-blue-400 hover:text-blue-300">Upload New</Link>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-gray-300">No results yet. Upload a report to see your summary here.</p>
            <div className="mt-4">
              <Link href="/upload" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Go to Upload</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* history list */}
            <aside className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-400">History</h2>
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    className={`w-full rounded border px-3 py-2 text-left text-sm transition-colors ${
                      activeId === item.id
                        ? 'border-blue-500 bg-blue-950/40 text-white'
                        : 'border-gray-800 bg-gray-950 text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="text-[11px] text-gray-400">{new Date(item.createdAt).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </aside>

            {/* active summary */}
            <section>
              {activeItem ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Summary: {activeItem.label}</h2>
                    <div className="text-xs text-gray-400">Generated {new Date(activeItem.createdAt).toLocaleString()}</div>
                  </div>
                  <ResultsSummary data={activeItem.payload} />
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-200">Show raw response</summary>
                    <div className="mt-2 rounded-lg bg-gray-900 p-4 text-green-300 overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(activeItem.payload, null, 2)}</pre>
                    </div>
                  </details>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-300">Select a result from the left to view.</div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
