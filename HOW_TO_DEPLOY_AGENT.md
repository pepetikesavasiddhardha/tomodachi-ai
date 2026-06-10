# Phase 2: Deploying the AI Agent to Vertex AI

Congratulations on deploying the Elastic MCP Server! 🎉

The next step is to create the "Brain" of your application: **The AI Agent**. 
We will use **Vertex AI Reasoning Engine** (GCP Agent Builder) to host a Python agent that uses Gemini and connects to your new MCP server.

I have created a new folder called `agent-backend` with the necessary Python code.

## Step 1: Prepare your Environment
Open your terminal and navigate to the new folder:
```bash
cd agent-backend
```

Install the required Python libraries on your local machine so we can run the deployment script:
```bash
pip install -r requirements.txt
```

## Step 2: Create a Cloud Storage Bucket
Vertex AI Reasoning Engine needs a Cloud Storage bucket to stage the code before deploying it. Run this command to create one (replace `YOUR_PROJECT_ID`):
```bash
gcloud storage buckets create gs://YOUR_PROJECT_ID-reasoning-engine --location=us-central1
```

## Step 3: Update the Deployment Script
Open the file `agent-backend/deploy.py` in your code editor.
You need to update three variables at the top of the file:
1. `PROJECT_ID`: Your Google Cloud Project ID.
2. `MCP_ENDPOINT`: The URL you got from Phase 1 (e.g., `https://tomodachi-mcp-server-xyz.a.run.app/sse`).

## Step 4: Deploy the Agent!
Run the deployment script:
```bash
python deploy.py
```

*(Note: This process takes about 5 to 10 minutes because Google Cloud is building a secure container for your agent).*

## Step 5: Get Your Agent ID
When the script finishes, it will print a success message with your **Agent ID** (also known as the `resource_name`). It will look something like this:
`projects/123456789/locations/us-central1/reasoningEngines/987654321`

---

### 🚨 WHAT TO DO NEXT:
**Copy that Agent ID and paste it in our chat!** 

Once you give me the Agent ID, I will rewrite the React frontend (`services/elasticService.ts` and `components/ChatInterface.tsx`) to stop talking to Elasticsearch directly, and instead route all chat messages and searches through your new Vertex AI Agent!
