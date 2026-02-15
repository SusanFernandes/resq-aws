export interface TwilioMessage {
  role: 'assistant' | 'user'
  content: string
}

export interface AIAnalysis {
  location: string
  name: string
  age: string
  summary: string
  type: string
  title: string
}

export interface EmergencyCall {
  id: string
  location: string
  nature: string
  priority: "CRITICAL" | "MODERATE"
  caller: string
  time: string
  details: string
  coordinates: [number, number]
  imageUrl: string | null
  conversation: TwilioMessage[]
  analysis: AIAnalysis
}

export interface WebSocketData {
  type: string;
  data: {
    id: string;
    timestamp: string;
    originalConversation: TwilioMessage[];
    aiAnalysis: AIAnalysis;
  };
} 