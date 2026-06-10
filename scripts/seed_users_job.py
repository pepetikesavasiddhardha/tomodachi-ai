import os
import json
import random
import time
import requests

# ==============================================================================
# CONFIGURATION
# ==============================================================================
ELASTIC_URL = os.getenv("ELASTIC_URL")
ELASTIC_API_KEY = os.getenv("ELASTIC_API_KEY")
USER_COUNT = int(os.getenv("USER_COUNT", "10000")) # Default to 10,000 if not set
BATCH_SIZE = 500
INDEX_NAME = "tomodachi_users"

if not ELASTIC_URL or not ELASTIC_API_KEY:
    print("❌ ERROR: ELASTIC_URL and ELASTIC_API_KEY environment variables are required.")
    exit(1)

# Clean URL
if ELASTIC_URL.endswith('/'):
    ELASTIC_URL = ELASTIC_URL[:-1]

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"ApiKey {ELASTIC_API_KEY}"
}

# ==============================================================================
# DATA GENERATION
# ==============================================================================
FIRST_NAMES_MALE = ['Hiroshi', 'Kenji', 'Takashi', 'Akira', 'Taro', 'Jiro', 'Daiki', 'Ryota', 'Kenta', 'Satoshi']
FIRST_NAMES_FEMALE = ['Yoko', 'Sakura', 'Mei', 'Keiko', 'Haruka', 'Yui', 'Naomi', 'Ayumi', 'Chloe', 'Elena']
LAST_NAMES = ['Tanaka', 'Sato', 'Watanabe', 'Garcia', 'Ito', 'Chen', 'Nakamura', 'Yamamoto', 'Lin', 'Smith', 'Takahashi', 'Kim']
LOCATIONS = ['Shibuya, Tokyo', 'Kyoto', 'Shinjuku, Tokyo', 'Minato, Tokyo', 'Ueno, Tokyo', 'Yokohama', 'Osaka', 'Kobe', 'Fukuoka', 'Sapporo']
INTERESTS_LIST = ['Gardening', 'Chess', 'Slow Walks', 'Tea Ceremony', 'Temple Visits', 'Reading', 'Photography', 'Nature', 'Coffee', 'Cooking', 'Music', 'History', 'Museums', 'Tai Chi', 'Mahjong', 'Golf', 'Yoga']

def generate_user(index):
    is_male = random.choice([True, False])
    first_name = random.choice(FIRST_NAMES_MALE) if is_male else random.choice(FIRST_NAMES_FEMALE)
    last_name = random.choice(LAST_NAMES)
    age = random.randint(60, 90)
    location = random.choice(LOCATIONS)
    
    # Pick 2 to 4 random interests
    num_interests = random.randint(2, 4)
    interests = random.sample(INTERESTS_LIST, num_interests)
    
    return {
        "email": f"user{index}@example.com",
        "password": "password123",
        "name": f"{first_name} {last_name}",
        "age": age,
        "gender": "Male" if is_male else "Female",
        "location": location,
        "bio": f"I am a retired professional living in {location}. I enjoy {' and '.join(interests)}.",
        "summary": f"A {age}-year-old living in {location} who enjoys {', '.join(interests)}.",
        "interests": interests
    }

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================
def main():
    print(f"🚀 Starting Cloud Run Job: Seeding {USER_COUNT} users into {INDEX_NAME}...")
    
    # 1. Ensure index exists with correct mapping
    print("Checking/Creating index mapping...")
    mapping = {
        "mappings": {
            "properties": {
                "email": { "type": "keyword" },
                "password": { "type": "keyword" }
            }
        }
    }
    
    response = requests.put(f"{ELASTIC_URL}/{INDEX_NAME}", headers=HEADERS, json=mapping)
    
    # Catch the specific Kibana 404 error
    if response.status_code == 404:
        try:
            err_json = response.json()
            if err_json.get("statusCode") == 404 and err_json.get("error") == "Not Found":
                print("\n❌ CRITICAL ERROR: You provided the Kibana URL instead of the Elasticsearch URL!")
                print("Kibana is the UI dashboard. This script needs to talk directly to the Elasticsearch database.")
                print("Please update your Cloud Run job environment variables to use the Elasticsearch endpoint.")
                exit(1)
        except:
            pass

    # 2. Batch Insert
    successful_inserts = 0
    
    for i in range(1, USER_COUNT + 1, BATCH_SIZE):
        bulk_data = ""
        current_batch_size = min(BATCH_SIZE, USER_COUNT - i + 1)
        
        for j in range(current_batch_size):
            user_index = i + j
            user = generate_user(user_index)
            doc_id = f"u_gen_cloudrun_{int(time.time())}_{user_index}"
            
            # NDJSON format for Elasticsearch _bulk API
            bulk_data += json.dumps({ "index": { "_index": INDEX_NAME, "_id": doc_id } }) + "\n"
            bulk_data += json.dumps(user) + "\n"
            
        # Send batch to Elastic
        response = requests.post(f"{ELASTIC_URL}/_bulk", headers=HEADERS, data=bulk_data)
        
        if response.status_code == 200:
            res_json = response.json()
            if res_json.get("errors"):
                print(f"⚠️ Batch {i} to {i + current_batch_size - 1} completed with some errors.")
            else:
                successful_inserts += current_batch_size
                print(f"✅ Indexed users {i} to {i + current_batch_size - 1}...")
        else:
            print(f"❌ Failed to index batch {i}. Status: {response.status_code}, Error: {response.text}")
            
        # Small sleep to prevent overwhelming the cluster
        time.sleep(0.5)

    print(f"🎉 Job Complete! Successfully inserted {successful_inserts} users.")
    print("You can now log in using emails like user1@example.com and password: password123")

if __name__ == "__main__":
    main()
