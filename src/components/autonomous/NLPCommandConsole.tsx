'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mic, Send, Clock, TrendingUp } from 'lucide-react'

interface ParsedCommand {
  intent: 'query' | 'action' | 'control' | 'escalate' | 'note' | 'unknown'
  action: string
  confidence: number
  reasoning: string
  suggestedExecution: string
}

interface CommandEntry {
  id: string
  rawInput: string
  parsed: ParsedCommand
  timestamp: number
  executed: boolean
  status: 'pending' | 'success' | 'failed'
}

export function NLPCommandConsole() {
  const [commandInput, setCommandInput] = useState('')
  const [commands, setCommands] = useState<CommandEntry[]>([])
  const [isListening, setIsListening] = useState(false)
  const [currentParsing, setCurrentParsing] = useState<ParsedCommand | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const intentIcons: Record<string, string> = {
    query: '❓',
    action: '⚡',
    control: '⚙️',
    escalate: '🚨',
    note: '📝',
    unknown: '❓',
  }

  const intentColors: Record<string, string> = {
    query: 'bg-blue-100 text-blue-800 border-blue-300',
    action: 'bg-green-100 text-green-800 border-green-300',
    control: 'bg-purple-100 text-purple-800 border-purple-300',
    escalate: 'bg-red-100 text-red-800 border-red-300',
    note: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    unknown: 'bg-gray-100 text-gray-800 border-gray-300',
  }

  const parseCommand = (input: string): ParsedCommand => {
    const normalized = input.toLowerCase()

    // Determine intent
    let intent: ParsedCommand['intent'] = 'unknown'
    let confidence = 0

    if (
      normalized.includes('escalate') ||
      normalized.includes('critical') ||
      normalized.includes('emergency')
    ) {
      intent = 'escalate'
      confidence = 95
    } else if (
      normalized.includes('note') ||
      normalized.includes('add') ||
      normalized.includes('document')
    ) {
      intent = 'note'
      confidence = 90
    } else if (
      normalized.includes('tell') ||
      normalized.includes('what') ||
      normalized.includes('status')
    ) {
      intent = 'query'
      confidence = 85
    } else if (
      normalized.includes('send') ||
      normalized.includes('dispatch') ||
      normalized.includes('alert')
    ) {
      intent = 'action'
      confidence = 88
    } else if (
      normalized.includes('toggle') ||
      normalized.includes('enable') ||
      normalized.includes('disable')
    ) {
      intent = 'control'
      confidence = 82
    }

    return {
      intent,
      action:
        intent === 'escalate'
          ? 'escalate_severity'
          : intent === 'note'
            ? 'add_note'
            : intent === 'action'
              ? 'dispatch_resource'
              : intent === 'control'
                ? 'toggle_feature'
                : 'unknown',
      confidence,
      reasoning:
        confidence > 80
          ? 'High confidence match: keywords clearly indicate intent'
          : confidence > 60
            ? 'Moderate confidence: partial keyword match'
            : 'Low confidence: ambiguous input',
      suggestedExecution:
        intent === 'escalate'
          ? 'Escalate case severity and prepare additional resources'
          : intent === 'note'
            ? `Add to case file: "${input}"`
            : intent === 'action'
              ? 'Dispatch specified resource to incident location'
              : intent === 'control'
                ? 'Toggle specified feature or setting'
                : 'Clarification needed',
    }
  }

  const handleSubmitCommand = () => {
    if (!commandInput.trim()) return

    const parsed = parseCommand(commandInput)
    setCurrentParsing(parsed)

    const newCommand: CommandEntry = {
      id: `cmd-${Date.now()}`,
      rawInput: commandInput,
      parsed,
      timestamp: Date.now(),
      executed: false,
      status: 'pending',
    }

    setCommands((prev) => [newCommand, ...prev])
    setCommandInput('')

    // Auto-execute after brief delay
    setTimeout(() => {
      setCommands((prev) =>
        prev.map((cmd) =>
          cmd.id === newCommand.id
            ? { ...cmd, executed: true, status: 'success' }
            : cmd
        )
      )
    }, 1500)
  }

  const toggleListening = () => {
    setIsListening(!isListening)
    if (!isListening) {
      // Simulate voice input after 2 seconds
      setTimeout(() => {
        const sampleCommands = [
          'Patient condition critical, escalate immediately',
          'Multiple victims reported',
          'Note - patient has history of cardiac issues',
          'What is the current status',
          'Send police unit to location',
        ]
        const randomCommand = sampleCommands[Math.floor(Math.random() * sampleCommands.length)]
        setCommandInput(randomCommand)
        setIsListening(false)
      }, 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              🎙️ Natural Language Command Console
            </CardTitle>
            <CardDescription>
              Enter voice or text commands to control emergency response operations
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Field */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type command or press microphone to speak..."
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitCommand()}
              className="flex-1"
            />
            <Button
              size="lg"
              onClick={toggleListening}
              className={`${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              <Mic className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              onClick={handleSubmitCommand}
              disabled={!commandInput.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Listening Status */}
          {isListening && (
            <div className="p-3 bg-red-100 border-2 border-red-300 rounded text-red-800 text-sm">
              🎤 Listening... Speak your command now
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Parsing Display */}
      {currentParsing && (
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {intentIcons[currentParsing.intent]} Command Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Intent */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Detected Intent</p>
              <Badge
                className={`text-base px-3 py-1 border ${intentColors[currentParsing.intent]}`}
              >
                {currentParsing.intent.toUpperCase()}
              </Badge>
            </div>

            {/* Confidence */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Confidence</p>
                <span className="font-bold text-lg text-purple-600">
                  {currentParsing.confidence}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    currentParsing.confidence > 80
                      ? 'bg-green-500'
                      : currentParsing.confidence > 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${currentParsing.confidence}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {currentParsing.confidence > 80
                  ? '✅ High confidence'
                  : currentParsing.confidence > 60
                    ? '⚡ Moderate confidence'
                    : '⚠️ Low confidence'}
              </p>
            </div>

            {/* Reasoning */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Analysis</p>
              <p className="text-sm text-gray-800 italic">{currentParsing.reasoning}</p>
            </div>

            {/* Action */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Suggested Action</p>
              <p className="text-sm font-semibold text-gray-900">
                {currentParsing.suggestedExecution}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Command History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              📋 Command History ({commands.length} commands)
            </CardTitle>
            {commands.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommands([])}
              >
                Clear History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {commands.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No commands yet. Enter a command or use voice input to get started.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {commands.map((cmd) => (
                <div
                  key={cmd.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    cmd.status === 'success'
                      ? 'bg-green-50 border-green-300'
                      : cmd.status === 'failed'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-yellow-50 border-yellow-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">
                        {intentIcons[cmd.parsed.intent]}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">"{cmd.rawInput}"</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={`text-xs ${
                              intentColors[cmd.parsed.intent]
                            }`}
                          >
                            {cmd.parsed.intent}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            {cmd.parsed.confidence}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(cmd.timestamp).toLocaleTimeString()}
                      </div>
                      <Badge
                        className={`mt-2 ${
                          cmd.status === 'success'
                            ? 'bg-green-600'
                            : cmd.status === 'failed'
                              ? 'bg-red-600'
                              : 'bg-yellow-600'
                        } text-white`}
                      >
                        {cmd.status === 'success'
                          ? '✓ Executed'
                          : cmd.status === 'failed'
                            ? '✗ Failed'
                            : '⏳ Processing'}
                      </Badge>
                    </div>
                  </div>

                  {/* Command Details */}
                  <div className="mt-3 pl-11 text-sm space-y-1 border-t pt-2">
                    <p className="text-gray-700">
                      <span className="font-semibold">Action:</span> {cmd.parsed.action}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Execution:</span>{' '}
                      {cmd.parsed.suggestedExecution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Command Statistics */}
      {commands.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📊 Command Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{commands.length}</div>
                  <p className="text-xs text-gray-600">Total Commands</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {commands.filter((c) => c.status === 'success').length}
                  </div>
                  <p className="text-xs text-gray-600">Successful</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {commands.filter((c) => c.status === 'failed').length}
                  </div>
                  <p className="text-xs text-gray-600">Failed</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(
                      commands.reduce((sum, c) => sum + c.parsed.confidence, 0) /
                        commands.length
                    )}
                    %
                  </div>
                  <p className="text-xs text-gray-600">Avg Confidence</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Commands Cheat Sheet */}
      <Card className="bg-amber-50 border-2 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">💡 Common Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="font-semibold text-amber-900">Escalation</p>
              <ul className="space-y-1 text-amber-800">
                <li>• "Escalate to critical"</li>
                <li>• "This is an emergency"</li>
                <li>• "Life-threatening situation"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-amber-900">Dispatch</p>
              <ul className="space-y-1 text-amber-800">
                <li>• "Send ambulance"</li>
                <li>• "Request fire department"</li>
                <li>• "Alert police units"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-amber-900">Information</p>
              <ul className="space-y-1 text-amber-800">
                <li>• "What's the status?"</li>
                <li>• "Tell me about this case"</li>
                <li>• "Check severity level"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-amber-900">Documentation</p>
              <ul className="space-y-1 text-amber-800">
                <li>• "Note patient allergies"</li>
                <li>• "Add to case file"</li>
                <li>• "Document this response"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
