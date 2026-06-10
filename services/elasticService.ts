import { Companion, Event, UserProfile } from '../types';
import { generateEmbedding } from './geminiService';
import { generateCompanions, generateEvents, generateUsers } from '../utils/dataGenerator';

// ============================================================================
// ELASTICSEARCH CONFIGURATION (SECURE ENVIRONMENT VARIABLES)
// ============================================================================

// 1. Try to get credentials from a bundler (Vite, Webpack, Next.js) if one is used
const getInjectedEnv = (baseKey: string) => {
    try {
        // Check Vite (import.meta.env)
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            const env = (import.meta as any).env;
            if (env[baseKey]) return env[baseKey];
            if (env[`VITE_${baseKey}`]) return env[`VITE_${baseKey}`];
        }
    } catch (e) {}
    try {
        // Check Node/Webpack/CRA (process.env)
        if (typeof process !== 'undefined' && process.env) {
            if (process.env[baseKey]) return process.env[baseKey];
            if (process.env[`REACT_APP_${baseKey}`]) return process.env[`REACT_APP_${baseKey}`];
        }
    } catch (e) {}
    return "";
};

let ENV_ELASTIC_URL = getInjectedEnv('ELASTIC_URL');
let ENV_ELASTIC_API_KEY = getInjectedEnv('ELASTIC_API_KEY');

// 2. Dynamically load from files for raw browser environments (No bundler)
export const initializeConfig = async () => {
    if (ENV_ELASTIC_URL && ENV_ELASTIC_API_KEY) return;
    
    try {
        const paths = ['./env.txt', 'env.txt', '/env.txt', '../env.txt', './.env', '.env', '/.env', '../.env'];
        
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const text = await response.text();
                    // Ensure we didn't just get the index.html fallback page
                    if (!text.trim().startsWith('<')) {
                        // Use \r?\n to handle both Windows and Unix line endings safely
                        const lines = text.split(/\r?\n/);
                        lines.forEach(line => {
                            const match = line.match(/^([^=]+)=(.*)$/);
                            if (match) {
                                const key = match[1].trim();
                                let val = match[2].trim();
                                // Remove quotes if present
                                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                                    val = val.slice(1, -1);
                                }
                                if (key === 'ELASTIC_URL' || key === 'VITE_ELASTIC_URL' || key === 'REACT_APP_ELASTIC_URL') {
                                    ENV_ELASTIC_URL = val;
                                }
                                if (key === 'ELASTIC_API_KEY' || key === 'VITE_ELASTIC_API_KEY' || key === 'REACT_APP_ELASTIC_API_KEY') {
                                    ENV_ELASTIC_API_KEY = val;
                                }
                            }
                        });
                        // If we found both, stop searching
                        if (ENV_ELASTIC_URL && ENV_ELASTIC_API_KEY) {
                            console.log(`✅ Successfully loaded credentials from ${path}`);
                            return; 
                        }
                    }
                }
            } catch (e) {
                // Ignore fetch error for this specific path and try the next one
            }
        }
        
        if (!ENV_ELASTIC_URL || !ENV_ELASTIC_API_KEY) {
            console.warn("⚠️ Could not find valid credentials in any .env or env.txt file.");
        }
    } catch (e) {
        console.warn("Could not load env files directly.");
    }
};

export const hasEnvCredentials = (): boolean => {
    return Boolean(ENV_ELASTIC_URL && ENV_ELASTIC_API_KEY);
};

let memoryUrl = '';
let memoryApiKey = '';

export const setElasticConfig = (url: string, apiKey: string) => {
    memoryUrl = url;
    memoryApiKey = apiKey;
    try {
        localStorage.setItem('ELASTIC_URL', url);
        localStorage.setItem('ELASTIC_API_KEY', apiKey);
    } catch (e) {
        console.warn("localStorage is not available in this environment.");
    }
};

export const getElasticConfig = () => {
    // 1. Prioritize Environment Variables (Seamless end-user experience)
    if (hasEnvCredentials()) {
        return { url: ENV_ELASTIC_URL, apiKey: ENV_ELASTIC_API_KEY };
    }

    // 2. Fallback to memory/localStorage (For local Admin/Dev setup if env vars aren't set)
    let url = memoryUrl;
    let apiKey = memoryApiKey;
    try {
        url = localStorage.getItem('ELASTIC_URL') || memoryUrl;
        apiKey = localStorage.getItem('ELASTIC_API_KEY') || memoryApiKey;
    } catch (e) {
        console.warn("localStorage is not available in this environment.");
    }
    return { url, apiKey };
};

const COMPANIONS_INDEX = 'tomodachi_companions';
const EVENTS_INDEX = 'tomodachi_events';
const USERS_INDEX = 'tomodachi_users';

// Helper to make authenticated requests to Elastic
const elasticFetch = async (path: string, options: RequestInit = {}) => {
    const { url, apiKey } = getElasticConfig();
    if (!url || !apiKey) {
        throw new Error("Elasticsearch credentials are missing. Please configure them in Dev Setup or set Environment Variables.");
    }

    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${apiKey}`,
        ...options.headers,
    };

    const response = await fetch(`${cleanUrl}${path}`, { ...options, headers });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Elasticsearch Error (${response.status}): ${errText}`);
    }
    
    return response.json();
};

// ============================================================================
// AUTHENTICATION & USER PROFILES
// ============================================================================

export const checkUserExists = async (email: string): Promise<boolean> => {
    const result = await elasticFetch(`/${USERS_INDEX}/_search`, {
        method: 'POST',
        body: JSON.stringify({
            query: { match: { "email.keyword": email } }
        })
    });
    return result.hits.hits.length > 0;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
    const result = await elasticFetch(`/${USERS_INDEX}/_search`, {
        method: 'POST',
        body: JSON.stringify({
            query: {
                bool: {
                    must: [
                        { match: { "email.keyword": email } },
                        { match: { "password.keyword": password } }
                    ]
                }
            }
        })
    });

    if (result.hits.hits.length > 0) {
        const user = result.hits.hits[0]._source;
        delete user.password; // Don't return password to frontend state
        return user as UserProfile;
    }
    throw new Error("Invalid email or password");
};

export const saveUser = async (profile: UserProfile, password?: string): Promise<void> => {
    if (!profile.email) throw new Error("Email is required to save user");

    // 1. Check if user exists to get their Elastic Document ID
    const searchRes = await elasticFetch(`/${USERS_INDEX}/_search`, {
        method: 'POST',
        body: JSON.stringify({ query: { match: { "email.keyword": profile.email } } })
    });

    let docId = '';
    let existingPassword = password;

    if (searchRes.hits.hits.length > 0) {
        docId = searchRes.hits.hits[0]._id;
        if (!password) {
            existingPassword = searchRes.hits.hits[0]._source.password;
        }
    }

    const docBody = { ...profile, password: existingPassword };

    if (docId) {
        // Update existing user
        await elasticFetch(`/${USERS_INDEX}/_doc/${docId}`, {
            method: 'PUT',
            body: JSON.stringify(docBody)
        });
    } else {
        // Create new user
        await elasticFetch(`/${USERS_INDEX}/_doc`, {
            method: 'POST',
            body: JSON.stringify(docBody)
        });
    }
};

// ============================================================================
// SEARCH FUNCTIONS (REAL kNN Vector Search with Fallback)
// ============================================================================

export const searchCompanions = async (profile: UserProfile): Promise<Companion[]> => {
    try {
        const queryText = profile.summary + " " + profile.interests.join(" ");
        const queryVector = await generateEmbedding(queryText);
        
        const searchBody = {
            knn: {
                field: "embedding",
                query_vector: queryVector,
                k: 12,
                num_candidates: 50
            },
            _source: ["id", "name", "age", "interests", "location", "imageUrl", "bio"]
        };

        const result = await elasticFetch(`/${COMPANIONS_INDEX}/_search`, {
            method: 'POST',
            body: JSON.stringify(searchBody)
        });

        if (result.hits && result.hits.hits && result.hits.hits.length > 0) {
            return result.hits.hits.map((hit: any) => ({
                ...hit._source,
                score: Math.round(hit._score * 100)
            }));
        }
    } catch (error) {
        console.warn("Vector search failed (likely missing embeddings). Falling back to standard search.", error);
    }

    // FALLBACK: If vector search fails (e.g. database wasn't re-seeded with vectors), return match_all
    console.log("Using fallback search for companions...");
    const fallbackResult = await elasticFetch(`/${COMPANIONS_INDEX}/_search`, {
        method: 'POST',
        body: JSON.stringify({
            query: { match_all: {} },
            size: 12,
            _source: ["id", "name", "age", "interests", "location", "imageUrl", "bio"]
        })
    });

    return fallbackResult.hits.hits.map((hit: any) => ({
        ...hit._source,
        score: 85 // Mock score for fallback
    }));
};

export const searchEvents = async (profile: UserProfile): Promise<Event[]> => {
    try {
        const queryText = profile.summary + " " + profile.interests.join(" ");
        const queryVector = await generateEmbedding(queryText);
        
        const searchBody = {
            knn: {
                field: "embedding",
                query_vector: queryVector,
                k: 8,
                num_candidates: 50
            },
            _source: ["id", "title", "date", "location", "attendees", "imageUrl", "description", "tags"]
        };

        const result = await elasticFetch(`/${EVENTS_INDEX}/_search`, {
            method: 'POST',
            body: JSON.stringify(searchBody)
        });

        if (result.hits && result.hits.hits && result.hits.hits.length > 0) {
            return result.hits.hits.map((hit: any) => ({
                ...hit._source,
                score: Math.round(hit._score * 100)
            }));
        }
    } catch (error) {
        console.warn("Vector search failed (likely missing embeddings). Falling back to standard search.", error);
    }

    // FALLBACK
    console.log("Using fallback search for events...");
    const fallbackResult = await elasticFetch(`/${EVENTS_INDEX}/_search`, {
        method: 'POST',
        body: JSON.stringify({
            query: { match_all: {} },
            size: 8,
            _source: ["id", "title", "date", "location", "attendees", "imageUrl", "description", "tags"]
        })
    });

    return fallbackResult.hits.hits.map((hit: any) => ({
        ...hit._source,
        score: 85 // Mock score for fallback
    }));
};

// ============================================================================
// CREATE EVENT (Index into Elastic)
// ============================================================================

export const createEvent = async (eventData: Omit<Event, 'id' | 'score'>): Promise<Event> => {
    const newEvent: Event = {
        ...eventData,
        id: `e_user_${Date.now()}`,
    };

    const textToEmbed = `${newEvent.title} ${newEvent.description} ${newEvent.tags.join(" ")} ${newEvent.location}`;
    const vector = await generateEmbedding(textToEmbed);

    await elasticFetch(`/${EVENTS_INDEX}/_doc/${newEvent.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...newEvent, embedding: vector })
    });
    
    console.log("Successfully indexed new event into Elastic Vector DB.");
    return newEvent;
};

// ============================================================================
// ADMIN / SETUP FUNCTIONS
// ============================================================================

export const setupElasticDatabase = async (
    onProgress: (msg: string) => void, 
    companionCount: number = 50, 
    eventCount: number = 20,
    userCount: number = 10
) => {
    const { url, apiKey } = getElasticConfig();
    if (!url || !apiKey) throw new Error("Please configure Elastic credentials first.");

    const createIndex = async (indexName: string, mappings: any) => {
        onProgress(`Creating index: ${indexName}...`);
        try {
            await elasticFetch(`/${indexName}`, { method: 'DELETE' }).catch(() => {});
            await elasticFetch(`/${indexName}`, {
                method: 'PUT',
                body: JSON.stringify({ mappings })
            });
        } catch (e: any) {
            onProgress(`Error creating index: ${e.message}`);
            throw e;
        }
    };

    const vectorMapping = {
        properties: {
            embedding: {
                type: "dense_vector",
                dims: 768,
                index: true,
                similarity: "cosine"
            }
        }
    };

    const userMapping = {
        properties: {
            email: { type: "keyword" },
            password: { type: "keyword" }
        }
    };

    await createIndex(COMPANIONS_INDEX, vectorMapping);
    await createIndex(EVENTS_INDEX, vectorMapping);
    await createIndex(USERS_INDEX, userMapping);

    const BATCH_SIZE = 50; 

    // 1. Seed Companions
    onProgress(`Generating ${companionCount} random companion profiles in memory...`);
    const generatedCompanions = generateCompanions(companionCount);
    
    onProgress(`Starting batch embedding and indexing for Companions...`);
    for (let i = 0; i < companionCount; i += BATCH_SIZE) {
        const batch = generatedCompanions.slice(i, i + BATCH_SIZE);
        let bulkCompanions = "";
        
        for (const comp of batch) {
            try {
                const textToEmbed = `${comp.bio} ${comp.interests.join(" ")} ${comp.location}`;
                const vector = await generateEmbedding(textToEmbed);
                bulkCompanions += JSON.stringify({ index: { _index: COMPANIONS_INDEX, _id: comp.id } }) + "\n";
                bulkCompanions += JSON.stringify({ ...comp, embedding: vector }) + "\n";
            } catch (err) {
                console.error("Failed to embed companion, skipping...", err);
            }
        }
        
        if (bulkCompanions) {
            await elasticFetch(`/_bulk`, { method: 'POST', body: bulkCompanions + "\n" });
        }
        
        onProgress(`Indexed ${Math.min(i + BATCH_SIZE, companionCount)} / ${companionCount} companions...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 2. Seed Events
    onProgress(`Generating ${eventCount} random events in memory...`);
    const generatedEvents = generateEvents(eventCount);

    onProgress(`Starting batch embedding and indexing for Events...`);
    for (let i = 0; i < eventCount; i += BATCH_SIZE) {
        const batch = generatedEvents.slice(i, i + BATCH_SIZE);
        let bulkEvents = "";
        
        for (const ev of batch) {
            try {
                const textToEmbed = `${ev.title} ${ev.description} ${ev.tags.join(" ")} ${ev.location}`;
                const vector = await generateEmbedding(textToEmbed);
                bulkEvents += JSON.stringify({ index: { _index: EVENTS_INDEX, _id: ev.id } }) + "\n";
                bulkEvents += JSON.stringify({ ...ev, embedding: vector }) + "\n";
            } catch (err) {
                console.error("Failed to embed event, skipping...", err);
            }
        }
        
        if (bulkEvents) {
            await elasticFetch(`/_bulk`, { method: 'POST', body: bulkEvents + "\n" });
        }
        
        onProgress(`Indexed ${Math.min(i + BATCH_SIZE, eventCount)} / ${eventCount} events...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 3. Seed Users (Logins)
    onProgress(`Generating ${userCount} random user accounts in memory...`);
    const generatedUsers = generateUsers(userCount);

    onProgress(`Starting indexing for Users...`);
    let bulkUsers = "";
    for (let i = 0; i < generatedUsers.length; i++) {
        const user = generatedUsers[i];
        const docId = `u_gen_${Date.now()}_${i}`;
        bulkUsers += JSON.stringify({ index: { _index: USERS_INDEX, _id: docId } }) + "\n";
        bulkUsers += JSON.stringify(user) + "\n";
    }

    if (bulkUsers) {
        await elasticFetch(`/_bulk`, { method: 'POST', body: bulkUsers + "\n" });
    }
    onProgress(`Indexed ${userCount} users (Login: user1@example.com / password123)...`);

    onProgress("✅ Elastic Database Setup Complete! Real dynamic data has been inserted.");
};
