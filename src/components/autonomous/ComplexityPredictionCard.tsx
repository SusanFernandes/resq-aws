'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface ComplexityData {
  level: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'CRITICAL'
  score: number
  factors: {
    medicalComplexity: number
    logisticalComplexity: number
    psychologicalComplexity: number
    environmentalComplexity: number
    timelineComplexity: number
  }
  estimatedHandleTime: number
  recommendedOperatorLevel: 'JUNIOR' | 'SENIOR' | 'EXPERT' | 'SUPERVISOR'
  predictedResourceNeed: {
    ambulances: number
    fireTrucks: number
    policeUnits: number
    hazmatTeam: boolean
    searchRescue: boolean
    mentalHealthSpecialist: boolean
  }
  confidence: number
  reasoning: string[]
}

export function ComplexityPredictionCard() {
  const [complexityData, setComplexityData] = useState<ComplexityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeComplexity()
  }, [])

  const initializeComplexity = () => {
    const mockData: ComplexityData = {
      level: 'COMPLEX',
      score: 72,
      factors: {
        medicalComplexity: 80,
        logisticalComplexity: 65,
        psychologicalComplexity: 55,
        environmentalComplexity: 45,
        timelineComplexity: 70,
      },
      estimatedHandleTime: 900, // 15 minutes
      recommendedOperatorLevel: 'SENIOR',
      predictedResourceNeed: {
        ambulances: 2,
        fireTrucks: 1,
        policeUnits: 1,
        hazmatTeam: false,
        searchRescue: false,
        mentalHealthSpecialist: true,
      },
      confidence: 88,
      reasoning: [
        '🏥 Critical medical symptoms detected',
        '👴 Elderly patient - higher risk profile',
        '👥 Multiple victims require additional resources',
        '⚠️ High psychological complexity - violence risk',
      ],
    }
    setComplexityData(mockData)
    setLoading(false)
  }

  const getComplexityColor = (level: string): string => {
    switch (level) {
      case 'SIMPLE':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'COMPLEX':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getComplexityIcon = (level: string): string => {
    switch (level) {
      case 'SIMPLE':
        return '✅'
      case 'MODERATE':
        return '⚡'
      case 'COMPLEX':
        return '⚠️'
      case 'CRITICAL':
        return '🚨'
      default:
        return '❓'
    }
  }

  const getOperatorLevelDescription = (level: string): string => {
    switch (level) {
      case 'JUNIOR':
        return 'Junior operators can handle this case independently'
      case 'SENIOR':
        return 'Senior operators recommended for oversight'
      case 'EXPERT':
        return 'Expert operators required for complex decision-making'
      case 'SUPERVISOR':
        return 'Supervisor+ required due to critical complexity and risk factors'
      default:
        return 'Unknown'
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.round(seconds / 60)
    if (minutes < 1) return `${seconds}s`
    return `${minutes} min`
  }

  if (loading) {
    return <div className="text-center">Loading complexity analysis...</div>
  }

  if (!complexityData) {
    return <div>No complexity data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Main Complexity Card */}
      <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🔍 Case Complexity Prediction
              </CardTitle>
              <CardDescription>
                AI-powered analysis of case complexity and resource requirements
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-2 bg-orange-600 text-white">
              {complexityData.confidence}% Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Complexity Score */}
          <Card className={`border-2 ${getComplexityColor(complexityData.level)}`}>
            <CardContent className="pt-6 text-center">
              <div className="text-5xl font-bold mb-2">{getComplexityIcon(complexityData.level)}</div>
              <div className="text-3xl font-bold mb-2 text-orange-600">
                {complexityData.score}/100
              </div>
              <Badge className={`text-lg px-4 py-2 ${getComplexityColor(complexityData.level)}`}>
                {complexityData.level}
              </Badge>
              <p className="text-sm text-gray-600 mt-3">
                {complexityData.level === 'SIMPLE'
                  ? 'Straightforward case - standard protocols apply'
                  : complexityData.level === 'MODERATE'
                    ? 'Moderate complexity - specialized care needed'
                    : complexityData.level === 'COMPLEX'
                      ? 'Complex case - multi-faceted approach required'
                      : 'CRITICAL complexity - maximum resources deployed'}
              </p>
            </CardContent>
          </Card>

          {/* Complexity Factors Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Complexity Factors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(complexityData.factors).map(([factor, score]) => (
                <div key={factor} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium capitalize">
                      {factor.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <span className="font-bold text-lg">{score}%</span>
                  </div>
                  <Progress value={score} className="h-3" />
                  <div className="text-xs text-gray-500">
                    {score < 30
                      ? '✅ Low complexity'
                      : score < 60
                        ? '⚡ Moderate complexity'
                        : score < 85
                          ? '⚠️ High complexity'
                          : '🚨 Critical complexity'}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recommendations Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Operator Level */}
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm mb-2">Recommended Operator</h3>
                <Badge className="text-base px-3 py-1 mb-2 bg-blue-600 text-white font-bold">
                  {complexityData.recommendedOperatorLevel}
                </Badge>
                <p className="text-xs text-gray-700">
                  {getOperatorLevelDescription(complexityData.recommendedOperatorLevel)}
                </p>
              </CardContent>
            </Card>

            {/* Estimated Handling Time */}
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm mb-2">Est. Handling Time</h3>
                <Badge className="text-base px-3 py-1 mb-2 bg-purple-600 text-white font-bold">
                  {formatTime(complexityData.estimatedHandleTime)}
                </Badge>
                <p className="text-xs text-gray-700">
                  Estimated time from initial assessment to resource dispatch
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resource Requirements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Predicted Resource Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-semibold">🚑 Ambulances</span>
                  <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                    {complexityData.predictedResourceNeed.ambulances}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-semibold">🚒 Fire Trucks</span>
                  <Badge className="bg-red-600 text-white text-lg px-3 py-1">
                    {complexityData.predictedResourceNeed.fireTrucks}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-semibold">👮 Police Units</span>
                  <Badge className="bg-yellow-600 text-white text-lg px-3 py-1">
                    {complexityData.predictedResourceNeed.policeUnits}
                  </Badge>
                </div>

                {/* Specialized Resources */}
                <div className="border-t pt-3 mt-3">
                  <h4 className="font-semibold text-sm mb-2">Specialized Resources</h4>
                  <div className="space-y-2 text-sm">
                    {complexityData.predictedResourceNeed.hazmatTeam && (
                      <div className="flex items-center gap-2 p-2 bg-orange-100 rounded">
                        <span>⚠️</span>
                        <span>Hazmat team required</span>
                      </div>
                    )}
                    {complexityData.predictedResourceNeed.searchRescue && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-100 rounded">
                        <span>🔍</span>
                        <span>Search & rescue team</span>
                      </div>
                    )}
                    {complexityData.predictedResourceNeed.mentalHealthSpecialist && (
                      <div className="flex items-center gap-2 p-2 bg-purple-100 rounded">
                        <span>💭</span>
                        <span>Mental health specialist</span>
                      </div>
                    )}
                    {!complexityData.predictedResourceNeed.hazmatTeam &&
                      !complexityData.predictedResourceNeed.searchRescue &&
                      !complexityData.predictedResourceNeed.mentalHealthSpecialist && (
                        <div className="flex items-center gap-2 p-2 bg-green-100 rounded text-sm">
                          <span>✅</span>
                          <span>Standard emergency resources sufficient</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reasoning/Factors */}
          <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                💡 Analysis Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {complexityData.reasoning.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <span className="font-bold text-lg">{reason.split(':')[0]}</span>
                    <span className="text-gray-700">
                      {reason.substring(reason.indexOf(':') + 1).trim()}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Critical Alert (if applicable) */}
          {complexityData.level === 'CRITICAL' && (
            <Card className="border-2 border-red-500 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700">🚨 CRITICAL COMPLEXITY ALERT</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-red-800 text-sm">
                  <li>✓ Maximum complexity case</li>
                  <li>✓ Senior/Expert supervision required</li>
                  <li>✓ All available resources should be prepared</li>
                  <li>✓ Immediate dispatch to trauma center/specialized facility</li>
                  <li>✓ Multi-agency coordination critical</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
