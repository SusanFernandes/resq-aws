/**
 * Symptom Checker Flow (U1)
 * Multi-step interactive symptom checker with decision trees
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { AlertTriangle, CheckCircle, Info, ChevronRight, RotateCcw } from 'lucide-react'

type DecisionType = 'CALL_112' | 'SEE_DOCTOR' | 'SELF_CARE' | null'

interface DecisionReason {
  decision: DecisionType
  reasoning: string
  resources?: string[]
}

interface SymptomCheckerFlowProps {
  onDecisionMade?: (result: DecisionReason) => void
}

// Symptom categories for quick selection
const SYMPTOM_CATEGORIES = [
  { id: 'chest-pain', label: 'Chest Pain' },
  { id: 'breathing', label: 'Difficulty Breathing' },
  { id: 'bleeding', label: 'Severe Bleeding' },
  { id: 'unconscious', label: 'Unconscious/Unresponsive' },
  { id: 'choking', label: 'Choking' },
  { id: 'poisoning', label: 'Poisoning/Overdose' },
  { id: 'burn', label: 'Severe Burn' },
  { id: 'headache', label: 'Severe Headache' },
  { id: 'abdominal', label: 'Severe Abdominal Pain' },
  { id: 'fever', label: 'High Fever' },
  { id: 'fracture', label: 'Fracture/Broken Bone' },
]

// Example questions for each symptom (would normally come from API)
const SYMPTOM_QUESTIONS: Record<string, Array<{ id: string; text: string; type: string }>> = {
  'chest-pain': [
    { id: 'cp1', text: 'How long has the pain been occurring?', type: 'MULTIPLE_CHOICE' },
    { id: 'cp2', text: 'Is the pain radiating to arm or neck?', type: 'YES_NO' },
    { id: 'cp3', text: 'Are you experiencing shortness of breath?', type: 'YES_NO' },
    { id: 'cp4', text: 'Do you have a history of heart disease?', type: 'YES_NO' },
  ],
  'breathing': [
    { id: 'br1', text: 'How severe is the difficulty (1-10)?', type: 'MULTIPLE_CHOICE' },
    { id: 'br2', text: 'Any wheezing or stridor sounds?', type: 'YES_NO' },
    { id: 'br3', text: 'Do you have asthma or respiratory conditions?', type: 'YES_NO' },
  ],
  'bleeding': [
    { id: 'bl1', text: 'Where is the bleeding located?', type: 'OPEN_TEXT' },
    { id: 'bl2', text: 'Can you control the bleeding with pressure?', type: 'YES_NO' },
    { id: 'bl3', text: 'How much blood loss (minor/moderate/severe)?', type: 'MULTIPLE_CHOICE' },
    { id: 'bl4', text: 'Is there any object embedded in the wound?', type: 'YES_NO' },
  ],
  'choking': [
    { id: 'ch1', text: 'Can the person cough or speak at all?', type: 'YES_NO' },
    { id: 'ch2', text: 'Is the airway completely blocked?', type: 'YES_NO' },
  ],
  'poisoning': [
    { id: 'po1', text: 'What substance was ingested?', type: 'OPEN_TEXT' },
    { id: 'po2', text: 'Approximately how much was consumed?', type: 'OPEN_TEXT' },
    { id: 'po3', text: 'How long ago was the poisoning (in minutes)?', type: 'MULTIPLE_CHOICE' },
    { id: 'po4', text: 'Is the person vomiting or having difficulty breathing?', type: 'YES_NO' },
  ],
}

export function SymptomCheckerFlow({ onDecisionMade }: SymptomCheckerFlowProps) {
  // Flow states
  type FlowStep = 'category-select' | 'questions' | 'decision'
  const [step, setStep] = useState<FlowStep>('category-select')
  const [selectedPrimarySymptom, setSelectedPrimarySymptom] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [decision, setDecision] = useState<DecisionReason | null>(null)
  const [loading, setLoading] = useState(false)

  // Get current questions for selected symptom
  const currentQuestions = selectedPrimarySymptom
    ? SYMPTOM_QUESTIONS[selectedPrimarySymptom] || []
    : []
  const currentQuestion = currentQuestions[currentQuestionIdx]
  const questionsCompleted = Object.keys(answers).length

  // Handle symptom category selection
  const handleSelectSymptom = (symptomId: string) => {
    setSelectedPrimarySymptom(symptomId)
    setAnswers({})
    setCurrentQuestionIdx(0)
    setStep('questions')
  }

  // Handle question answer submission
  const handleAnswerQuestion = (answerValue: string) => {
    if (!currentQuestion) return

    setAnswers({
      ...answers,
      [currentQuestion.id]: answerValue,
    })

    // Move to next question or finish
    if (currentQuestionIdx < currentQuestions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1)
    } else {
      // All questions answered, get decision
      submitForDecision({
        ...answers,
        [currentQuestion.id]: answerValue,
      })
    }
  }

  // Get decision from backend
  const submitForDecision = async (allAnswers: Record<string, string>) => {
    setLoading(true)
    try {
      const response = await fetch('/api/symptom-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primarySymptom: selectedPrimarySymptom,
          answers: allAnswers,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setDecision(result)
        setStep('decision')
        onDecisionMade?.(result)
      }
    } catch (error) {
      console.error('[SymptomCheckerFlow] Error getting decision:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle "Start Over"
  const handleRestart = () => {
    setStep('category-select')
    setSelectedPrimarySymptom(null)
    setAnswers({})
    setCurrentQuestionIdx(0)
    setDecision(null)
  }

  // ===== STEP 1: Category Selection =====
  if (step === 'category-select') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            U1: Interactive Symptom Checker
          </CardTitle>
          <CardDescription>
            Select your primary symptom to receive a personalized assessment
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {SYMPTOM_CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant="outline"
                className="justify-start h-auto py-3"
                onClick={() => handleSelectSymptom(category.id)}
              >
                <span className="text-left text-xs">{category.label}</span>
              </Button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            💡 <strong>Tip:</strong> If you don't see your symptom, select your closest match or
            contact emergency services if you're in critical condition.
          </div>
        </CardContent>
      </Card>
    )
  }

  // ===== STEP 2: Interactive Questions =====
  if (step === 'questions' && currentQuestion) {
    const selectedSymptomLabel = SYMPTOM_CATEGORIES.find(
      (cat) => cat.id === selectedPrimarySymptom
    )?.label
    const progress = Math.round(((currentQuestionIdx + 1) / currentQuestions.length) * 100)

    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">{selectedSymptomLabel}</CardTitle>
              <CardDescription className="text-xs mt-1">
                Question {currentQuestionIdx + 1} of {currentQuestions.length}
              </CardDescription>
            </div>
            <Badge variant="secondary">{progress}%</Badge>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded h-1.5 mt-3">
            <div className="bg-blue-500 h-1.5 rounded" style={{ width: `${progress}%` }} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Question */}
          <div className="bg-slate-50 p-4 rounded border">
            <p className="font-semibold text-sm">{currentQuestion.text}</p>
          </div>

          {/* Answer Options (by type) */}
          <div className="space-y-2">
            {currentQuestion.type === 'YES_NO' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAnswerQuestion('yes')}
                >
                  ✓ Yes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAnswerQuestion('no')}
                >
                  ✗ No
                </Button>
              </div>
            )}

            {currentQuestion.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {['Mild (0-3 min)', 'Moderate (3-30 min)', 'Severe (>30 min)'].map((option) => (
                  <Button
                    key={option}
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => handleAnswerQuestion(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'OPEN_TEXT' && (
              <div>
                <textarea
                  className="w-full border rounded p-2 text-xs resize-none"
                  rows={3}
                  placeholder="Type your answer here..."
                  id="open-answer"
                />
                <Button
                  className="w-full mt-2"
                  onClick={() => {
                    const textarea = document.getElementById('open-answer') as HTMLTextAreaElement
                    if (textarea.value.trim()) {
                      handleAnswerQuestion(textarea.value)
                    }
                  }}
                >
                  Next <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (currentQuestionIdx > 0) {
                  setCurrentQuestionIdx(currentQuestionIdx - 1)
                } else {
                  setStep('category-select')
                }
              }}
            >
              ← Back
            </Button>

            {loading && (
              <div className="text-xs text-muted-foreground">Processing next question...</div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ===== STEP 3: Decision Result =====
  if (step === 'decision' && decision) {
    const decisionConfig = {
      CALL_112: {
        icon: AlertTriangle,
        title: '🚨 CALL 112 IMMEDIATELY',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-700',
        badgeColor: 'bg-red-100 text-red-700',
      },
      SEE_DOCTOR: {
        icon: CheckCircle,
        title: '⚕️ SEE A DOCTOR TODAY',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-700',
        badgeColor: 'bg-yellow-100 text-yellow-700',
      },
      SELF_CARE: {
        icon: Info,
        title: '👍 SELF-CARE MANAGEMENT',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-700',
        badgeColor: 'bg-green-100 text-green-700',
      },
    }

    const config = decision.decision ? decisionConfig[decision.decision] : null

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>U1: Your Symptom Assessment</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Decision */}
          {config && (
            <Alert className={`${config.bgColor} border ${config.borderColor}`}>
              <AlertTriangle className={`h-5 w-5 ${config.textColor.replace('text-', 'text-')}`} />
              <AlertDescription className={`font-bold text-base ${config.textColor}`}>
                {config.title}
              </AlertDescription>
            </Alert>
          )}

          {/* Reasoning */}
          <div className="bg-slate-50 p-3 rounded border">
            <p className="text-xs font-semibold mb-2">Reasoning:</p>
            <p className="text-xs text-slate-700">{decision.reasoning}</p>
          </div>

          {/* Resources */}
          {decision.resources && decision.resources.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2">Recommended Resources:</p>
              <ul className="text-xs space-y-1 list-disc list-inside text-slate-600">
                {decision.resources.map((resource, idx) => (
                  <li key={idx}>{resource}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Answers Summary */}
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2 text-xs">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">Full Responses</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="text-xs">
              <div className="bg-slate-50 p-3 rounded border mt-2">
                <p className="font-semibold mb-2">Assessment Summary:</p>
                <div className="space-y-1 text-slate-700">
                  <p>• Primary Symptom: {selectedPrimarySymptom?.toUpperCase()}</p>
                  <p>• Questions Answered: {questionsCompleted}</p>
                  <p>• Recommendation: {decision.decision}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="text-xs">
              <div className="bg-slate-50 p-3 rounded border mt-2 space-y-2">
                {currentQuestions.map((q) => (
                  <div key={q.id}>
                    <p className="font-semibold text-slate-700">{q.text}</p>
                    <p className="text-slate-500 ml-2">Answer: {answers[q.id] || 'Not answered'}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="border-t pt-3 flex gap-2">
            {decision.decision === 'CALL_112' && (
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs">
                📞 Call 112 Now
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={handleRestart}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default loading state
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-center text-sm text-muted-foreground">Loading...</div>
      </CardContent>
    </Card>
  )
}
