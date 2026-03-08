/**
 * Location Verification Component (A7)
 * AI-assisted location verification using Google Maps
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Check, AlertCircle, Loader2 } from 'lucide-react'

interface LocationData {
  verified: boolean
  address: string
  coordinates: {
    latitude: number
    longitude: number
  }
  confidence: number
  alternatives?: Array<{
    address: string
    coordinates: { latitude: number; longitude: number }
  }>
}

interface LocationVerificationProps {
  rawLocation?: string
  latitude?: number
  longitude?: number
  onLocationConfirmed?: (location: LocationData) => void
}

export function LocationVerification({
  rawLocation,
  latitude,
  longitude,
  onLocationConfirmed,
}: LocationVerificationProps) {
  const [verificationResult, setVerificationResult] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedAlternative, setSelectedAlternative] = useState<LocationData | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    if (!rawLocation && (!latitude || !longitude)) return

    const verifyLocation = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/verify-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawLocation: rawLocation || undefined,
            latitude,
            longitude,
          }),
        })

        if (response.ok) {
          const result = await response.json()
          setVerificationResult(result)
        }
      } catch (error) {
        console.error('[LocationVerification] Error verifying location:', error)
      } finally {
        setLoading(false)
      }
    }

    verifyLocation()
  }, [rawLocation, latitude, longitude])

  const handleConfirm = () => {
    const confirmed = selectedAlternative || verificationResult
    if (confirmed) {
      setIsConfirmed(true)
      onLocationConfirmed?.(confirmed)
    }
  }

  if (!verificationResult && !loading) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            A7: Location Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Waiting for location information...</div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            A7: Location Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Verifying location...</div>
        </CardContent>
      </Card>
    )
  }

  if (!verificationResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            A7: Location Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Could not verify location. Please try again.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const displayLocation = selectedAlternative || verificationResult

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          A7: Location Verification
        </CardTitle>
        <CardDescription>
          AI verified emergency location using maps and GPS data
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Location Display */}
        <Alert variant={displayLocation.verified ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {displayLocation.verified ? (
              <>
                <strong>✅ Location Verified</strong>
                <br />
                {displayLocation.address}
              </>
            ) : (
              <>
                <strong>⚠️ Location Not Verified</strong>
                <br />
                Please confirm the location manually
              </>
            )}
          </AlertDescription>
        </Alert>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-2 rounded">
            <p className="font-semibold text-muted-foreground">Latitude:</p>
            <p className="font-mono">{displayLocation.coordinates.latitude.toFixed(4)}°N</p>
          </div>
          <div className="bg-slate-50 p-2 rounded">
            <p className="font-semibold text-muted-foreground">Longitude:</p>
            <p className="font-mono">{displayLocation.coordinates.longitude.toFixed(4)}°E</p>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold">Verification Confidence:</span>
            <Badge variant={displayLocation.confidence >= 80 ? 'default' : 'secondary'}>
              {displayLocation.confidence}%
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded h-2">
            <div
              className="bg-green-500 h-2 rounded"
              style={{ width: `${displayLocation.confidence}%` }}
            />
          </div>
        </div>

        {/* Alternative Locations */}
        {verificationResult.alternatives && verificationResult.alternatives.length > 0 && (
          <div className="border-t pt-3">
            <p className="font-semibold text-xs mb-2">Alternative Matches:</p>
            <div className="space-y-1">
              {verificationResult.alternatives.map((alt, idx) => (
                <Button
                  key={idx}
                  variant={
                    selectedAlternative?.address === alt.address ? 'default' : 'outline'
                  }
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    setSelectedAlternative({
                      verified: true,
                      address: alt.address,
                      coordinates: alt.coordinates,
                      confidence: 85,
                    })
                  }}
                >
                  {alt.address}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Confirmation Section */}
        {!isConfirmed && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold">Is this location correct?</p>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleConfirm}
              >
                <Check className="w-3 h-3 mr-1" />
                Yes, Correct
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs">
                ❌ No, Different
              </Button>
            </div>
          </div>
        )}

        {isConfirmed && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Location confirmed and locked for dispatch.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
