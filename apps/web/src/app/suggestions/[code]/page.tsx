'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { useSuggestResults } from '@/store/useSuggestResults'
import { useClaimDraft } from '@/store/useClaimDraft'

function toPercent(v?: number) {
  if (typeof v !== 'number' || isNaN(v)) return '—'
  return `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`
}

export default function SuggestExplainPage({ params }: { params: { code: string } }) {
  const { getByCode, note } = useSuggestResults()
  const { addItem } = useClaimDraft()
  const candidate = getByCode(decodeURIComponent(params.code))
  const router = useRouter()
  const [selectionWarnings, setSelectionWarnings] = useState<string[]>([])
  const [blocked, setBlocked] = useState(false)
  const [aiText, setAiText] = useState<string>('')
  const [loadingAi, setLoadingAi] = useState(false)

  useEffect(() => {
    // run selection validation including this candidate if user点击接受前想看组合冲突
    async function runValidate() {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000').replace(/\/$/, '')
        const res = await fetch(`${apiBase}/api/rules/validate-selection`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedCodes: [params.code] })
        })
        if (!res.ok) return
        const data = await res.json()
        setBlocked(!!data.blocked)
        setSelectionWarnings(Array.isArray(data.warnings) ? data.warnings : [])
      } catch {}
    }
    runValidate()
  }, [params.code])

  const fee = useMemo(() => candidate?.feature_hits?.find(f => f.startsWith('Fee:'))?.replace('Fee: $', '') || '0.00', [candidate])

  // Map rule id to human-readable policy name
  const labelForRule = (id: string): string => {
    const map: Record<string, string> = {
      time_threshold: 'Minimum Duration',
      telehealth: 'Telehealth Context',
      telehealth_video_required: 'Video Required for Telehealth',
      after_hours: 'After-hours Context',
      mutually_exclusive: 'Mutual Exclusivity',
      frequency_limits: 'Frequency Limits',
      location_consulting_rooms_only: 'Location: Consulting Rooms Only',
      location_hospital_only: 'Location: Hospital Only',
      location_residential_care: 'Location: Residential Care',
      referral_required: 'Referral Required',
      specialty_required: 'Specialty Requirement',
      required_elements: 'Required Documentation Elements',
    }
    return map[id] || id
  }

  const policyRows = useMemo(() => {
    const rr = (candidate?.rule_results || []) as any[]
    // sort: fail -> warn -> pass
    const rank: Record<string, number> = { fail: 0, warn: 1, pass: 2 }
    return rr.slice().sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3))
  }, [candidate?.rule_results])

  const missingElements = useMemo(() => {
    const rr = (candidate?.rule_results || []) as any[]
    const missFromRule = rr.find(r => r.id === 'required_elements' && /Missing elements/i.test(String(r.reason || '')))
    if (missFromRule) {
      const m = String(missFromRule.reason).match(/Missing elements:\s*(.*)$/i)
      if (m && m[1]) return m[1].split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    return [] as string[]
  }, [candidate?.rule_results])

  const summary = useMemo(() => {
    if (!candidate) return ''
    const parts: string[] = []
    parts.push(`${candidate.code} — ${candidate.title}.`)
    if (candidate.compliance === 'red') parts.push('Policy check: Blocked. Please resolve failed rules below。')
    else if (candidate.compliance === 'amber') parts.push('Policy check: Needs Review. See warnings below。')
    else parts.push('Policy check: OK.')
    if (missingElements.length) parts.push(`Add documentation: ${missingElements.join(', ')}.`)
    return parts.join(' ')
  }, [candidate, missingElements])

  const onAccept = () => {
    if (!candidate) return
    addItem({ code: candidate.code, title: candidate.title, fee, description: candidate.title, score: candidate.score })
    router.push('/suggestions')
  }

  useEffect(() => {
    async function genExplain() {
      if (!candidate) return
      try {
        setLoadingAi(true)
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000').replace(/\/$/, '')
        const res = await fetch(`${apiBase}/api/suggest/explain-text`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: candidate.code, title: candidate.title, rule_results: candidate.rule_results, compliance: candidate.compliance })
        })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        setAiText(data?.text || '')
      } catch {
        setAiText('')
      } finally {
        setLoadingAi(false)
      }
    }
    genExplain()
  }, [candidate?.code])

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Policy Explanation</h1>
          <Link href="/suggestions" className="text-primary-600 hover:text-primary-700">← Back</Link>
        </div>

        {note && (
          <div className="card">
            <div className="text-sm font-medium text-gray-900 mb-2">Clinical Notes (read‑only)</div>
            <div className="bg-gray-50 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">
              {note}
            </div>
          </div>
        )}

        {!candidate ? (
          <div className="card">No explanation available. Please re-run suggestions.</div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{candidate.code} — {candidate.title}</div>
                  <div className="text-sm text-gray-600 mt-1">Compliance: <span className={`${candidate.compliance==='green'?'text-green-700':candidate.compliance==='amber'?'text-amber-700':'text-red-700'}`}>{candidate.compliance ?? '—'}</span> · Fee: ${fee}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={onAccept} disabled={blocked} className={`btn-primary ${blocked ? 'opacity-50 cursor-not-allowed' : ''}`}>Accept</button>
                </div>
              </div>
              {blocked && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="text-sm font-medium text-red-800">Selection is blocked</div>
                  {selectionWarnings.length > 0 && (
                    <ul className="list-disc ml-5 text-xs text-red-700 mt-1">
                      {selectionWarnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Policy-focused explanation */}
            <div className="card space-y-4">
              <p className="text-sm text-gray-700">{summary}</p>
              <div className="text-sm text-gray-700">
                <div className="font-medium text-gray-900 mb-1">AI Explanation</div>
                {loadingAi ? <div className="text-gray-500">Generating…</div> : (aiText ? <p>{aiText}</p> : <p className="text-gray-500">—</p>)}
              </div>

              {(candidate.rule_results && candidate.rule_results.length > 0) ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 px-2 w-56">Policy</th>
                        <th className="py-2 px-2 w-24">Status</th>
                        <th className="py-2 px-2">Why</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policyRows.map((r: any, idx: number) => (
                        <tr key={idx} className="border-b last:border-b-0 border-gray-100 align-top">
                          <td className="py-2 px-2 font-medium text-gray-800">{labelForRule(r.id)}</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${r.status === 'pass' ? 'bg-green-100 text-green-800' : r.status === 'warn' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span>
                          </td>
                          <td className="py-2 px-2 text-gray-800">{r.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No rule results available.</div>
              )}

              {(missingElements.length > 0 || selectionWarnings.length > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                  <div className="font-medium text-amber-900 mb-1">What to fix</div>
                  <ul className="list-disc ml-5 space-y-1 text-amber-900">
                    {missingElements.map((m, i) => <li key={`m-${i}`}>Add documentation: {m}</li>)}
                    {selectionWarnings.map((w, i) => <li key={`w-${i}`}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}


