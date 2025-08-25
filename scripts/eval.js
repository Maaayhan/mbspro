/*
  Simple evaluation runner for /suggest
  - Reads eval/notes.jsonl
  - Calls local API /api/suggest with topN=3
  - Computes Top-1/Top-3 Precision/Recall and P50/P95 latency
*/

const fs = require('fs');
const path = require('path');

async function readJsonl(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\r?\n/) 
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

async function callSuggest(note, topN = 3, base = process.env.API_BASE || 'http://localhost:4000') {
  const url = `${base}/api/suggest`;
  const payload = { note, topN };
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const ms = Date.now() - t0;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  return { json, ms };
}

function precisionAtK(predCodes, goldCodes, k) {
  const predTopK = predCodes.slice(0, k);
  const hits = predTopK.filter((c) => goldCodes.includes(c));
  return hits.length / Math.max(1, k);
}

function recallAtK(predCodes, goldCodes, k) {
  const predTopK = predCodes.slice(0, k);
  const hits = goldCodes.filter((g) => predTopK.includes(g));
  return hits.length / Math.max(1, goldCodes.length);
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function main() {
  const evalPath = path.join(__dirname, '..', 'eval', 'notes.jsonl');
  const items = await readJsonl(evalPath);
  const latencies = [];
  let p1Sum = 0, p3Sum = 0, r1Sum = 0, r3Sum = 0;

  for (const { note, gold_codes } of items) {
    try {
      const { json, ms } = await callSuggest(note, 3);
      latencies.push(ms);
      const predCodes = (json.candidates || []).map((c) => String(c.code));
      p1Sum += precisionAtK(predCodes, gold_codes, 1);
      p3Sum += precisionAtK(predCodes, gold_codes, 3);
      r1Sum += recallAtK(predCodes, gold_codes, 1);
      r3Sum += recallAtK(predCodes, gold_codes, 3);
    } catch (e) {
      console.error('Eval error:', e.message);
    }
  }

  const n = items.length;
  const p1 = (p1Sum / n).toFixed(3);
  const p3 = (p3Sum / n).toFixed(3);
  const r1 = (r1Sum / n).toFixed(3);
  const r3 = (r3Sum / n).toFixed(3);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);

  console.log('=== Eval Metrics (topN=3) ===');
  console.log(`Top-1 Precision: ${p1}`);
  console.log(`Top-3 Precision: ${p3}`);
  console.log(`Top-1 Recall:    ${r1}`);
  console.log(`Top-3 Recall:    ${r3}`);
  console.log(`Latency P50:     ${p50} ms`);
  console.log(`Latency P95:     ${p95} ms`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


