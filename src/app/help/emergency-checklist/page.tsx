/**
 * Emergency Checklist Page (U3)
 * Simple dispatch reference guide for emergency situations
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

interface ChecklistItem {
  id: string
  text: string
  priority: 'critical' | 'high' | 'medium'
}

interface ChecklistSection {
  title: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
  items: ChecklistItem[]
}

export default function EmergencyChecklistPage() {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const toggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId)
    } else {
      newChecked.add(itemId)
    }
    setCheckedItems(newChecked)
  }

  const sections: ChecklistSection[] = [
    {
      title: '🚨 CALL 112 IMMEDIATELY',
      icon: <AlertCircle className="w-5 h-5" />,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      items: [
        {
          id: 'call-1',
          text: 'Loss of consciousness or unresponsiveness',
          priority: 'critical',
        },
        { id: 'call-2', text: 'Difficulty breathing or choking', priority: 'critical' },
        {
          id: 'call-3',
          text: 'Chest pain, pressure, or tightness',
          priority: 'critical',
        },
        { id: 'call-4', text: 'Signs of stroke (facial drooping, speech difficulty)', priority: 'critical' },
        { id: 'call-5', text: 'Severe uncontrolled bleeding', priority: 'critical' },
        { id: 'call-6', text: 'Suspected poisoning or overdose', priority: 'critical' },
        { id: 'call-7', text: 'Severe allergic reaction', priority: 'critical' },
        { id: 'call-8', text: 'Severe burns (>20% of body)', priority: 'critical' },
        { id: 'call-9', text: 'Severe trauma or accidents', priority: 'critical' },
        { id: 'call-10', text: 'Suicidal or homicidal thoughts', priority: 'critical' },
      ],
    },
    {
      title: '⚕️ SEE A DOCTOR TODAY',
      icon: <AlertCircle className="w-5 h-5" />,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      items: [
        { id: 'doctor-1', text: 'Mild to moderate chest discomfort', priority: 'high' },
        { id: 'doctor-2', text: 'High fever (> 39°C) lasting several days', priority: 'high' },
        { id: 'doctor-3', text: 'Severe headache with stiff neck', priority: 'high' },
        {
          id: 'doctor-4',
          text: 'Persistent vomiting or inability to retain fluids',
          priority: 'high',
        },
        {
          id: 'doctor-5',
          text: 'Severe abdominal pain lasting >2 hours',
          priority: 'high',
        },
        { id: 'doctor-6', text: 'Suspected bone fracture', priority: 'high' },
        { id: 'doctor-7', text: 'Deep cuts requiring stitches', priority: 'high' },
        { id: 'doctor-8', text: 'Eye injuries or vision changes', priority: 'high' },
        {
          id: 'doctor-9',
          text: 'Allergic reaction with swelling (but breathing OK)',
          priority: 'high',
        },
        { id: 'doctor-10', text: 'Suspected infection (pus, redness, warmth)', priority: 'high' },
      ],
    },
    {
      title: "👍 SELF-CARE MANAGEMENT",
      icon: <CheckCircle2 className="w-5 h-5" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      items: [
        { id: 'care-1', text: 'Minor cuts or scrapes with good bleeding control', priority: 'medium' },
        { id: 'care-2', text: 'Common cold symptoms (cough, runny nose)', priority: 'medium' },
        {
          id: 'care-3',
          text: 'Low-grade fever (< 38.5°C) with mild symptoms',
          priority: 'medium',
        },
        { id: 'care-4', text: 'Muscle soreness or minor sprains', priority: 'medium' },
        { id: 'care-5', text: 'Heartburn or mild indigestion', priority: 'medium' },
        { id: 'care-6', text: 'Minor headache responding to rest', priority: 'medium' },
        { id: 'care-7', text: 'Mild nausea without vomiting', priority: 'medium' },
        { id: 'care-8', text: 'Minor rashes without systemic symptoms', priority: 'medium' },
        {
          id: 'care-9',
          text: 'Constipation or diarrhea (no severe pain)',
          priority: 'medium',
        },
        {
          id: 'care-10',
          text: 'Mild anxiety or stress manageable with relaxation',
          priority: 'medium',
        },
      ],
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">U3: Emergency Decision Checklist</h1>
        <p className="text-sm text-muted-foreground">
          Quick reference guide to determine appropriate level of emergency care. Check off items as
          you assess the situation.
        </p>
      </div>

      {/* Tip Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <strong>Remember:</strong> When in doubt, call 112. It's always better to be safe. Emergency
            services can assess severity and provide guidance.
          </div>
        </CardContent>
      </Card>

      {/* Checklist Sections */}
      {sections.map((section) => (
        <Card key={section.title} className={`border-2 ${section.bgColor}`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-base flex items-center gap-2 ${section.textColor}`}>
              {section.icon}
              {section.title}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {section.items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-white/50 transition"
                >
                  <input
                    type="checkbox"
                    checked={checkedItems.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="mt-0.5 w-4 h-4 rounded border"
                  />
                  <div className="flex-1 text-xs">
                    <p className={checkedItems.has(item.id) ? 'line-through text-muted-foreground' : ''}>
                      {item.text}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs flex-shrink-0 ${
                      item.priority === 'critical'
                        ? 'bg-red-200 text-red-700'
                        : item.priority === 'high'
                          ? 'bg-yellow-200 text-yellow-700'
                          : 'bg-green-200 text-green-700'
                    }`}
                  >
                    {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                  </Badge>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* First Aid Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Basic First Aid While Waiting</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-xs">
          <div className="space-y-1">
            <p className="font-semibold">For Unconsciousness:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Place on side (recovery position)</li>
              <li>Clear airway, check breathing</li>
              <li>Keep warm with blanket</li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">For Severe Bleeding:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Apply direct pressure with clean cloth</li>
              <li>Elevate limb above heart if possible</li>
              <li>Continue pressure for 15+ minutes</li>
              <li>Do NOT remove cloth, add on top if bleeding continues</li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">For Choking:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Encourage coughing if air movement present</li>
              <li>Perform Heimlich maneuver if trained</li>
              <li>Alternate back blows & chest thrusts for infants</li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">For Chest Pain:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Sit or lie person down immediately</li>
              <li>Loosen tight clothing</li>
              <li>If available and trained, give aspirin (unless allergic)</li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">For Poisoning/Overdose:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Move away from poison source if safe</li>
              <li>Do NOT induce vomiting</li>
              <li>Keep samples/container for identification</li>
              <li>Monitor breathing and consciousness</li>
            </ul>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">For Burns:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Cool with cool (not cold) water for 10-20 minutes</li>
              <li>Remove restrictive items (rings, bracelets)</li>
              <li>Cover with clean, dry cloth</li>
              <li>Elevate burned area if possible</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {checkedItems.size > 0 && (
        <Card className="bg-slate-50">
          <CardContent className="pt-4 text-xs text-slate-700">
            <p>
              <strong>Items reviewed: {checkedItems.size}</strong>
            </p>
            {Array.from(checkedItems).some(
              (id) =>
                sections.flatMap((s) => s.items).find((item) => item.id === id)?.priority ===
                'critical'
            ) && (
              <p className="text-red-600 font-semibold mt-1">
                ⚠️ CRITICAL items detected - Consider calling 112
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Emergency Contacts */}
      <Card className="border-2 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-sm text-red-700">Important Contacts</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 text-xs">
          <div className="font-semibold text-red-900">
            🚨 Emergency: <span className="font-bold text-lg">112</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>
              <p className="font-semibold">Poison Control:</p>
              <p>1800-222-0101 (India)</p>
            </div>
            <div>
              <p className="font-semibold">Mental Health:</p>
              <p>Aasra: 9820466726</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
