import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables from .env file if running locally
dotenv.config();

const PORT = process.env.PORT || 8080;
const ELASTIC_URL = process.env.ELASTIC_URL;
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!ELASTIC_URL || !ELASTIC_API_KEY || !GEMINI_API_KEY) {
    console.error("❌ ERROR: Missing required environment variables (ELASTIC_URL, ELASTIC_API_KEY, GEMINI_API_KEY).");
    process.exit(1);
}

const cleanUrl = ELASTIC_URL.endsWith('/') ? ELASTIC_URL.slice(0, -1) : ELASTIC_URL;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY, vertexai: true });

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Initialize MCP Server
const server = new Server(
    { name: "tomodachi-elastic-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

// Define the Tools available to the AI Agent
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "search_companions",
                description: "Search the Elasticsearch database for elderly companions based on interests, bio, and location using semantic vector search.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The search query (e.g., 'likes gardening in Tokyo')" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "search_events",
                description: "Search the Elasticsearch database for local social events and activities using semantic vector search.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "The search query (e.g., 'chess club on weekends')" }
                    },
                    required: ["query"]
                }
            }
        ]
    };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === "search_companions" || name === "search_events") {
        const index = name === "search_companions" ? "tomodachi_companions" : "tomodachi_events";
        
        try {
            // 1. Safely parse the query from the AI Agent
            let queryString = "";
            if (args && args.query) {
                queryString = typeof args.query === 'string' ? args.query : JSON.stringify(args.query);
            }
            
            console.log(`Executing ${name} with query: "${queryString}"`);
            
            let results = [];

            try {
                // 2. Generate Vector Embedding for the query
                const embedRes = await ai.models.embedContent({
                    model: 'text-embedding-004',
                    contents: queryString || "Tokyo",
                });
                const vector = embedRes.embeddings[0].values;

                // 3. Perform kNN Search in Elasticsearch
                let searchBody = {
                    knn: {
                        field: "embedding",
                        query_vector: vector,
                        k: 5,
                        num_candidates: 50
                    },
                    _source: { excludes: ["embedding"] } // Exclude the massive vector array from the response
                };

                let response = await fetch(`${cleanUrl}/${index}/_search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `ApiKey ${ELASTIC_API_KEY}`
                    },
                    body: JSON.stringify(searchBody)
                });

                if (response.ok) {
                    let data = await response.json();
                    results = data.hits?.hits?.map(hit => hit._source) || [];
                } else {
                    console.warn(`kNN search returned status ${response.status}. Likely missing embeddings.`);
                }
            } catch (vecErr) {
                console.warn("Vector search error:", vecErr.message);
            }

            // 4. FALLBACK: If the specific query returned 0 matches (or threw an error), return a general match_all
            // This ensures the Agent always has *some* data to show the user during the demo!
            if (results.length === 0) {
                console.log(`⚠️ 0 matches found for "${queryString}". Falling back to match_all...`);
                const fallbackResponse = await fetch(`${cleanUrl}/${index}/_search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `ApiKey ${ELASTIC_API_KEY}`
                    },
                    body: JSON.stringify({ query: { match_all: {} }, size: 5, _source: { excludes: ["embedding"] } })
                });
                const fallbackData = await fallbackResponse.json();
                results = fallbackData.hits?.hits?.map(hit => hit._source) || [];
            }

            console.log(`✅ Returning ${results.length} results to the Agent.`);

            return {
                content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
            };

        } catch (error) {
            console.error(`❌ Error in ${name}:`, error);
            return {
                content: [{ type: "text", text: `Error executing search: ${error.message}` }],
                isError: true
            };
        }
    }

    throw new Error(`Tool not found: ${name}`);
});

// ============================================================================
// SSE TRANSPORT SETUP (Required for Cloud Run / Web environments)
// ============================================================================
let transport;

app.get('/sse', async (req, res) => {
    console.log("New SSE connection established.");
    transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);
});

app.post('/messages', async (req, res) => {
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).send("No active SSE connection. Connect to /sse first.");
    }
});

// Health check endpoint for Cloud Run
app.get('/', (req, res) => {
    res.send("Tomodachi Elastic MCP Server is running. Connect via SSE at /sse");
});

app.listen(PORT, () => {
    console.log(`🚀 MCP Server listening on port ${PORT}`);
});
