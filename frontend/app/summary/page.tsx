'use client';

import { useEffect, useMemo, useState } from 'react';
import ResultsSummary, { UploadResponse, ReferenceRange } from '@/components/ResultsSummary';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useApi } from '@/lib/api';
import { PAGE, CARD, BTN_PRIMARY, TEXT_LABEL, LINK_ACCENT } from '@/lib/styles';

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
  const [serverLoading, setServerLoading] = useState(false);
  const { apiFetch } = useApi();

  function loadFromServer() {
    setServerLoading(true);
    apiFetch('/history')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: HistoryItem[] | null) => {
        if (data && Array.isArray(data)) {
          setHistory(data);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
          }
          setActiveId((prev) => {
            const stillValid = prev != null && data.some((item: HistoryItem) => item.id === prev);
            return stillValid ? prev : (data[0]?.id ?? null);
          });
        }
      })
      .catch(() => {})
      .finally(() => setServerLoading(false));
  }

  useEffect(() => {
    // Show cached results immediately, then refresh from backend
    const h = loadHistory();
    setHistory(h);
    if (h.length && !activeId) setActiveId(h[0].id);
    loadFromServer();
  }, []);

  const activeItem = useMemo(() => history.find((h) => h.id === activeId) || null, [history, activeId]);

  useEffect(() => {
    if (!activeItem) return;
    const sex = activeItem.sex ?? '';
    apiFetch(`/reference-ranges?sex=${encodeURIComponent(sex)}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then(setReferenceRanges)
      .catch(() => {});
  }, [activeId]);

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
    <main className={PAGE}>
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Your Results</h1>
          <Link href="/upload" className={`text-sm ${LINK_ACCENT}`}>Upload New</Link>
        </div>

        {history.length === 0 ? (
          <div className={`${CARD} p-8 text-center`}>
            <p className="text-rose-200/60">No results yet. Upload a report to see your summary here.</p>
            <div className="mt-4">
              <Link href="/upload" className={BTN_PRIMARY}>Go to Upload</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* history sidebar */}
            <aside className={`${CARD} p-4`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-rose-300/60">History</h2>
                {serverLoading && <span className={`${TEXT_LABEL} animate-pulse`}>Syncing…</span>}
              </div>
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => setActiveId(item.id)}
                      className={`w-full rounded border px-3 py-2 text-left text-sm transition-colors pr-8 ${
                        activeId === item.id
                          ? 'border-rose-700/60 bg-rose-950/30 text-white'
                          : 'border-rose-900/20 bg-black/20 text-rose-100/70 hover:border-rose-800/40 hover:text-rose-100'
                      }`}
                    >
                      <div className="font-medium truncate">{item.label}</div>
                      <div className="text-[11px] text-rose-300">{new Date(item.createdAt).toLocaleString()}</div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(item); }}
                      className="absolute top-2 right-2 text-rose-900/60 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
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
                    <div className="text-xs text-rose-300">Uploaded {new Date(activeItem.createdAt).toLocaleString()}</div>
                  </div>

                  {/* User Information */}
                  <div className={`${CARD} p-4`}>
                    <h3 className="mb-3 text-sm font-semibold text-white">User Information</h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                      <div>
                        <div className={`${TEXT_LABEL} mb-1`}>Age</div>
                        <div className="text-white font-medium">{activeItem.age || '—'}</div>
                      </div>
                      <div>
                        <div className={`${TEXT_LABEL} mb-1`}>Sex</div>
                        <div className="text-white font-medium">{formatSex(activeItem.sex)}</div>
                      </div>
                      <div>
                        <div className={`${TEXT_LABEL} mb-1`}>Test Date</div>
                        <div className="text-white font-medium">{formatDate(activeItem.testDate)}</div>
                      </div>
                      <div>
                        <div className={`${TEXT_LABEL} mb-1`}>Upload Date</div>
                        <div className="text-white font-medium">{new Date(activeItem.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>

                  <ResultsSummary data={activeItem.payload} referenceRanges={referenceRanges} />

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-rose-300/50 hover:text-rose-100">Show raw response</summary>
                    <div className="mt-2 rounded-lg border border-rose-900/30 bg-black/40 p-4 text-green-300 overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(activeItem.payload, null, 2)}</pre>
                    </div>
                  </details>
                </div>
              ) : (
                <div className={`${CARD} p-8 text-center text-rose-200/60`}>Select a result from the left to view.</div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
