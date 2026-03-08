/**
 * Live Analysis Panel Component (O1)
 * Real-time AI analysis display for operator decision support
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, Zap } from 'lucide-react'

export interface LiveAnalysisData {
  analysisId: string
  callId: string
  transcript: string
  detectedSymptoms: Array<{
    symptom: string
    confidence: number
    severity: string
  }>
  severity: string
  aiSuggestion: string
  recommendedAction: string
  nextQuestions: string[]
}

interface LiveAnalysisPanelProps {
  analysisId?: string
  isActive?: boolean
  onUpdate?: (data: LiveAnalysisData) => void
}

export function LiveAnalysisPanel({
  analysisId,
  isActive = false,
  onUpdate,
}: LiveAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<LiveAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isActive || !analysisId) return

    // Fetch current analysis
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/live-analysis/${analysisId}`)
        if (response.ok) {
          const { analysis } = await response.json()
          setAnalysis(analysis)
          onUpdate?.(analysis)
        }
      } catch (error) {
        console.error('[LiveAnalysisPanel] Error fetching analysis:', error)
      }
    }

    fetchAnalysis()

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchAnalysis, 2000)

    return () => clearInterval(interval)
  }, [analysisId, isActive, onUpdate])

  if (!isActive || !analysis) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            O1: Live Analysis Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Waiting for active call analysis...
          </div>
        </CardContent>
      </Card>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50'
      case 'HIGH':
        return 'bg-orange-50'
      case 'MEDIUM':
        return 'bg-yellow-50'
      default:
        return 'bg-blue-50'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" />
          O1: Live Analysis Panel
        </CardTitle>
        <CardDescription>Real-time AI
 assisted call analysis for operator support</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Transcript */}
        <div>
          <h4 className="font-semibold text-xs mb-2">📞 RECENT TRANSCRIPT (Last 30 seconds):</h4>
          <div className="bg-slate-100 p-3 rounded text-xs text-slate-700 max-h-20 overflow-y-auto">
            {analysis.transcript || 'Waiting for call content...'}
          </div>
        </div>

        {/* Severity Alert */}
        <Alert variant={analysis.severity === 'CRITICAL' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Severity: {analysis.severity}</strong>
            <br />
            {analysis.aiSuggestion}
          </AlertDescription>
        </Alert>

        {/* Detected Symptoms */}
        {analysis.detectedSymptoms.length > 0 && (
          <div>
            <h4 className="font-semibold text-xs mb-2">🔍 DETECTED SYMPTOMS:</h4>
            <div className="space-y-1">
              {analysis.detectedSymptoms.map((symptom, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="text-xs">{symptom.symptom}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded h-2">
                      <div
                        className="bg-green-500 h-2 rounded"
                        style={{ width: `${symptom.confidence}%` }}
                      />
                    </div>
                    <Badge variant={getSeverityColor(symptom.severity)} className="text-xs">
                      {symptom.confidence}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Action */}
        <div className={`p-3 rounded ${getSeverityBg(analysis.severity)}`}>
          <h4 className="font-semibold text-xs mb-1">💡 RECOMMENDED ACTION:</h4>
          <p className="text-xs font-medium">{analysis.recommendedAction}</p>
        </div>

        {/* Next Questions */}
        {analysis.nextQuestions.length > 0 && (
          <div>
            <h4 className="font-semibold text-xs mb-2">❓ SUGGEST ASKING:</h4>
            <ul className="space-y-1">
              {analysis.nextQuestions.map((question, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Update Status */}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Last updated: {new Date(analysis.timestamp || Date.now()).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}
