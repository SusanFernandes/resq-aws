'use client'

import React, { useMemo, useState } from 'react'
import { MapPin, Navigation, Phone, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Hospital } from '@/features/user-facing/hospital-finder/hospital-finder'
import { Button } from '@/components/ui/button'

interface HospitalMapViewProps {
  hospitals: Hospital[]
  selectedHospital: Hospital | null
  emergencyLocation?: {
    latitude: number
    longitude: number
    address: string
  }
  onHospitalSelect?: (hospital: Hospital) => void
  className?: string
}

export function HospitalMapView({
  hospitals,
  selectedHospital,
  emergencyLocation,
  onHospitalSelect,
  className = '',
}: HospitalMapViewProps) {
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null)

  // Sort hospitals by distance for display
  const sortedHospitals = useMemo(() => {
    return [...hospitals].sort((a, b) => a.distance - b.distance)
  }, [hospitals])

  // Get nearest 5 hospitals for visualization
  const nearestHospitals = useMemo(() => {
    return sortedHospitals.slice(0, 5)
  }, [sortedHospitals])

  // Calculate map bounds
  const mapBounds = useMemo(() => {
    if (!emergencyLocation || nearestHospitals.length === 0) return null

    const lats = [
      emergencyLocation.latitude,
      ...nearestHospitals.map((h) => h.latitude),
    ]
    const lngs = [
      emergencyLocation.longitude,
      ...nearestHospitals.map((h) => h.longitude),
    ]

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    }
  }, [emergencyLocation, nearestHospitals])

  const getDistanceColor = (distance: number): string => {
    if (distance < 5) return 'text-green-600 bg-green-100'
    if (distance < 10) return 'text-yellow-600 bg-yellow-100'
    return 'text-orange-600 bg-orange-100'
  }

  const getDistanceIcon = (distance: number): string => {
    if (distance < 5) return '🟢'
    if (distance < 10) return '🟡'
    return '🟠'
  }

  if (!emergencyLocation) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            U5: Hospital Location Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Waiting for emergency location...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            U5: Hospital Location Map
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {nearestHospitals.length} nearest
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map Container */}
        <div className="relative w-full h-96 bg-gray-100 rounded-lg border-2 border-gray-200 overflow-hidden">
          {/* ASCII Map Representation */}
          <div className="w-full h-full relative flex items-center justify-center">
            <svg
              className="w-full h-full absolute inset-0"
              viewBox="0 0 500 400"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid */}
              <defs>
                <pattern
                  id="grid"
                  width="50"
                  height="50"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 50 0 L 0 0 0 50"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="500" height="400" fill="url(#grid)" />

              {/* Emergency Location (Center) */}
              <circle
                cx="250"
                cy="200"
                r="12"
                fill="#ef4444"
                stroke="#fff"
                strokeWidth="3"
              />
              <text
                x="250"
                y="240"
                textAnchor="middle"
                className="text-xs fill-gray-700"
              >
                Emergency
              </text>

              {/* Hospital Markers */}
              {nearestHospitals.map((hospital, index) => {
                // Simple positioning based on relative distance
                const angle = (index / nearestHospitals.length) * Math.PI * 2
                const radius = 80 + index * 20
                const x = 250 + Math.cos(angle) * radius
                const y = 200 + Math.sin(angle) * radius

                const isSelected = selectedHospital?.id === hospital.id
                const isHovered = hoveredHospitalId === hospital.id

                return (
                  <g key={hospital.id}>
                    {/* Distance line */}
                    <line
                      x1="250"
                      y1="200"
                      x2={x}
                      y2={y}
                      stroke="#dbeafe"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />

                    {/* Hospital Marker */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 16 : 10}
                      fill={isSelected ? '#2563eb' : '#10b981'}
                      stroke={isHovered ? '#fff' : '#f3f4f6'}
                      strokeWidth={isHovered ? 3 : 2}
                      className="cursor-pointer transition-all"
                      onClick={() => onHospitalSelect?.(hospital)}
                      onMouseEnter={() => setHoveredHospitalId(hospital.id)}
                      onMouseLeave={() => setHoveredHospitalId(null)}
                    />

                    {/* Hospital Label */}
                    {(isSelected || isHovered) && (
                      <g>
                        <rect
                          x={x - 40}
                          y={y - 35}
                          width="80"
                          height="25"
                          fill="#fff"
                          stroke="#2563eb"
                          rx="4"
                        />
                        <text
                          x={x}
                          y={y - 12}
                          textAnchor="middle"
                          className="text-xs font-semibold"
                          fill="#1e40af"
                        >
                          {hospital.distance.toFixed(1)}km
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Overlay Info */}
            <div className="absolute top-3 right-3 bg-white rounded-lg border p-2 text-xs shadow-md">
              <div className="font-semibold text-gray-900">Map View</div>
              <div className="text-gray-600">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                Emergency
              </div>
              <div className="text-gray-600">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                Hospitals
              </div>
              <div className="text-gray-600">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                Selected
              </div>
            </div>
          </div>
        </div>

        {/* Hospital List with Distance Indicators */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Nearest Hospitals</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {nearestHospitals.map((hospital, index) => {
              const isSelected = selectedHospital?.id === hospital.id
              return (
                <button
                  key={hospital.id}
                  onClick={() => onHospitalSelect?.(hospital)}
                  onMouseEnter={() => setHoveredHospitalId(hospital.id)}
                  onMouseLeave={() => setHoveredHospitalId(null)}
                  className={`w-full text-left p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : hoveredHospitalId === hospital.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getDistanceIcon(hospital.distance)}</span>
                        <span className="font-semibold text-sm truncate">
                          #{index + 1} {hospital.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-1">
                        {hospital.address}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getDistanceColor(hospital.distance)}`}>
                          {hospital.distance.toFixed(1)} km
                        </span>
                        <span className="text-xs text-gray-600">
                          ETA: {Math.round(hospital.distance * 2)} min
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isSelected && (
                        <Badge className="bg-blue-600 text-white mb-1">Selected</Badge>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-semibold">{hospital.rating}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Distance Legend */}
        <div className="p-2 bg-gray-50 rounded border text-xs space-y-1">
          <div className="font-semibold text-gray-700">ETA Reference</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
              <span>&lt;5km (10 min)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
              <span>5-10km (20 min)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500"></span>
              <span>&gt;10km (20+ min)</span>
            </div>
          </div>
        </div>

        {/* Current Selection Info */}
        {selectedHospital && (
          <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-300 space-y-2">
            <h4 className="font-semibold text-sm text-blue-900">Selected Hospital</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold">{selectedHospital.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 flex-shrink-0" />
                <span>{selectedHospital.distance.toFixed(1)} km away</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span className="font-mono text-xs">{selectedHospital.phone}</span>
              </div>
              <div className="text-xs text-blue-700 mt-2">
                <strong>ETA:</strong> ~{Math.round(selectedHospital.distance * 2)} minutes
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
