'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface EmotionScore {
  panic: number
  worry: number
  calmness: number
  anger: number
  confusion: number
}

interface SentimentData {
  currentSentiment: 'positive' | 'neutral' | 'negative'
  emotionScores: EmotionScore
  stressLevel: 'low' | 'moderate' | 'high' | 'critical'
  riskScore: number // 0-100
  confidence: number
  recommendation: string
  trendData: Array<{ time: string; stress: number; panic: number }>
  dominantEmotion: string
  secondaryEmotion: string
}

interface SentimentAnalysisPanelProps {
  transcript?: string
  callId?: string
  autoRefresh?: boolean
}

export function SentimentAnalysisPanel({ transcript = '', callId, autoRefresh = true }: SentimentAnalysisPanelProps) {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trendHistory, setTrendHistory] = useState<Array<{ time: string; stress: number; panic: number }>>([])

  useEffect(() => {
    if (transcript) {
      analyzeSentiment(transcript)
    } else {
      initializeSentiment()
    }
  }, [transcript])

  useEffect(() => {
    if (!autoRefresh || !transcript) return
    
    const interval = setInterval(() => {
      analyzeSentiment(transcript)
    }, 15000) // Update every 15 seconds
    return () => clearInterval(interval)
  }, [transcript, autoRefresh])

  const analyzeSentiment = async (text: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/analyze-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      // Map API response to our component format
      const newTrend = {
        time: new Date().toLocaleTimeString(),
        stress: result.stress_level === 'critical' ? 90 : result.stress_level === 'high' ? 70 : result.stress_level === 'moderate' ? 50 : 30,
        panic: result.emotions?.panic || 0
      }

      setTrendHistory(prev => [...prev.slice(-9), newTrend]) // Keep last 10 points

      const emotions = result.emotions || {
        panic: 0,
        worry: 0,
        calmness: 100,
        anger: 0,
        confusion: 0
      }

      const sorted = Object.entries(emotions).sort(([, a], [, b]) => b - a)
      const dominant = sorted[0]?.[0] || 'calmness'
      const secondary = sorted[1]?.[0] || 'calmness'

      setSentimentData({
        currentSentiment: result.sentiment || 'neutral',
        emotionScores: emotions,
        stressLevel: result.stress_level || 'moderate',
        riskScore: result.risk_score || 50,
        confidence: result.confidence || 0.85,
        recommendation: result.recommendation || 'Processing...',
        trendData: trendHistory.length > 0 ? trendHistory : generateMockTrend(),
        dominantEmotion: dominant.charAt(0).toUpperCase() + dominant.slice(1),
        secondaryEmotion: secondary.charAt(0).toUpperCase() + secondary.slice(1)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      console.error('Sentiment analysis error:', err)
      initializeSentiment() // Fallback to mock
    } finally {
      setLoading(false)
    }
  }

  const generateMockTrend = () => [
    { time: '0s', stress: 45, panic: 20 },
    { time: '30s', stress: 58, panic: 35 },
    { time: '60s', stress: 70, panic: 55 },
    { time: '90s', stress: 78, panic: 75 },
  ]

  const initializeSentiment = () => {
    const mockData: SentimentData = {
      currentSentiment: 'negative',
      emotionScores: {
        panic: 75,
        worry: 60,
        calmness: 20,
        anger: 30,
        confusion: 45,
      },
      stressLevel: 'high',
      riskScore: 78,
      confidence: 0.92,
      recommendation:
        '😨 HIGH STRESS DETECTED: Caller experiencing significant panic. Recommend calming techniques and reassurance.',
      trendData: generateMockTrend(),
      dominantEmotion: 'Panic',
      secondaryEmotion: 'Worry',
    }
    setSentimentData(mockData)
    setLoading(false)
  }

  const getEmotionColor = (emotion: string, score: number): string => {
    if (score < 30) return 'bg-green-100'
    if (score < 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getEmotionIcon = (emotion: string): string => {
    switch (emotion.toLowerCase()) {
      case 'panic':
        return '😨'
      case 'worry':
        return '😟'
      case 'calmness':
        return '😌'
      case 'anger':
        return '😠'
      case 'confusion':
        return '😕'
      default:
        return '😐'
    }
  }

  const getRiskColor = (score: number): string => {
    if (score < 30) return 'text-green-600'
    if (score < 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStressLevel = (level: string): string => {
    switch (level) {
      case 'critical':
        return '🚨 CRITICAL'
      case 'high':
        return '⚠️ HIGH'
      case 'moderate':
        return '⚡ MODERATE'
      case 'low':
        return '✅ LOW'
      default:
        return 'UNKNOWN'
    }
  }

  if (loading) {
    return <div className="text-center">Loading sentiment analysis...</div>
  }

  if (!sentimentData) {
    return <div>No sentiment data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                😊 Real-Time Emotion & Stress Analysis
              </CardTitle>
              <CardDescription>
                Dynamic assessment of caller emotional state and stress levels
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-2 bg-purple-600 text-white">
              {sentimentData.confidence}% Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dominant Emotions */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="text-center space-y-2">
                  <div className="text-4xl">{getEmotionIcon(sentimentData.dominantEmotion)}</div>
                  <div className="font-semibold">{sentimentData.dominantEmotion}</div>
                  <div className="text-2xl font-bold text-red-600">
                    {sentimentData.emotionScores[sentimentData.dominantEmotion.toLowerCase() as keyof EmotionScore]}%
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="text-center space-y-2">
                  <div className="text-4xl">{getEmotionIcon(sentimentData.secondaryEmotion)}</div>
                  <div className="font-semibold">{sentimentData.secondaryEmotion}</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {sentimentData.emotionScores[sentimentData.secondaryEmotion.toLowerCase() as keyof EmotionScore]}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk & Stress Gauges */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Risk Score</span>
                    <span className={`text-2xl font-bold ${getRiskColor(sentimentData.riskScore)}`}>
                      {sentimentData.riskScore}
                    </span>
                  </div>
                  <Progress value={sentimentData.riskScore} className="h-3" />
                  <p className="text-xs text-gray-600">
                    {sentimentData.riskScore > 75
                      ? '🚨 URGENT intervention needed'
                      : sentimentData.riskScore > 50
                        ? '⚠️ Significant support required'
                        : '✅ Manageable situation'}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Stress Level</span>
                    <span className="text-sm font-bold">{getStressLevel(sentimentData.stressLevel)}</span>
                  </div>
                  <Progress
                    value={
                      sentimentData.stressLevel === 'critical'
                        ? 100
                        : sentimentData.stressLevel === 'high'
                          ? 75
                          : sentimentData.stressLevel === 'moderate'
                            ? 50
                            : 25
                    }
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Emotion Breakdown */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">5-Emotion Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(sentimentData.emotionScores).map(([emotion, score]) => (
                <div key={emotion} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium capitalize flex items-center gap-2">
                      {getEmotionIcon(emotion)} {emotion}
                    </label>
                    <span className="font-bold text-lg">{score}%</span>
                  </div>
                  <div
                    className={`h-4 rounded-full ${getEmotionColor(emotion, score)} transition-all`}
                    style={{ width: `${score}%` }}
                  />
                  <p className="text-xs text-gray-600">
                    {score < 30
                      ? '✅ Low level'
                      : score < 60
                        ? '⚡ Moderate level'
                        : '🚨 High level'}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Overall Sentiment */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Current Sentiment</span>
              <Badge
                className={`text-base px-3 py-1 ${
                  sentimentData.currentSentiment === 'negative'
                    ? 'bg-red-500 text-white'
                    : sentimentData.currentSentiment === 'neutral'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-green-500 text-white'
                }`}
              >
                {sentimentData.currentSentiment === 'negative'
                  ? '😢 NEGATIVE'
                  : sentimentData.currentSentiment === 'neutral'
                    ? '😐 NEUTRAL'
                    : '😊 POSITIVE'}
              </Badge>
            </div>
            <p className="text-sm text-gray-700">
              {sentimentData.currentSentiment === 'negative'
                ? 'Caller expressing distress and negative emotions'
                : sentimentData.currentSentiment === 'neutral'
                  ? 'Caller maintaining composed demeanor'
                  : 'Caller showing positive emotional responses'}
            </p>
          </div>

          {/* Recommendation */}
          <Card className="border-2 border-cyan-200 bg-cyan-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                💡 Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800">{sentimentData.recommendation}</p>
            </CardContent>
          </Card>

          {/* Trend Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Emotion Trend (Last 90 seconds)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sentimentData.trendData.map((point, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{point.time}</span>
                      <div className="flex gap-4">
                        <span className="text-red-600">Panic: {point.panic}%</span>
                        <span className="text-yellow-600">Stress: {point.stress}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-red-500"
                        style={{
                          width: `${Math.max(point.panic, point.stress)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Crisis Indicators */}
          {sentimentData.stressLevel === 'critical' && (
            <Card className="border-2 border-red-500 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700">🚨 CRITICAL STRESS ALERT</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-red-800">
                  <li>✓ Extreme panic detected</li>
                  <li>✓ High risk of poor decision-making</li>
                  <li>✓ Potential danger to self or others</li>
                  <li>✓ Immediate multi-agency response warranted</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
