/*
  Normalize mbs_rules.json into a consistent schema.
  Usage: node scripts/normalize-mbs-rules.js apps/api/src/suggest/mbs_rules.json
*/

const fs = require('fs');
const path = require('path');

function parseBoolean(value) {
  return value === true;
}

function ensureStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x)).filter((x) => x.length > 0);
}

function parseIntervalString(interval) {
  if (typeof interval !== 'string') return null;
  const m = interval.trim().match(/^([\[\(])\s*([^,]+)\s*,\s*([^\]\)]+)\s*([\]\)])$/);
  if (!m) return null;
  const includeMin = m[1] === '[';
  const includeMax = m[4] === ']';
  const parseEnd = (s) => {
    const v = s.trim().toLowerCase();
    if (v === 'null' || v === 'none' || v === 'inf' || v === 'infinite') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const minMinutes = parseEnd(m[2]);
  const maxMinutes = parseEnd(m[3]);
  return { minMinutes, maxMinutes, includeMin, includeMax };
}

function normalizeTimeThreshold(obj) {
  if (!obj || typeof obj !== 'object') return undefined;
  if ('interval' in obj) {
    const parsed = parseIntervalString(obj.interval);
    if (parsed) return parsed;
  }
  // Already normalized?
  const keys = ['minMinutes', 'maxMinutes'];
  if (keys.some((k) => k in obj)) {
    return {
      minMinutes: obj.minMinutes ?? null,
      maxMinutes: obj.maxMinutes ?? null,
      includeMin: obj.includeMin !== false,
      includeMax: obj.includeMax === true,
    };
  }
  return undefined;
}

function normalizeFrequencyLimits(obj) {
  if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return undefined;
  const per = obj.per || obj.scope || '';
  let scope = null;
  let months = undefined;
  if (per === 'calendar_year') {
    scope = 'calendar_year';
  } else if (per === 'months' || per === 'period_months' || per === 'rolling_months') {
    scope = 'rolling_months';
    months = Number(obj.period_length ?? obj.months);
    if (!Number.isFinite(months)) months = undefined;
  }
  const out = {};
  if (scope) out.scope = scope;
  if (scope === 'rolling_months' && Number.isFinite(months)) out.months = months;
  if (Number.isFinite(Number(obj.max))) out.max = Number(obj.max);
  const combined = obj.combined_with || obj.combinedWith;
  if (combined && Array.isArray(combined) && combined.length > 0) {
    out.combinedWith = ensureStringArray(combined);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeConditions(arr, flags) {
  const result = [];
  const list = Array.isArray(arr) ? arr : [];
  for (const raw of list) {
    if (typeof raw !== 'string') {
      result.push({ kind: 'text', value: String(raw) });
      continue;
    }
    const s = raw.trim();
    if (!s) continue;

    if (s === 'requires referral' || s === 'referral_required') {
      result.push({ kind: 'referral_required' });
      continue;
    }
    if (s === 'same_specialist_or_locum_tenens') {
      result.push({ kind: 'same_specialist_or_locum_tenens' });
      continue;
    }
    if (s === 'review_after_first_in_course_of_treatment' || s === 'after_first_in_course_of_treatment' || s === 'first_or_only_in_course_of_treatment' || s === 'initial_assessment' || s === 'minor_attendance' || s === 'comprehensive_assessment') {
      result.push({ kind: s });
      continue;
    }
    // specialty: xyz
    let m = s.match(/^specialty\s*:\s*(.+)$/i);
    if (m) {
      result.push({ kind: 'specialty', value: m[1].trim() });
      continue;
    }
    // requires_prior_initial_within_12_months: [132,6023]
    m = s.match(/^requires_prior_initial_within_(\d+)__?months\s*:\s*\[(.+)\]\s*$/i);
    if (m) {
      const months = Number(m[1]);
      const codes = m[2].split(',').map((x) => String(x).trim()).filter(Boolean);
      result.push({ kind: 'requires_prior_initial_within_months', months, codes });
      continue;
    }
    // Fallback text kind
    result.push({ kind: 'text', value: s });
  }

  // If flags indicate video is required, add a structured condition
  if (flags && flags.telehealth && flags.video_required) {
    result.push({ kind: 'telehealth_video_required', value: true });
  }

  return result;
}

function normalizeFlags(flags) {
  const f = flags && typeof flags === 'object' ? flags : {};
  return {
    telehealth: parseBoolean(f.telehealth),
    after_hours: parseBoolean(f.after_hours),
    video_required: parseBoolean(f.video_required),
    consulting_rooms_only: parseBoolean(f.consulting_rooms_only),
    hospital_only: parseBoolean(f.hospital_only),
    residential_care: parseBoolean(f.residential_care),
  };
}

function normalizeItem(item) {
  const flags = normalizeFlags(item.flags);
  const normalized = {
    code: String(item.code ?? ''),
    title: String(item.title ?? ''),
    desc: String(item.desc ?? ''),
    fee: item.fee === null || item.fee === undefined ? null : String(item.fee),
    timeThreshold: normalizeTimeThreshold(item.timeThreshold),
    frequencyLimits: normalizeFrequencyLimits(item.frequency_limits || item.frequencyLimits),
    flags,
    mutuallyExclusiveWith: ensureStringArray(item.mutuallyExclusiveWith),
    references: ensureStringArray(item.references),
    conditions: normalizeConditions(item.conditions, flags),
  };
  // Remove undefined keys
  for (const k of Object.keys(normalized)) {
    if (normalized[k] === undefined) delete normalized[k];
  }
  return normalized;
}

function main() {
  const inputPath = process.argv[2];
  const outputPathArg = process.argv[3];
  if (!inputPath) {
    console.error('Usage: node scripts/normalize-mbs-rules.js <path-to-mbs_rules.json>');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs);
    process.exit(1);
  }

  const raw = fs.readFileSync(abs, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON input:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error('Expected a JSON array of items');
    process.exit(1);
  }

  const backupPath = abs.replace(/\.json$/i, '.backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf8');

  const out = data.map(normalizeItem);
  const outPath = outputPathArg
    ? path.resolve(process.cwd(), outputPathArg)
    : abs;
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  // Basic report
  const counts = {
    total: out.length,
    withTime: out.filter((i) => i.timeThreshold).length,
    withFreq: out.filter((i) => i.frequencyLimits).length,
    withConditions: out.filter((i) => Array.isArray(i.conditions) && i.conditions.length > 0).length,
  };
  console.log('Normalized mbs_rules.json:', counts);
  console.log('Backup saved to', backupPath);
  console.log('Output written to', outPath);
}

main();


