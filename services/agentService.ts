import { Companion, Event, UserProfile } from '../types';

// ============================================================================
// GCP REASONING ENGINE (AGENT BUILDER) INTEGRATION
// ============================================================================

const getInjectedEnv = (baseKey: string) => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            const env = (import.meta as any).env;
            if (env[baseKey]) return env[baseKey];
            if (env[`VITE_${baseKey}`]) return env[`VITE_${baseKey}`];
        }
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env) {
            if (process.env[baseKey]) return process.env[baseKey];
            if (process.env[`REACT_APP_${baseKey}`]) return process.env[`REACT_APP_${baseKey}`];
        }
    } catch (e) {}
    return "";
};

let ENV_AGENT_ID = getInjectedEnv('AGENT_ID');

export const initializeAgentConfig = async () => {
    if (ENV_AGENT_ID) return;
    
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
    return Boolean(ENV_AGENT_ID);
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

// Step 1: Create a Session
export const createAgentSession = async (userId: string): Promise<string> => {
    if (!ENV_AGENT_ID) throw new Error("AGENT_ID is not configured.");
    
    const { locationId, name } = parseAgentId(ENV_AGENT_ID);
    const url = `https://${locationId}-aiplatform.googleapis.com/v1/${name}:query`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
    // We send a hidden system command to the agent, asking it to use its MCP tools to fetch data and return raw JSON.
    const prompt = `SYSTEM COMMAND: Use your tools to search for companions and events matching these interests: ${profile.interests.join(', ')} in ${profile.location}. Return ONLY a raw JSON object with no markdown formatting. Format: {"companions": [...], "events": [...]}`;
    
    let fullResponse = "";
    for await (const chunk of streamAgentMessage(sessionId, profile.email || 'default', prompt)) {
        fullResponse += chunk;
    }

    try {
        // Clean up potential markdown code blocks the LLM might add
        const cleaned = fullResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse agent JSON response:", fullResponse);
        throw new Error("Agent did not return valid JSON matches.");
    }
};
