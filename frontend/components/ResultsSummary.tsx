"use client";

import React from "react";
import { PILL_TONES, CARD, CARD_INNER, CARD_ALERT, TEXT_ERROR, TEXT_BODY, TABLE_HEADER_TEXT, BORDER_MUTED } from "@/lib/styles";

// Types based on backend response
export type PredictionResult = {
  label: string;         // "Positive" | "Negative" | "Not enough information" | "Model not loaded" | "Prediction Error"
  confidence: number | null;
  missing?: string;      // comma-separated missing feature names, only when label is "Not enough information"
};

export type FileResult = {
  raw_ocr_results: Record<string, string>;
  predictions: Record<string, PredictionResult>;
};

export type UploadResponse = {
  message: string;
  results: Record<string, FileResult>;
  run_id?: number;
};

export type ReferenceRange = {
  low: number | null;
  high: number | null;
  unit: string;
  display_name: string;
};

const defaultDiseaseOrder = ["Anemia", "Thyroid", "Diabetes"];

export function getTipsForDisease(disease: string): string[] {
  switch (disease.toLowerCase()) {
    case "anemia":
      return [
        "Consult a doctor for a definitive diagnosis and iron level checks.",
        "Increase intake of iron-rich foods (red meat, lentils, spinach, fortified cereals).",
        "Pair iron-rich foods with Vitamin C (citrus fruits, bell peppers) to boost absorption.",
        "Limit consumption of tea and coffee near mealtimes, as they can inhibit iron absorption.",
      ];
    case "thyroid":
      return [
        "This result indicates potential thyroid imbalance. Consult an endocrinologist.",
        "Discuss follow-up tests (like Free T3/T4) with your physician.",
        "Maintain a diet rich in iodine and selenium, but only under medical guidance.",
        "Monitor energy levels, weight, and heart rate, and report any changes to your doctor.",
      ];
    case "diabetes":
      return [
        "A positive signal warrants immediate blood glucose and HbA1c verification with a healthcare provider.",
        "Focus on a low-glycemic index diet rich in fiber (whole grains, vegetables, legumes).",
        "Incorporate regular physical activity, aiming for at least 150 minutes of moderate exercise weekly (CDC recommended).",
        "Monitor your carbohydrate intake and seek advice from a certified diabetes educator (CDE).",
      ];
    default:
      return [];
  }
}

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
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${PILL_TONES[tone]}`}>{children}</span>;
}

function prettyKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function pickBiomarkers(raw: Record<string, string>, limit = 8) {
  const priority = [
    "Hemoglobin",
    "MCV",
    "MCH",
    "MCHC",
    "LDL_Cholesterol",
    "HDL_Cholesterol",
    "Triglyceride_Levels",
    "Fasting_Blood_Glucose",
    "HbA1c",
    "TSH",
    "Creatinine_Levels",
    "CRP_Levels",
  ];

  const uniqueBiomarkers: Record<string, [string, string]> = {};
  const HIDE_KEYS = new Set(["gender", "sex", "age"]);
  const entries = Object.entries(raw).filter(([k, v]) => v && v !== "Not Found" && !HIDE_KEYS.has(k.toLowerCase()));

  for (const [k, v] of entries) {
    uniqueBiomarkers[k] = [k, v];
  }

  const prioritized: Array<[string, string]> = [];
  const addedKeys = new Set<string>();

  for (const p of priority) {
    if (uniqueBiomarkers[p] && !addedKeys.has(p)) {
      prioritized.push(uniqueBiomarkers[p]);
      addedKeys.add(p);
    }
  }

  for (const key in uniqueBiomarkers) {
    if (!addedKeys.has(key)) {
      prioritized.push(uniqueBiomarkers[key]);
      addedKeys.add(key);
    }
  }

  return prioritized.slice(0, limit);
}

export default function ResultsSummary({
  data,
  diseaseOrder = defaultDiseaseOrder,
  referenceRanges = {},
}: {
  data: UploadResponse;
  diseaseOrder?: string[];
  referenceRanges?: Record<string, ReferenceRange>;
}) {
  const files = Object.entries(data?.results ?? {});
  if (!files.length) return null;

  return (
    <section className="space-y-10">
      {files.map(([filename, fileResult]) => {
        const predictions = fileResult.predictions || {};
        const diseases = (diseaseOrder.length ? diseaseOrder : Object.keys(predictions)).filter((d) => predictions[d] !== undefined);
        const biomarkers = pickBiomarkers(fileResult.raw_ocr_results);

        const positiveDiseases = diseases
          .map(d => ({
            name: d,
            pred: predictions[d],
            tips: getTipsForDisease(d),
          }))
          .filter(item => item.pred?.label === "Positive" && item.tips.length > 0);

        return (
          <div key={filename} className={`${CARD} p-6`}>
            <div className="mb-4 flex items-center justify-between">
              <h4 className={`text-lg font-semibold ${TABLE_HEADER_TEXT}`}>AI Risk Prediction Scores</h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {diseases.map((d) => {
                const pred = predictions[d] ?? { label: "Unknown", confidence: null };
                return (
                  <div key={d} className={`${CARD_INNER} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white">{d}</div>
                      <Pill tone={pred.label === "Positive" ? "bad" : pred.label === "Negative" ? "good" : "muted"}>{pred.label}</Pill>
                    </div>
                    <div className={`mt-2 text-2xl font-bold ${pred.label === "Positive" ? "text-red-400" : pred.label === "Negative" ? "text-green-400" : "text-white"}`}>
                      {pred.confidence !== null && pred.confidence !== undefined ? `${pred.confidence.toFixed(1)}%` : "—"}
                    </div>
                    <ConfidenceBar value={pred.confidence} state={pred.label} />
                    <div className="mt-2 text-xs text-white">Confidence</div>
                  </div>
                );
              })}
            </div>

            {positiveDiseases.length > 0 && (
              <div className={`mt-8 border-t ${BORDER_MUTED} pt-6`}>
                <h5 className={`mb-3 text-lg font-bold ${TEXT_ERROR}`}>Actionable Insights & Next Steps</h5>
                <div className="space-y-6">
                  {positiveDiseases.map(item => (
                    <div key={item.name} className={`${CARD_ALERT} p-4`}>
                      <h6 className={`text-md font-semibold ${TABLE_HEADER_TEXT} mb-3`}>
                        {item.name} Signal Detected ({item.pred.confidence?.toFixed(1)}% Confidence)
                      </h6>
                      <ul className={`list-disc ml-4 space-y-2 text-sm ${TEXT_BODY}`}>
                        {item.tips.map((tip, index) => (
                          <li key={index} className="pl-1">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h4 className={`text-lg font-semibold ${TABLE_HEADER_TEXT}`}>Key Biomarkers</h4>
            </div>
            <div className="mt-6">
              {biomarkers.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {biomarkers.map(([k, v]) => {
                    const ref = referenceRanges[k];
                    const num = ref ? parseFloat(v) : NaN;
                    let valueColor = "text-white";
                    if (ref && !isNaN(num)) {
                      const outOfRange =
                        (ref.low !== null && num < ref.low) ||
                        (ref.high !== null && num > ref.high);
                      valueColor = outOfRange ? "text-red-400" : "text-green-400";
                    }
                    return (
                      <div key={k} className={`flex items-center justify-between ${CARD_INNER} px-3 py-2`}>
                        <span className="text-white">{prettyKey(k)}</span>
                        <span className={`font-medium ${valueColor}`}>{v}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`${CARD_INNER} p-3 text-sm text-gray-400`}>No biomarkers extracted.</div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
