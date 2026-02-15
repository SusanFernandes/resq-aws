import requests
import time

# Base URL for your local app
BASE_URL = "http://localhost:5000"
test_call_id = f"test_call_{int(time.time())}"

# Step 1: Initial call
response = requests.post(f"{BASE_URL}/voice", data={"CallSid": test_call_id})
print("Initial call response:", response.status_code)

print("\nTest endpoint response:", response.json())