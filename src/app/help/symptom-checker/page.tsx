/**
 * Public Symptom Checker Page
 * Hosts the interactive SymptomCheckerFlow component
 */

'use client'

import React from 'react'
import { SymptomCheckerFlow } from '@/features/user/symptom-checker/symptom-checker-flow'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

export default function SymptomCheckerPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">ResQ Symptom Checker</h1>
        <p className="text-muted-foreground">
          Answer a few quick questions to get instant guidance on what to do next.
        </p>
      </div>

      {/* Important Disclaimer */}
      <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <strong>Disclaimer:</strong> This tool provides guidance only and should not replace
            professional medical advice. If you're in a life-threatening situation, call{' '}
            <strong>112</strong> immediately.
          </div>
        </div>
      </div>

      {/* Symptom Checker Component */}
      <div className="py-4">
        <SymptomCheckerFlow />
      </div>

      {/* Tips Section */}
      <div className="bg-slate-50 p-6 rounded-lg border space-y-4">
        <h3 className="font-semibold text-slate-900">💡 Tips for Best Results</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>✓ Be honest about your symptoms for accurate assessment</li>
          <li>✓ Have any relevant medical history handy</li>
          <li>✓ If you're uncertain, always choose the safer option</li>
          <li>✓ Don't delay in seeking emergency help if needed</li>
        </ul>
      </div>

      {/* When to Call 112 */}
      <div className="bg-red-50 border-2 border-red-200 p-6 rounded-lg space-y-3">
        <h3 className="font-semibold text-red-700">When to Call 112 Immediately</h3>
        <ul className="grid grid-cols-2 gap-2 text-xs text-red-700">
          <li>• Chest pain or pressure</li>
          <li>• Difficulty breathing</li>
          <li>• Loss of consciousness</li>
          <li>• Severe bleeding</li>
          <li>• Choking</li>
          <li>• Poisoning</li>
          <li>• Signs of stroke</li>
          <li>• Severe allergic reaction</li>
        </ul>
      </div>

      {/* Support Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-600">
          <h4 className="font-semibold text-blue-900 mb-2">Need Medical Advice?</h4>
          <p className="text-xs text-blue-700">
            Consult healthcare professionals for diagnosis and treatment plans.
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded border-l-4 border-green-600">
          <h4 className="font-semibold text-green-900 mb-2">Mental Health Support?</h4>
          <p className="text-xs text-green-700">
            Mental health is important. Reach out to counselors and support services.
          </p>
        </div>
      </div>
    </div>
  )
}
