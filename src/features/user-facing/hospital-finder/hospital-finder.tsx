'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { MapPin, Phone, Clock, AlertCircle, Filter, X, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AIAnalysisData } from '@/components/ai-analysis-card'
import useMockData from '@/hooks/use-mock-data'

interface HospitalFinderProps {
  analysis: AIAnalysisData | null
  onSelectHospital?: (hospital: Hospital) => void
  isLoading?: boolean
}

export interface Hospital {
  id: string
  name: string
  type: 'hospital' | 'clinic' | 'blood_bank'
  city: string
  state: string
  address: string
  pincode: string
  phone: string
  operating_hours: string
  specializations: string[]
  beds_available: number
  emergency_service: boolean
  rating: number
  latitude: number
  longitude: number
  distance: number // km
}

export function HospitalFinder({
  analysis,
  onSelectHospital,
  isLoading = false,
}: HospitalFinderProps) {
  const mockData = useMockData()
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'emergency' | 'nearest'>(
    'nearest'
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Get relevant specialization based on emergency type
  const relevantSpecializations = useMemo(() => {
    if (!analysis) return []

    const intentType = analysis.intent.type.toUpperCase()
    const specializations: Record<string, string[]> = {
      MEDICAL: ['Cardiology', 'Emergency Medicine', 'Internal Medicine', 'ICU'],
      CARDIAC: ['Cardiology', 'Emergency Medicine', 'ICU'],
      ACCIDENT: ['Trauma', 'Orthopedics', 'Emergency Medicine'],
      FIRE: ['Burns Ward', 'Emergency Medicine', 'ICU'],
      TOXIC: ['Toxicology', 'Emergency Medicine', 'ICU'],
    }

    return specializations[intentType] || specializations.MEDICAL
  }, [analysis])

  // Calculate distance from analysis location to hospital
  const calculatedHospitals = useMemo(() => {
    if (!mockData.facilities || !analysis?.location) return []

    const userLat = analysis.location.latitude || 0
    const userLng = analysis.location.longitude || 0

    return mockData.facilities.map((facility: Hospital) => ({
      ...facility,
      distance: calculateDistance(userLat, userLng, facility.latitude, facility.longitude),
    }))
  }, [mockData.facilities, analysis])

  // Filter hospitals based on settings
  const filteredHospitals = useMemo(() => {
    let filtered = calculatedHospitals

    // Filter by type (show hospitals first)
    filtered = filtered.filter((h: Hospital) => h.type === 'hospital' || selectedFilter === 'all')

    // Filter by emergency service if selected
    if (selectedFilter === 'emergency') {
      filtered = filtered.filter((h: Hospital) => h.emergency_service)
    }

    // Sort by distance
    filtered = filtered.sort((a: Hospital, b: Hospital) => a.distance - b.distance)

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (h: Hospital) =>
          h.name.toLowerCase().includes(term) ||
          h.city.toLowerCase().includes(term) ||
          h.specializations.some((s: string) => s.toLowerCase().includes(term))
      )
    }

    return filtered.slice(0, 8) // Limit to 8 results
  }, [calculatedHospitals, selectedFilter, searchTerm])

  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            U4: Hospital Finder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Waiting for location verification...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!mockData.facilities || mockData.facilities.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            U4: Hospital Finder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Loading hospital data...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-600" />
                U4: Hospital Finder
              </CardTitle>
              <CardDescription>
                {analysis.location?.address || 'Location'} • {filteredHospitals.length} hospitals
                nearby
              </CardDescription>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="space-y-3">
            <Input
              placeholder="Search by hospital name, city, or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-sm"
            />

            <div className="flex gap-2">
              <Button
                variant={selectedFilter === 'nearest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('nearest')}
                className="h-8"
              >
                <MapPin className="w-3 h-3 mr-1" />
                Nearest
              </Button>
              <Button
                variant={selectedFilter === 'emergency' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('emergency')}
                className="h-8"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Emergency Only
              </Button>
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
                className="h-8"
              >
                <Filter className="w-3 h-3 mr-1" />
                All Facilities
              </Button>
            </div>

            {relevantSpecializations && relevantSpecializations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {relevantSpecializations.map((spec: string) => (
                  <Badge key={spec} variant="secondary" className="text-xs bg-blue-50">
                    {spec}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {filteredHospitals.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'No hospitals match your search' : 'No hospitals available'}
            </p>
          </div>
        ) : (
          filteredHospitals.map((hospital: Hospital, idx: number) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              rank={idx + 1}
              isExpanded={expandedId === hospital.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === hospital.id ? null : hospital.id)
              }
              onSelect={() => onSelectHospital?.(hospital)}
              relevantSpecs={relevantSpecializations || []}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

interface HospitalCardProps {
  hospital: Hospital
  rank: number
  isExpanded: boolean
  onToggleExpand: () => void
  onSelect: () => void
  relevantSpecs: string[]
}

function HospitalCard({
  hospital,
  rank,
  isExpanded,
  onToggleExpand,
  onSelect,
  relevantSpecs,
}: HospitalCardProps) {
  const hasRelevantSpecialization = hospital.specializations.some((spec) =>
    relevantSpecs.some((rel) => spec.toLowerCase().includes(rel.toLowerCase()))
  )

  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 transition space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs font-bold">
              #{rank}
            </Badge>
            <h4 className="font-semibold text-sm line-clamp-1">{hospital.name}</h4>
            {hospital.emergency_service && (
              <Badge variant="destructive" className="text-xs">
                24/7 ER
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {hospital.distance.toFixed(1)} km
            </div>
            <div>★ {hospital.rating}/5</div>
            {hospital.beds_available > 0 && (
              <div className="text-green-600">
                {hospital.beds_available} beds avail
              </div>
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onSelect} className="h-8 px-3">
          Select
        </Button>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <Phone className="w-3 h-3 text-gray-600" />
          <span className="font-mono text-gray-700">{hospital.phone}</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <Clock className="w-3 h-3 text-gray-600" />
          <span className="text-gray-700">{hospital.operating_hours}</span>
        </div>
      </div>

      {/* Relevant Specializations Highlight */}
      {hasRelevantSpecialization && (
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-xs font-semibold text-green-800 mb-1">Relevant for this emergency:</p>
          <div className="flex flex-wrap gap-1">
            {hospital.specializations
              .filter((spec) =>
                relevantSpecs.some((rel) => spec.toLowerCase().includes(rel.toLowerCase()))
              )
              .map((spec) => (
                <Badge key={spec} variant="outline" className="text-xs bg-green-100 text-green-800">
                  ✓ {spec}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Expandable Details */}
      {isExpanded && (
        <div className="pt-2 border-t space-y-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Full Address</p>
            <p className="text-sm font-medium">
              {hospital.address}, {hospital.city}, {hospital.state} {hospital.pincode}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">All Specializations</p>
            <div className="flex flex-wrap gap-1">
              {hospital.specializations.map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-semibold text-sm capitalize">{hospital.type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Beds</p>
              <p className="font-semibold text-sm text-green-600">{hospital.beds_available}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rating</p>
              <p className="font-semibold text-sm">★ {hospital.rating}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expand Button */}
      <button
        onClick={onToggleExpand}
        className="w-full text-center text-xs text-blue-600 hover:bg-blue-50 py-1 rounded transition"
      >
        {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
      </button>
    </div>
  )
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
