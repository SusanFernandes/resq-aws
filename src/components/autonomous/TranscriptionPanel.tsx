'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Clipboard } from 'lucide-react'

interface TranscriptSegment {
  time: string
  speaker: 'caller' | 'operator'
  text: string
  confidence: number
  redFlags: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
}

interface TranscriptionData {
  transcripts: TranscriptSegment[]
  summary: string
  keyPhrases: string[]
  redFlags: string[]
  actionItems: string[]
  medicalTerms: string[]
  totalDuration: number
  averageConfidence: number
}

export function TranscriptionPanel() {
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null)

  useEffect(() => {
    initializeTranscription()
    const interval = setInterval(addTranscriptSegment, 8000) // Add segment every 8 seconds
    return () => clearInterval(interval)
  }, [])

  const initializeTranscription = () => {
    const mockData: TranscriptionData = {
      transcripts: [
        {
          time: '0:00',
          speaker: 'caller',
          text: 'Hello? I need help! My father is not breathing properly!',
          confidence: 96,
          redFlags: ['not breathing'],
          sentiment: 'negative',
        },
        {
          time: '0:05',
          speaker: 'operator',
          text: 'Stay calm, I am here to help. Where are you calling from?',
          confidence: 94,
          redFlags: [],
          sentiment: 'neutral',
        },
        {
          time: '0:12',
          speaker: 'caller',
          text: 'We are at home, 123 Main Street. He is gasping for air!',
          confidence: 95,
          redFlags: ['gasping for air', 'breathing difficulty'],
          sentiment: 'negative',
        },
        {
          time: '0:20',
          speaker: 'operator',
          text: 'Ambulance is on the way. Is he conscious?',
          confidence: 97,
          redFlags: [],
          sentiment: 'neutral',
        },
        {
          time: '0:28',
          speaker: 'caller',
          text: 'Yes, yes he is conscious but in severe pain in his chest!',
          confidence: 93,
          redFlags: ['severe pain', 'chest pain'],
          sentiment: 'negative',
        },
      ],
      summary:
        'Caller reports father with severe respiratory distress and chest pain at home. Symptoms suggest possible cardiac event. Ambulance dispatched. Patient conscious but in distress.',
      keyPhrases: ['Father', 'Home', '123 Main Street', 'Breathing difficulty', 'Chest pain'],
      redFlags: ['not breathing', 'gasping for air', 'breathing difficulty', 'severe pain', 'chest pain'],
      actionItems: [
        'Priority dispatch to residential address',
        'Prepare for cardiac emergency protocols',
        'Oxygen support ready',
        'Consider advanced life support',
      ],
      medicalTerms: ['respiratory distress', 'cardiac event'],
      totalDuration: 28,
      averageConfidence: 95,
    }
    setTranscriptionData(mockData)
    setLoading(false)
  }

  const addTranscriptSegment = () => {
    setTranscriptionData((prev) => {
      if (!prev) return null

      const responses = [
        { text: 'Help is arriving soon, stay on the line with me', speaker: 'operator' },
        { text: 'He seems to be stabilizing slightly', speaker: 'caller' },
        { text: 'I need you to make sure nothing is blocking his airway', speaker: 'operator' },
        { text: 'His color is pale and lips are blue', speaker: 'caller' },
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      const newTime = `0:${Math.round(prev.totalDuration + 5)}`

      const newSegment: TranscriptSegment = {
        time: newTime,
        speaker: randomResponse.speaker as 'caller' | 'operator',
        text: randomResponse.text,
        confidence: 90 + Math.random() * 7,
        redFlags:
          randomResponse.speaker === 'caller' &&
          (randomResponse.text.includes('blue') || randomResponse.text.includes('pale'))
            ? ['cyanosis', 'hypoxia']
            : [],
        sentiment: randomResponse.speaker === 'operator' ? 'neutral' : 'negative',
      }

      return {
        ...prev,
        transcripts: [...prev.transcripts, newSegment],
        totalDuration: prev.totalDuration + 5,
      }
    })
  }

  const getSentimentIcon = (sentiment: string): string => {
    switch (sentiment) {
      case 'positive':
        return '😊'
      case 'neutral':
        return '😐'
      case 'negative':
        return '😢'
      default:
        return '❓'
    }
  }

  const getSpeakerBadge = (speaker: string): string => {
    return speaker === 'caller' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
  }

  const downloadTranscript = () => {
    if (!transcriptionData) return

    let text = 'CALL TRANSCRIPTION\n'
    text += '==================\n'
    text += `Duration: ${Math.floor(transcriptionData.totalDuration / 60)}:${(transcriptionData.totalDuration % 60).toString().padStart(2, '0')}\n\n`

    text += 'SUMMARY\n-------\n'
    text += transcriptionData.summary + '\n\n'

    text += 'TRANSCRIPT\n----------\n'
    transcriptionData.transcripts.forEach((seg) => {
      text += `[${seg.time}] ${seg.speaker.toUpperCase()}: ${seg.text}\n`
    })

    text += '\n\nKEY INFORMATION\n---------------\n'
    text += `Red Flags: ${transcriptionData.redFlags.join(', ')}\n`
    text += `Medical Terms: ${transcriptionData.medicalTerms.join(', ')}\n`
    text += `Key Phrases: ${transcriptionData.keyPhrases.join(', ')}\n\n`

    text += 'ACTION ITEMS\n------------\n'
    transcriptionData.actionItems.forEach((item) => {
      text += `• ${item}\n`
    })

    const blob = new Blob([text], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'call-transcription.txt'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const copyToClipboard = () => {
    if (!transcriptionData) return

    let text = 'CALL TRANSCRIPTION\n'
    transcriptionData.transcripts.forEach((seg) => {
      text += `[${seg.time}] ${seg.speaker.toUpperCase()}: ${seg.text}\n`
    })

    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return <div className="text-center">Loading transcription...</div>
  }

  if (!transcriptionData) {
    return <div>No transcription data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📞 Live Call Transcription
              </CardTitle>
              <CardDescription>
                Real-time speech-to-text with red flag detection and key phrase extraction
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-600">
                {Math.floor(transcriptionData.totalDuration / 60)}:
                {(transcriptionData.totalDuration % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-sm text-gray-600">Call Duration</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📋 Auto-Generated Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-800">{transcriptionData.summary}</p>
        </CardContent>
      </Card>

      {/* Key Information Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Red Flags */}
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="pt-4">
            <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
              🚨 Red Flags ({transcriptionData.redFlags.length})
            </h3>
            <div className="space-y-2">
              {transcriptionData.redFlags.length === 0 ? (
                <p className="text-sm text-gray-600">No red flags detected</p>
              ) : (
                transcriptionData.redFlags.map((flag, idx) => (
                  <Badge key={idx} className="bg-red-600 text-white capitalize">
                    {flag}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Medical Terms */}
        <Card className="border-2 border-purple-300 bg-purple-50">
          <CardContent className="pt-4">
            <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
              💊 Medical Terms ({transcriptionData.medicalTerms.length})
            </h3>
            <div className="space-y-2">
              {transcriptionData.medicalTerms.length === 0 ? (
                <p className="text-sm text-gray-600">No medical terms detected</p>
              ) : (
                transcriptionData.medicalTerms.map((term, idx) => (
                  <Badge key={idx} variant="outline" className="capitalize">
                    {term}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Phrases */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🔑 Key Phrases Detected</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {transcriptionData.keyPhrases.map((phrase, idx) => (
              <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-300">
                {phrase}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Transcript */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              🎙️ Live Transcript ({transcriptionData.transcripts.length} entries)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="gap-2"
              >
                <Clipboard className="w-4 h-4" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={downloadTranscript}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto font-mono text-sm">
            {transcriptionData.transcripts.map((segment, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border-l-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                style={{
                  borderLeftColor: segment.speaker === 'caller' ? '#ef4444' : '#3b82f6',
                }}
                onClick={() =>
                  setExpandedSegment(expandedSegment === `${idx}` ? null : `${idx}`)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-600 font-bold w-12">[{segment.time}]</span>
                      <Badge className={getSpeakerBadge(segment.speaker)}>
                        {segment.speaker === 'caller' ? '📱 Caller' : '👤 Operator'}
                      </Badge>
                      <span className="text-lg">{getSentimentIcon(segment.sentiment)}</span>
                      <Badge
                        variant="outline"
                        className="text-xs ml-auto"
                      >
                        {Math.round(segment.confidence)}%
                      </Badge>
                    </div>
                    <p className="text-gray-800">{segment.text}</p>

                    {/* Expanded Details */}
                    {expandedSegment === `${idx}` && (
                      <div className="mt-3 pt-3 border-t space-y-2 text-xs">
                        <div>
                          <span className="font-semibold">Confidence:</span> {Math.round(segment.confidence)}%
                        </div>
                        <div>
                          <span className="font-semibold">Sentiment:</span> {segment.sentiment}
                        </div>
                        {segment.redFlags.length > 0 && (
                          <div>
                            <span className="font-semibold">Red Flags:</span>{' '}
                            {segment.redFlags.join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">✅ Recommended Action Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {transcriptionData.actionItems.map((item, idx) => (
              <li key={idx} className="flex gap-3 p-2 bg-white rounded">
                <span className="font-bold text-orange-600">{idx + 1}.</span>
                <span className="text-gray-800">{item}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Transcript Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📊 Transcription Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Total Segments</p>
              <p className="text-2xl font-bold text-blue-600">
                {transcriptionData.transcripts.length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded border-green-200">
              <p className="text-xs text-gray-600 mb-1">Avg Confidence</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(transcriptionData.averageConfidence)}%
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded border-red-200">
              <p className="text-xs text-gray-600 mb-1">Red Flags Found</p>
              <p className="text-2xl font-bold text-red-600">
                {transcriptionData.redFlags.length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded border-purple-200">
              <p className="text-xs text-gray-600 mb-1">Caller/Operator Ratio</p>
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(
                  (transcriptionData.transcripts.filter((s) => s.speaker === 'caller').length /
                    transcriptionData.transcripts.length) *
                    100
                )}
                % / 
                {Math.round(
                  (transcriptionData.transcripts.filter((s) => s.speaker === 'operator').length /
                    transcriptionData.transcripts.length) *
                    100
                )}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Indicators */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">✨ Transcription Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Recognition Accuracy</span>
              <Badge className="bg-green-600 text-white">
                {transcriptionData.averageConfidence > 90
                  ? 'Excellent'
                  : transcriptionData.averageConfidence > 75
                    ? 'Good'
                    : 'Fair'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Red Flag Detection</span>
              <Badge className="bg-green-600 text-white">
                {transcriptionData.redFlags.length > 0 ? 'Active' : 'Standby'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Medical Term Recognition</span>
              <Badge className="bg-green-600 text-white">
                {transcriptionData.medicalTerms.length > 0 ? 'Detecting' : 'Ready'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
