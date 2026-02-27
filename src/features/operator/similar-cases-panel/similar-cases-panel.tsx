/**
 * Similar Cases Panel Component (O2)
 * Shows similar past cases for operator learning
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, BookOpen, TrendingUp } from 'lucide-react'

interface SimilarCase {
  caseId: string
  transcript: string
  symptoms: string[]
  severity: string
  resolution: string
  dispatchSent: {
    service: string
    hospital: string
    outcome: string
  }
  operatorNotes: string
  similarity: number
}

interface SimilarCasesPanelProps {
  symptoms: string[]
  severity?: string
}

export function SimilarCasesPanel({ symptoms, severity = 'MEDIUM' }: SimilarCasesPanelProps) {
  const [cases, setCases] = useState<SimilarCase[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  useEffect(() => {
    if (symptoms.length === 0) return

    const fetchSimilarCases = async () => {
      setLoading(true)
      try {
        const symptomsParam = symptoms.join('+')
        const response = await fetch(
          `/api/similar-cases?symptoms=${symptomsParam}&severity=${severity}&limit=3`
        )

        if (response.ok) {
          const { cases } = await response.json()
          setCases(cases)
        }
      } catch (error) {
        console.error('[SimilarCasesPanel] Error fetching cases:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSimilarCases()
  }, [symptoms, severity])

  const toggleExpand = (caseId: string) => {
    setExpandedIds((prev) =>
      prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]
    )
  }

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'destructive'
      case 'HIGH':
        return 'default'
      case 'MEDIUM':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (cases.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            O2: Similar Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {loading ? 'Searching case history...' : 'No similar cases found in records.'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          O2: Similar Cases ({cases.length})
        </CardTitle>
        <CardDescription>Learn from how similar cases were handled</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {cases.map((caseRecord) => {
          const isExpanded = expandedIds.includes(caseRecord.caseId)

          return (
            <div key={caseRecord.caseId} className="border rounded-lg p-3 space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getSeverityColor(caseRecord.severity)} className="text-xs">
                      {caseRecord.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {caseRecord.similarity}% match
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold">Symptoms:</p>
                  <p className="text-xs text-muted-foreground">{caseRecord.symptoms.join(', ')}</p>
                </div>
              </div>

              {/* Quick Preview */}
              <div className="bg-slate-50 p-2 rounded text-xs max-h-16 overflow-hidden">
                <p className="text-muted-foreground line-clamp-3">{caseRecord.transcript}</p>
              </div>

              {/* Outcome */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-semibold text-xs">Dispatch:</p>
                  <p>{caseRecord.dispatchSent.service}</p>
                  <p className="text-muted-foreground">{caseRecord.dispatchSent.hospital}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs">Outcome:</p>
                  <Badge
                    variant={
                      caseRecord.dispatchSent.outcome === 'SUCCESSFUL'
                        ? 'default'
                        : caseRecord.dispatchSent.outcome === 'FAILED'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="text-xs"
                  >
                    {caseRecord.dispatchSent.outcome}
                  </Badge>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t pt-2 space-y-2">
                  <div>
                    <p className="font-semibold text-xs mb-1">📝 Operator Notes:</p>
                    <p className="text-xs text-muted-foreground">{caseRecord.operatorNotes}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-xs mb-1">✅ Resolution:</p>
                    <p className="text-xs text-muted-foreground">{caseRecord.resolution}</p>
                  </div>
                </div>
              )}

              {/* Toggle Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleExpand(caseRecord.caseId)}
              >
                {isExpanded ? '▼ Less' : '▶ More Details'}
              </Button>
            </div>
          )
        })}

        <div className="text-xs text-muted-foreground flex items-start gap-1 pt-2 border-t">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Use these examples to inform your dispatch decisions.</span>
        </div>
      </CardContent>
    </Card>
  )
}
