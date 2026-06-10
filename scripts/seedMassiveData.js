/**
 * STANDALONE NODE.JS SCRIPT FOR MASSIVE DATA SEEDING (COMPANIONS & EVENTS)
 * 
 * This script generates dummy companions and events, uses Google Gemini to 
 * create vector embeddings, and bulk inserts them into Elasticsearch.
 */

import { GoogleGenAI } from '@google/genai';

// ==============================================================================
// CONFIGURATION
// ==============================================================================
const ELASTIC_URL = process.env.ELASTIC_URL;
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const COMPANION_COUNT = parseInt(process.env.COMPANION_COUNT || "1000", 10);
const EVENT_COUNT = parseInt(process.env.EVENT_COUNT || "500", 10);
const BATCH_SIZE = 50; // Keep batch size small to avoid Gemini 429 Rate Limits

const COMPANIONS_INDEX = 'tomodachi_companions';
const EVENTS_INDEX = 'tomodachi_events';

if (!ELASTIC_URL || !ELASTIC_API_KEY || !GEMINI_API_KEY) {
    console.error("❌ ERROR: ELASTIC_URL, ELASTIC_API_KEY, and GEMINI_API_KEY environment variables are required.");
    process.exit(1);
}

const cleanUrl = ELASTIC_URL.endsWith('/') ? ELASTIC_URL.slice(0, -1) : ELASTIC_URL;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY, vertexai: true });

// ==============================================================================
// DATA GENERATORS
// ==============================================================================
const firstNamesMale = ['Hiroshi', 'Kenji', 'Takashi', 'Akira', 'Taro', 'Jiro', 'Daiki', 'Ryota', 'Kenta', 'Satoshi'];
const firstNamesFemale = ['Yoko', 'Sakura', 'Mei', 'Keiko', 'Haruka', 'Yui', 'Naomi', 'Ayumi', 'Chloe', 'Elena'];
const lastNames = ['Tanaka', 'Sato', 'Watanabe', 'Garcia', 'Ito', 'Chen', 'Nakamura', 'Yamamoto', 'Lin', 'Smith'];
const locations = ['Shibuya, Tokyo', 'Kyoto', 'Shinjuku, Tokyo', 'Minato, Tokyo', 'Ueno, Tokyo', 'Yokohama', 'Osaka', 'Kobe', 'Fukuoka', 'Sapporo'];
const interestsList = ['Gardening', 'Chess', 'Slow Walks', 'Tea Ceremony', 'Temple Visits', 'Reading', 'Photography', 'Nature', 'Coffee', 'Cooking', 'Music', 'History', 'Museums', 'Tai Chi', 'Mahjong', 'Golf', 'Yoga'];
const eventAdjectives = ['Weekend', 'Morning', 'Evening', 'Beginner', 'Advanced', 'Community', 'Relaxing', 'Energetic', 'Social', 'Quiet'];
const eventNouns = ['Gathering', 'Club', 'Meetup', 'Class', 'Workshop', 'Tour', 'Session', 'Social', 'Excursion'];

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomItems = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

function generateCompanion(index) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale ? getRandomItem(firstNamesMale) : getRandomItem(firstNamesFemale);
    const lastName = getRandomItem(lastNames);
    const age = Math.floor(Math.random() * (90 - 60 + 1)) + 60;
    const location = getRandomItem(locations);
    const interests = getRandomItems(interestsList, Math.floor(Math.random() * 3) + 2);
    
    return {
        id: `c_gen_cloudrun_${Date.now()}_${index}`,
        name: `${firstName} ${lastName}`,
        age,
        interests,
        location,
        imageUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 10000)}`,
        bio: `I am a retired professional living in ${location}. I spend my days enjoying ${interests[0]} and ${interests[1]}. Looking for a friend to share these moments.`
    };
}

function generateEvent(index) {
    const interest = getRandomItem(interestsList);
    const adj = getRandomItem(eventAdjectives);
    const noun = getRandomItem(eventNouns);
    const location = getRandomItem(locations);
    const tags = getRandomItems(['Outdoors', 'Indoor', 'Social', 'Quiet', 'Active', 'Learning', 'Accessible'], 3);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const times = ['9:00 AM', '10:30 AM', '1:00 PM', '3:00 PM', '6:00 PM'];
    
    return {
        id: `e_gen_cloudrun_${Date.now()}_${index}`,
        title: `${adj} ${interest} ${noun}`,
        date: `Next ${getRandomItem(days)}, ${getRandomItem(times)}`,
        location,
        attendees: Math.floor(Math.random() * 25) + 3,
        imageUrl: `https://picsum.photos/400/200?random=${Math.floor(Math.random() * 10000)}`,
        description: `Join us in ${location} for a wonderful time focusing on ${interest}. This is a ${tags[0].toLowerCase()} event perfect for anyone looking to meet new people.`,
        tags: [interest, ...tags]
    };
}

// ==============================================================================
// ELASTICSEARCH HELPERS
// ==============================================================================
async function elasticFetch(path, options = {}) {
    const response = await fetch(`${cleanUrl}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${ELASTIC_API_KEY}`,
            ...options.headers,
        }
    });
    
    if (response.status === 404) {
        const err = await response.text();
        if (err.includes("Not Found")) {
            console.error("\n❌ CRITICAL ERROR: You provided the Kibana URL instead of the Elasticsearch URL!");
            console.error("Please update your Cloud Run job environment variables to use the Elasticsearch endpoint.");
            process.exit(1);
        }
    }
    
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Elastic Error: ${err}`);
    }
    return response.json();
}

async function createIndex(indexName) {
    console.log(`Checking/Creating index: ${indexName}...`);
    try {
        await elasticFetch(`/${indexName}`, { method: 'DELETE' }).catch(() => {});
        await elasticFetch(`/${indexName}`, {
            method: 'PUT',
            body: JSON.stringify({
                mappings: {
                    properties: {
                        embedding: {
                            type: "dense_vector",
                            dims: 768,
                            index: true,
                            similarity: "cosine"
                        }
                    }
                }
            })
        });
    } catch (e) {
        console.error(`Error creating index ${indexName}:`, e.message);
    }
}

// ==============================================================================
// MAIN EXECUTION
// ==============================================================================
async function run() {
    console.log(`🚀 Starting Cloud Run Job: Seeding ${COMPANION_COUNT} Companions and ${EVENT_COUNT} Events...`);
    
    await createIndex(COMPANIONS_INDEX);
    await createIndex(EVENTS_INDEX);

    // --- SEED COMPANIONS ---
    console.log(`\n--- Starting Companions Insertion ---`);
    for (let i = 0; i < COMPANION_COUNT; i += BATCH_SIZE) {
        let bulkData = "";
        const currentBatchSize = Math.min(BATCH_SIZE, COMPANION_COUNT - i);
        
        for (let j = 0; j < currentBatchSize; j++) {
            const comp = generateCompanion(i + j);
            const textToEmbed = `${comp.bio} ${comp.interests.join(" ")} ${comp.location}`;
            
            try {
                const response = await ai.models.embedContent({
                    model: 'text-embedding-004',
                    contents: textToEmbed,
                });
                const vector = response.embeddings[0].values;

                bulkData += JSON.stringify({ index: { _index: COMPANIONS_INDEX, _id: comp.id } }) + "\n";
                bulkData += JSON.stringify({ ...comp, embedding: vector }) + "\n";
            } catch (err) {
                console.error(`Failed to embed companion ${i+j}:`, err.message);
            }
        }

        if (bulkData) {
            await elasticFetch(`/_bulk`, { method: 'POST', body: bulkData + "\n" });
            console.log(`✅ Indexed companions ${i} to ${i + currentBatchSize - 1}...`);
        }
        
        // Sleep to respect Gemini API rate limits (429 Too Many Requests)
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // --- SEED EVENTS ---
    console.log(`\n--- Starting Events Insertion ---`);
    for (let i = 0; i < EVENT_COUNT; i += BATCH_SIZE) {
        let bulkData = "";
        const currentBatchSize = Math.min(BATCH_SIZE, EVENT_COUNT - i);
        
        for (let j = 0; j < currentBatchSize; j++) {
            const ev = generateEvent(i + j);
            const textToEmbed = `${ev.title} ${ev.description} ${ev.tags.join(" ")} ${ev.location}`;
            
            try {
                const response = await ai.models.embedContent({
                    model: 'text-embedding-004',
                    contents: textToEmbed,
                });
                const vector = response.embeddings[0].values;

                bulkData += JSON.stringify({ index: { _index: EVENTS_INDEX, _id: ev.id } }) + "\n";
                bulkData += JSON.stringify({ ...ev, embedding: vector }) + "\n";
            } catch (err) {
                console.error(`Failed to embed event ${i+j}:`, err.message);
            }
        }

        if (bulkData) {
            await elasticFetch(`/_bulk`, { method: 'POST', body: bulkData + "\n" });
            console.log(`✅ Indexed events ${i} to ${i + currentBatchSize - 1}...`);
        }
        
        // Sleep to respect Gemini API rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log("\n🎉 Job Complete! Successfully inserted all vector data.");
}

run().catch(console.error);
