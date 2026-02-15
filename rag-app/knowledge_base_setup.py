import chromadb
import os
import json
from chromadb.utils import embedding_functions
import pandas as pd

# Initialize ChromaDB
client = chromadb.PersistentClient("./chroma_db")
embedding_function = embedding_functions.DefaultEmbeddingFunction()

# Delete existing collection if it exists (for clean slate during setup)
try:
    client.delete_collection("emergency_knowledge")
    print("Deleted existing collection")
except:
    print("No existing collection to delete")

# Create collection
collection = client.create_collection(
    name="emergency_knowledge",
    embedding_function=embedding_function,
    metadata={"description": "Emergency response information for India"}
)

# Define emergency response knowledge base
emergency_knowledge = [
    {
        "text": "For medical emergencies, ask the caller for symptoms, if the person is conscious, breathing, and if there's bleeding. Instruct to check pulse and breathing if appropriate. Ask if the patient has any known medical conditions or allergies.",
        "metadata": {
            "type": "medical",
            "source": "Medical Protocol Guide",
            "priority": "high"
        }
    },
    {
        "text": "For fire emergencies, ask about the size of fire, materials burning, if people are trapped, and if there are hazardous materials nearby. Instruct callers to evacuate immediately and not return to the building.",
        "metadata": {
            "type": "fire",
            "source": "Fire Response Protocol",
            "priority": "high"
        }
    },
    {
        "text": "For police emergencies, ask if the caller is in immediate danger, if weapons are involved, and descriptions of any suspects. Advise the caller to find a safe location if possible.",
        "metadata": {
            "type": "police",
            "source": "Police Emergency Guide",
            "priority": "high"
        }
    },
    {
        "text": "Common symptoms of heart attack include chest pain or discomfort, shortness of breath, pain in the jaw, neck or back, and feeling weak, light-headed, or faint. Advise the caller to have the patient chew aspirin if not allergic and if available.",
        "metadata": {
            "type": "medical",
            "source": "Cardiac Emergency Guide",
            "priority": "high"
        }
    },
    {
        "text": "For snake bite emergencies, instruct to keep the victim calm and still, remove any jewelry or tight clothing near the bite, position the wound below heart level if possible, clean the wound gently, and cover with clean, dry bandage. Do NOT apply tourniquet, cut the wound, or attempt to suck out venom.",
        "metadata": {
            "type": "medical",
            "source": "Snake Bite Protocol",
            "priority": "high"
        }
    },
    {
        "text": "For road accidents, ask about the number of vehicles involved, if anyone is trapped, estimated number of injured people, and if there is fuel leakage or fire risk. Advise to turn on hazard lights and use reflectors/warning triangles if available.",
        "metadata": {
            "type": "accident",
            "source": "Road Accident Protocol",
            "priority": "high"
        }
    },
    {
        "text": "If caller reports drowning, ask if the person has been removed from water, their consciousness state, and if they're breathing. Instruct to place person on their back on a firm surface and begin CPR if not breathing.",
        "metadata": {
            "type": "medical",
            "source": "Drowning Response Guide",
            "priority": "high"
        }
    },
    {
        "text": "For electrical injuries, ensure the power source is off before approaching. Ask if the victim is conscious and breathing. Check for entry and exit wounds. Do not touch the victim if still in contact with electrical source.",
        "metadata": {
            "type": "medical",
            "source": "Electrical Injury Guide",
            "priority": "high"
        }
    },
    {
        "text": "For unconscious victims, instruct to check if breathing by tilting head back slightly, looking for chest movement, and feeling for breath. If not breathing normally, start CPR. Place in recovery position if breathing and no spinal injury suspected.",
        "metadata": {
            "type": "medical",
            "source": "First Aid Protocol",
            "priority": "high"
        }
    },
    {
        "text": "For burns, ask the extent and degree of burns. Instruct to cool burn with cool (not cold) running water for 10-15 minutes, not to apply ice, and not to break blisters. Remove jewelry and tight items near burn area.",
        "metadata": {
            "type": "medical",
            "source": "Burn Treatment Guide",
            "priority": "high"
        }
    },
    {
        "text": "For domestic violence situations, ask if caller is safe to talk, if the abuser is present, and nature of any injuries. Use yes/no questions if needed for safety. Advise to find safe location if possible.",
        "metadata": {
            "type": "police",
            "source": "Domestic Violence Protocol",
            "priority": "high"
        }
    },
    {
        "text": "For chemical spills, ask about the chemical type, quantity, if anyone has been exposed, and symptoms. Advise to evacuate area, avoid touching the substance, and remove contaminated clothing if skin contact occurred.",
        "metadata": {
            "type": "hazmat",
            "source": "Chemical Emergency Guide",
            "priority": "high"
        }
    },
    {
        "text": "For gas leaks, instruct caller to evacuate immediately, not use electrical devices or open flames, and leave doors open when exiting. If possible, turn off main gas supply before leaving.",
        "metadata": {
            "type": "fire",
            "source": "Gas Leak Protocol",
            "priority": "high"
        }
    },
    {
        "text": "When dealing with callers in shock, speak clearly and calmly. Repeat questions if needed. Ask simple, direct questions. Reassure them help is coming. If medically in shock, advise to lie down with legs elevated if no spinal injury.",
        "metadata": {
            "type": "general",
            "source": "Dispatcher Training",
            "priority": "medium"
        }
    },
    {
        "text": "For major bleeding, instruct to apply direct pressure on wound with clean cloth/bandage, raise injured area above heart level if possible, and add more material if blood soaks through rather than removing the first bandage.",
        "metadata": {
            "type": "medical",
            "source": "Bleeding Control Guide",
            "priority": "high"
        }
    },
    {
        "text": "For stroke symptoms, use FAST assessment: Face drooping, Arm weakness, Speech difficulty, Time to call emergency. Ask when symptoms started as this affects treatment options.",
        "metadata": {
            "type": "medical",
            "source": "Stroke Protocol",
            "priority": "high"
        }
    },
    {
        "text": "In cases of choking, if person can cough or speak, encourage them to keep coughing. If unable to speak or cough effectively, instruct to perform Heimlich maneuver or back blows followed by abdominal thrusts.",
        "metadata": {
            "type": "medical",
            "source": "Choking Response Guide",
            "priority": "high"
        }
    },
    {
        "text": "For diabetic emergencies, ask about consciousness, if they can swallow, and if they have glucose/sugar available. If conscious and able to swallow, instruct to consume fast-acting sugar like juice or glucose gel.",
        "metadata": {
            "type": "medical",
            "source": "Diabetic Emergency Guide",
            "priority": "high"
        }
    },
    {
        "text": "In cases of seizure, instruct to clear area of harmful objects, not restrain the person, not put anything in their mouth, and time the seizure. After seizure, place in recovery position if unconscious but breathing.",
        "metadata": {
            "type": "medical",
            "source": "Seizure Response Guide",
            "priority": "high"
        }
    },
    {
        "text": "For suicide threats, keep caller on line, speak calmly, ask directly if they're thinking of harming themselves, if they have a plan, and if they have means. Do not leave them alone if you're with them physically.",
        "metadata": {
            "type": "mental_health",
            "source": "Mental Health Crisis Protocol",
            "priority": "high"
        }
    },
    {
        "text": "Emergency services in India can be reached by dialing 112, which is the unified emergency number connecting to police, fire, and medical services. In some areas, you can still use 100 for police, 101 for fire, and 108 for ambulance.",
        "metadata": {
            "type": "general",
            "source": "India Emergency Services Guide",
            "priority": "medium"
        }
    },
    {
        "text": "For calming distressed callers: Speak slowly and clearly. Use the caller's name if provided. Acknowledge their feelings with phrases like 'I understand this is frightening' or 'You're doing a great job staying calm.' Give them simple tasks to focus on.",
        "metadata": {
            "type": "general",
            "source": "Dispatcher Training",
            "priority": "medium"
        }
    },
    {
        "text": "Important information to collect from all emergency callers: Precise location (address, landmarks, GPS coordinates), caller's name and contact number, number of people affected, and specific emergency details.",
        "metadata": {
            "type": "general",
            "source": "Call Handling Protocol",
            "priority": "high"
        }
    },
    {
        "text": "For child callers, use simple language, be extra reassuring, ask easy-to-answer questions, and tell them they're being brave and doing the right thing by calling. Ask if an adult is nearby who can help.",
        "metadata": {
            "type": "general",
            "source": "Child Caller Protocol",
            "priority": "medium"
        }
    },
    {
        "text": "For elderly callers who may have hearing difficulties, speak clearly and slightly louder (but don't shout), use simple direct phrases, and be patient if information needs repeating.",
        "metadata": {
            "type": "general",
            "source": "Elderly Caller Guide",
            "priority": "medium"
        }
    },
    {
        "text": "In terrorist attacks or active shooter situations, advise callers to run if safe path exists, hide if evacuation not possible (lock doors, stay quiet, silence phones), and fight only as last resort. Provide location details for responders.",
        "metadata": {
            "type": "police",
            "source": "Terrorism Response Protocol",
            "priority": "high"
        }
    },
    {
        "text": "During monsoon flooding emergencies, advise callers to move to higher ground, not walk or drive through flood waters, avoid electrical equipment if wet, and drink only bottled or purified water.",
        "metadata": {
            "type": "disaster",
            "source": "Flood Response Guide",
            "priority": "high"
        }
    },
    {
        "text": "For earthquake response, instruct to drop to hands and knees, cover head and neck with arms (or get under sturdy table), and hold on. Stay indoors until shaking stops. After, check for injuries and evacuate if damage is suspected.",
        "metadata": {
            "type": "disaster",
            "source": "Earthquake Protocol",
            "priority": "high"
        }
    },
    {
        "text": "For animal attacks, instruct the person to back away slowly without running, avoid eye contact with the animal, and try to put something between themselves and the animal. For snake encounters, tell them to move away slowly and not provoke it.",
        "metadata": {
            "type": "animal",
            "source": "Animal Attack Protocol",
            "priority": "medium"
        }
    },
    {
        "text": "Emergency response times in urban areas of India typically range from 10-30 minutes depending on traffic and distance. Rural areas may experience longer response times. Always advise callers that help is coming but provide appropriate first aid instructions while waiting.",
        "metadata": {
            "type": "general",
            "source": "Response Time Guidelines",
            "priority": "medium"
        }
    }
]

# Add documents to collection
collection.add(
    documents=[item["text"] for item in emergency_knowledge],
    metadatas=[item["metadata"] for item in emergency_knowledge],
    ids=[f"doc_{i}" for i in range(len(emergency_knowledge))]
)

print(f"Added {len(emergency_knowledge)} documents to the knowledge base")

# Optional: Test query to verify the collection is working
results = collection.query(
    query_texts=["What should I do for a heart attack?"],
    n_results=2
)

print("\nTest Query Results:")
for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
    print(f"\nResult {i+1}:")
    print(f"Text: {doc}")
    print(f"Metadata: {metadata}")

print("\nKnowledge base setup complete!")