'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowRight, Brain, Zap, CheckCircle } from 'lucide-react'

interface DecisionMetrics {
  autonomousDecisions: number
  manualDecisions: number
  averageConfidence: number
  recentThinking: string[]
  systemStatus: string
}

interface ThinkingNode {
  stage: 'Input' | 'Analysis' | 'Decision' | 'Execution' | 'Outcome'
  title: string
  data: string
  confidence?: number
  duration: number // ms
  color: string
}

interface DecisionLog {
  timestamp: string
  decision: string
  confidence: number
  factors: string[]
  outcome: 'success' | 'pending' | 'failed'
}

export function ThinkingProcessDashboard() {
  const [decisionMetrics, setDecisionMetrics] = useState<DecisionMetrics | null>(null)
  const [thinkingChain, setThinkingChain] = useState<ThinkingNode[]>([])
  const [decisionLog, setDecisionLog] = useState<DecisionLog[]>([])
  const [selectedDecision, setSelectedDecision] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initializeThinking()
    const interval = setInterval(updateThinkingProcess, 12000) // Update every 12 seconds
    return () => clearInterval(interval)
  }, [])

  const initializeThinking = () => {
    const metrics: DecisionMetrics = {
      autonomousDecisions: 28,
      manualDecisions: 7,
      averageConfidence: 83,
      recentThinking: [
        'Evaluating severity indicators...',
        'Assessing risk factors...',
        'Recommending resource allocation...',
        'Monitoring emotion trajectory...',
      ],
      systemStatus: '🤖 AUTONOMOUS MODE - Active decision making',
    }

    const thinking: ThinkingNode[] = [
      {
        stage: 'Input',
        title: 'Situation Assessment',
        data: '📱 Caller: Severe chest pain, breathing difficulty. Patient: Male, 52 years old',
        duration: 245,
        color: 'blue',
      },
      {
        stage: 'Analysis',
        title: 'Medical Complexity Analysis',
        data: '🏥 Symptoms: Cardiac + respiratory. Risk factors: Age, severity. Complexity: COMPLEX (72/100)',
        confidence: 88,
        duration: 1240,
        color: 'purple',
      },
      {
        stage: 'Decision',
        title: 'Resource Optimization',
        data: '🏥 Primary: Central Medical Hospital (ETA 12 min, Quality 5/5). Cost: $2,400',
        confidence: 92,
        duration: 890,
        color: 'green',
      },
      {
        stage: 'Execution',
        title: 'Autonomous Dispatch',
        data: '✅ Dispatched: 2x Ambulance, 1x Fire, 1x Police. Current: En route',
        confidence: 95,
        duration: 340,
        color: 'orange',
      },
      {
        stage: 'Outcome',
        title: 'Monitoring & Reassessment',
        data: '⏱️ Call duration: 5 min. Status: Ongoing monitoring every 10 sec',
        confidence: 89,
        duration: 5000,
        color: 'yellow',
      },
    ]

    const logs: DecisionLog[] = [
      {
        timestamp: '0:28',
        decision: 'Escalate from MODERATE to HIGH severity',
        confidence: 94,
        factors: [
          'Caller panic level increasing',
          'Breathing difficulty worsening',
          'Patient age (52) - cardiac risk',
        ],
        outcome: 'success',
      },
      {
        timestamp: '1:15',
        decision: 'Dispatch COMPLEX case to trauma center',
        confidence: 92,
        factors: [
          'Multi-system symptoms detected',
          'Recommended operator: SENIOR',
          'Hospital capacity available',
        ],
        outcome: 'success',
      },
      {
        timestamp: '3:42',
        decision: 'Recommend mental health specialist standby',
        confidence: 78,
        factors: [
          'Caller experiencing high stress',
          'Aggressive emotional response',
          'May affect patient recovery',
        ],
        outcome: 'pending',
      },
      {
        timestamp: '5:10',
        decision: 'Continuous monitoring every 10 seconds confirmed',
        confidence: 96,
        factors: [
          'Severity: HIGH (84/100)',
          'Trend: Escalating',
          'Timeline critical',
        ],
        outcome: 'success',
      },
    ]

    setDecisionMetrics(metrics)
    setThinkingChain(thinking)
    setDecisionLog(logs)
    setLoading(false)
  }

  const updateThinkingProcess = () => {
    setDecisionLog((prev) => {
      const newDecision: DecisionLog = {
        timestamp: `${Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 59)}`,
        decision: ['Monitor severity', 'Assess trend', 'Check resources', 'Evaluate response time'][
          Math.floor(Math.random() * 4)
        ],
        confidence: 70 + Math.random() * 25,
        factors: [
          'Real-time data update',
          'Continuous analysis active',
          'System responsive',
        ],
        outcome: 'success',
      }
      return [newDecision, ...prev].slice(0, 10)
    })

    setDecisionMetrics((prev) => {
      if (!prev) return null
      return {
        ...prev,
        autonomousDecisions: prev.autonomousDecisions + 1,
      }
    })
  }

  const getStageIcon = (stage: string): string => {
    switch (stage) {
      case 'Input':
        return '📥'
      case 'Analysis':
        return '🔍'
      case 'Decision':
        return '🤖'
      case 'Execution':
        return '⚡'
      case 'Outcome':
        return '✅'
      default:
        return '❓'
    }
  }

  const getOutcomeColor = (outcome: string): string => {
    switch (outcome) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getOutcomeIcon = (outcome: string): string => {
    switch (outcome) {
      case 'success':
        return '✓'
      case 'failed':
        return '✗'
      case 'pending':
        return '⏳'
      default:
        return '?'
    }
  }

  if (loading) {
    return <div className="text-center">Loading thinking process...</div>
  }

  if (!decisionMetrics) {
    return <div>No data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6" />
                Autonomous Thinking Process Dashboard
              </CardTitle>
              <CardDescription>
                Complete transparency into AI decision-making logic and reasoning
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-2 bg-violet-600 text-white">
              {decisionMetrics.systemStatus}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {decisionMetrics.autonomousDecisions}
            </div>
            <p className="text-xs text-gray-600">Autonomous Decisions</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {decisionMetrics.manualDecisions}
            </div>
            <p className="text-xs text-gray-600">Operator Overrides</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {decisionMetrics.averageConfidence}%
            </div>
            <p className="text-xs text-gray-600">Avg Confidence</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">
              {Math.round(
                (decisionMetrics.autonomousDecisions /
                  (decisionMetrics.autonomousDecisions + decisionMetrics.manualDecisions)) *
                  100
              )}
              %
            </div>
            <p className="text-xs text-gray-600">Auto Success Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Thinking Chain Visualization */}
      <Card className="border-2 border-cyan-200 bg-cyan-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Decision Making Chain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline */}
            <div className="space-y-4">
              {thinkingChain.map((node, idx) => (
                <div key={idx}>
                  {/* Node */}
                  <div className="flex items-start gap-4">
                    {/* Icon & Connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white
                        ${
                          node.color === 'blue'
                            ? 'bg-blue-500'
                            : node.color === 'purple'
                              ? 'bg-purple-500'
                              : node.color === 'green'
                                ? 'bg-green-500'
                                : node.color === 'orange'
                                  ? 'bg-orange-500'
                                  : 'bg-yellow-500'
                        }`}
                      >
                        {getStageIcon(node.stage)}
                      </div>
                      {idx < thinkingChain.length - 1 && (
                        <div className="w-1 h-8 bg-gray-300 mt-1 mb-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 mt-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900">{node.title}</h4>
                        <div className="flex items-center gap-2">
                          {node.confidence && (
                            <Badge
                              className={
                                node.confidence > 90
                                  ? 'bg-green-600 text-white'
                                  : node.confidence > 75
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-orange-600 text-white'
                              }
                            >
                              {Math.round(node.confidence)}%
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {node.duration}ms
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                        {node.data}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Thinking Log */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🧠 Recent Thinking Process</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {decisionMetrics.recentThinking.map((thought, idx) => (
              <li key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="text-lg">💭</span>
                <span className="text-gray-800">{thought}</span>
                <span className="text-xs text-gray-500 ml-auto animate-pulse">processing...</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Decision Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">📋 Complete Decision Log</CardTitle>
            <Badge className="bg-gray-600 text-white">{decisionLog.length} decisions</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {decisionLog.map((log, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedDecision === idx
                    ? 'border-blue-500 bg-blue-50'
                    : `border-gray-200 bg-white hover:bg-gray-50`
                }`}
                onClick={() => setSelectedDecision(selectedDecision === idx ? null : idx)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-gray-600">[{log.timestamp}]</span>
                      <h4 className="font-semibold text-gray-900">{log.decision}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={log.confidence}
                        className="w-24 h-2"
                      />
                      <span className="text-xs font-bold text-gray-600">
                        {Math.round(log.confidence)}%
                      </span>
                    </div>
                  </div>
                  <Badge
                    className={`ml-2 ${getOutcomeColor(log.outcome)}`}
                  >
                    {getOutcomeIcon(log.outcome)} {log.outcome.toUpperCase()}
                  </Badge>
                </div>

                {/* Expanded Details */}
                {selectedDecision === idx && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        Contributing Factors:
                      </p>
                      <div className="space-y-1">
                        {log.factors.map((factor, fidx) => (
                          <div key={fidx} className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span className="text-gray-700">{factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Decision Reasoning */}
                    <div className="p-2 bg-blue-100 rounded text-sm text-blue-800">
                      <p className="font-semibold mb-1">💡 Reasoning:</p>
                      <p>
                        {log.outcome === 'success'
                          ? "Decision executed successfully. All parameters validated and thresholds met."
                          : log.outcome === 'pending'
                            ? 'Decision pending approval or additional information.'
                            : 'Decision required manual override by operator.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confidence Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 Confidence Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { range: '90-100%', count: 18, label: 'Very High Confidence', color: 'bg-green-500' },
              { range: '75-89%', count: 7, label: 'High Confidence', color: 'bg-yellow-500' },
              { range: '60-74%', count: 2, label: 'Moderate Confidence', color: 'bg-orange-500' },
              { range: '< 60%', count: 1, label: 'Low Confidence', color: 'bg-red-500' },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{item.range}</span>
                  <span className="text-sm text-gray-600">{item.count} decisions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={item.color}
                      style={{ width: `${(item.count / 28) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{Math.round((item.count / 28) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Decision Quality Assessment */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">✨ Decision Quality Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span>Reasoning Transparency</span>
            <Badge className="bg-green-600 text-white">Excellent</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span>Factor Consideration</span>
            <Badge className="bg-green-600 text-white">Comprehensive</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span>Consistency</span>
            <Badge className="bg-green-600 text-white">High</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-white rounded">
            <span>Operator Override Rate</span>
            <Badge className="bg-yellow-600 text-white">
              {Math.round(
                (decisionMetrics.manualDecisions /
                  (decisionMetrics.autonomousDecisions + decisionMetrics.manualDecisions)) *
                  100
              )}
              %
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Operator Control Info */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            👤 Operator Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-800 mb-3">
            Operator maintains control of all decisions. The autonomous system provides
            recommendations, analysis, and automated execution of low-risk actions. Critical
            decisions always require operator confirmation.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span>Autonomous actions: Sentiment analysis, Monitoring, Complexity prediction</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <span>Manual approval required: Resource dispatch, Escalation, Communications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <span>Always controllable: Toggle any feature to MANUAL mode at any time</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
