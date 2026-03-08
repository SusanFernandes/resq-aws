# Add this import at the top of the file
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# The rest of your imports
from flask import Flask, request, Response, jsonify, redirect
import os
import json
import chromadb
import requests
import logging
from twilio.twiml.voice_response import VoiceResponse, Gather
from chromadb.utils import embedding_functions
import time
import requests


# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.before_request
def before_request():
    # Force HTTPS for all routes when using ngrok
    if 'ngrok' in request.host and request.headers.get('X-Forwarded-Proto') == 'http':
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=301)

# Configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = "llama-3.1-8b-instant"
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")

# Initialize ChromaDB
client = chromadb.PersistentClient("./chroma_db")
embedding_function = embedding_functions.DefaultEmbeddingFunction()
collection = client.get_or_create_collection(
    name="emergency_knowledge",
    embedding_function=embedding_function,
    metadata={"description": "Emergency response information for India"}
)

# Session storage for tracking conversation state
sessions = {}

def get_or_create_session(call_sid):
    """Create or retrieve a session for the current call"""
    if call_sid not in sessions:
        sessions[call_sid] = {
            "conversation_history": [
                {"role": "system", "content": "You are an emergency response agent for India's 112 service. Be calm, clear, and empathetic. Your goal is to quickly gather key information about the emergency situation and provide reassurance. Ask one question at a time. Extract and confirm: 1) Caller's location (as specific as possible), 2) Type of emergency (medical, fire, police, etc.), 3) Details of the situation. Keep responses short and focused."}
            ],
            "emergency_info": {
                "location": None,
                "emergency_type": None,
                "situation": None,
                "caller_contact": None,
                "complete": False
            },
            "current_step": "initial"
        }
    return sessions[call_sid]

def query_rag(query, session):
    """Query the RAG system to generate a response"""
    # First, retrieve relevant information from ChromaDB
    results = collection.query(
        query_texts=[query],
        n_results=3
    )
    
    # Extract retrieved documents
    retrieved_docs = results['documents'][0]
    retrieved_metadatas = results['metadatas'][0]
    
    # Format retrieved context
    context = "\n\n".join([
        f"Source: {meta.get('source', 'Emergency Knowledge Base')}\n{doc}" 
        for doc, meta in zip(retrieved_docs, retrieved_metadatas)
    ])
    
    # Update conversation with user input
    session["conversation_history"].append({"role": "user", "content": query})
    
    # Create prompt for the LLM
    prompt = f"""Based on the following emergency service knowledge:

{context}

And the conversation history:
{json.dumps(session["conversation_history"], indent=2)}

Current emergency information gathered:
Location: {session["emergency_info"]["location"] or "Not provided yet"}
Emergency Type: {session["emergency_info"]["emergency_type"] or "Not provided yet"}
Situation Details: {session["emergency_info"]["situation"] or "Not provided yet"}

Respond as an emergency dispatcher. Keep responses under 3 sentences. Be calm and reassuring.
If you're missing critical information, ask for it directly.
If you have all the essential information, tell the caller help is being dispatched and provide basic safety instructions.
"""

    # Call Groq API with proper error handling
    try:
        # Validate API key first
        if not GROQ_API_KEY:
            logger.error("GROQ_API_KEY is not set")
            return "I'm having trouble processing your request. Please clearly state your emergency and location."
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 256
            },
            timeout=30  # Add timeout
        )
        
        # Check if request was successful
        if response.status_code != 200:
            logger.error(f"Groq API error - Status: {response.status_code}, Response: {response.text}")
            return "I'm having trouble processing your request. Please clearly state your emergency and location."
        
        response_data = response.json()
        
        # Check if response has expected structure
        if "choices" not in response_data:
            logger.error(f"Unexpected API response structure: {response_data}")
            return "I'm having trouble processing your request. Please clearly state your emergency and location."
        
        if not response_data["choices"] or "message" not in response_data["choices"][0]:
            logger.error(f"No choices or message in API response: {response_data}")
            return "I'm having trouble processing your request. Please clearly state your emergency and location."
        
        agent_response = response_data["choices"][0]["message"]["content"]
        
        # Update conversation history
        session["conversation_history"].append({"role": "assistant", "content": agent_response})
        
        # Extract emergency information
        update_emergency_info(query, agent_response, session)
        
        return agent_response
        
    except requests.exceptions.Timeout:
        logger.error("Groq API request timed out")
        return "I'm having trouble processing your request. Please clearly state your emergency and location."
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error calling Groq API: {str(e)}")
        return "I'm having trouble processing your request. Please clearly state your emergency and location."
    except Exception as e:
        logger.error(f"Unexpected error calling Groq API: {str(e)}")
        return "I'm having trouble processing your request. Please clearly state your emergency and location."

def update_emergency_info(user_input, response, session):
    """Extract and update emergency information based on conversation"""
    # Extract emergency info from user input
    input_for_extraction = "\n".join([
        msg["content"] for msg in session["conversation_history"] if msg["role"] == "user"
    ])
    
    extraction_prompt = f"""
    Extract emergency information from this text:
    {input_for_extraction}
    
    Current information:
    {json.dumps(session["emergency_info"], indent=2)}
    
    Output ONLY a JSON object with fields:
    - location: (location of emergency or null if unclear)
    - emergency_type: (medical, fire, police, or null if unclear)
    - situation: (brief description of what's happening or null)
    - caller_contact: (phone number or null)
    - complete: (true if we have location AND emergency type, otherwise false)
    """
    
    try:
        if not GROQ_API_KEY:
            logger.error("GROQ_API_KEY is not set for extraction")
            return
        
        extraction_response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": extraction_prompt}],
                "temperature": 0.1,
                "max_tokens": 256
            },
            timeout=30
        )
        
        # Check if request was successful
        if extraction_response.status_code != 200:
            logger.error(f"Extraction API error - Status: {extraction_response.status_code}, Response: {extraction_response.text}")
            return
        
        extraction_data = extraction_response.json()
        
        # Check response structure
        if "choices" not in extraction_data or not extraction_data["choices"]:
            logger.error(f"No choices in extraction response: {extraction_data}")
            return
        
        extracted_data = extraction_data["choices"][0]["message"]["content"]
        
        # Find JSON in response
        import re
        json_match = re.search(r'{.*}', extracted_data, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                extracted_info = json.loads(json_str)
                # Update session with new information (only if values are not None)
                for key, value in extracted_info.items():
                    if value is not None and value != "null" and value != "":
                        session["emergency_info"][key] = value
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse extracted JSON: {e}")
                logger.error(f"Raw extracted data: {extracted_data}")
        else:
            logger.error(f"No JSON found in extraction response: {extracted_data}")
            
    except requests.exceptions.Timeout:
        logger.error("Extraction API request timed out")
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error in extraction: {str(e)}")
    except Exception as e:
        logger.error(f"Error extracting emergency info: {str(e)}")

@app.route("/voice", methods=["POST"])
def voice():
    """Handle incoming calls and start the conversation using Twilio's Say TTS"""
    response = VoiceResponse()
    call_sid = request.values.get("CallSid")
    session = get_or_create_session(call_sid)
    
    # Initial greeting using Twilio's Say
    response.say("This is 112 emergency services. Please clearly tell me what's happening and your location.", 
                 voice="woman", language="en-IN")
    
    # Gather speech input
    gather = Gather(
        input="speech",
        action="/process_speech",
        method="POST",
        speechTimeout="2",
        speechModel="phone_call",
        language="en-IN"
    )
    response.append(gather)
    
    # If no speech detected, retry
    response.redirect("/voice")
    
    return Response(str(response), mimetype="text/xml")

@app.route("/process_speech", methods=["POST"])
def process_speech():
    """Process speech input from the caller using Twilio's Say TTS"""
    logger.debug("===== PROCESS SPEECH =====")
    logger.debug(f"All request values: {request.values.to_dict()}")

    response = VoiceResponse()
    call_sid = request.values.get("CallSid")
    logger.debug(f"Call SID: {call_sid}")

    session = get_or_create_session(call_sid)
    session["call_sid"] = call_sid

    logger.debug(f"Current session state: {json.dumps(session, indent=2)}")

    # Get speech input
    speech_result = request.values.get("SpeechResult")
    logger.debug(f"Speech result: {speech_result}")

    if speech_result:
        # Query RAG for response
        agent_response = query_rag(speech_result, session)
        
        # Use Twilio's Say for the response
        response.say(agent_response, voice="woman", language="en-IN")
        
        send_to_dashboard(session)

        
        # Gather more speech input
        gather = Gather(
            input="speech",
            action="/process_speech",
            method="POST",
            speechTimeout="2",
            speechModel="phone_call",
            language="en-IN"
        )
        response.append(gather)
        
        # If emergency info is complete, log and end with confirmation
        if session["emergency_info"]["complete"]:
            # In a real system, you would send this info to emergency services
            logger.info(f"EMERGENCY DETAILS: {json.dumps(session['emergency_info'], indent=2)}")
            
            # Final confirmation message if we haven't sent it yet
            if session["current_step"] != "confirmation_sent":
                confirmation = f"Emergency services have been notified. {session['emergency_info']['emergency_type']} responders are being dispatched to {session['emergency_info']['location']}. Please stay on the line if you need further assistance."
                response.say(confirmation, voice="woman", language="en-IN")
                session["current_step"] = "confirmation_sent"
    else:
        # Handle case when speech cannot be recognized
        response.say("I couldn't understand. Please clearly state your emergency and location.", voice="woman", language="en-IN")
        gather = Gather(
            input="speech",
            action="/process_speech",
            method="POST",
            speechTimeout="2",
            speechModel="phone_call",
            language="en-IN"
        )
        response.append(gather)
    
    # If no further input received, redirect to handle
    response.redirect("/process_speech")
    
    return Response(str(response), mimetype="text/xml")

def send_to_dashboard(session):
    """Send emergency information to the dashboard via websocket server"""
    try:
        # Prepare data for the dashboard
        conversation_data = session["conversation_history"]
        emergency_info = session["emergency_info"]
            
        payload = {
            "id": session.get("call_sid", f"call-{int(time.time())}"),
            "convo": {
                "data": conversation_data
            },
            "emergency_info": emergency_info   # Include extracted emergency information
        }
            
        # Send POST request to the websocket server
        response = requests.post(
            "http://localhost:8080/twilio-webhook",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
            
        if response.status_code == 200:
            logger.info("Successfully sent data to dashboard")
        else:
            logger.error(f"Failed to send data to dashboard: {response.status_code}")
                
    except Exception as e:
        logger.error(f"Error sending data to dashboard: {str(e)}")


# Optional endpoint for direct testing without Twilio
@app.route("/test", methods=["GET", "POST"])
def test_endpoint():
    """Test endpoint to simulate conversation without Twilio"""
    if request.method == "POST":
        user_input = request.form.get("user_input")
        test_session = get_or_create_session("test_session")
        response = query_rag(user_input, test_session)
        return {
            "response": response,
            "emergency_info": test_session["emergency_info"]
        }
    return """
    <html>
        <body>
            <h1>Test Emergency Response System</h1>
            <form method="post">
                <input type="text" name="user_input" placeholder="Your emergency...">
                <button type="submit">Send</button>
            </form>
        </body>
    </html>
    """

@app.route("/test_webhook", methods=["GET", "POST"])
def test_webhook():
    """Simple test endpoint to verify the server is responsive"""
    request_data = {
        "method": request.method,
        "url": request.url,
        "headers": dict(request.headers),
        "form_data": request.form.to_dict() if request.form else {},
        "query_params": request.args.to_dict() if request.args else {}
    }
    
    return jsonify({
        "status": "success",
        "message": "Webhook test endpoint is working",
        "timestamp": time.time(),
        "request_data": request_data
    })

if __name__ == "__main__":
    # Tell Flask we're behind a proxy
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1)
        
    print(f"Starting server on port 5000")
    print("Make sure to use the HTTPS URL from ngrok for your Twilio webhook")
    app.run(debug=True, port=5000)