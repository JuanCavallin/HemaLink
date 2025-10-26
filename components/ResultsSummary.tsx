"use client";

import React from "react";

// Types based on backend response
export type BackendPredictionString = string; // "Positive (Confidence: 83.12%)" | "Model not loaded" | "Prediction Error: ..."

export type FileResult = {
  raw_ocr_results: Record<string, string>;
  predictions: Record<string, BackendPredictionString>;
};

export type UploadResponse = {
  message: string;
  results: Record<string, FileResult>;
};

function parsePrediction(pred?: BackendPredictionString) {
  if (!pred) return { label: "Unknown", confidence: null as number | null };
  const label = (/^Positive/i.test(pred) ? "Positive" : /^Negative/i.test(pred) ? "Negative" : /Model not loaded/i.test(pred) ? "Not Loaded" : /Prediction Error/i.test(pred) ? "Error" : "Unknown");
  const confMatch = pred.match(/Confidence:\s*([0-9]+(?:\.[0-9]+)?)%/i);
  const confidence = confMatch ? parseFloat(confMatch[1]) : null;
  return { label, confidence };
}

const defaultDiseaseOrder = ["Anemia", "Thyroid", "Diabetes"];

function ConfidenceBar({ value, state }: { value: number | null; state: string }) {
  const base = state === "Positive" ? "bg-red-500" : state === "Negative" ? "bg-green-500" : "bg-gray-500";
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="mt-2 h-2 w-full rounded bg-gray-700" aria-label="confidence">
      <div className={`h-2 rounded ${base}`} style={{ width: `${pct}%`, transition: "width 300ms ease" }} />
    </div>
  );
}

function Pill({ children, tone = "default" as "default" | "good" | "bad" | "muted" }: { children: React.ReactNode; tone?: "default" | "good" | "bad" | "muted" }) {
  const tones: Record<string, string> = {
    default: "bg-gray-800 text-gray-100 border-gray-700",
    good: "bg-green-900/30 text-green-300 border-green-700/50",
    bad: "bg-red-900/30 text-red-300 border-red-700/50",
    muted: "bg-gray-900/50 text-gray-300 border-gray-700/60",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

function prettyKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function pickBiomarkers(raw: Record<string, string>, limit = 8) {
  const priority = [
    "Hemoglobin",
    "White blood cells",
    "Red blood cells",
    "Hematocrit",
    "MCV",
    "MCH",
    "MCHC",
    "LDL",
    "HDL",
    "Triglycerides",
    "CRP Levels",
    "Creatinine Levels",
  ];
  const entries = Object.entries(raw).filter(([, v]) => v && v !== "Not Found");
  const prioritized: Array<[string, string]> = [];
  for (const p of priority) {
    const found = entries.find(([k]) => k.toLowerCase() === p.toLowerCase());
    if (found) prioritized.push(found);
  }
  for (const e of entries) {
    if (!prioritized.some(([k]) => k === e[0])) prioritized.push(e);
  }
  return prioritized.slice(0, limit);
}

export default function ResultsSummary({ data, diseaseOrder = defaultDiseaseOrder }: { data: UploadResponse; diseaseOrder?: string[] }) {
  const files = Object.entries(data?.results ?? {});
  if (!files.length) return null;

  return (
    <section className="space-y-10">
      {files.map(([filename, fileResult]) => {
        const predictions = fileResult.predictions || {};
        const diseases = (diseaseOrder.length ? diseaseOrder : Object.keys(predictions)).filter((d) => predictions[d] !== undefined);
        const biomarkers = pickBiomarkers(fileResult.raw_ocr_results);

        return (
          <div key={filename} className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">Summary for {filename}</h4>
              <Pill tone="muted">Analyzed</Pill>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {diseases.map((d) => {
                const parsed = parsePrediction(predictions[d]);
                return (
                  <div key={d} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300">{d}</div>
                      <Pill tone={parsed.label === "Positive" ? "bad" : parsed.label === "Negative" ? "good" : "muted"}>{parsed.label}</Pill>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-white">{parsed.confidence !== null ? `${parsed.confidence.toFixed(1)}%` : "—"}</div>
                    <ConfidenceBar value={parsed.confidence} state={parsed.label} />
                    <div className="mt-2 text-xs text-gray-400">Confidence</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <h5 className="mb-2 text-sm font-medium text-gray-300">Key biomarkers</h5>
              {biomarkers.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {biomarkers.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 px-3 py-2">
                      <span className="text-gray-300">{prettyKey(k)}</span>
                      <span className="font-medium text-white">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-gray-800 bg-gray-950 p-3 text-sm text-gray-400">No biomarkers extracted.</div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
