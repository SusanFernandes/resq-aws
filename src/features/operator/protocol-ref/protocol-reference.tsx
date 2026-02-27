'use client'

import React, { useMemo } from 'react'
import { BookOpen, AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AIAnalysisData } from '@/components/ai-analysis-card'

interface ProtocolReferenceProps {
  analysis: AIAnalysisData | null
  onExecuteProtocol?: (protocolName: string) => void
  isLoading?: boolean
}

interface Protocol {
  name: string
  icon: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedResponse: number // minutes
  requiredResources: string[]
  assessmentQuestions: string[]
  steps: string[]
  contraindications: string[]
}

const PROTOCOLS_MAP: Record<string, Protocol> = {
  MEDICAL: {
    name: 'Medical Emergency Protocol',
    icon: '🏥',
    priority: 'CRITICAL',
    estimatedResponse: 15,
    requiredResources: ['Ambulance', 'Paramedics', 'AED', 'Oxygen'],
    assessmentQuestions: [
      'Is the patient conscious and responsive?',
      'What are the vital signs (BP, HR, Respiration)?',
      'Is there signs of trauma or bleeding?',
      'Any known medical conditions or allergies?',
      'When did symptoms start?',
    ],
    steps: [
      'Assess scene safety and personal safety',
      'Check responsiveness and airway',
      'Perform CPR if needed (100-120 compressions/min)',
      'Place in recovery position if unconscious',
      'Monitor vitals every 1-2 minutes',
      'Keep calm and provide reassurance',
      'Prepare for ambulance arrival',
    ],
    contraindications: [
      'Do not move patient unnecessarily',
      'Do not give food or water if unconscious',
      'Do not assume unresponsiveness = cardiac arrest',
    ],
  },
  FIRE: {
    name: 'Fire Emergency Protocol',
    icon: '🔥',
    priority: 'CRITICAL',
    estimatedResponse: 10,
    requiredResources: ['Fire Engine', 'Firefighters', 'Rescue Equipment', 'Ladder Truck'],
    assessmentQuestions: [
      'What is burning (building/vehicle/vegetation)?',
      'Are people trapped or injured?',
      'Are hazardous materials involved?',
      'What is the fire size (small/medium/large)?',
      'Is the building structurally sound?',
      'How many people need evacuation?',
    ],
    steps: [
      'Alert to evacuation areas immediately',
      'Close doors to contain fire',
      'Use fire extinguisher only if safe (Class & fire)',
      'Evacuate all occupants safely',
      'Account for all people outside',
      'Do not return for belongings',
      'Meet firefighters and brief them',
    ],
    contraindications: [
      'Do not use elevators',
      'Do not waste time gathering belongings',
      'Do not enter area if smoke blocks vision',
      'Do not fight fire if it spreads rapidly',
    ],
  },
  POLICE: {
    name: 'Police Emergency Protocol',
    icon: '🚔',
    priority: 'HIGH',
    estimatedResponse: 20,
    requiredResources: ['Police Units', 'Patrol Car', 'Backup Units'],
    assessmentQuestions: [
      'What is the nature of the crime/incident?',
      'Is anyone in immediate danger?',
      'Describe the suspect(s) if known',
      'Are weapons involved?',
      'Has the suspect fled?',
      'Any witnesses present?',
    ],
    steps: [
      'Move to a safe location',
      'Provide clear location details',
      'Preserve the crime scene',
      'Do not touch or move evidence',
      'Note descriptions of suspects',
      'Keep witnesses together',
      'Wait for police arrival',
    ],
    contraindications: [
      'Do not confront the suspect',
      'Do not disturb the crime scene',
      'Do not leave the scene',
      'Do not share scene details with bystanders',
    ],
  },
  ACCIDENT: {
    name: 'Traffic Accident Protocol',
    icon: '🚗',
    priority: 'HIGH',
    estimatedResponse: 20,
    requiredResources: ['Ambulance', 'Police', 'Fire Rescue', 'Tow Truck'],
    assessmentQuestions: [
      'How many vehicles involved?',
      'Are occupants trapped?',
      'What is the severity of injuries?',
      'Has the scene been made safe (hazard lights)?',
      'Is there fuel/chemical spillage?',
      'Traffic impact and blockage?',
    ],
    steps: [
      'Ensure personal safety first',
      'Check vehicle stability before approaching',
      'Turn on hazard lights',
      'Move to safe location',
      'Call for nearest medical assistance',
      'Check occupants for injuries',
      'Protect scene from further hazards',
    ],
    contraindications: [
      'Do not move injured persons unless danger',
      'Do not turn off ignition (risk of airbag)',
      'Do not smoke or use phones near fuel',
      'Do not stand in traffic lanes',
    ],
  },
  TOXIC: {
    name: 'Hazardous Material Protocol',
    icon: '☢️',
    priority: 'CRITICAL',
    estimatedResponse: 25,
    requiredResources: ['Hazmat Team', 'Ambulance', 'Fire Department', 'Evacuation Support'],
    assessmentQuestions: [
      'What is the chemical/material?',
      'How was exposure (inhalation/contact)?',
      'Symptoms in exposed persons?',
      'Has the leak/spill been contained?',
      'Wind direction and affected areas?',
      'Number of people affected?',
    ],
    steps: [
      'Evacuate immediately to upwind area',
      'Do not return for items',
      'Move to highest point if gas (denser than air)',
      'Stay at least 100m from incident site',
      'Do not touch or use any items',
      'Cover skin and respiratory tract',
      'Wait for Hazmat team directions',
    ],
    contraindications: [
      'Do not enter hazard zone',
      'Do not touch contaminated materials',
      'Do not attempt to contain or clean',
      'Do not ignore wind direction',
    ],
  },
  UTILITY: {
    name: 'Utility Emergency Protocol',
    icon: '⚡',
    priority: 'HIGH',
    estimatedResponse: 30,
    requiredResources: ['Utility Company Team', 'Police', 'Evacuation Support'],
    assessmentQuestions: [
      'Is it electrical, gas, or water?',
      'Is there an active emergency (fire/leak)?',
      'Are people in immediate danger?',
      'Has the main supply been shut off?',
      'What area is affected?',
    ],
    steps: [
      'Do not touch equipment or lines',
      'Turn off main supply if accessible and safe',
      'Evacuate if gas smell is present',
      'Do not use electrical devices if wet',
      'Alert neighbors if utility-wide failure',
      'Do not attempt repairs',
    ],
    contraindications: [
      'Never touch downed power lines',
      'Never assume line is dead',
      'Never ignore gas smell',
      'Never attempt DIY repairs',
    ],
  },
  DEFAULT: {
    name: 'General Emergency Protocol',
    icon: '🚨',
    priority: 'MEDIUM',
    estimatedResponse: 20,
    requiredResources: ['Appropriate Services'],
    assessmentQuestions: [
      'What type of emergency?',
      'Who is affected?',
      'What is the immediate danger?',
      'Has help already been called?',
    ],
    steps: [
      'Assess scene safety',
      'Move to safe location',
      'Provide basic aid if trained',
      'Wait for emergency services',
    ],
    contraindications: ['Do not put yourself in danger'],
  },
}

export function ProtocolReference({
  analysis,
  onExecuteProtocol,
  isLoading = false,
}: ProtocolReferenceProps) {
  const protocol = useMemo(() => {
    if (!analysis) return null
    const intentType = analysis.intent.type.toUpperCase()
    return PROTOCOLS_MAP[intentType] || PROTOCOLS_MAP.DEFAULT
  }, [analysis])

  if (!analysis || !protocol) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            O3: Protocol Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Waiting for emergency classification...
          </div>
        </CardContent>
      </Card>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-green-100 text-green-800 border-green-300'
    }
  }

  return (
    <Card className={`border-2 ${getPriorityColor(protocol.priority)}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">{protocol.icon}</span>
              O3: {protocol.name}
            </CardTitle>
            <CardDescription>
              Emergency Type: {analysis.intent.displayName} (Confidence:{' '}
              {analysis.intent.confidence}%)
            </CardDescription>
          </div>
          <Badge variant="outline" className={`${getPriorityColor(protocol.priority)}`}>
            {protocol.priority}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Response Info */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-xs text-muted-foreground">Est. Response</div>
              <div className="font-semibold">{protocol.estimatedResponse} min</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-xs text-muted-foreground">Resources</div>
              <div className="font-semibold">{protocol.requiredResources.length} types</div>
            </div>
          </div>
        </div>

        {/* Required Resources */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            📦 Required Resources
          </h3>
          <div className="flex flex-wrap gap-2">
            {protocol.requiredResources.map((resource) => (
              <Badge key={resource} variant="secondary" className="bg-blue-50">
                {resource}
              </Badge>
            ))}
          </div>
        </div>

        {/* Assessment Questions */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            ❓ Assessment Questions
          </h3>
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            {protocol.assessmentQuestions.map((question, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="font-bold text-sm text-blue-600 flex-shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-sm text-gray-700">{question}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            ✅ Response Steps
          </h3>
          <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
            {protocol.steps.map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="font-bold text-sm text-green-600 flex-shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-sm text-gray-700">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contraindications */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Critical Contraindications (Do NOT)
          </h3>
          <div className="space-y-2 p-3 bg-red-50 rounded-lg border-2 border-red-200">
            {protocol.contraindications.map((contra, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="font-bold text-sm text-red-600 flex-shrink-0">✗</span>
                <span className="text-sm text-gray-700">{contra}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => onExecuteProtocol?.(protocol.name)}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 h-10"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Execute Protocol & Alert Teams
        </Button>
      </CardContent>
    </Card>
  )
}
