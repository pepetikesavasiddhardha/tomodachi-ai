# Hackathon Guide: GCP Agent Builder + Elastic MCP + Gemini

This is a fantastic hackathon stack! Using the **Model Context Protocol (MCP)** is the most modern way to build AI agents. 

Currently, your React app talks *directly* to Elasticsearch and Gemini. To meet the hackathon requirements, we need to change the architecture so that an **Agent** sits in the middle.

## 🏗️ The Target Architecture

1. **Frontend (React App):** The user types "Find me a gardening buddy."
2. **GCP Agent Builder (Vertex AI):** Receives the message. It uses **Gemini** to understand the intent.
3. **Elastic MCP Server:** The Agent realizes it needs to search the database. It uses the Elastic MCP Server as a "Tool" to perform a vector search.
4. **Elasticsearch:** Returns the matches to the MCP Server ➔ Agent ➔ Frontend.

---

## Step-by-Step Implementation Plan

I have generated the code for the **Elastic MCP Server** for you! It is located in the `mcp-backend/` folder in this repository.

### Phase 1: Deploy the Elastic MCP Server
1. Open your terminal and navigate to the `mcp-backend/` folder.
2. Read the `mcp-backend/README.md` file. It contains the exact `gcloud run deploy` command you need to host this MCP server on Google Cloud Run.
3. Once deployed, you will get an SSE URL (e.g., `https://tomodachi-mcp-server-xyz.a.run.app/sse`).

### Phase 2: Create the Agent in GCP (Vertex AI Reasoning Engine)
For this hackathon, the best way to combine Gemini + MCP is using **Vertex AI Reasoning Engine** (which uses LangChain under the hood).

1. **Write the Agent Code (Python):**
   You will write a Python script that initializes a Gemini model and connects to your hosted Elastic MCP Server.
   
   *Example Python pseudo-code for your Agent:*
   ```python
   from langchain_google_vertexai import ChatVertexAI
   from langchain_mcp_adapters.client import MultiServerMCPClient
   from langgraph.prebuilt import create_react_agent

   # 1. Initialize Gemini
   llm = ChatVertexAI(model="gemini-2.5-flash")

   # 2. Connect to your Elastic MCP Server (hosted on Cloud Run)
   mcp_client = MultiServerMCPClient()
   mcp_client.connect_sse("https://your-elastic-mcp-cloud-run-url.run.app/sse")
   
   # 3. Get the tools from Elastic (e.g., search_companions, search_events)
   elastic_tools = mcp_client.get_tools()

   # 4. Create the Agent
   agent = create_react_agent(llm, tools=elastic_tools)
   ```

2. **Deploy the Agent:**
   You deploy this Python code to **Vertex AI Reasoning Engine**. This gives you a secure, scalable REST API endpoint.

### Phase 3: Update the React Frontend (What I will do for you)
Once your Agent is deployed on Vertex AI, you will get an **Agent ID** (it looks like `projects/123/locations/us-central1/reasoningEngines/456`).

Once you have that ID, tell me! I will then modify this React app to:
1. Remove the direct Elasticsearch `fetch` calls.
2. Remove the direct Gemini `@google/genai` calls.
3. Replace them with a single call to your new GCP Agent endpoint.

---

## 🚀 Your Immediate Next Steps

To proceed with the hackathon requirements, you need to step away from this React codebase for a moment and build the backend.

**Do this now:**
1. Go to the `mcp-backend/` folder and deploy the MCP server to Cloud Run.
2. Look up documentation on **"Vertex AI Reasoning Engine LangChain MCP"**. Deploy your Gemini agent and connect it to the MCP server URL.
3. **Come back here** and give me the deployed **Reasoning Engine Agent ID**.

Once you give me the Agent ID, I will rewrite the React app's `services/elasticService.ts` to talk to your new Agent!
