"use client";

import { useState, useEffect } from "react";
import type {
  SuggestRequest,
  SuggestResponse,
  RagRequest,
  RagResponse,
  RagResult,
  SuggestCandidate,
} from "@mbspro/shared";
import ClaimForm from "./claim/page";

// Convert RAG API response to our internal format
const convertRagToSuggest = (ragResponse: RagResponse): SuggestResponse => {
  const candidates: SuggestCandidate[] = ragResponse.results.map(
    (result: RagResult) => {
      const code =
        result.itemNum ||
        (result.itemNums ? result.itemNums.join(", ") : "Unknown");

      const score = (() => {
        const s =
          typeof result.match_score === "number" ? result.match_score : 0;
        // If it looks like a percentage (0-100), scale down; otherwise clamp to [0,1]
        if (s > 1 && s <= 100) return Math.max(0, Math.min(1, s / 100));
        return Math.max(0, Math.min(1, s));
      })();

      return {
        code,
        title: result.title,
        score,
        confidence: score,
        short_explain: result.match_reason,
        feature_hits: [`Fee: $${result.fee}`, `Benefit: $${result.benefit}`],
      };
    }
  );

  return {
    candidates,
    signals: {
      duration: 0,
      mode: "rag" as any,
      after_hours: false,
      chronic: false,
    },
  };
};

// 工具函数：把 "23, 36" / "23，36" / "23 | 36" 等字符串拆分、去重、清洗
function explodeCodes(codes: string[]): string[] {
  const arr: string[] = [];
  for (const c of codes) {
    c.split(/[,|，]/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => arr.push(s));
  }
  return Array.from(new Set(arr));
}

export default function HomePage() {
  const [note, setNote] = useState("");
  const [topN, setTopN] = useState<number>(5);
  const [response, setResponse] = useState<SuggestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [source, setSource] = useState<"local" | "rag">("local");

  // HEAD branch features: ClaimForm and bulk selection
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const selectedCount = Object.values(selectedMap).filter(Boolean).length;
  const [openForm, setOpenForm] = useState(false);
  const [bulkCodes, setBulkCodes] = useState<string[] | null>(null);

  // Main branch features: validation and explain modal
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [validation, setValidation] = useState<{
    ok: boolean;
    blocked: boolean;
    conflicts: Array<{ code: string; with: string[] }>;
    warnings: string[];
  } | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainFor, setExplainFor] = useState<SuggestCandidate | null>(null);
  const [mbs, setMbs] = useState<any | null>(null);
  const [mbsLoading, setMbsLoading] = useState(false);
  const [mbsError, setMbsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [reloading, setReloading] = useState(false);

  // 打开 modal 时禁滚（可选）
  useEffect(() => {
    if (openForm) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openForm]);

  // Helper functions for selection management (from main branch)
  const toggleSelect = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const validateSelection = async (codes: string[]) => {
    try {
      setValidating(true);
      setValidateError(null);
      const apiBase = (
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
      ).replace(/\/$/, "");
      const url = `${apiBase}/api/rules/validate-selection`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCodes: codes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setValidation(data);
    } catch (e) {
      setValidateError(e instanceof Error ? e.message : "Validate failed");
      setValidation(null);
    } finally {
      setValidating(false);
    }
  };

  // Re-validate whenever selection changes and we have suggestions
  useEffect(() => {
    if (response && selectedCodes.length >= 0) {
      validateSelection(selectedCodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCodes]);

  const getSelectedRisk = (): "green" | "amber" | "red" | null => {
    if (!response || !response.candidates) return null;
    const map = new Map(response.candidates.map((c) => [c.code, c]));
    const selected = selectedCodes
      .map((code) => map.get(code))
      .filter(Boolean) as SuggestCandidate[];
    if (selected.length === 0) return null;
    if (validation?.blocked) return "red";
    if (selected.some((c) => c.compliance === "red")) return "red";
    if (selected.some((c) => c.compliance === "amber")) return "amber";
    return "green";
  };

  const openExplain = (c: SuggestCandidate) => {
    setExplainFor(c);
    setExplainOpen(true);
  };

  const closeExplain = () => {
    setExplainOpen(false);
    setExplainFor(null);
  };

  const handleMbsCodes = async () => {
    if (!note.trim()) {
      setMbsError("Please enter a clinical note");
      return;
    }
    try {
      setMbsLoading(true);
      setMbsError(null);
      const apiBase = (
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
      ).replace(/\/$/, "");
      const url = `${apiBase}/api/mbs-codes`;
      const body = {
        episode_id: "ui-demo",
        note_text: note.trim(),
        attachments: [],
        options: { top_k: topN, return_spans: true },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMbs(data);
    } catch (e) {
      setMbsError(e instanceof Error ? e.message : "Call /mbs-codes failed");
      setMbs(null);
    } finally {
      setMbsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const apiBase = (
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
      ).replace(/\/$/, "");
      const url = `${apiBase}/api/mbs-admin/metrics/snapshot`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      setMetrics({ error: e instanceof Error ? e.message : "failed" });
    }
  };

  const hotReload = async () => {
    try {
      setReloading(true);
      const apiBase = (
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
      ).replace(/\/$/, "");
      const url = `${apiBase}/api/mbs-admin/reload`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json().catch(() => ({}));
    } catch (e) {
      // no-op
    } finally {
      setReloading(false);
      fetchMetrics();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!note.trim()) {
      setError("Please enter a clinical note");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setStatus(null);
    setLatencyMs(null);
    setSelectedCodes([]);
    setValidation(null);
    setValidateError(null);

    try {
      const apiBase = (
        process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
      ).replace(/\/$/, "");
      const started = performance.now();

      if (source === "local") {
        const suggestUrl = `${apiBase}/api/suggest`;
        const body: SuggestRequest = {
          note: note.trim(),
          topN: topN > 0 ? topN : 5,
        };
        const res = await fetch(suggestUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setStatus(res.status);
        const elapsed = performance.now() - started;
        setLatencyMs(Math.round(elapsed));
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            errorData?.message || `HTTP ${res.status}: ${res.statusText}`
          );
        }
        const data: SuggestResponse = await res.json();
        setResponse(data);
      } else {
        const ragUrl = `${apiBase}/api/rag/query`;
        const requestBody: RagRequest = {
          query: note.trim(),
          top: topN > 0 ? topN : 5,
        };
        const res = await fetch(ragUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        setStatus(res.status);
        const elapsed = performance.now() - started;
        setLatencyMs(Math.round(elapsed));
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            errorData?.message || `HTTP ${res.status}: ${res.statusText}`
          );
        }
        const ragData: RagResponse = await res.json();
        const convertedData = convertRagToSuggest(ragData);
        setResponse(convertedData);
      }
    } catch (err) {
      console.error("Error calling API:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get suggestions"
      );
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setNote("");
    setTopN(5);
    setResponse(null);
    setError(null);
    setSelectedCodes([]);
    setValidation(null);
    setValidateError(null);
    setMbs(null);
    setMbsError(null);
  };

  // HEAD branch features: bulk selection
  const selectAll = () => {
    if (response?.candidates) {
      const newSelectedMap: Record<string, boolean> = {};
      response.candidates.forEach((c) => {
        newSelectedMap[c.code] = true;
      });
      setSelectedMap(newSelectedMap);
    }
  };

  const clearSelection = () => setSelectedMap({});

  const openClaimWithSelected = () => {
    const selectedCodes = Object.keys(selectedMap).filter(
      (code) => selectedMap[code]
    );
    if (selectedCodes.length === 0) return;

    setBulkCodes(selectedCodes);
    setOpenForm(true);
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          MBS Item Suggestions
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Enter your clinical notes or SOAP documentation to receive AI-powered
          MBS item suggestions
        </p>
      </div>

      {/* Top Risk Banner + Actions */}
      {response && (
        <div className="max-w-4xl mx-auto">
          <div className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-700">Selected:</span>
              <span className="font-semibold text-gray-900">{selectedCodes.length}</span>
              {(() => {
                const risk = getSelectedRisk();
                if (!risk) return null;
                if (risk === "red")
                  return (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      Risk: Red
                    </span>
                  );
                if (risk === "amber")
                  return (
                    <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                      Risk: Amber
                    </span>
                  );
                return (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Risk: Green
                  </span>
                );
              })()}
              {validation && (
                validation.blocked ? (
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    Blocked
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    No blocking conflicts
                  </span>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={
                  !response || selectedCodes.length === 0 || !!validation?.blocked
                }
                onClick={() => alert("Referral draft generated (demo).")}
              >
                Generate Referral
              </button>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={
                  !response || selectedCodes.length === 0 || !!validation?.blocked
                }
                onClick={() => alert("FHIR Claim payload created (demo).")}
              >
                Create Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="card max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="clinical-note"
              className="form-label"
            >
              Clinical Notes / SOAP Documentation
            </label>
            <textarea
              id="clinical-note"
              rows={8}
              className="form-textarea"
              placeholder={`Enter your clinical notes here...

Example:
- Patient presents with chronic lower back pain
- Visit duration: 15 min
- Mode: telehealth
- Physical examination shows limited range of motion
- Discussed treatment options and pain management strategies
- Prescribed physiotherapy and reviewed in 2 weeks`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
            />
            <div className="mt-1 text-sm text-gray-500">
              {note.length} characters
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <label htmlFor="top-n" className="form-label">
                Maximum Suggestions
              </label>
              <select
                id="top-n"
                className="form-textarea"
                value={topN}
                onChange={(e) => setTopN(parseInt(e.target.value))}
                disabled={loading}
              >
                <option value={1}>1 suggestions</option>
                <option value={3}>3 suggestions</option>
                <option value={5}>5 suggestions</option>
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="source" className="form-label">
                Data Source
              </label>
              <select
                id="source"
                className="form-textarea"
                value={source}
                onChange={(e) => setSource(e.target.value as "local" | "rag")}
                disabled={loading}
              >
                <option value="local">Local (/api/suggest)</option>
                <option value="rag">RAG (/api/rag/query)</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={clearForm}
                className="btn-secondary"
                disabled={loading}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={fetchMetrics}
                className="btn-secondary"
              >
                Metrics
              </button>
              <button
                type="button"
                onClick={hotReload}
                className="btn-secondary"
                disabled={reloading}
              >
                {reloading ? "Hot Reloading..." : "Hot Reload"}
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !note.trim()}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Getting Suggestions...
                  </span>
                ) : (
                  "Get Suggestions"
                )}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={mbsLoading || !note.trim()}
                onClick={handleMbsCodes}
              >
                {mbsLoading ? "Running /mbs-codes..." : "Run /mbs-codes"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Panel */}
      {response && (
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Suggestions
              </h3>
              <div className="text-sm text-gray-600">
                From{" "}
                <code className="bg-gray-100 px-1 rounded">
                  {source === "local" ? "POST /suggest" : "POST /rag/query"}
                </code>
              </div>
            </div>

            {/* 批量动作条 */}
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-gray-700">
                Selected: <b>{selectedCount}</b>
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={selectAll}
                disabled={!response.candidates?.length}
              >
                Select all
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={clearSelection}
                disabled={selectedCount === 0}
              >
                Clear selection
              </button>
              <div className="ml-auto">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={selectedCount === 0}
                  onClick={openClaimWithSelected}
                >
                  Open Claim with Selected ({selectedCount})
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <span className="font-medium text-gray-700">Candidates:</span>
                <span className="ml-2 text-gray-900">
                  {response.candidates?.length || 0}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Signals:</span>
                <span className="ml-2 text-gray-900">
                  {response.signals ? "Yes" : "None"}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">HTTP:</span>
                <span className="ml-2 text-gray-900">{status ?? "-"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Latency:</span>
                <span className="ml-2 text-gray-900">
                  {latencyMs != null ? `${latencyMs} ms` : "-"}
                </span>
              </div>
            </div>

            {/* Selection + Validation */}
            <div className="mb-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-700">Selected:</span>
                  <span className="ml-2 text-gray-900">{selectedCodes.length}</span>
                </div>
                {validating && (
                  <span className="text-xs text-gray-500">Validating selection...</span>
                )}
              </div>
              {validation && (
                <div className="mt-2">
                  {validation.blocked ? (
                    <div className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                      Blocked: conflicts detected
                    </div>
                  ) : (
                    <div className="inline-flex items-center rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      No blocking conflicts
                    </div>
                  )}
                  {Array.isArray(validation.warnings) &&
                    validation.warnings.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-gray-700">
                        {validation.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                </div>
              )}
              {validateError && (
                <div className="mt-2 text-xs text-red-600">{validateError}</div>
              )}
            </div>

            {/* Empty state */}
            {(!response.candidates || response.candidates.length === 0) && (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-600">
                No suggestions were found. Try refining the note or increasing
                Top-N.
              </div>
            )}

            {/* Main content with right selected panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                {response.candidates?.map((c, idx) => (
                  <div
                    key={`${c.code}-${idx}`}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-gray-500">#{idx + 1}</div>
                        <div className="text-base font-semibold text-gray-900">
                          {c.code} · {c.title}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Score / Conf.</div>
                        <div className="text-lg font-bold text-gray-900">
                          {c.score?.toFixed(3)}
                          {typeof c.confidence === "number"
                            ? ` / ${c.confidence.toFixed(2)}`
                            : ""}
                        </div>
                        <div className="mt-2 flex items-center justify-end space-x-3">
                          <label className="inline-flex items-center space-x-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={selectedCodes.includes(c.code)}
                              onChange={() => toggleSelect(c.code)}
                            />
                            <span>Select</span>
                          </label>
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            onClick={() => openExplain(c)}
                          >
                            Explain
                          </button>
                        </div>
                      </div>
                    </div>

                    {c.compliance && (
                      <div className="mt-2">
                        {c.compliance === "green" && (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            Compliance: Green
                          </span>
                        )}
                        {c.compliance === "amber" && (
                          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                            Compliance: Amber
                          </span>
                        )}
                        {c.compliance === "red" && (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            Compliance: Red
                          </span>
                        )}
                      </div>
                    )}

                    {c.short_explain && (
                      <div className="mt-2 text-sm text-gray-700">
                        {c.short_explain}
                      </div>
                    )}

                    {Array.isArray(c.rule_results) && c.rule_results.length > 0 && (
                      <div className="mt-3 text-sm">
                        <div className="text-xs font-medium text-gray-600 mb-1">
                          Rules
                        </div>
                        <ul className="list-disc list-inside space-y-1">
                          {c.rule_results.map((r, i) => (
                            <li key={`${r.id}-${i}`} className="text-gray-700">
                              <span className="font-semibold">
                                {(r.status as any)?.toString()?.toUpperCase?.()}
                              </span>
                              {": "}
                              {r.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {Array.isArray(c.feature_hits) && c.feature_hits.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {c.feature_hits.map((f, i) => (
                          <span
                            key={`${f}-${i}`}
                            className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {c.score_breakdown && (
                      <div className="mt-3 text-xs text-gray-500">
                        bm25:{" "}
                        {typeof c.score_breakdown["bm25"] === "number"
                          ? c.score_breakdown["bm25"].toFixed(3)
                          : (c.score_breakdown["bm25"] as any)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON toggle */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowJson(!showJson)}
                className="btn-secondary"
                disabled={loading}
              >
                {showJson ? "Hide raw JSON" : "Show raw JSON"}
              </button>
              {showJson && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claim Form（✅ 批量） */}
      {openForm && bulkCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩，点击关闭 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setOpenForm(false);
              setBulkCodes(null);
            }}
          />

          {/* 弹窗容器：相对定位 + 最大高度 + 纵向滚动 */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create Claim"
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg bg-white shadow-xl"
          >
            {/* 头部：sticky，滚动时始终可见 */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
              <h3 className="text-lg font-semibold">
                Create Claim for {bulkCodes.length} items
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setOpenForm(false);
                  setBulkCodes(null);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* 内容区：给表单留出内边距 */}
            <div className="px-6 py-4">
              <ClaimForm
                code={bulkCodes[0] ?? ""}
                note={note}
                defaultSignals={{
                  duration: Math.max(0, response?.signals?.duration ?? 0),
                  mode:
                    response?.signals?.mode === "telehealth" ||
                    response?.signals?.mode === "after_hours"
                      ? (response.signals.mode as any)
                      : "in_person",
                }}
                initialItemsCodes={bulkCodes}
                onClose={() => {
                  setOpenForm(false);
                  setBulkCodes(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Day-1 Info */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                RAG Integration Active
              </h3>
              <div className="mt-1 text-sm text-green-700">
                This application is now powered by an external RAG
                (Retrieval-Augmented Generation) API that provides real-time MBS
                item suggestions based on clinical scenarios. The system
                retrieves relevant information and generates accurate
                recommendations with match scores and explanations.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ExplainModal open={explainOpen} onClose={closeExplain} candidate={explainFor} />
    </div>
  );
}

// Explain Modal (simple)
function ExplainModal({ open, onClose, candidate }: { open: boolean, onClose: () => void, candidate: SuggestCandidate | null }) {
  if (!open || !candidate) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl p-6 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-gray-500">Explain</div>
            <div className="text-lg font-semibold text-gray-900">{candidate.code} · {candidate.title}</div>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>
        {candidate.riskBanner && (
          <div className="mt-3">
            {candidate.riskBanner === 'red' && <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Risk: Red</span>}
            {candidate.riskBanner === 'amber' && <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">Risk: Amber</span>}
            {candidate.riskBanner === 'green' && <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Risk: Green</span>}
          </div>
        )}
        {Array.isArray(candidate.rule_results) && candidate.rule_results.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Rules</div>
            <div className="space-y-2">
              {candidate.rule_results.map((r, i) => (
                <div key={`${r.id}-${i}`} className="border border-gray-200 rounded-md p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{(r.status as any)?.toString()?.toUpperCase?.()}</div>
                    <div className="text-xs text-gray-500">{r.id}</div>
                  </div>
                  <div className="mt-1 text-gray-800">{r.reason}</div>
                  {r.evidence && (<EvidenceView evidence={r.evidence} />)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceView({ evidence }: { evidence: any }) {
  try {
    const rows: Array<{ k: string, v: any }> = []
    const push = (k: string, v: any) => rows.push({ k, v })
    if (typeof evidence.durationMinutes === 'number') push('duration', `${evidence.durationMinutes} min`)
    if (evidence.threshold) push('threshold', JSON.stringify(evidence.threshold))
    if (typeof evidence.mode === 'string') push('mode', evidence.mode)
    if (Array.isArray(evidence.acceptable)) push('acceptable', evidence.acceptable.join(', '))
    if (typeof evidence.hoursBucket === 'string') push('hoursBucket', evidence.hoursBucket)
    if (typeof evidence.referralPresent === 'boolean') push('referralPresent', String(evidence.referralPresent))
    if (typeof evidence.location === 'string') push('location', evidence.location)
    if (typeof evidence.scope === 'string') push('scope', evidence.scope)
    if (typeof evidence.months === 'number') push('months', evidence.months)
    if (typeof evidence.max === 'number') push('max', evidence.max)
    if (Array.isArray(evidence.combinedWith) && evidence.combinedWith.length > 0) push('combinedWith', evidence.combinedWith.join(', '))
    if (typeof evidence.windowStart === 'string') push('windowStart', evidence.windowStart)
    if (typeof evidence.windowEnd === 'string') push('windowEnd', evidence.windowEnd)
    if (Array.isArray(evidence.matches)) push('matches', `${evidence.matches.length} record(s) in window`)
    if (Array.isArray(evidence.overlap)) push('overlap', evidence.overlap.join(', '))

    if (rows.length === 0) return null
    return (
      <div className="mt-2 text-xs text-gray-600">
        <table className="w-full border-separate border-spacing-y-1">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="align-top whitespace-nowrap pr-2 text-gray-500">{r.k}</td>
                <td className="align-top break-words">{String(r.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  } catch {
    return (<pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">{JSON.stringify(evidence, null, 2)}</pre>)
  }
}
