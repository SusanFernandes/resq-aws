# PRODUCTION AI INTEGRATION GUIDE

## Quick Start - Using Real AI in Your Application

### 1. Environment Setup

Create a `.env.local` file in your project root:

```bash
# .env.local

# Hugging Face API (Required for sentiment analysis)
HUGGINGFACE_API_KEY=hf_your_token_here

# Groq API (Optional, for enhanced medical NER and NLP)
GROQ_API_KEY=gsk_your_groq_token_here

# Deepgram API (Optional, for advanced transcription)
DEEPGRAM_API_KEY=your_deepgram_key_here
```

### 2. API Endpoint Usage

#### Sentiment Analysis
```typescript
const response = await fetch('/api/analyze-sentiment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'The patient is experiencing severe chest pain and shortness of breath'
  })
});

const result = await response.json();
// Returns:
// {
//   sentiment: 'negative',
//   score: -0.87,
//   emotions: { panic: 85, worry: 72, calmness: 0, ... },
//   stress_level: 'critical',
//   risk_score: 87,
//   confidence: 0.87,
//   inference_time_ms: 245
// }
```

#### Complexity Prediction
```typescript
const response = await fetch('/api/predict-complexity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    callId: 'call-12345',
    transcript: 'The patient is unconscious and not breathing',
    demographics: { age: 45 },
    symptoms: ['unconscious', 'not breathing'],
    location: { type: 'urban' }
  })
});

const result = await response.json();
// Returns:
// {
//   level: 'CRITICAL',
//   score: 94,
//   estimatedTime: 1800,
//   recommendedOperatorLevel: 'SUPERVISOR',
//   confidence: 0.92,
//   requiredResources: ['Advanced Life Support', 'Trauma Team', ...]
// }
```

#### Transcription
```typescript
const response = await fetch('/api/transcribe-call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    callId: 'call-12345',
    speaker: 'Caller',
    text: 'I think he had a stroke, his face is drooping',
    timestamp: new Date().toISOString()
  })
});

const result = await response.json();
// Returns:
// {
//   confidence: 0.96,
//   redFlags: [
//     { condition: 'stroke', severity: 'CRITICAL' }
//   ],
//   priorityScore: 95,
//   recommendedAction: 'EMERGENCY: STROKE detected. Immediate dispatch required.',
//   detectedConditions: ['stroke']
// }
```

#### NLP Command Execution
```typescript
const response = await fetch('/api/execute-nlp-command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    callId: 'call-12345',
    rawCommand: 'Escalate to senior operator immediately'
  })
});

const result = await response.json();
// Returns:
// {
//   parsedIntent: 'escalate',
//   confidence: 92,
//   executionPlan: [
//     '1. Notify supervisor',
//     '2. Escalate to senior operator',
//     '3. Enable real-time monitoring'
//   ],
//   extractedParameters: { escalationLevel: 'IMMEDIATE', priority: 'CRITICAL' }
// }
```

#### Resource Optimization
```typescript
const response = await fetch('/api/optimize-resources', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    callId: 'call-12345',
    incidentLocation: 'Main St, Downtown',
    caseComplexity: 'CRITICAL',
    requiredSpecialties: ['Trauma', 'Cardiology'],
    nearbyFacilities: [
      {
        id: 'h1',
        name: 'Central Hospital',
        distance: 2.3,
        specialty: ['Trauma', 'Cardiology'],
        traumaLevel: 1,
        quality: 5
      },
      // ... more facilities
    ]
  })
});

const result = await response.json();
// Returns:
// {
//   primaryFacility: { ... },
//   secondaryFacility: { ... },
//   tertiaryFacility: { ... },
//   dispatchRecommendation: 'Dispatch to Central Hospital (Trauma Level 1, ETA: 9min)',
//   costEstimate: 6500
// }
```

### 3. Frontend Component Integration

#### Dashboard Component
```typescript
'use client'

import { useEffect, useState } from 'react'

export function DashboardPage() {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const analyzeEmerencyCall = async (transcript: string) => {
    setLoading(true)
    
    try {
      // 1. Analyze sentiment
      const sentimentResp = await fetch('/api/analyze-sentiment', {
        method: 'POST',
        body: JSON.stringify({ text: transcript })
      })
      const sentiment = await sentimentResp.json()
      
      // 2. Predict complexity
      const complexityResp = await fetch('/api/predict-complexity', {
        method: 'POST',
        body: JSON.stringify({
          callId: 'call-' + Date.now(),
          transcript,
          demographics: { age: 45 },
          symptoms: extractSymptoms(transcript)
        })
      })
      const complexity = await complexityResp.json()
      
      // 3. Combine results
      setAnalysis({
        sentiment,
        complexity,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      <h1>Emergency Response Dashboard</h1>
      
      {analysis && (
        <div>
          <section>
            <h2>Sentiment Analysis</h2>
            <p>Stress Level: {analysis.sentiment.stress_level}</p>
            <p>Risk Score: {analysis.sentiment.risk_score}/100</p>
            <div className="emotions">
              {Object.entries(analysis.sentiment.emotions).map(([emotion, score]) => (
                <div key={emotion}>
                  {emotion}: {score}%
                </div>
              ))}
            </div>
          </section>
          
          <section>
            <h2>Complexity Assessment</h2>
            <p>Level: {analysis.complexity.level}</p>
            <p>Recommended Operator: {analysis.complexity.recommendedOperatorLevel}</p>
            <p>Estimated Handling Time: {analysis.complexity.estimatedTime}s</p>
          </section>
        </div>
      )}
    </div>
  )
}

function extractSymptoms(transcript: string): string[] {
  const symptoms = [
    'chest pain', 'shortness of breath', 'unconscious', 'stroke',
    'bleeding', 'trauma', 'seizure'
  ]
  return symptoms.filter(s => transcript.toLowerCase().includes(s))
}
```

### 4. Real-Time Transcription

```typescript
import { WebSpeechTranscriber } from '@/lib/ai/transcription-v2'

export function TranscriptionComponent() {
  const [transcript, setTranscript] = useState('')
  const [transcriber] = useState(() => new WebSpeechTranscriber())
  
  const handleStartRecording = () => {
    transcriber.start({
      onSegment: (segment) => {
        console.log('Transcribed:', segment.text)
        setTranscript(prev => prev + ' ' + segment.text)
      },
      onError: (error) => console.error('Transcription error:', error)
    })
  }
  
  const handleStopRecording = async () => {
    transcriber.stop()
    
    // Send final transcript for analysis
    const response = await fetch('/api/analyze-sentiment', {
      method: 'POST',
      body: JSON.stringify({ text: transcript })
    })
    const result = await response.json()
    console.log('Analysis result:', result)
  }
  
  return (
    <div>
      <p>Transcript: {transcript}</p>
      <button onClick={handleStartRecording}>Start Recording</button>
      <button onClick={handleStopRecording}>Stop Recording</button>
    </div>
  )
}
```

### 5. Full Pipeline (Orchestrator)

```typescript
import { Orchestrator } from '@/lib/ai/orchestrator-v2'

export async function runFullAnalysis(transcript: string, callId: string) {
  const orchestrator = new Orchestrator()
  
  // This runs all 5 services in parallel
  const result = await orchestrator.analyzeCall(transcript, callId)
  
  console.log('Complete Analysis:')
  console.log('- Emotions:', result.emotions)
  console.log('- Medical Entities:', result.medicalEntities)
  console.log('- Complexity:', result.complexity)
  console.log('- Intent:', result.intent)
  console.log('- Overall Severity:', result.overallSeverity)
  console.log('- Recommendation:', result.recommendation)
  
  return result
}
```

---

## API Request/Response Examples

### Critical Condition Detection

**Request:**
```json
{
  "text": "The patient is unconscious and not breathing. No pulse detected."
}
```

**Response (Sentiment):**
```json
{
  "sentiment": "negative",
  "score": -0.99,
  "emotions": {
    "panic": 98,
    "worry": 85,
    "anger": 0,
    "calmness": 0,
    "confusion": 25
  },
  "stress_level": "critical",
  "risk_score": 99,
  "recommendation": "🚨 CRITICAL: High stress detected. Recommend immediate senior operator handoff..."
}
```

---

## Error Handling

```typescript
async function safeAPICall(endpoint: string, data: any) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('API Error:', error.error)
      // Handle fallback to local inference here
      return { success: false, fallback: true }
    }
    
    return await response.json()
  } catch (error) {
    console.error('Network error:', error)
    // Use local inference as fallback
    return { success: false, error: 'Network unreachable' }
  }
}
```

---

## Performance Optimization

```typescript
// Cache results to avoid redundant API calls
const analysisCache = new Map()

async function getCachedAnalysis(callId: string, transcript: string) {
  if (analysisCache.has(callId)) {
    return analysisCache.get(callId)
  }
  
  const result = await fetch('/api/analyze-sentiment', {
    method: 'POST',
    body: JSON.stringify({ text: transcript })
  }).then(r => r.json())
  
  // Cache for 5 minutes
  analysisCache.set(callId, result)
  setTimeout(() => analysisCache.delete(callId), 5 * 60 * 1000)
  
  return result
}
```

---

## API Key Setup

### Hugging Face
1. Go to https://huggingface.co/settings/tokens
2. Create a new token (READ permissions)
3. Copy token to `.env.local`

### Groq (Optional)
1. Go to https://console.groq.com
2. Create API key
3. Copy to `.env.local`
4. Usage: Enhanced medical NER and NLP confidence

### Deepgram (Optional)
1. Go to https://console.deepgram.com
2. Create API key
3. Copy to `.env.local`
4. Usage: Advanced transcription fallback

---

## Production Deployment

### Environment Variables (Production)
```bash
# Use secure secret management (AWS Secrets Manager, etc.)
HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY}
GROQ_API_KEY=${GROQ_API_KEY}
DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}

# Optional: Enable logging
LOG_LEVEL=info
ENABLE_INFERENCE_LOGGING=true
```

### Rate Limiting
```typescript
const rateLimit = new Map()

app.post('/api/analyze-sentiment', (req, res) => {
  const clientIP = req.ip
  const now = Date.now()
  
  if (!rateLimit.has(clientIP)) {
    rateLimit.set(clientIP, [])
  }
  
  const recentRequests = rateLimit.get(clientIP).filter(t => now - t < 60000)
  
  if (recentRequests.length > 100) { // Max 100 req/min
    return res.status(429).json({ error: 'Rate limit exceeded' })
  }
  
  recentRequests.push(now)
  rateLimit.set(clientIP, recentRequests)
  
  // ... continue with analysis
})
```

---

## Testing

```typescript
// Test suite for production AI services
describe('Production AI Services', () => {
  test('Sentiment analyzer detects critical conditions', async () => {
    const resp = await fetch('/api/analyze-sentiment', {
      method: 'POST',
      body: JSON.stringify({ text: 'Patient unconscious' })
    })
    const result = await resp.json()
    
    expect(result.stress_level).toBe('critical')
    expect(result.risk_score).toBeGreaterThan(90)
  })
  
  test('Complexity predictor classifies CRITICAL cases', async () => {
    const resp = await fetch('/api/predict-complexity', {
      method: 'POST',
      body: JSON.stringify({
        transcript: 'Cardiac arrest, not breathing',
        symptoms: ['cardiac arrest', 'not breathing']
      })
    })
    const result = await resp.json()
    
    expect(result.level).toBe('CRITICAL')
  })
})
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing API key | Add `HUGGINGFACE_API_KEY` to .env |
| 429 Too Many Requests | Rate limit exceeded | Implement backoff retry logic |
| Empty emotion detection | Invalid API response | Check HF API status, use local fallback |
| High latency (>1s) | Network/API slowness | Use result caching, consider local models |
| Memory leak | WebSpeech not stopped | Call `transcriber.stop()` or `abort()` |

---

**Status**: ✅ **READY FOR PRODUCTION**
