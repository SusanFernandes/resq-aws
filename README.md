# ResQ AI — Intelligent Emergency Response System

ResQ AI is a multi-module AI-driven emergency management system designed to assist India's 112 helpline and related services. It combines voice call processing, real-time AI analysis, and interactive dashboards to provide efficient emergency response coordination.

## 🏗️ System Architecture

The system consists of four main layers:

### Input Layer

- Voice calls, SMS, WhatsApp messages, and social-media alerts
- Twilio-powered voice call handling with speech recognition

### Processing Layer

- Speech-to-Text conversion using Twilio
- Natural Language Processing with Groq API (Llama 3)
- Retrieval-Augmented Generation (RAG) using ChromaDB knowledge base
- AI-powered conversation management

### Decision Layer

- Google Gemini AI for sentiment analysis and emergency classification
- Automatic extraction of location, emergency type, and priority
- Real-time emergency data structuring

### Output Layer

- Interactive operator dashboard with real-time updates
- Mapbox-powered geospatial visualization
- Automated dispatch notifications
- WebSocket-based real-time communication

## 🚀 Features

### Voice Call Intelligence

- **Conversational AI**: Natural language understanding for emergency calls
- **Knowledge Base**: Specialized emergency response protocols (medical, fire, police)
- **Dynamic Information Extraction**: Automatically gathers location, emergency type, and caller details
- **Multi-turn Conversations**: Maintains context throughout emergency calls

### Real-time Dashboard

- **Live Map View**: Emergency locations displayed on interactive maps
- **Emergency Details**: Comprehensive incident information with AI analysis
- **Priority Classification**: Critical/Moderate/Low severity assessment
- **Dispatch Management**: One-click service dispatch (medical, fire, police)
- **Conversation History**: Full call transcript and AI insights

### AI-Powered Analysis

- **Emergency Classification**: Automatic categorization and prioritization
- **Location Intelligence**: Geospatial data extraction and mapping
- **Sentiment Analysis**: Caller distress assessment
- **Resource Allocation**: Smart dispatch recommendations

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **Maps**: Mapbox GL JS for geospatial visualization
- **State Management**: Zustand for client-side state
- **Real-time**: WebSocket client for live updates

### Backend Services

- **API Server**: Node.js with Express.js
- **Real-time Communication**: WebSocket server for dashboard updates
- **AI Analysis**: Google Generative AI (Gemini 2.0 Flash)
- **Database**: PostgreSQL with Prisma ORM

### RAG (Retrieval-Augmented Generation) System

- **Framework**: Python Flask
- **Voice Processing**: Twilio API for call handling and TTS
- **LLM**: Groq API with Llama 3 8B model
- **Vector Database**: ChromaDB for knowledge base storage
- **Speech Recognition**: Twilio's speech-to-text

### Infrastructure

- **Database**: PostgreSQL in Docker
- **Development**: ngrok for local webhook testing
- **Deployment**: Docker containerization

## 📋 Prerequisites

- Node.js 18+
- Python 3.8+
- PostgreSQL (Docker recommended)
- Twilio account with phone number
- Google AI API key
- Groq API key
- Mapbox access token

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd resq_ai

# Install dependencies
npm install
cd backend && npm install
cd ../rag-app && pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env` files in root, `backend/`, and `rag-app/` directories:

```env
# Root .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/resq_ai"
NEXT_PUBLIC_MAPBOX_TOKEN="your_mapbox_token"

# backend/.env
GEMINI_API_KEY="your_google_ai_key"
PORT=8080

# rag-app/.env
GROQ_API_KEY="your_groq_key"
TWILIO_ACCOUNT_SID="your_twilio_sid"
TWILIO_AUTH_TOKEN="your_twilio_token"
```

### 3. Database Setup

```bash
# Start PostgreSQL database
./start-database.sh

# Run Prisma migrations
npm run db:push
```

### 4. Knowledge Base Setup

```bash
cd rag-app
python knowledge_base_setup.py
```

### 5. Twilio Configuration

```bash
cd rag-app
python twilio_setup.py
```

### 6. Start Services

```bash
# Terminal 1: Start RAG app (handles voice calls)
cd rag-app
python app.py

# Terminal 2: Start backend API/WebSocket server
cd backend
npm start

# Terminal 3: Start frontend dashboard
npm run dev
```

## 📞 Voice Call Flow

1. **Incoming Call**: Citizen calls emergency number (112)
2. **Initial Response**: AI agent greets and asks for emergency details
3. **Conversation**: Natural dialogue to gather location, emergency type, situation
4. **Information Extraction**: AI analyzes conversation for key details
5. **Dashboard Update**: Real-time push to operator dashboard
6. **Dispatch**: Operator reviews and dispatches appropriate services

## 🎯 API Endpoints

### Backend Server (Port 8080)

- `POST /twilio-webhook`: Receives emergency data from RAG app
- `WebSocket ws://localhost:8080?type=dashboard`: Real-time dashboard updates

### RAG App (Port 5000)

- `POST /voice`: Handles incoming Twilio voice calls
- `POST /process_speech`: Processes speech input
- `GET /test`: Test endpoint for development

## 🗄️ Database Schema

```prisma
model Post {
    id        Int      @id @default(autoincrement())
    name      String
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([name])
}
```

*Note: Database schema is minimal; emergency data is currently handled via WebSocket for real-time processing.*

## 🧪 Testing

### Voice Call Testing

```bash
cd rag-app
python test.py
```

### Webhook Testing

Visit `http://localhost:5000/test_webhook` to verify Twilio integration.

## 🚀 Deployment

### Production Considerations

- Use production-grade PostgreSQL instance
- Configure proper SSL certificates
- Set up monitoring and logging
- Implement backup strategies
- Configure firewall rules

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built for India's emergency response ecosystem
- Powered by cutting-edge AI technologies
- Designed for real-time emergency coordination

---

**ResQ AI**: Making emergency response smarter, faster, and more efficient.
