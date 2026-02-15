# Add this import at the top of the file
from dotenv import load_dotenv

import traceback

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
GROQ_MODEL = "llama3-8b-8192"
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

    # Call Groq API
    try:
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
            }
        )
        response_data = response.json()
        agent_response = response_data["choices"][0]["message"]["content"]
        
        # Update conversation history
        session["conversation_history"].append({"role": "assistant", "content": agent_response})
        
        # Extract emergency information
        update_emergency_info(query, agent_response, session)
        
        return agent_response
    except Exception as e:
        logger.error(f"Error calling Groq API: {str(e)}")
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
            }
        )
        
        extracted_data = extraction_response.json()["choices"][0]["message"]["content"]
        
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
            except json.JSONDecodeError:
                logger.error("Failed to parse extracted JSON")
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
    try:
        logger.debug("===== PROCESS SPEECH ENDPOINT ACCESSED =====")
        logger.debug(f"Request method: {request.method}")
        logger.debug(f"Request path: {request.path}")
        logger.debug(f"Request headers: {dict(request.headers)}")
        logger.debug(f"Request values: {request.values.to_dict() if request.values else 'No values'}")
        logger.debug(f"Request form: {request.form.to_dict() if request.form else 'No form data'}")
        logger.debug(f"Request JSON: {request.json if request.is_json else 'Not JSON'}")
        
        response = VoiceResponse()
        call_sid = request.values.get("CallSid")
        logger.debug(f"Call SID: {call_sid or 'No CallSid found'}")

        if not call_sid:
            logger.error("No CallSid found in request. Cannot process speech.")
            response.say("I'm sorry, there was a system error. Please try again.", voice="woman", language="en-IN")
            return Response(str(response), mimetype="text/xml")

        session = get_or_create_session(call_sid)
        logger.debug(f"Session retrieved: {json.dumps(session, indent=2)}")

        # Get speech input
        speech_result = request.values.get("SpeechResult")
        logger.debug(f"Speech result: {speech_result or 'No speech detected'}")

        if speech_result:
            # Query RAG for response
            logger.debug("Querying RAG system for response")
            agent_response = query_rag(speech_result, session)
            logger.debug(f"RAG response: {agent_response}")
            
            # Use Twilio's Say for the response
            response.say(agent_response, voice="woman", language="en-IN")
            
            # Send the updated conversation data to the webhook
            try:
                webhook_url = "https://optimum-foal-loosely.ngrok-free.app/twilio-webhook"
                webhook_data = {
                    "convo": {
                        "data": session["conversation_history"],
                        "id": call_sid
                    },
                    "emergency_info": session["emergency_info"]
                }
                
                logger.debug(f"Sending data to webhook: {json.dumps(webhook_data, indent=2)}")
                
                webhook_response = requests.post(
                    webhook_url,
                    json=webhook_data,
                    headers={"Content-Type": "application/json"}
                )
                
                logger.debug(f"Webhook response status: {webhook_response.status_code}")
                logger.debug(f"Webhook response content: {webhook_response.text[:500]}") # Log first 500 chars to avoid huge logs
                
                if webhook_response.status_code == 200:
                    logger.info("Successfully sent conversation data to webhook")
                else:
                    logger.warning(f"Webhook returned non-200 status: {webhook_response.status_code}")
            except Exception as e:
                logger.error(f"Error sending to webhook: {str(e)}")
                logger.error(traceback.format_exc())
            
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
            
            # If emergency info is complete
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
            logger.warning("No speech result detected in the request")
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
        logger.debug("Returning TwiML response")
        return Response(str(response), mimetype="text/xml")
        
    except Exception as e:
        logger.error(f"CRITICAL ERROR in process_speech: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Send error notification to webhook for monitoring
        try:
            webhook_url = "https://optimum-foal-loosely.ngrok-free.app/twilio-webhook"
            error_data = {
                "error": True,
                "message": str(e),
                "stack_trace": traceback.format_exc(),
                "request_data": {
                    "method": request.method,
                    "path": request.path,
                    "values": request.values.to_dict() if request.values else {},
                    "headers": dict(request.headers)
                }
            }
            requests.post(webhook_url, json=error_data)
        except:
            logger.error("Failed to send error to webhook")
        
        # Return a basic response to prevent Twilio from hanging
        error_response = VoiceResponse()
        error_response.say("I'm sorry, there was a system error. Please call back in a few minutes.", voice="woman", language="en-IN")
        error_response.hangup()
        return Response(str(error_response), mimetype="text/xml")

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
    
    

@app.route("/twilio-webhook", methods=["POST"])
def forward_to_webhook():
    """Forward received data to the external webhook"""
    try:
        # Get the JSON data from the request
        twilioData = request.json
        
        # Log the received data
        logger.debug(f"Received webhook data: {json.dumps(twilioData, indent=2)}")
        
        # Extract conversation history if available
        if twilioData and 'convo' in twilioData:
            conversationHistory = twilioData.get('convo', {}).get('data', {})
            logger.debug(f"Extracted conversation history: {json.dumps(conversationHistory, indent=2)}")
        
        # Forward the data to your external webhook
        webhook_url = "https://optimum-foal-loosely.ngrok-free.app/twilio-webhook"
        
        webhook_response = requests.post(
            webhook_url,
            json=twilioData,
            headers={"Content-Type": "application/json"}
        )
        
        # Log the response from the webhook
        logger.debug(f"Webhook response status: {webhook_response.status_code}")
        logger.debug(f"Webhook response content: {webhook_response.text}")
        
        # Return the forwarded response or a success message
        if webhook_response.status_code == 200:
            return jsonify({
                "status": "success",
                "message": "Data forwarded to webhook successfully",
                "original_data": twilioData,
                "webhook_response": webhook_response.json() if webhook_response.text else {}
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": f"Webhook returned status code {webhook_response.status_code}",
                "original_data": twilioData,
                "webhook_response": webhook_response.text
            }), 500
            
    except Exception as e:
        logger.error(f"Error forwarding to webhook: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Failed to forward data: {str(e)}",
        }), 500
        

def send_to_webhook(data):
    """Utility function to send data to the webhook"""
    try:
        webhook_url = "https://optimum-foal-loosely.ngrok-free.app/twilio-webhook"
        response = requests.post(
            webhook_url,
            json=data,
            headers={"Content-Type": "application/json"}
        )
        return response.status_code == 200, response
    except Exception as e:
        logger.error(f"Error sending to webhook: {str(e)}")
        return False, None


if __name__ == "__main__":
    # Print all registered routes for debugging
    print("Registered routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.endpoint:30} {rule.methods} {rule}")
        
    # Tell Flask we're behind a proxy
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1)
            
    print(f"Starting server on port 5000")
    print("Make sure to use the HTTPS URL from ngrok for your Twilio webhook")
    app.run(debug=True, port=5000)