'use client';

import { useEffect, useMemo, useState } from 'react';
import ResultsSummary, { UploadResponse, ReferenceRange } from '@/components/ResultsSummary';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useApi } from '@/lib/api';

const HISTORY_KEY = 'hemalink:resultsHistory';

type HistoryItem = {
  id: string;
  createdAt: string;
  label: string;
  age?: string;
  sex?: string;
  testDate?: string;   // ISO YYYY-MM-DD (the blood test date)
  runId?: number;      // RDS blood_test.id for backend deletion
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

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function formatSex(sex?: string): string {
  if (!sex) return '—';
  if (sex === 'M') return 'Male';
  if (sex === 'F') return 'Female';
  return sex;
}

export default function SummaryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [referenceRanges, setReferenceRanges] = useState<Record<string, ReferenceRange>>({});
  const { apiFetch } = useApi();

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    if (h.length && !activeId) setActiveId(h[0].id);
  }, []);

  const activeItem = useMemo(() => history.find((h) => h.id === activeId) || null, [history, activeId]);

  useEffect(() => {
    const sex = activeItem?.sex ?? '';
    apiFetch(`/reference-ranges?sex=${encodeURIComponent(sex)}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then(setReferenceRanges)
      .catch(() => {});
  }, [activeItem?.sex]);

  async function deleteItem(item: HistoryItem) {
    if (!confirm(`Delete "${item.label}"? This cannot be undone.`)) return;

    // Remove from localStorage immediately
    const updated = history.filter((h) => h.id !== item.id);
    setHistory(updated);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    }
    if (activeId === item.id) {
      setActiveId(updated[0]?.id ?? null);
    }

    // Delete from backend if we have a run_id
    if (item.runId) {
      try {
        await apiFetch(`/records/${item.runId}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Backend deletion failed for run_id:', item.runId, e);
      }
    }
  }

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
            {/* history sidebar */}
            <aside className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-400">History</h2>
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => setActiveId(item.id)}
                      className={`w-full rounded border px-3 py-2 text-left text-sm transition-colors pr-8 ${
                        activeId === item.id
                          ? 'border-blue-500 bg-blue-950/40 text-white'
                          : 'border-gray-800 bg-gray-950 text-gray-300 hover:border-gray-700'
                      }`}
                    >
                      <div className="font-medium truncate">{item.label}</div>
                      <div className="text-[11px] text-gray-400">{new Date(item.createdAt).toLocaleString()}</div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(item); }}
                      className="absolute top-2 right-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={`Delete ${item.label}`}
                      title="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </aside>

            {/* active result */}
            <section>
              {activeItem ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Summary: {activeItem.label}</h2>
                    <div className="text-xs text-gray-400">Uploaded {new Date(activeItem.createdAt).toLocaleString()}</div>
                  </div>

                  {/* User Information */}
                  <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-gray-400">User Information</h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Age</div>
                        <div className="text-white font-medium">{activeItem.age || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Sex</div>
                        <div className="text-white font-medium">{formatSex(activeItem.sex)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Test Date</div>
                        <div className="text-white font-medium">{formatDate(activeItem.testDate)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Upload Date</div>
                        <div className="text-white font-medium">{new Date(activeItem.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>

                  <ResultsSummary data={activeItem.payload} referenceRanges={referenceRanges} />

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
