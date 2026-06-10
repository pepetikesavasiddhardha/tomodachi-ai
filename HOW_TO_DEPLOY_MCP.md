# How to Deploy the Elastic MCP Server to Google Cloud Run

## 🚨 FIXING THE "Missing required argument [--clear-base-image]" ERROR
If you received the error `Base image is not supported for services built from Dockerfile`, it means Google Cloud CLI requires an explicit flag to clear any previous buildpack base images when deploying from a Dockerfile. We have added the `--clear-base-image` flag to the command below to fix this!

---

## 🤔 WHY ARE WE HOSTING AN MCP SERVER?

**Q: What is the purpose of hosting this MCP server?**

**A: It acts as a "Universal Translator" between your AI Agent and your Elasticsearch database.**

In a standard app, your React frontend talks directly to your database. But in an **Agentic AI** architecture (which is required for this hackathon), the flow changes:

1. The user talks to an **AI Agent** (hosted on GCP Agent Builder).
2. The AI Agent needs to search for companions or events. But AI models don't natively know how to write Elasticsearch queries.
3. This is where **MCP (Model Context Protocol)** comes in. The MCP Server wraps your Elasticsearch database and turns it into a set of simple "Tools" (e.g., `search_companions`).
4. The AI Agent asks the MCP Server: *"Hey, use the search_companions tool to find people who like gardening."*
5. The MCP Server translates that into a complex Vector Search, queries Elasticsearch, and hands the results back to the AI Agent.

Because your AI Agent lives in the cloud (GCP), your MCP Server also needs to live in the cloud so the Agent can reach it. That is why we deploy it to Google Cloud Run!

---

Follow these exact steps in your computer's terminal (command prompt):

### Step 1: Open your Terminal and Authenticate
Make sure you have the Google Cloud CLI (`gcloud`) installed. Open your terminal and run:
```bash
gcloud auth login
```
*(This will open a browser window for you to log into your Google account).*

### Step 2: Set your GCP Project
Tell `gcloud` which project to use. Replace `YOUR_PROJECT_ID` with your actual Google Cloud Project ID:
```bash
gcloud config set project YOUR_PROJECT_ID
```

### Step 3: Enable Cloud Run
Ensure the Cloud Run API is enabled for your project:
```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### Step 4: Navigate to the MCP Folder
In your terminal, change directories into the `mcp-backend` folder where your server code lives:
```bash
cd mcp-backend
```

### Step 5: Build the Docker Container Explicitly
Run this command to force Google Cloud to build the image using our Dockerfile:
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/tomodachi-mcp-server .
```
*(Wait a minute or two for this to finish and say "SUCCESS").*

### Step 6: Deploy the Container to Cloud Run!
Now, deploy the image you just built. **Before you press Enter, replace the placeholder values inside the quotes with your actual keys!**

```bash
gcloud run deploy tomodachi-mcp-server \
  --image gcr.io/YOUR_PROJECT_ID/tomodachi-mcp-server \
  --port 8080 \
  --clear-base-image \
  --set-env-vars ELASTIC_URL="https://your-cluster.es.us-central1.gcp.cloud.es.io" \
  --set-env-vars ELASTIC_API_KEY="your_base64_encoded_api_key" \
  --set-env-vars GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE" \
  --region us-central1 \
  --allow-unauthenticated
```

### Step 7: Get Your MCP Endpoint URL
Once the deployment finishes, the terminal will print out a **Service URL**. It will look something like this:
`https://tomodachi-mcp-server-xyz.a.run.app`

**Your final MCP SSE Endpoint is that URL with `/sse` added to the end.**

**Example:**
`https://tomodachi-mcp-server-xyz.a.run.app/sse`

---

### What's Next?
Now that your MCP Server is hosted, you can build your AI Agent (using Python, LangChain, and Vertex AI Reasoning Engine). 

When your Python Agent code asks for the MCP server URL, you will give it the `.../sse` URL you just generated!
