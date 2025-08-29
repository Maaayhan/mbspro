'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'

export type SwapAlt = {
  code: string
  title: string
  fee?: number
  policy: { status: 'green'|'amber'|'red'|string; reason: string }
  selection: { blocked?: boolean; warnings?: string[]; conflicts?: Array<{ code: string; with: string[] }> }
  // candidate details for replacement
  rule_results?: any[]
  compliance?: string
  confidence?: number
  feature_hits?: string[]
  score?: number
  score_breakdown?: Record<string, number>
}

type Props = {
  open: boolean
  onClose: () => void
  code: string
  title: string
  note: string
  selectedCodes: string[]
  onReplace: (alt: SwapAlt, opts?: { removeConflicts?: boolean }) => void
}

export default function SwapPanel({ open, onClose, code, title, note, selectedCodes, onReplace }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [alts, setAlts] = useState<SwapAlt[]>([])
  const [autoRemoveConflicts, setAutoRemoveConflicts] = useState(true)

  useEffect(() => {
    if (!open) return
    async function load() {
      setLoading(true); setError('')
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000').replace(/\/$/, '')
        const res = await fetch(`${apiBase}/api/suggest/alternatives`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note, currentCode: code, selectedCodes, topN: 8 })
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const arr = Array.isArray(data?.alternatives) ? data.alternatives : []
        // filter: exclude items already visible in top suggestions (selectedCodes isn't the same; ask caller to pass visible suggestions? Use heuristic: exclude currentCode and duplicates by code in selectedCodes and also those in window.suggestVisible if provided)
        const visible: string[] = Array.isArray((window as any)?.__suggestVisible)
          ? ((window as any).__suggestVisible as string[])
          : []
        const filtered = arr.filter((a: any) => a && a.code && a.code !== code && !selectedCodes.includes(a.code) && !visible.includes(a.code))
        setAlts(filtered)
      } catch (e: any) {
        setError(e?.message || 'Failed to load alternatives')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, code, note, selectedCodes.join(',')])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm text-gray-600">Swap for</div>
            <div className="text-lg font-semibold text-gray-900">{code} — {title}</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <input id="auto-remove-conflicts" type="checkbox" className="rounded border-gray-300" checked={autoRemoveConflicts} onChange={(e) => setAutoRemoveConflicts(e.target.checked)} />
          <label htmlFor="auto-remove-conflicts" className="text-sm text-gray-700">Auto remove conflicting items</label>
        </div>

        {loading && <div className="text-gray-600 text-sm">Loading alternatives…</div>}
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <div className="space-y-3">
          {alts.map((a) => (
            <div key={a.code} className="border border-gray-200 rounded p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded">{a.code}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{a.title}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-700">
                    <span className={`px-2 py-0.5 rounded-full mr-2 ${a.policy.status==='green'?'bg-green-100 text-green-800':a.policy.status==='amber'?'bg-yellow-100 text-yellow-800':'bg-red-100 text-red-800'}`}>{a.policy.status}</span>
                    <span>{a.policy.reason || '—'}</span>
                  </div>
                  {a.selection?.warnings && a.selection.warnings.length > 0 && (
                    <div className="mt-1 text-xs text-amber-700">Warnings: {a.selection.warnings.join('; ')}</div>
                  )}
                  {a.selection?.blocked && a.selection.conflicts && a.selection.conflicts.length > 0 && (
                    <div className="mt-1 text-xs text-red-700">Conflicts: {a.selection.conflicts.map((c:any)=>`${c.code}↔${c.with.join(',')}`).join(' ; ')}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm text-gray-700">{typeof a.fee==='number' ? `$${a.fee.toFixed(2)}` : ''}</div>
                  {!a.selection?.blocked ? (
                    <button onClick={() => onReplace(a, { removeConflicts: autoRemoveConflicts })} className="bg-primary-600 hover:bg-primary-700 text-white text-xs px-3 py-1 rounded">Replace</button>
                  ) : (
                    <button onClick={() => onReplace(a, { removeConflicts: true })} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">Force Replace</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!loading && alts.length === 0 && <div className="text-sm text-gray-500">No alternatives available.</div>}
        </div>
      </div>
    </div>
  )
}


