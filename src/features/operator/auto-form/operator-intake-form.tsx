'use client'

import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Edit2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AIAnalysisData } from '@/components/ai-analysis-card'

interface OperatorIntakeFormProps {
  analysis: AIAnalysisData | null
  onDispatch?: (formData: DispatchFormData) => void
  isLoading?: boolean
}

export interface DispatchFormData {
  callerName: string
  callerPhone: string
  age: string
  location: string
  address: string
  latitude: number
  longitude: number
  emergencyType: string
  severity: string
  description: string
  additionalNotes: string
  confirmedByOperator: boolean
}

export function OperatorIntakeForm({
  analysis,
  onDispatch,
  isLoading = false,
}: OperatorIntakeFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<DispatchFormData>({
    callerName: '',
    callerPhone: '',
    age: '',
    location: '',
    address: '',
    latitude: 0,
    longitude: 0,
    emergencyType: '',
    severity: '',
    description: '',
    additionalNotes: '',
    confirmedByOperator: false,
  })

  // Populate form with AI-extracted data
  useEffect(() => {
    if (analysis) {
      setFormData({
        callerName: analysis.extracted.callerName || '',
        callerPhone: '', // Not always available from AI
        age: analysis.extracted.age || '',
        location: analysis.extracted.location || '',
        address: analysis.location?.address || '',
        latitude: analysis.location?.latitude || 0,
        longitude: analysis.location?.longitude || 0,
        emergencyType: analysis.intent.type || '',
        severity: analysis.extracted.severity || '',
        description: analysis.extracted.description || '',
        additionalNotes: '',
        confirmedByOperator: false,
      })
    }
  }, [analysis])

  const handleFieldChange = (field: keyof DispatchFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleConfirmAndDispatch = () => {
    if (!formData.callerName || !formData.location) {
      alert('Please fill in required fields: Caller Name, Location')
      return
    }
    setFormData((prev) => ({ ...prev, confirmedByOperator: true }))
    onDispatch?.(formData)
  }

  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">O6: Operator Intake Form</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Waiting for AI analysis...
          </div>
        </CardContent>
      </Card>
    )
  }

  const dataQualityColor =
    analysis.confidence.overall >= 80
      ? 'bg-green-50 border-green-200'
      : analysis.confidence.overall >= 60
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-red-50 border-red-200'

  return (
    <Card className={`${dataQualityColor} border-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              O6: Operator Intake Form
            </CardTitle>
            <CardDescription>
              Review and confirm extracted emergency details
            </CardDescription>
          </div>
          <Button
            variant={isEditing ? 'destructive' : 'secondary'}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel Edit
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Data Quality Indicator */}
        <div className="p-3 bg-white rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">AI Extraction Confidence</span>
            <Badge
              variant={
                analysis.confidence.overall >= 80
                  ? 'default'
                  : analysis.confidence.overall >= 60
                    ? 'secondary'
                    : 'destructive'
              }
            >
              {analysis.confidence.overall}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {analysis.confidence.recommendation === 'AUTO_DISPATCH'
              ? '✅ High confidence - suitable for auto-dispatch'
              : analysis.confidence.recommendation === 'OPERATOR_ASSISTED'
                ? '⚠️ Medium confidence - operator review recommended'
                : '🚨 Low confidence - requires operator verification'}
          </p>
        </div>

        {/* Caller Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="caller-name" className="text-sm font-semibold">
              Caller Name *
            </Label>
            <Input
              id="caller-name"
              value={formData.callerName}
              onChange={(e) => handleFieldChange('callerName', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., Rajesh Kumar"
              className={!isEditing ? 'bg-gray-50' : ''}
            />
          </div>
          <div>
            <Label htmlFor="caller-phone" className="text-sm font-semibold">
              Caller Phone
            </Label>
            <Input
              id="caller-phone"
              value={formData.callerPhone}
              onChange={(e) => handleFieldChange('callerPhone', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., +91 98765 43210"
              className={!isEditing ? 'bg-gray-50' : ''}
            />
          </div>
          <div>
            <Label htmlFor="age" className="text-sm font-semibold">
              Age
            </Label>
            <Input
              id="age"
              value={formData.age}
              onChange={(e) => handleFieldChange('age', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., 32"
              type="number"
              className={!isEditing ? 'bg-gray-50' : ''}
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="space-y-3 p-3 bg-white rounded-lg border">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            Location Details
            {analysis.location?.verified && (
              <Badge variant="outline" className="text-xs">
                ✅ Verified
              </Badge>
            )}
          </h3>
          <div>
            <Label htmlFor="location" className="text-sm font-semibold">
              Location Name *
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleFieldChange('location', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., Home, Office, Street"
              className={!isEditing ? 'bg-gray-50' : ''}
            />
          </div>
          <div>
            <Label htmlFor="address" className="text-sm font-semibold">
              Full Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., 123 Main St, Mumbai"
              className={!isEditing ? 'bg-gray-50' : ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <Label className="text-xs text-muted-foreground">Latitude</Label>
              <div className="text-sm font-mono p-2 bg-gray-50 rounded">
                {formData.latitude || 'Not available'}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Longitude</Label>
              <div className="text-sm font-mono p-2 bg-gray-50 rounded">
                {formData.longitude || 'Not available'}
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Details */}
        <div className="space-y-3 p-3 bg-white rounded-lg border">
          <h3 className="font-semibold text-sm">Emergency Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergency-type" className="text-sm font-semibold">
                Emergency Type
              </Label>
              <Input
                id="emergency-type"
                value={formData.emergencyType}
                onChange={(e) => handleFieldChange('emergencyType', e.target.value)}
                disabled={!isEditing}
                placeholder="e.g., Medical, Fire, Accident"
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
            <div>
              <Label htmlFor="severity" className="text-sm font-semibold">
                Severity Level
              </Label>
              <Input
                id="severity"
                value={formData.severity}
                onChange={(e) => handleFieldChange('severity', e.target.value)}
                disabled={!isEditing}
                placeholder="e.g., Critical, Moderate"
                className={!isEditing ? 'bg-gray-50' : ''}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description" className="text-sm font-semibold">
              Description
            </Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange('description', e.target.value)}
              disabled={!isEditing}
              placeholder="Emergency description..."
              className={`flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${!isEditing ? 'bg-gray-50' : ''}`}
            />
          </div>
        </div>

        {/* Operator Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm font-semibold">
            Operator Notes (Optional)
          </Label>
          <textarea
            id="notes"
            value={formData.additionalNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange('additionalNotes', e.target.value)}
            disabled={!isEditing}
            placeholder="Add any additional information..."
            className={`flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${!isEditing ? 'bg-gray-50' : ''}`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {isEditing ? (
            <Button
              onClick={() => setIsEditing(false)}
              variant="default"
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          ) : (
            <>
              <Button
                onClick={handleConfirmAndDispatch}
                disabled={isLoading || !formData.callerName || !formData.location}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {analysis.confidence.recommendation === 'AUTO_DISPATCH'
                  ? 'Confirm & Dispatch'
                  : 'Confirm & Send'}
              </Button>
              {analysis.confidence.recommendation !== 'ESCALATE_TO_HUMAN' && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
