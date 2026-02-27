/**
 * Contextual Questions Component (A5)
 * Generates and displays intelligent follow-up questions
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, ChevronRight } from 'lucide-react'

export interface ContextualQuestion {
  questionId: string
  text: string
  answerType: 'YES_NO' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT'
  options?: string[]
  priority: number
  relevance: number
}

interface ContextualQuestionsProps {
  symptoms: string[]
  previousAnswers: Record<string, string>
  onAnswerSubmitted: (questionId: string, answer: string | boolean) => void
  isLoading?: boolean
}

export function ContextualQuestions({
  symptoms,
  previousAnswers,
  onAnswerSubmitted,
  isLoading = false,
}: ContextualQuestionsProps) {
  const [currentQuestion, setCurrentQuestion] = useState<ContextualQuestion | null>(null)
  const [answer, setAnswer] = useState<string>('')
  const [showNextQuestion, setShowNextQuestion] = useState(false)

  // Question bank by symptom
  const questionBank: Record<string, ContextualQuestion[]> = {
    'chest pain': [
      {
        questionId: 'q-cp-1',
        text: 'Is the chest pain radiating to your arm, shoulder, or jaw?',
        answerType: 'YES_NO',
        priority: 1,
        relevance: 95,
      },
      {
        questionId: 'q-cp-2',
        text: 'Are you experiencing shortness of breath along with the chest pain?',
        answerType: 'YES_NO',
        priority: 1,
        relevance: 95,
      },
      {
        questionId: 'q-cp-3',
        text: 'On a scale of 1-10, how severe is the pain?',
        answerType: 'MULTIPLE_CHOICE',
        options: ['1-3 (Mild)', '4-6 (Moderate)', '7-9 (Severe)', '10 (Worst ever)'],
        priority: 2,
        relevance: 85,
      },
    ],
    'difficulty breathing': [
      {
        questionId: 'q-db-1',
        text: 'Is the person completely unable to breathe or just having difficulty?',
        answerType: 'YES_NO',
        priority: 1,
        relevance: 95,
      },
      {
        questionId: 'q-db-2',
        text: 'Is there wheezing, gasping, or stridor (high-pitched sound)?',
        answerType: 'MULTIPLE_CHOICE',
        options: ['Wheezing', 'Gasping', 'Stridor', 'None of these'],
        priority: 2,
        relevance: 85,
      },
    ],
    'bleeding': [
      {
        questionId: 'q-bl-1',
        text: 'How severe is the bleeding? Is it gushing or spurting?',
        answerType: 'YES_NO',
        priority: 1,
        relevance: 95,
      },
      {
        questionId: 'q-bl-2',
        text: 'Where is the bleeding located?',
        answerType: 'MULTIPLE_CHOICE',
        options: ['Head/Face', 'Arms/Legs', 'Torso/Chest', 'Abdomen'],
        priority: 1,
        relevance: 95,
      },
    ],
    'unconscious': [
      {
        questionId: 'q-uc-1',
        text: 'Is the person breathing?',
        answerType: 'YES_NO',
        priority: 1,
        relevance: 100,
      },
      {
        questionId: 'q-uc-2',
        text: 'Can you feel a pulse?',
        answerType: 'YES_NO',
        priority: 1,
        relevance: 100,
      },
    ],
  }

  const getNextQuestion = useCallback(() => {
    // Get all relevant questions for current symptoms
    const allQuestions: ContextualQuestion[] = []

    symptoms.forEach((symptom) => {
      const lowerSymptom = symptom.toLowerCase()
      for (const [key, questions] of Object.entries(questionBank)) {
        if (lowerSymptom.includes(key) || key.includes(lowerSymptom.split(' ')[0])) {
          allQuestions.push(...questions)
        }
      }
    })

    // Remove duplicates
    const uniqueQuestions = Array.from(
      new Map(allQuestions.map((q) => [q.questionId, q])).values()
    )

    // Remove already answered questions
    const unansweredQuestions = uniqueQuestions.filter((q) => !previousAnswers[q.questionId])

    // Sort by priority, then relevance
    unansweredQuestions.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return b.relevance - a.relevance
    })

    return unansweredQuestions.length > 0 ? unansweredQuestions[0] : null
  }, [symptoms, previousAnswers, questionBank])

  React.useEffect(() => {
    if (!currentQuestion && !showNextQuestion) {
      const next = getNextQuestion()
      if (next) {
        setCurrentQuestion(next)
      }
    }
  }, [currentQuestion, showNextQuestion, getNextQuestion])

  const handleAnswerSubmit = () => {
    if (!currentQuestion || !answer) return

    onAnswerSubmitted(currentQuestion.questionId, answer)
    setAnswer('')
    setCurrentQuestion(null)
    setShowNextQuestion(false)

    // Show next question
    const next = getNextQuestion()
    if (next) {
      setTimeout(() => {
        setCurrentQuestion(next)
      }, 500)
    }
  }

  if (!currentQuestion) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            A5: Contextual Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {symptoms.length === 0
              ? 'Waiting for symptom detection...'
              : Object.keys(previousAnswers).length === 0
                ? 'Preparing questions based on symptoms...'
                : 'All key questions answered.'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          A5: Contextual Questions
        </CardTitle>
        <CardDescription>AI generates next best question based on context</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Question */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
              Q
            </div>
            <h4 className="font-semibold text-sm">{currentQuestion.text}</h4>
          </div>

          {/* Answer Options */}
          <div className="ml-10 space-y-2">
            {currentQuestion.answerType === 'YES_NO' && (
              <div className="flex gap-2">
                <Button
                  variant={answer === 'YES' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setAnswer('YES')}
                >
                  Yes
                </Button>
                <Button
                  variant={answer === 'NO' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setAnswer('NO')}
                >
                  No
                </Button>
              </div>
            )}

            {currentQuestion.answerType === 'MULTIPLE_CHOICE' && currentQuestion.options && (
              <div className="space-y-1">
                {currentQuestion.options.map((option) => (
                  <Button
                    key={option}
                    variant={answer === option ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setAnswer(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}

            {currentQuestion.answerType === 'OPEN_TEXT' && (
              <input
                type="text"
                placeholder="Enter response..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full px-3 py-2 border rounded text-xs"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAnswerSubmit()
                }}
              />
            )}
          </div>

          {/* Submit Button */}
          <div className="ml-10">
            <Button
              onClick={handleAnswerSubmit}
              disabled={!answer || isLoading}
              size="sm"
              className="text-xs"
            >
              <ChevronRight className="w-3 h-3 mr-1" />
              Next Question
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground flex items-center gap-2 border-t pt-2">
          <Badge variant="outline" className="text-xs">
            Priority: {currentQuestion.priority}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Relevance: {currentQuestion.relevance}%
          </Badge>
        </div>

        {/* Answered Summary */}
        {Object.keys(previousAnswers).length > 0 && (
          <div className="border-t pt-2">
            <p className="text-xs font-semibold mb-2">Answers Collected: {Object.keys(previousAnswers).length}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
