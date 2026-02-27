/**
 * SOS Button Component (U11)
 * Sticky floating SOS button with emergency contact management and 3-second countdown
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertTriangle,
  Phone,
  MapPin,
  Plus,
  X,
  Trash2,
  CheckCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react'

interface EmergencyContact {
  id: string
  name: string
  phone: string
  priority: 1 | 2 | 3
}

interface LocationData {
  lat: number
  lng: number
  address: string
  timestamp: number
}

type SOSState = 'idle' | 'countdown' | 'activating' | 'active'

export function SOSButton() {
  const [sosState, setSOSState] = useState<SOSState>('idle')
  const [countdown, setCountdown] = useState(3)
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: '1', name: 'Mom', phone: '+91 98765 43210', priority: 1 },
    { id: '2', name: 'Dad', phone: '+91 98765 43211', priority: 2 },
    { id: '3', name: 'Sister', phone: '+91 98765 43212', priority: 3 },
  ])
  const [location, setLocation] = useState<LocationData | null>(null)
  const [showContactManager, setShowContactManager] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [sosEventId, setSOSEventId] = useState<string | null>(null)
  const [sosResponse, setSOSResponse] = useState<any>(null)

  // Countdown timer
  useEffect(() => {
    if (sosState !== 'countdown') return

    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1)
      } else {
        triggerSOSCall()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, sosState])

  // Get GPS location
  const getLocation = async (): Promise<LocationData | null> => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            resolve({
              lat: latitude,
              lng: longitude,
              address: `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`,
              timestamp: Date.now(),
            })
          },
          () => {
            // Mock location if GPS fails
            resolve({
              lat: 19.0759,
              lng: 72.8776,
              address: 'Mumbai, Maharashtra, India (Mock Location)',
              timestamp: Date.now(),
            })
          }
        )
      } else {
        // Mock location
        resolve({
          lat: 19.0759,
          lng: 72.8776,
          address: 'Mumbai, Maharashtra, India (Mock Location)',
          timestamp: Date.now(),
        })
      }
    })
  }

  // Start SOS countdown
  const handleSOSClick = async () => {
    if (sosState === 'idle') {
      const loc = await getLocation()
      setLocation(loc)
      setSOSState('countdown')
      setCountdown(3)
    }
  }

  // Cancel countdown
  const handleCancel = () => {
    setSOSState('idle')
    setCountdown(3)
  }

  // Trigger SOS call to backend
  const triggerSOSCall = async () => {
    setSOSState('activating')

    try {
      const response = await fetch('/api/sos-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location?.lat || 19.0759,
          longitude: location?.lng || 72.8776,
          address: location?.address || 'Unknown Location',
          emergencyContacts: contacts,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSOSResponse(result)
        setSOSEventId(result.eventId)
        setSOSState('active')

        // Auto-call 112
        window.location.href = 'tel:112'
      }
    } catch (error) {
      console.error('[SOSButton] Error triggering SOS:', error)
      setSOSState('idle')
    }
  }

  // Add new emergency contact
  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) return
    if (contacts.length >= 5) {
      alert('Maximum 5 emergency contacts allowed')
      return
    }

    const newPriority = Math.min((contacts.length + 1) as 1 | 2 | 3, 3)
    setContacts([
      ...contacts,
      {
        id: Date.now().toString(),
        name: newContactName,
        phone: newContactPhone,
        priority: newPriority,
      },
    ])

    setNewContactName('')
    setNewContactPhone('')
  }

  // Delete contact
  const handleDeleteContact = (id: string) => {
    setContacts(contacts.filter((c) => c.id !== id))
  }

  // ===== IDLE STATE: Normal SOS Button =====
  if (sosState === 'idle') {
    return (
      <>
        {/* Sticky SOS Button */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
          {/* Contact Manager Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="rounded-full shadow-lg"
            onClick={() => setShowContactManager(!showContactManager)}
          >
            <Phone className="w-4 h-4 mr-1" />
            Contacts
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>

          {/* Main SOS Button */}
          <Button
            onClick={handleSOSClick}
            className="rounded-full h-20 w-20 bg-red-600 hover:bg-red-700 shadow-xl animate-pulse"
          >
            <div className="flex flex-col items-center gap-1">
              <AlertTriangle className="w-6 h-6" />
              <span className="text-xs font-bold">SOS</span>
            </div>
          </Button>
        </div>

        {/* Contact Manager Dropdown */}
        {showContactManager && (
          <div className="fixed bottom-32 right-6 z-40 w-80 max-w-screen shadow-xl">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Emergency Contacts</span>
                  <Badge variant="secondary">{contacts.length}/5</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Contact List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {contacts
                    .sort((a, b) => a.priority - b.priority)
                    .map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded border"
                      >
                        <div className="flex-1">
                          <p className="text-xs font-semibold">{contact.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{contact.phone}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            Priority {contact.priority}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    ))}
                </div>

                {/* Add New Contact */}
                {contacts.length < 5 && (
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs font-semibold">Add New Contact:</p>
                    <input
                      type="text"
                      placeholder="Name"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      className="w-full text-xs border rounded p-1.5"
                    />
                    <input
                      type="tel"
                      placeholder="Phone +91"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      className="w-full text-xs border rounded p-1.5"
                    />
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      onClick={handleAddContact}
                      variant={newContactName && newContactPhone ? 'default' : 'outline'}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Contact
                    </Button>
                  </div>
                )}

                {/* Info */}
                <Alert className="text-xs bg-blue-50 border-blue-200">
                  <AlertTriangle className="h-3 w-3" />
                  <AlertDescription className="text-blue-700">
                    Contacts will be SMS'd and 112 will be auto-called.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    )
  }

  // ===== COUNTDOWN STATE: 3-Second Warning =====
  if (sosState === 'countdown') {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-96 max-w-screen">
        <Card className="bg-red-50 border-2 border-red-200 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              SOS CALL INITIATING
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Countdown Display */}
            <div className="flex justify-center items-center">
              <div
                className={`text-7xl font-bold ${countdown > 1 ? 'text-red-600' : 'text-red-700 animate-bounce'}`}
              >
                {countdown}
              </div>
            </div>

            {/* Location Info */}
            {location && (
              <Alert variant="default" className="bg-white">
                <MapPin className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Location: {location.address}
                </AlertDescription>
              </Alert>
            )}

            {/* Contacts Being Notified */}
            <div>
              <p className="text-xs font-semibold mb-1 text-red-700">Contacts to be notified:</p>
              <div className="space-y-1">
                {contacts.slice(0, 3).map((c) => (
                  <div key={c.id} className="text-xs text-red-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {c.name} ({c.phone})
                  </div>
                ))}
              </div>
            </div>

            {/* Cancel Button */}
            <Button
              variant="outline"
              className="w-full text-xs border-red-300 text-red-700 hover:bg-red-50"
              onClick={handleCancel}
            >
              <X className="w-3 h-3 mr-1" />
              Cancel SOS
            </Button>

            <p className="text-xs text-center text-red-600 font-semibold">
              Release will call 112 and notify contacts
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== SOS ACTIVE STATE: Confirmation Screen =====
  if (sosState === 'active' && sosEventId) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-96 max-w-screen">
        <Card className="bg-green-50 border-2 border-green-200 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              SOS ACTIVATED
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Event ID */}
            <div className="bg-white p-3 rounded border-l-4 border-green-600">
              <p className="text-xs text-muted-foreground font-semibold">Event ID:</p>
              <p className="text-sm font-mono font-bold text-green-700">{sosEventId}</p>
            </div>

            {/* Emergency Dispatch Status */}
            {sosResponse && (
              <>
                <Alert className="bg-white border-green-300">
                  <Phone className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-xs">
                    <strong>112 Emergency Call:</strong> Placed in progress
                  </AlertDescription>
                </Alert>

                <div className="space-y-1 text-xs">
                  <p className="font-semibold">Expected Response Time:</p>
                  <p className="text-green-700">
                    {sosResponse.estimatedETA || '3-11 minutes'}
                  </p>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-semibold">SMS Status:</p>
                  <p className="text-green-700">
                    {sosResponse.smsStatus === 'sent'
                      ? '✅ SMS sent to emergency contacts'
                      : '⏳ Sending SMS...'}
                  </p>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-semibold">Your Location (Shared with)</p>
                  <p className="text-muted-foreground font-mono">
                    {location?.address || 'Unknown'}
                  </p>
                </div>
              </>
            )}

            {/* Instructions */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700">
                <strong>Stay on the line</strong> with the 112 operator. Keep your phone nearby.
              </AlertDescription>
            </Alert>

            {/* Disable Reset (Keep button but disable) */}
            <Button disabled className="w-full opacity-50 text-xs" variant="outline">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              SOS Active - Do Not Hang Up
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fallback
  return null
}
