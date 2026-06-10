import os
from pathlib import Path
from dotenv import load_dotenv
import vertexai
from vertexai.preview import reasoning_engines
from agent import TomodachiAgent

# ==============================================================================
# CONFIGURATION - UPDATE THESE VALUES BEFORE RUNNING!
# ==============================================================================
# ==============================================================================
# 1. LOAD ENVIRONMENT VARIABLES FROM ROOT .env FILE
# ==============================================================================
# This dynamically finds the .env file in the parent directory (the root of your project)
# so you don't need to maintain two separate .env files.
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

PROJECT_ID = os.getenv("PROJECT_ID")
LOCATION = os.getenv("LOCATION")
MCP_URL = os.getenv("MCP_URL")

if not PROJECT_ID or not LOCATION or not MCP_URL:
    raise ValueError(
        "❌ Missing PROJECT_ID, LOCATION, or MCP_URL in the root .env file!\n"
        "Please open the .env file in the root of your project and add them."
    )

print(f"Initializing deployment for project: {PROJECT_ID} in {LOCATION}")
print(f"Connecting to MCP Server at: {MCP_URL}")

# ==============================================================================
# DEPLOYMENT SCRIPT
# ==============================================================================
def deploy():
    print(f"Initializing Vertex AI in project {PROJECT_ID}...")
    
    # The staging bucket is required by Reasoning Engine to upload the code
    staging_bucket = f"gs://{PROJECT_ID}-reasoning-engine"
    vertexai.init(project=PROJECT_ID, location=LOCATION, staging_bucket=staging_bucket)

    # Initialize the agent locally
    agent = TomodachiAgent(project_id=PROJECT_ID, location=LOCATION, mcp_url=MCP_URL)

    print("Deploying Agent to Vertex AI Reasoning Engine...")
    print("This process usually takes 5 to 10 minutes. Please wait...")
    
    # Create the Reasoning Engine
    remote_agent = reasoning_engines.ReasoningEngine.create(
        agent,
        requirements=[
            "google-cloud-aiplatform[reasoningengine]",
            "langchain",
            "langchain-google-vertexai",
            "langgraph",
            "langchain-mcp-adapters",
            "mcp",
            "httpx",
            "sse-starlette",
             "google-cloud-aiplatform[agent_engines]"
        ],
        # CRITICAL FIX: We must explicitly tell Reasoning Engine to package our local agent.py file
        extra_packages=["agent.py"],
        display_name="Tomodachi-MCP-Agent",
    )

    print("\n============================================================")
    print("✅ DEPLOYMENT COMPLETE!")
    print("============================================================")
    print("Please copy the Agent ID below and provide it to the AI Assistant")
    print("so it can update your React frontend code:")
    print(f"\nAGENT ID: {remote_agent.resource_name}\n")
    print("============================================================")

if __name__ == "__main__":
    deploy()
