'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'

interface Feature {
  name: string
  mode: 'MANUAL' | 'AUTONOMOUS'
  enabled: boolean
  confidenceThreshold: number
  safetyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  requiresConfirmation: boolean
}

interface AutonomousModeSettings {
  globalMode: 'MANUAL' | 'AUTONOMOUS'
  features: Feature[]
  autonomousDecisions: number
  manualDecisions: number
  averageConfidence: number
  safetyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export function AutonomousModePanel() {
  const [settings, setSettings] = useState<AutonomousModeSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  const [confirmationRequired, setConfirmationRequired] = useState(false)
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null)

  useEffect(() => {
    initializeSettings()
  }, [])

  const initializeSettings = () => {
    const mockSettings: AutonomousModeSettings = {
      globalMode: 'MANUAL',
      features: [
        {
          name: 'sentiment-analysis',
          mode: 'AUTONOMOUS',
          enabled: true,
          confidenceThreshold: 70,
          safetyLevel: 'LOW',
          requiresConfirmation: false,
        },
        {
          name: 'continuous-monitoring',
          mode: 'AUTONOMOUS',
          enabled: true,
          confidenceThreshold: 75,
          safetyLevel: 'MEDIUM',
          requiresConfirmation: false,
        },
        {
          name: 'complexity-prediction',
          mode: 'AUTONOMOUS',
          enabled: true,
          confidenceThreshold: 65,
          safetyLevel: 'LOW',
          requiresConfirmation: false,
        },
        {
          name: 'resource-optimization',
          mode: 'MANUAL',
          enabled: true,
          confidenceThreshold: 85,
          safetyLevel: 'CRITICAL',
          requiresConfirmation: true,
        },
        {
          name: 'natural-language-commands',
          mode: 'AUTONOMOUS',
          enabled: true,
          confidenceThreshold: 80,
          safetyLevel: 'MEDIUM',
          requiresConfirmation: false,
        },
        {
          name: 'transcription',
          mode: 'AUTONOMOUS',
          enabled: true,
          confidenceThreshold: 60,
          safetyLevel: 'LOW',
          requiresConfirmation: false,
        },
      ],
      autonomousDecisions: 24,
      manualDecisions: 8,
      averageConfidence: 82,
      safetyLevel: 'MEDIUM',
    }
    setSettings(mockSettings)
    setLoading(false)
  }

  const getSafetyColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSafetyIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '🚨'
      case 'HIGH':
        return '⚠️'
      case 'MEDIUM':
        return '⚡'
      case 'LOW':
        return '✅'
      default:
        return '❓'
    }
  }

  const handleGlobalModeToggle = () => {
    if (settings?.globalMode === 'AUTONOMOUS') {
      setConfirmingAction('emergency-shutdown')
      setConfirmationRequired(true)
    } else {
      setConfirmingAction('enable-autonomous')
      setConfirmationRequired(true)
    }
  }

  const handleFeatureModeToggle = (featureName: string) => {
    const feature = settings?.features.find((f) => f.name === featureName)
    if (feature?.safetyLevel === 'CRITICAL' && feature.mode === 'MANUAL') {
      setConfirmingAction(`toggle-${featureName}`)
      setConfirmationRequired(true)
    } else {
      toggleFeatureMode(featureName)
    }
  }

  const toggleFeatureMode = (featureName: string) => {
    setSettings((prev) => {
      if (!prev) return null
      return {
        ...prev,
        features: prev.features.map((f) =>
          f.name === featureName ? { ...f, mode: f.mode === 'MANUAL' ? 'AUTONOMOUS' : 'MANUAL' } : f
        ),
      }
    })
    setConfirmationRequired(false)
    setConfirmingAction(null)
  }

  const confirmAction = () => {
    if (confirmingAction === 'emergency-shutdown') {
      setSettings((prev) => {
        if (!prev) return null
        return {
          ...prev,
          globalMode: 'MANUAL',
          features: prev.features.map((f) => ({
            ...f,
            mode: 'MANUAL',
            requiresConfirmation: true,
          })),
          safetyLevel: 'HIGH',
        }
      })
    } else if (confirmingAction === 'enable-autonomous') {
      setSettings((prev) => {
        if (!prev) return null
        return {
          ...prev,
          globalMode: 'AUTONOMOUS',
        }
      })
    } else if (confirmingAction?.startsWith('toggle-')) {
      const featureName = confirmingAction.replace('toggle-', '')
      toggleFeatureMode(featureName)
    }

    setConfirmationRequired(false)
    setConfirmingAction(null)
  }

  if (loading) {
    return <div className="text-center">Loading...</div>
  }

  if (!settings) {
    return <div>No settings available</div>
  }

  return (
    <div className="space-y-6">
      {/* Global Mode Control */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {settings.globalMode === 'AUTONOMOUS' ? '🤖' : '👤'} Operator Mode Control
              </CardTitle>
              <CardDescription>Global autonomous vs manual mode control</CardDescription>
            </div>
            <Badge
              className={`text-lg px-4 py-2 ${getSafetyColor(settings.safetyLevel)}`}
            >
              {getSafetyIcon(settings.safetyLevel)} {settings.safetyLevel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div>
              <h3 className="font-semibold text-lg">System Mode</h3>
              <p className="text-sm text-gray-600">
                {settings.globalMode === 'AUTONOMOUS'
                  ? 'System is operating autonomously. Critical features still require operator approval.'
                  : 'All features require operator confirmation before execution.'}
              </p>
            </div>
            <Button
              onClick={handleGlobalModeToggle}
              className={settings.globalMode === 'AUTONOMOUS' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
            >
              {settings.globalMode === 'AUTONOMOUS' ? '🛑 DISABLE AUTONOMOUS' : '▶️ ENABLE AUTONOMOUS'}
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {settings.autonomousDecisions}
                  </div>
                  <div className="text-sm text-gray-600">Autonomous Decisions</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{settings.manualDecisions}</div>
                  <div className="text-sm text-gray-600">Operator Actions</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {settings.averageConfidence}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Confidence</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Feature-Level Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">⚙️ Feature Configuration</CardTitle>
          <CardDescription>
            Control individual autonomous features and set confidence thresholds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.features.map((feature) => (
            <div
              key={feature.name}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setSelectedFeature(selectedFeature === feature.name ? null : feature.name)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold capitalize">
                    {feature.name.replace(/-/g, ' ')}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {feature.safetyLevel === 'CRITICAL'
                      ? '🔴 CRITICAL SAFETY LEVEL - Always requires confirmation'
                      : feature.safetyLevel === 'HIGH'
                        ? '🟠 HIGH SAFETY LEVEL - Backup required'
                        : feature.safetyLevel === 'MEDIUM'
                          ? '🟡 MEDIUM SAFETY LEVEL'
                          : '🟢 LOW SAFETY LEVEL - Safe for autonomous operation'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={feature.enabled ? 'default' : 'secondary'}>
                    {feature.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </Badge>
                  <Badge
                    className={`font-bold ${
                      feature.mode === 'AUTONOMOUS'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}
                  >
                    {feature.mode === 'AUTONOMOUS' ? '🤖 AUTO' : '👤 MANUAL'}
                  </Badge>
                </div>
              </div>

              {/* Expanded feature details */}
              {selectedFeature === feature.name && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Mode Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <label className="font-medium">
                      {feature.mode === 'AUTONOMOUS' ? 'Autonomous Mode' : 'Manual Mode'}
                    </label>
                    <Button
                      size="sm"
                      variant={feature.mode === 'AUTONOMOUS' ? 'default' : 'outline'}
                      onClick={() => handleFeatureModeToggle(feature.name)}
                    >
                      {feature.mode === 'AUTONOMOUS' ? 'Switch to Manual' : 'Switch to Auto'}
                    </Button>
                  </div>

                  {/* Confidence Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-medium">Confidence Threshold</label>
                      <span className="text-lg font-bold text-blue-600">
                        {feature.confidenceThreshold}%
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[feature.confidenceThreshold]}
                      className="w-full"
                      disabled
                    />
                    <p className="text-xs text-gray-500">
                      {feature.confidenceThreshold > 80
                        ? '🔒 Very strict - Only high confidence decisions'
                        : feature.confidenceThreshold > 60
                          ? '⚖️ Balanced - Good confidence level'
                          : '⚡ Permissive - More frequent autonomous actions'}
                    </p>
                  </div>

                  {/* Confirmation Flag */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <label className="font-medium">
                      {feature.requiresConfirmation ? 'Requires Confirmation' : 'Auto-Executes'}
                    </label>
                    <Switch checked={feature.requiresConfirmation} disabled />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Safety Alerts */}
      {settings.safetyLevel === 'CRITICAL' && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">🚨 Safety Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">
              Critical safety features are in autonomous mode. Monitor system behavior closely.
              Press Emergency Shutdown if unexpected behavior occurs.
            </p>
            <Button className="mt-4 bg-red-600 hover:bg-red-700">Emergency Shutdown</Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      {confirmationRequired && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700">⚠️ Confirmation Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-orange-800">
              {confirmingAction === 'emergency-shutdown'
                ? 'Are you sure you want to disable AUTONOMOUS mode? All features will require operator confirmation.'
                : confirmingAction === 'enable-autonomous'
                  ? 'Are you sure you want to enable AUTONOMOUS mode? Non-critical features will auto-execute.'
                  : confirmingAction?.includes('critical')
                    ? 'This is a CRITICAL feature. Confirm to enable autonomous mode.'
                    : 'Confirm this action?'}
            </p>
            <div className="flex gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700 flex-1"
                onClick={confirmAction}
              >
                ✓ Confirm
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setConfirmationRequired(false)
                  setConfirmingAction(null)
                }}
              >
                ✗ Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
