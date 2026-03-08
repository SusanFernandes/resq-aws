'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TimelinePoint {
  time: string
  severity: number
  change: number
  reason: string
  escalated: boolean
}

interface MonitoringData {
  initialSeverity: number
  currentSeverity: number
  delta: number
  trend: 'escalating' | 'de-escalating' | 'stable'
  escalationTriggered: boolean
  escalationReason?: string
  timeline: TimelinePoint[]
  reassessmentCount: number
  nextReassessmentIn: number
}

export function ContinuousMonitoringPanel() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    initializeMonitoring()
    const interval = setInterval(updateMonitoring, 10000) // 10 second reassessment interval
    return () => clearInterval(interval)
  }, [])

  const initializeMonitoring = () => {
    const mockTimeline: TimelinePoint[] = [
      { time: '0s', severity: 45, change: 0, reason: 'Initial assessment', escalated: false },
      { time: '30s', severity: 52, change: 7, reason: '📈 Minor severity increase: Breathing difficulty', escalated: false },
      { time: '60s', severity: 68, change: 16, reason: '⬆️ Moderate increase: Symptoms worsening', escalated: false },
      { time: '90s', severity: 85, change: 17, reason: '😨 High increase: Caller panic rising', escalated: true },
    ]

    const mockData: MonitoringData = {
      initialSeverity: 45,
      currentSeverity: 85,
      delta: 40,
      trend: 'escalating',
      escalationTriggered: true,
      escalationReason: 'Rapid escalation detected (+40 points) - Severity increased dramatically',
      timeline: mockTimeline,
      reassessmentCount: 4,
      nextReassessmentIn: 8000,
    }

    setMonitoringData(mockData)

    // Prepare chart data
    const chartPoints = mockTimeline.map((point) => ({
      time: point.time,
      severity: point.severity,
    }))
    setChartData(chartPoints)
    setLoading(false)
  }

  const updateMonitoring = () => {
    setMonitoringData((prev) => {
      if (!prev) return null

      const newSeverity = Math.max(
        0,
        Math.min(100, prev.currentSeverity + (Math.random() - 0.5) * 15)
      )
      const newDelta = newSeverity - prev.currentSeverity
      const newTrend =
        newDelta > 5 ? 'escalating' : newDelta < -5 ? 'de-escalating' : 'stable'

      const newTimeline = [
        ...prev.timeline,
        {
          time: `${(prev.reassessmentCount + 1) * 30}s`,
          severity: newSeverity,
          change: newDelta,
          reason: `Reassessment ${prev.reassessmentCount + 1}: Status update`,
          escalated: newSeverity > 80 || newDelta > 15,
        },
      ].slice(-10) // Keep last 10 points

      const newChartData = newTimeline.map((point) => ({
        time: point.time,
        severity: point.severity,
      }))
      setChartData(newChartData)

      return {
        ...prev,
        currentSeverity: newSeverity,
        delta: newDelta,
        trend: newTrend,
        timeline: newTimeline,
        reassessmentCount: prev.reassessmentCount + 1,
        escalationTriggered: newSeverity > 85,
        nextReassessmentIn: 8000,
      }
    })
  }

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'escalating':
        return '📈'
      case 'de-escalating':
        return '📉'
      case 'stable':
        return '➡️'
      default:
        return '❓'
    }
  }

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'escalating':
        return 'text-red-600'
      case 'de-escalating':
        return 'text-green-600'
      case 'stable':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getSeverityLevel = (severity: number): string => {
    if (severity < 30) return '✅ LOW'
    if (severity < 60) return '🟡 MODERATE'
    if (severity < 85) return '🟠 HIGH'
    return '🚨 CRITICAL'
  }

  if (loading) {
    return <div className="text-center">Loading continuous monitoring...</div>
  }

  if (!monitoringData) {
    return <div>No monitoring data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                ⏱️ Continuous Severity Monitoring
              </CardTitle>
              <CardDescription>
                Real-time reassessment every 10 seconds with escalation detection
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-2 bg-yellow-600 text-white">
              Reassessment #{monitoringData.reassessmentCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Severity Comparison */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Initial Severity</div>
                <div className="text-3xl font-bold text-blue-600">
                  {monitoringData.initialSeverity}
                </div>
                <div className="text-xs text-gray-500 mt-1">Start of call</div>
              </CardContent>
            </Card>
            <Card className={`text-center pt-4 ${
              monitoringData.delta > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
            }`}>
              <CardContent>
                <div className="text-sm text-gray-600 mb-1">Change (Δ)</div>
                <div className={`text-3xl font-bold ${
                  monitoringData.delta > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {monitoringData.delta > 0 ? '+' : ''}{monitoringData.delta}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {monitoringData.delta > 20
                    ? 'Rapid change'
                    : monitoringData.delta > 0
                      ? 'Escalating'
                      : 'Improving'}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Current Severity</div>
                <div className="text-3xl font-bold text-orange-600">
                  {Math.round(monitoringData.currentSeverity)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Now</div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Status */}
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Severity Trend</h3>
                  <p className="text-sm text-gray-600">
                    {monitoringData.trend === 'escalating'
                      ? 'Situation is worsening - close monitoring required'
                      : monitoringData.trend === 'de-escalating'
                        ? 'Situation improving - continue support'
                        : 'Situation stable - maintain current level'}
                  </p>
                </div>
                <div className={`text-5xl ${getTrendColor(monitoringData.trend)}`}>
                  {getTrendIcon(monitoringData.trend)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Current Status</span>
                <Badge className="text-lg px-3 py-1 bg-gray-700 text-white">
                  {getSeverityLevel(monitoringData.currentSeverity)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Escalation Alert */}
          {monitoringData.escalationTriggered && (
            <Card className="border-2 border-red-500 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  🚨 ESCALATION TRIGGERED
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-800 mb-3">{monitoringData.escalationReason}</p>
                <Button className="bg-red-600 hover:bg-red-700">
                  ✓ Acknowledge & Prepare Response
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Severity Timeline Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Severity Timeline ({monitoringData.reassessmentCount} observations)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => `${value.toFixed(1)}/100`}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="severity"
                    stroke={monitoringData.trend === 'escalating' ? '#ef4444' : '#10b981'}
                    strokeWidth={3}
                    dot={{ fill: '#333', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Timeline Events */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reassessment Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monitoringData.timeline.map((point, idx) => (
                  <div key={idx} className="flex gap-4 p-3 bg-gray-50 rounded-lg border">
                    <div className="text-center min-w-16">
                      <div className="font-bold text-lg text-blue-600">{point.severity}</div>
                      <div className="text-xs text-gray-500">{point.time}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">Severity {idx === 0 ? 'Baseline' : 'Check'}</span>
                        <div className="flex items-center gap-2">
                          {point.change !== 0 && (
                            <span
                              className={`font-bold ${
                                point.change > 0 ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {point.change > 0 ? '+' : ''}{point.change}
                            </span>
                          )}
                          {point.escalated && <Badge className="bg-red-600">ESCALATED</Badge>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{point.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monitoring Status */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Monitoring Active</h3>
                  <p className="text-sm text-gray-600">
                    Continuous assessment running. Next reassessment in{' '}
                    <span className="font-bold">{Math.round(monitoringData.nextReassessmentIn / 1000)}s</span>
                  </p>
                </div>
                <div className="text-4xl">🔄</div>
              </div>
            </CardContent>
          </Card>

          {/* Escalation Triggers Reference */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Escalation Triggers</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-lg">🚨</span>
                  <span>Critical severity (&gt; 90/100)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span>Rapid spike (&gt; 20 point jump)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">📈</span>
                  <span>3+ consecutive severity increases</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  <span>Unexpected reversal from improving to worsening</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
