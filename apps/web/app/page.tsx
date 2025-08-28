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

      return {
        code,
        title: result.title,
        score: (() => {
          const s =
            typeof result.match_score === "number" ? result.match_score : 0;
          if (s > 1 && s <= 100) return Math.max(0, Math.min(1, s / 100));
          return Math.max(0, Math.min(1, s));
        })(),
        short_explain: result.match_reason,
        feature_hits: [`Fee: $${result.fee}`, `Benefit: $${result.benefit}`],
      };
    }
  );

  return {
    candidates,
    signals: {
      duration: 0,
      mode: "rag" as any, // 你的 Signals 定义里若是联合类型，可在传入 ClaimForm 时兜底
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

  // ✅ 多选相关
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const selectedCount = Object.values(selectedMap).filter(Boolean).length;

  // ✅ 打开 ClaimForm（批量）相关
  const [openForm, setOpenForm] = useState(false);
  const [bulkCodes, setBulkCodes] = useState<string[] | null>(null);

  // 打开 modal 时禁滚（可选）
  useEffect(() => {
    if (openForm) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openForm]);

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
      console.error("Error calling /suggest:", err);
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
    setSelectedMap({});
  };

  // ✅ 生成被选中的 codes，并打开 ClaimForm
  const openClaimWithSelected = () => {
    if (!response?.candidates) return;
    const picked: string[] = [];
    response.candidates.forEach((c, idx) => {
      const key = `${c.code}#${idx}`;
      if (selectedMap[key]) picked.push(c.code);
    });
    const codes = explodeCodes(picked);
    if (codes.length === 0) return;

    // 可选：限制最多 N 条，避免 UI 过挤
    const MAX = 10;
    const finalCodes = codes.slice(0, MAX);

    setBulkCodes(finalCodes);
    setOpenForm(true);
  };

  // ✅ 全选/清空
  const selectAll = () => {
    if (!response?.candidates) return;
    const map: Record<string, boolean> = {};
    response.candidates.forEach((c, idx) => {
      map[`${c.code}#${idx}`] = true;
    });
    setSelectedMap(map);
  };
  const clearSelection = () => setSelectedMap({});

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

      {/* Input Form */}
      <div className="card max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="clinical-note" className="form-label">
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

            {/* Empty state */}
            {(!response.candidates || response.candidates.length === 0) && (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-600">
                No suggestions were found. Try refining the note or increasing
                Top-N.
              </div>
            )}

            {/* Candidate cards（✅ 加了复选框） */}
            <div className="space-y-3">
              {response.candidates?.map((c, idx) => {
                const key = `${c.code}#${idx}`;
                return (
                  <div
                    key={key}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={!!selectedMap[key]}
                          onChange={(e) =>
                            setSelectedMap((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          aria-label={`Select ${c.code}`}
                        />
                        <div>
                          <div className="text-sm text-gray-500">
                            #{idx + 1}
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {c.code} · {c.title}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Score</div>
                        <div className="text-lg font-bold text-gray-900">
                          {c.score?.toFixed(3)}
                        </div>
                      </div>
                    </div>

                    {c.short_explain && (
                      <div className="mt-2 text-sm text-gray-700">
                        {c.short_explain}
                      </div>
                    )}

                    {Array.isArray(c.rule_results) &&
                      c.rule_results.length > 0 && (
                        <div className="mt-3 text-sm">
                          <div className="text-xs font-medium text-gray-600 mb-1">
                            Rules
                          </div>
                          <ul className="list-disc list-inside space-y-1">
                            {c.rule_results.map((r, i) => (
                              <li
                                key={`${r.id}-${i}`}
                                className="text-gray-700"
                              >
                                <span className="font-semibold">
                                  {(r.status as any)
                                    ?.toString()
                                    ?.toUpperCase?.()}
                                </span>
                                {": "}
                                {r.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {Array.isArray(c.feature_hits) &&
                      c.feature_hits.length > 0 && (
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
                );
              })}
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
    </div>
  );
}
