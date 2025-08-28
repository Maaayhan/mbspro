"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

// ---------- Types ----------
export type VisitType = "in_person" | "telehealth" | "after_hours";

export type Signals = {
  duration?: number;
  mode?: VisitType;
};

export type Item = {
  code: string; // MBS code (free text to allow e.g. "23", "721")
  display?: string;
  unitPrice?: number; // cents or dollars? using number; caller decides
  modifiers: string[]; // e.g. ["TELEHEALTH", "AFTER_HOURS"]
};

export type SubmitSuccess = {
  claim?: unknown;
  bundle?: unknown;
  hapi?: { id?: string };
};

export type SubmitError = { error?: string; message?: string };

const MODIFIER_OPTIONS = [
  { code: "AFTER_HOURS", label: "After-hours" },
  { code: "TELEHEALTH", label: "Telehealth" },
] as const;

// Small helpers
const toNumberOrUndefined = (v: string) =>
  v.trim() === "" || Number.isNaN(Number(v)) ? undefined : Number(v);

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

// ---------- Component ----------
export default function ClaimForm({
  code,
  note,
  defaultSignals = {},
  initialItemsCodes,
  onClose,
}: {
  code: string;
  note: string;
  defaultSignals?: Signals;
  initialItemsCodes?: string[];
  onClose: () => void;
}) {
  // IDs (editable)
  const [patientId, setPatientId] = useState("pat-123");
  const [practitionerId, setPractitionerId] = useState("prac-001");

  // Whether to auto-create Encounter (recommended for demo)
  const [autoEncounter, setAutoEncounter] = useState(true);
  const [encounterId, setEncounterId] = useState("enc-temp");

  // Items (multiple lines supported)
  const [items, setItems] = useState<Item[]>(() => {
    const codes = (initialItemsCodes?.length ? initialItemsCodes : [code])
      .map((c) => c.trim())
      .filter(Boolean);

    const uniqCodes = Array.from(new Set(codes));
    return uniqCodes.map((c) => ({
      code: c,
      modifiers: [],
      unitPrice: undefined,
    }));
  });

  // Encounter-level context (AI prefilled, editable)
  const [durationMinutes, setDurationMinutes] = useState<number>(
    defaultSignals.duration ?? 0
  );
  const [visitType, setVisitType] = useState<VisitType>(
    defaultSignals.mode ?? "in_person"
  );

  // Notes → Claim.note[]
  const [notesText, setNotesText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitSuccess | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const formId = useId();
  const firstInvalidRef = useRef<HTMLInputElement | null>(null);

  const apiBase = useMemo(() => {
    const base = (
      process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
    ).replace(/\/$/, "");
    return base;
  }, []);

  // ---------- helpers ----------
  const updateItem = useCallback((idx: number, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { code: "", modifiers: [], unitPrice: undefined },
    ]);
  }, []);

  const removeItem = useCallback((idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Visit type syncs default modifiers for each item (still overridable per item)
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        let mods = [...it.modifiers];
        const hasT = mods.includes("TELEHEALTH");
        const hasA = mods.includes("AFTER_HOURS");
        if (visitType === "telehealth" && !hasT) mods.push("TELEHEALTH");
        if (visitType !== "telehealth" && hasT)
          mods = mods.filter((m) => m !== "TELEHEALTH");
        if (visitType === "after_hours" && !hasA) mods.push("AFTER_HOURS");
        if (visitType !== "after_hours" && hasA)
          mods = mods.filter((m) => m !== "AFTER_HOURS");
        mods = uniq(mods);
        return mods.join("|") === it.modifiers.join("|")
          ? it
          : { ...it, modifiers: mods };
      })
    );
  }, [visitType]);

  // ---------- validation ----------
  const itemErrors = useMemo(
    () =>
      items.map((i) => ({ code: !i.code.trim() ? "Code is required" : null })),
    [items]
  );

  const hasErrors = useMemo(
    () =>
      itemErrors.some((e) => e.code) || (!autoEncounter && !encounterId.trim()),
    [itemErrors, autoEncounter, encounterId]
  );

  // Focus first invalid input on submit
  useEffect(() => {
    if (!submitting && hasErrors && firstInvalidRef.current) {
      firstInvalidRef.current.focus();
    }
  }, [submitting, hasErrors]);

  // ---------- submit ----------
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setErr(null);
    setResult(null);

    // Build payload
    const payload = {
      patientId: patientId.trim(),
      practitionerId: practitionerId.trim(),
      encounterId: autoEncounter ? undefined : encounterId.trim(),
      encounter: autoEncounter
        ? {
            // Minimal fields to auto-create Encounter (backend can derive end from duration)
            visitType,
            durationMinutes,
          }
        : undefined,
      selected: items.map((it) => ({
        code: it.code.trim(),
        display: it.display?.trim() || undefined,
        modifiers: uniq(it.modifiers),
        ...(typeof it.unitPrice === "number"
          ? { unitPrice: Number(it.unitPrice) }
          : {}),
      })),
      meta: {
        rawNote: note,
        durationMinutes,
        visitType,
        ruleNotes: notesText ? [notesText] : [],
      },
    };

    // Client-side guard
    if (hasErrors) {
      setErr("Please fix validation errors before submitting.");
      setSubmitting(false);
      return;
    }

    // Fetch with timeout
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 20000);

    try {
      const url = autoEncounter
        ? `${apiBase}/api/claim/bundle/submit`
        : `${apiBase}/api/claim/submit`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(to);

      const maybeJson = (await res.json().catch(() => ({}))) as
        | SubmitSuccess
        | SubmitError;
      if (!res.ok) {
        const msg =
          (maybeJson as SubmitError)?.error ||
          (maybeJson as SubmitError)?.message ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setResult(maybeJson as SubmitSuccess);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setErr(msg);
    } finally {
      clearTimeout(to);
      setSubmitting(false);
    }
  }, [
    apiBase,
    autoEncounter,
    encounterId,
    durationMinutes,
    visitType,
    items,
    note,
    hasErrors,
    patientId,
    practitionerId,
    notesText,
  ]);

  // Submit on <form> to get Enter key + accessibility
  const onSubmitForm = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void handleSubmit();
    },
    [handleSubmit]
  );

  return (
    <div className="space-y-5">
      {!result ? (
        <form
          className="space-y-5"
          onSubmit={onSubmitForm}
          aria-labelledby={`${formId}-title`}
        >
          <h2 id={`${formId}-title`} className="sr-only">
            Create Claim
          </h2>

          {/* IDs & Encounter  */}
          <section
            className="rounded border p-3 space-y-3"
            aria-labelledby={`${formId}-ids`}
          >
            <h3
              id={`${formId}-ids`}
              className="text-sm font-semibold text-gray-800"
            >
              Patient & Practitioner
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledInput
                label="Patient ID"
                value={patientId}
                onChange={setPatientId}
                autoComplete="off"
              />
              <LabeledInput
                label="Practitioner ID"
                value={practitionerId}
                onChange={setPractitionerId}
                autoComplete="off"
              />
              <div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={autoEncounter}
                    onChange={(e) => setAutoEncounter(e.target.checked)}
                    aria-describedby={`${formId}-encounter-hint`}
                  />
                  Auto-create Encounter
                </label>
                <p
                  id={`${formId}-encounter-hint`}
                  className="mt-1 text-xs text-gray-500"
                >
                  If unchecked, you must provide an Encounter ID.
                </p>
                {!autoEncounter && (
                  <div className="mt-2">
                    <LabeledInput
                      label="Encounter ID"
                      value={encounterId}
                      onChange={setEncounterId}
                      isInvalid={!encounterId.trim()}
                      inputRef={(el) => {
                        if (!encounterId.trim()) firstInvalidRef.current = el;
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="space-y-3" aria-labelledby={`${formId}-items`}>
            <h3
              id={`${formId}-items`}
              className="text-sm font-semibold text-gray-800"
            >
              Items
            </h3>
            {items.map((it, idx) => {
              const codeInvalid = !it.code.trim();
              return (
                <div key={idx} className="rounded border p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <LabeledInput
                      label="MBS Code"
                      value={it.code}
                      onChange={(v) => updateItem(idx, { code: v })}
                      placeholder="e.g. 23, 721"
                      isInvalid={codeInvalid}
                      inputRef={(el) => {
                        if (codeInvalid && !firstInvalidRef.current)
                          firstInvalidRef.current = el;
                      }}
                    />
                    <LabeledInput
                      label="Display (optional)"
                      value={it.display || ""}
                      onChange={(v) => updateItem(idx, { display: v })}
                      placeholder="Level B GP consult"
                    />
                    <LabeledInput
                      label="Unit Price (optional)"
                      type="number"
                      value={it.unitPrice?.toString() || ""}
                      onChange={(v) =>
                        updateItem(idx, { unitPrice: toNumberOrUndefined(v) })
                      }
                      inputMode="decimal"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {MODIFIER_OPTIONS.map((opt) => {
                      const active = it.modifiers.includes(opt.code);
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() =>
                            updateItem(idx, {
                              modifiers: active
                                ? it.modifiers.filter((m) => m !== opt.code)
                                : uniq([...it.modifiers, opt.code]),
                            })
                          }
                          className={`px-2 py-1 rounded text-xs border focus:outline-none focus:ring ${
                            active
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 border-gray-300"
                          }`}
                          aria-pressed={active}
                          aria-label={`Toggle ${opt.label}`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="ml-auto text-xs text-red-600 hover:underline"
                        aria-label={`Remove item ${idx + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={addItem} className="btn-secondary">
              + Add item
            </button>
          </section>

          {/* Encounter context */}
          <section
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            aria-labelledby={`${formId}-ctx`}
          >
            <h3 id={`${formId}-ctx`} className="sr-only">
              Encounter Context
            </h3>
            <LabeledInput
              label="Duration (minutes)"
              type="number"
              value={String(durationMinutes)}
              onChange={(v) => setDurationMinutes(Number(v || 0))}
              inputMode="numeric"
            />
            <div>
              <div className="form-label">Visit Type</div>
              <select
                className="form-textarea"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as VisitType)}
                aria-label="Visit Type"
              >
                <option value="in_person">In-person</option>
                <option value="telehealth">Telehealth</option>
                <option value="after_hours">After-hours</option>
              </select>
            </div>
            <div />
          </section>

          {/* notes */}
          <section>
            <div className="form-label">Notes (optional)</div>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Any rationale or comments…"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              aria-label="Notes"
            />
          </section>

          {err && (
            <p className="text-sm text-red-600" role="alert">
              {err}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || hasErrors}
              aria-disabled={submitting || hasErrors}
            >
              {submitting ? "Creating…" : "Create Claim"}
            </button>
          </div>
        </form>
      ) : (
        <ResultView result={result} onClose={onClose} />
      )}
    </div>
  );
}

// ---------- Reusable Inputs ----------
function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  isInvalid,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  isInvalid?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  const id = useId();
  return (
    <div>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        className={`form-textarea ${
          isInvalid ? "border-red-500 focus:ring-red-500" : ""
        }`}
        value={value}
        placeholder={placeholder}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(isInvalid)}
      />
      {isInvalid && (
        <p className="mt-1 text-xs text-red-600">This field is required.</p>
      )}
    </div>
  );
}

// ---------- Result ----------
function ResultView({
  result,
  onClose,
}: {
  result: SubmitSuccess;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const claimId = result?.hapi?.id;

  // 兼容两种返回
  const payload = result.claim ?? result.bundle ?? {};
  const title = result.claim
    ? "Claim JSON"
    : result.bundle
    ? "Bundle JSON"
    : "Response";

  return (
    <div className="space-y-3">
      <div className="rounded border border-green-200 bg-green-50 p-3 text-sm">
        {result.claim
          ? "Claim created."
          : result.bundle
          ? "Bundle submitted."
          : "Success."}
        {claimId && (
          <span className="ml-2">
            ID: <code>{claimId}</code>
          </span>
        )}
      </div>

      <details
        className="rounded border p-3 bg-gray-50"
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-medium">
          {open ? `Hide ${title}` : `Show ${title}`}
        </summary>

        <pre className="mt-2 text-xs overflow-auto max-h-[60vh]">
          {JSON.stringify(payload, null, 2)}
        </pre>

        <div className="mt-2 flex gap-2 justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              navigator.clipboard
                .writeText(JSON.stringify(payload, null, 2))
                .catch(() => {});
            }}
          >
            Copy JSON
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${result.claim ? "claim" : "bundle"}-${
                claimId ?? "preview"
              }.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download JSON
          </button>
        </div>
      </details>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
