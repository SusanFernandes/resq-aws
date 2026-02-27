// AI Analysis Display Component
// Shows intent, confidence, sentiment, location verification on dashboard
// Feature O3: Protocol suggestion included

'use client'

import React from 'react'
import { AlertTriangle, CheckCircle2, AlertCircle, TrendingUp, MapPin, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export interface AIAnalysisData {
  intent: {
    type: string
    confidence: number
    displayName: string
    keywords: string[]
    priority: string
  }
  extracted: {
    location: string
    callerName: string
    age: string
    emergencyType: string
    severity: string
    description: string
  }
  location?: {
    address: string
    city: string
    state: string
    latitude: number
    longitude: number
    confidence: number
    verified: boolean
    riskLevel: string
  }
  sentiment: {
    stressLevel: 'calm' | 'stressed' | 'panic'
    stressPercentage: number
    emotionalState: string
    confidence: number
    needsReassurance: boolean
    suggestions: string[]
  }
  confidence: {
    overall: number
    recommendation: 'AUTO_DISPATCH' | 'OPERATOR_ASSISTED' | 'ESCALATE_TO_HUMAN'
    shouldAutoDispatch: boolean
    shouldEscalate: boolean
    reason: string
    riskLevel: 'safe' | 'caution' | 'unsafe'
    factors: Record<string, number>
  }
  suggestedResources: string[]
  readyForDispatch: boolean
  needsOperatorReview: boolean
  escalateToHuman: boolean
}

interface AIAnalysisCardProps {
  analysis: AIAnalysisData | null
  isLoading?: boolean
}

export function AIAnalysisCard({ analysis, isLoading = false }: AIAnalysisCardProps) {
  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">AI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Analyzing emergency...</div>
          ) : (
            <div className="text-sm text-muted-foreground">No analysis data available</div>
          )}
        </CardContent>
      </Card>
    )
  }

  const getStressEmoji = (level: string) => {
    switch (level) {
      case 'calm':
        return '😌'
      case 'stressed':
        return '😟'
      case 'panic':
        return '😱'
      default:
        return '❓'
    }
  }

  const getConfidenceColor = (percentage: number) => {
    if (percentage >= 85) return 'green'
    if (percentage >= 60) return 'yellow'
    return 'red'
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'AUTO_DISPATCH':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'OPERATOR_ASSISTED':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'ESCALATE_TO_HUMAN':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-3">
      {/* Intent Classification */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Intent Classification
            </CardTitle>
            <Badge variant="outline">{analysis.intent.displayName}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-semibold">{analysis.intent.confidence.toFixed(0)}%</span>
            </div>
            <Progress
              value={analysis.intent.confidence}
              className="h-1.5"
            />
          </div>
          {analysis.intent.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {analysis.intent.keywords.slice(0, 3).map((kw, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {kw}
                </Badge>
              ))}
              {analysis.intent.keywords.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{analysis.intent.keywords.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confidence Score & Recommendation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Overall Confidence
            </CardTitle>
            {getRecommendationIcon(analysis.confidence.recommendation)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Confidence Score</span>
              <span className="font-semibold">{analysis.confidence.overall.toFixed(0)}%</span>
            </div>
            <Progress
              value={analysis.confidence.overall}
              className="h-2"
            />
          </div>

          <div className="bg-muted p-2 rounded text-xs space-y-1">
            <div className="font-semibold">
              {analysis.confidence.recommendation.replace(/_/g, ' ')}
            </div>
            <div className="text-muted-foreground text-[11px]">
              {analysis.confidence.reason}
            </div>
          </div>

          {analysis.confidence.factors && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(analysis.confidence.factors)
                .filter(([_, value]) => typeof value === 'number')
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between bg-accent/50 p-1.5 rounded">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                    <span className="font-semibold">{(value as number).toFixed(0)}%</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sentiment Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Caller Sentiment {getStressEmoji(analysis.sentiment.stressLevel)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Stress Level</span>
              <span className="font-semibold">{analysis.sentiment.stressPercentage.toFixed(0)}%</span>
            </div>
            <Progress
              value={analysis.sentiment.stressPercentage}
              className="h-1.5"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            <strong>{analysis.sentiment.emotionalState}</strong>
            {analysis.sentiment.needsReassurance && (
              <div className="text-yellow-700 dark:text-yellow-500 mt-1">
                ⚠️ Requires reassurance
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Verification */}
      {analysis.location && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs font-semibold">{analysis.location.address}</div>
              <div className="text-xs text-muted-foreground">
                {analysis.location.city}, {analysis.location.state}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Confidence</span>
              <Badge
                variant={analysis.location.verified ? 'default' : 'secondary'}
              >
                {analysis.location.confidence.toFixed(0)}%
              </Badge>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={
                  analysis.location.riskLevel === 'safe'
                    ? 'default'
                    : analysis.location.riskLevel === 'caution'
                      ? 'outline'
                      : 'destructive'
                }
              >
                {analysis.location.riskLevel}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Resources */}
      {analysis.suggestedResources.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Suggested Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {analysis.suggestedResources.map((resource, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {resource}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Notices */}
      {analysis.escalateToHuman && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2 text-xs text-red-700 dark:text-red-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Escalate to human operator - insufficient confidence</span>
        </div>
      )}

      {analysis.readyForDispatch && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded p-2 text-xs text-green-700 dark:text-green-200 flex gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Ready for autonomous dispatch</span>
        </div>
      )}
    </div>
  )
}

export default AIAnalysisCard
