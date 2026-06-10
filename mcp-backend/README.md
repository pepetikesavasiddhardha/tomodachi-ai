# Tomodachi Elastic MCP Server

This folder contains a fully functional **Model Context Protocol (MCP)** server. It wraps your Elasticsearch database and exposes it as "Tools" (`search_companions` and `search_events`) that an AI Agent can use.

Because MCP clients (like LangChain or Vertex AI Reasoning Engine) need to communicate over HTTP in the cloud, this server uses **SSE (Server-Sent Events)** via Express.js.

## 🚀 How to Deploy to Google Cloud Run

Unlike the data seeding scripts which were Cloud Run *Jobs* (run once and stop), an MCP Server must be a Cloud Run *Service* (always listening for incoming HTTP requests from your Agent).

### Step 1: Authenticate
Open your terminal and ensure you are logged into GCP:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 2: Build and Deploy the Service
Navigate into this `mcp-backend` folder:
```bash
cd mcp-backend
```

Run the following command to build the container and deploy it as a web service. Replace the environment variables with your actual keys:

```bash
gcloud run deploy tomodachi-mcp-server \
  --source . \
  --clear-base-image \
  --set-env-vars ELASTIC_URL="https://YOUR_CLUSTER.es.us-central1.gcp.cloud.es.io" \
  --set-env-vars ELASTIC_API_KEY="your_base64_encoded_api_key" \
  --set-env-vars GEMINI_API_KEY="your_gemini_api_key" \
  --region us-central1 \
  --allow-unauthenticated
```

### Step 3: Get Your MCP Endpoint
Once the deployment finishes, the terminal will output a **Service URL** (e.g., `https://tomodachi-mcp-server-xyz.a.run.app`).

Your **MCP SSE Endpoint** that you will provide to your AI Agent (Vertex AI Reasoning Engine / LangChain) is that URL plus `/sse`.

**Example:**
`https://tomodachi-mcp-server-xyz.a.run.app/sse`

---

## How to use this with Vertex AI Reasoning Engine (Agent Builder)

When you write your Python code to deploy your Agent to GCP, you will connect to this MCP server like this:

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

# Connect to the Cloud Run MCP Server we just deployed
mcp_client = MultiServerMCPClient()
mcp_client.connect_sse("https://tomodachi-mcp-server-xyz.a.run.app/sse")

# Get the Elastic tools (search_companions, search_events)
elastic_tools = mcp_client.get_tools()

# Pass these tools to your Gemini Agent!
# agent = create_react_agent(llm, tools=elastic_tools)
```
