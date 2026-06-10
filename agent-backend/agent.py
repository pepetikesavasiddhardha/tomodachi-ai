from typing import Dict, Any

class TomodachiAgent:
    """
    This is the AI Agent deployed to Vertex AI Reasoning Engine.
    It connects to the Elastic MCP Server to search for companions and events.
    """
    def __init__(self, project_id: str, location: str, mcp_url: str):
        self.project_id = project_id
        self.location = location
        self.mcp_url = mcp_url

    def set_up(self):
        """
        This method runs once when the Reasoning Engine container starts up.
        NOTE: Imports are placed inside the method to prevent Pickling errors during deployment.
        """
        import vertexai
        from langchain_google_vertexai import ChatVertexAI
        
        vertexai.init(project=self.project_id, location=self.location)
        # Initialize the Gemini model
        self.llm = ChatVertexAI(model_name="gemini-2.5-flash")

    async def query(self, input: str, user_profile: str = "") -> str:
        """
        This is the main entry point called by the React frontend.
        It is natively async to prevent event loop crashes in Reasoning Engine.
        """
        from langgraph.prebuilt import create_react_agent
        from mcp import ClientSession
        from mcp.client.sse import sse_client
        from langchain_mcp_adapters.tools import load_mcp_tools
        
        try:
            # 1. Connect to the Elastic MCP Server via SSE
            async with sse_client(self.mcp_url) as streams:
                async with ClientSession(streams[0], streams[1]) as session:
                    await session.initialize()
                    
                    # 2. Fetch the tools (search_companions, search_events) from Elastic
                    tools = await load_mcp_tools(session)
                    
                    # 3. Create the ReAct Agent with Gemini and the Elastic Tools
                    agent = create_react_agent(self.llm, tools=tools)
                    
                    # 4. Construct the prompt with the user's profile context
                    system_prompt = (
                        "You are Tomodachi AI, a gentle, patient, and empathetic social companion agent designed for older adults. "
                        "Your goal is to help them find local companions and events to reduce loneliness. "
                        "Always use the provided tools to search the database when the user asks for matches or events. "
                        f"Here is the user's profile context to help you search better: {user_profile}"
                    )
                    
                    messages = [
                        ("system", system_prompt),
                        ("user", input)
                    ]
                    
                    # 5. Invoke the agent and return the response
                    response = await agent.ainvoke({"messages": messages})
                    return response["messages"][-1].content
                    
        except Exception as e:
            print(f"Error during MCP query: {str(e)}")
            return f"I'm sorry, I encountered an error while trying to search: {str(e)}"
