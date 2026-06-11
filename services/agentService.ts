import { Companion, Event, UserProfile } from '../types';

// ============================================================================
// GCP REASONING ENGINE (AGENT BUILDER) INTEGRATION
// ============================================================================

const getInjectedEnv = (baseKey: string) => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            const env = (import.meta as any).env;
            if (env[baseKey]) return String(env[baseKey]).trim();
            if (env[`VITE_${baseKey}`]) return String(env[`VITE_${baseKey}`]).trim();
            if (env[`REACT_APP_${baseKey}`]) return String(env[`REACT_APP_${baseKey}`]).trim();
        }
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env) {
            if (process.env[baseKey]) return String(process.env[baseKey]).trim();
            if (process.env[`VITE_${baseKey}`]) return String(process.env[`VITE_${baseKey}`]).trim();
            if (process.env[`REACT_APP_${baseKey}`]) return String(process.env[`REACT_APP_${baseKey}`]).trim();
        }
    } catch (e) {}
    return "";
};

let ENV_AGENT_ID = getInjectedEnv('AGENT_ID');
let ENV_GCP_TOKEN = getInjectedEnv('GCP_TOKEN'); // Added for authentication

export const initializeAgentConfig = async () => {
    if (ENV_AGENT_ID && ENV_GCP_TOKEN) return;
    
    try {
        const paths = ['./env.txt', 'env.txt', '/env.txt', './.env', '.env', '/.env'];
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const text = await response.text();
                    if (!text.trim().startsWith('<')) {
                        const lines = text.split(/\r?\n/);
                        lines.forEach(line => {
                            const match = line.match(/^([^=]+)=(.*)$/);
                            if (match) {
                                const key = match[1].trim();
                                let val = match[2].trim();
                                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                                    val = val.slice(1, -1);
                                }
                                if (key === 'AGENT_ID' || key === 'VITE_AGENT_ID' || key === 'REACT_APP_AGENT_ID') {
                                    ENV_AGENT_ID = val;
                                }
                                if (key === 'GCP_TOKEN' || key === 'VITE_GCP_TOKEN' || key === 'REACT_APP_GCP_TOKEN') {
                                    ENV_GCP_TOKEN = val;
                                }
                            }
                        });
                        if (ENV_AGENT_ID) {
                            console.log(`✅ Successfully loaded AGENT_ID from ${path}`);
                            return; 
                        }
                    }
                }
            } catch (e) {}
        }
    } catch (e) {
        console.warn("Could not load env files directly for Agent ID.");
    }
};

export const hasAgentId = (): boolean => {
    if (!ENV_AGENT_ID) return false;

    try {
        parseAgentId(ENV_AGENT_ID);
        return true;
    } catch (e) {
        console.warn('AGENT_ID is not a valid Reasoning Engine resource path; falling back to the standard search path.', e);
        return false;
    }
};

const parseAgentId = (agentId: string) => {
    const parts = agentId.split('/');
    if (parts.length !== 6) {
        throw new Error("Invalid Agent ID format. Expected: projects/{project_id}/locations/{location_id}/reasoningEngines/{agent_id}");
    }
    return {
        locationId: parts[3],
        name: agentId
    };
};

// Helper to get headers with authentication
const getAuthHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    if (ENV_GCP_TOKEN) {
        headers['Authorization'] = `Bearer ${ENV_GCP_TOKEN}`;
    }
    return headers;
};

// Step 1: Create a Session
export const createAgentSession = async (userId: string): Promise<string> => {
    if (!ENV_AGENT_ID) throw new Error("AGENT_ID is not configured.");
    
    const { locationId, name } = parseAgentId(ENV_AGENT_ID);
    const url = `https://${locationId}-aiplatform.googleapis.com/v1/${name}:query`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            input: { user_id: userId },
            classMethod: 'async_create_session'
        })
    });
    
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to create agent session: ${err}`);
    }
    
    const data = await response.json();
    return data.output.id;
};

// Step 2: Stream Query (Chat)
export const streamAgentMessage = async function* (sessionId: string, userId: string, message: string) {
    const { locationId, name } = parseAgentId(ENV_AGENT_ID);
    const url = `https://${locationId}-aiplatform.googleapis.com/v1/${name}:streamQuery`;

    const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            input: { user_id: userId, session_id: sessionId, message: message },
            classMethod: 'async_stream_query'
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to stream agent message: ${err}`);
    }

    const decoder = new TextDecoder();
    // @ts-ignore - TS might complain about response.body async iteration, but it's supported in modern browsers
    for await (const chunk of response.body) {
        const chunkText = decoder.decode(chunk, { stream: true });
        
        // The chunk might contain multiple JSON objects separated by newlines
        const lines = chunkText.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.content && parsed.content.parts && parsed.content.parts.length > 0) {
                    yield parsed.content.parts[0].text;
                }
            } catch (e) {
                // Ignore parse errors for partial chunks
            }
        }
    }
};

// Step 3: Fetch Matches via Agent (Using MCP Tools)
export const getMatchesViaAgent = async (profile: UserProfile, sessionId: string): Promise<{ companions: Companion[], events: Event[] }> => {
    // We send a highly explicit system command to force the agent to use the tools and return JSON.
    const prompt = `SYSTEM COMMAND: You MUST use the 'search_companions' and 'search_events' tools to find matches for a user who lives in ${profile.location || 'Tokyo'} and likes ${profile.interests.join(', ')}. 
    After using the tools, return ONLY a raw JSON object containing the results. Do not use markdown formatting. Do not include conversational text.
    Format exactly like this: {"companions": [...], "events": [...]}`;
    
    let fullResponse = "";
    for await (const chunk of streamAgentMessage(sessionId, profile.email || 'default', prompt)) {
        fullResponse += chunk;
    }

    try {
        // Clean up potential markdown code blocks the LLM might add
        const cleaned = fullResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        
        // Ensure arrays exist even if LLM hallucinates
        return {
            companions: parsed.companions || [],
            events: parsed.events || []
        };
    } catch (e) {
        console.error("Failed to parse agent JSON response:", fullResponse);
        throw new Error("Agent did not return valid JSON matches.");
    }
};
