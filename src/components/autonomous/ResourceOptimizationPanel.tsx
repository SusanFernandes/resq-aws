'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, TrendingUp } from 'lucide-react'

interface Facility {
  id: string
  name: string
  type: string
  distance: number
  eta: number
  quality: number
  currentLoad: number
  specialization: string[]
  score: number
  reasoning: string
}

interface OptimizationData {
  primaryFacility: Facility
  secondaryFacility: Facility
  tertiaryFacility: Facility
  costEstimate: number
  specialRequirements: string[]
  backupPlan: string
  dispatchRecommendation: string
  route: {
    distance: number
    estimatedTime: number
  }
}

export function ResourceOptimizationPanel() {
  const [optimizationData, setOptimizationData] = useState<OptimizationData>({
    primaryFacility: {
      id: 'h1',
      name: 'Central Medical Hospital',
      type: 'Hospital',
      distance: 2.3,
      eta: 12,
      quality: 5,
      currentLoad: 65,
      specialization: ['trauma', 'cardiology', 'pediatrics'],
      score: 92,
      reasoning: 'Very close proximity + specialized care + high quality facility',
    },
    secondaryFacility: {
      id: 'h2',
      name: 'Eastside Trauma Center',
      type: 'Trauma Center',
      distance: 3.1,
      eta: 16,
      quality: 5,
      currentLoad: 78,
      specialization: ['trauma', 'polytrauma', 'orthopedics'],
      score: 85,
      reasoning: 'Specialized trauma facility with expert team',
    },
    tertiaryFacility: {
      id: 'h3',
      name: 'St. Mary Health Center',
      type: 'Hospital',
      distance: 4.2,
      eta: 22,
      quality: 4,
      currentLoad: 45,
      specialization: ['general', 'pediatrics', 'orthopedics'],
      score: 72,
      reasoning: 'Lower load but more distant and less specialized',
    },
    costEstimate: 4200,
    specialRequirements: [
      '🚑 Trauma center activation required',
      '👥 Multi-victim incident coordination',
      '🏥 Critical care team standby',
    ],
    backupPlan:
      'If Central Medical unavailable, redirect to Eastside Trauma Center (ETA +4 min). Tertiary option: St. Mary Health Center.',
    dispatchRecommendation:
      'DISPATCH: Ambulance + Fire + Police to Central Medical Hospital (ETA: 12 min, Quality: 5/5). Notify hospital of incoming critical case.',
    route: {
      distance: 2.3,
      estimatedTime: 12,
    },
  })

  const [selectedFacility, setSelectedFacility] = useState<string>('primary')
  const [dispatchConfirmed, setDispatchConfirmed] = useState(false)

  const getQualityStars = (quality: number): string => {
    return '⭐'.repeat(quality)
  }

  const getLoadColor = (load: number): string => {
    if (load < 40) return 'bg-green-100 text-green-800'
    if (load < 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getFacilityCard = (facility: Facility, position: 'primary' | 'secondary' | 'tertiary') => {
    const positionStyles = {
      primary: 'border-3 border-green-500 bg-green-50',
      secondary: 'border-2 border-yellow-400 bg-yellow-50',
      tertiary: 'border-2 border-gray-300 bg-gray-50',
    }

    const positionBadges = {
      primary: '🥇 1st Choice',
      secondary: '🥈 2nd Choice',
      tertiary: '🥉 3rd Choice',
    }

    return (
      <Card
        key={facility.id}
        className={`cursor-pointer transition-all ${positionStyles[position]} ${
          selectedFacility === position ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => setSelectedFacility(position)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{facility.name}</CardTitle>
              <p className="text-sm text-gray-600">{facility.type}</p>
            </div>
            <Badge className={`${position === 'primary' ? 'bg-green-600 text-white' : position === 'secondary' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-white'}`}>
              {positionBadges[position]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quality Rating */}
          <div className="flex items-center justify-between">
            <span className="font-semibold">Quality</span>
            <span className="text-lg">{getQualityStars(facility.quality)}</span>
          </div>

          {/* Distance & ETA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Distance</p>
                <p className="font-bold">{facility.distance} km</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">ETA</p>
                <p className="font-bold">{facility.eta} min</p>
              </div>
            </div>
          </div>

          {/* Current Load */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Current Load</span>
              <Badge className={getLoadColor(facility.currentLoad)}>
                {facility.currentLoad}%
              </Badge>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  facility.currentLoad < 40
                    ? 'bg-green-500'
                    : facility.currentLoad < 70
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${facility.currentLoad}%` }}
              />
            </div>
            <p className="text-xs text-gray-600">
              {facility.currentLoad < 40
                ? '✅ Low load'
                : facility.currentLoad < 70
                  ? '⚡ Moderate load'
                  : '🚨 High load'}
            </p>
          </div>

          {/* Specializations */}
          <div className="space-y-2">
            <p className="font-semibold text-sm">Specializations</p>
            <div className="flex flex-wrap gap-2">
              {facility.specialization.map((spec) => (
                <Badge key={spec} variant="outline" className="capitalize">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>

          {/* Score & Reasoning */}
          <div className="pt-3 border-t">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-sm">Match Score</span>
              <span className="text-2xl font-bold text-blue-600">{facility.score}%</span>
            </div>
            <p className="text-xs text-gray-700 italic">{facility.reasoning}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-cyan-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🏥 Resource Optimization & Dispatch
              </CardTitle>
              <CardDescription>
                AI-recommended facility selection with cost-benefit analysis and routing
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                ${optimizationData.costEstimate}
              </div>
              <p className="text-sm text-gray-600">Est. Total Cost</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Facility Comparison */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Facility Recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {getFacilityCard(optimizationData.primaryFacility, 'primary')}
          {getFacilityCard(optimizationData.secondaryFacility, 'secondary')}
          {getFacilityCard(optimizationData.tertiaryFacility, 'tertiary')}
        </div>
      </div>

      {/* Special Requirements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🚨 Special Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {optimizationData.specialRequirements.map((req, idx) => (
              <li key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <span className="text-lg font-bold">{req.split(':')[0]}</span>
                <span className="text-gray-700">
                  {req.substring(req.indexOf(':') + 1).trim()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Route Information */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            🗺️ Optimized Route
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Distance</p>
              <p className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                {optimizationData.route.distance} km
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Estimated Travel Time</p>
              <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                {optimizationData.route.estimatedTime} min
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded border">
            <p className="text-sm text-gray-700">
              <strong>Route Details:</strong> Optimal path considering incident location,
              facility location, and real-time traffic patterns. Ambulance will navigate via
              fastest available route with police escort if needed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Backup Plan */}
      <Card className="bg-yellow-50 border-2 border-yellow-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📋 Backup Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-800">{optimizationData.backupPlan}</p>
        </CardContent>
      </Card>

      {/* Primary Recommendation */}
      <Card className="border-3 border-green-500 bg-gradient-to-r from-green-50 to-green-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-green-700">✓ Dispatch Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-900 font-semibold mb-4">{optimizationData.dispatchRecommendation}</p>

          {!dispatchConfirmed ? (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg h-12 font-bold"
              onClick={() => setDispatchConfirmed(true)}
            >
              ✓ CONFIRM DISPATCH
            </Button>
          ) : (
            <div className="p-4 bg-green-200 border-2 border-green-600 rounded text-center">
              <p className="text-lg font-bold text-green-800">🚑 DISPATCH CONFIRMED</p>
              <p className="text-sm text-green-700">
                Ambulance dispatched to {optimizationData.primaryFacility.name}
              </p>
              <p className="text-xs text-green-600 mt-2">
                Estimated arrival: {optimizationData.primaryFacility.eta} minutes
              </p>
              <Button
                className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setDispatchConfirmed(false)}
              >
                Cancel Dispatch
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">💰 Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-semibold">Primary Facility Cost</span>
              <span className="font-bold">$2,400</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-semibold">Additional Resources</span>
              <span className="font-bold">$1,200</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-semibold">Transport & Routing</span>
              <span className="font-bold">$600</span>
            </div>
            <div className="border-t-2 pt-3 flex items-center justify-between text-lg">
              <span className="font-bold">TOTAL ESTIMATED COST</span>
              <span className="text-2xl font-bold text-green-600">
                ${optimizationData.costEstimate}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Facility Comparison Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left py-2 px-2">Facility</th>
                  <th className="text-center py-2 px-2">Distance</th>
                  <th className="text-center py-2 px-2">ETA</th>
                  <th className="text-center py-2 px-2">Quality</th>
                  <th className="text-center py-2 px-2">Load</th>
                  <th className="text-center py-2 px-2">Score</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-green-50">
                  <td className="py-2 px-2 font-semibold">{optimizationData.primaryFacility.name}</td>
                  <td className="text-center py-2 px-2">{optimizationData.primaryFacility.distance} km</td>
                  <td className="text-center py-2 px-2">{optimizationData.primaryFacility.eta} min</td>
                  <td className="text-center py-2 px-2">{optimizationData.primaryFacility.quality}/5</td>
                  <td className="text-center py-2 px-2">{optimizationData.primaryFacility.currentLoad}%</td>
                  <td className="text-center font-bold text-green-600">{optimizationData.primaryFacility.score}%</td>
                </tr>
                <tr className="border-b bg-yellow-50">
                  <td className="py-2 px-2 font-semibold">{optimizationData.secondaryFacility.name}</td>
                  <td className="text-center py-2 px-2">{optimizationData.secondaryFacility.distance} km</td>
                  <td className="text-center py-2 px-2">{optimizationData.secondaryFacility.eta} min</td>
                  <td className="text-center py-2 px-2">{optimizationData.secondaryFacility.quality}/5</td>
                  <td className="text-center py-2 px-2">{optimizationData.secondaryFacility.currentLoad}%</td>
                  <td className="text-center font-bold text-yellow-600">{optimizationData.secondaryFacility.score}%</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-2 px-2 font-semibold">{optimizationData.tertiaryFacility.name}</td>
                  <td className="text-center py-2 px-2">{optimizationData.tertiaryFacility.distance} km</td>
                  <td className="text-center py-2 px-2">{optimizationData.tertiaryFacility.eta} min</td>
                  <td className="text-center py-2 px-2">{optimizationData.tertiaryFacility.quality}/5</td>
                  <td className="text-center py-2 px-2">{optimizationData.tertiaryFacility.currentLoad}%</td>
                  <td className="text-center font-bold text-gray-600">{optimizationData.tertiaryFacility.score}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
