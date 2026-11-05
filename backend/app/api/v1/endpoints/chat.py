from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.retention_agent import get_retention_agent

router = APIRouter()


@router.post("", response_model=ChatResponse)
async def converse_with_retention_agent(request: ChatRequest):
    """
    Executes conversational turn with the Autonomous Retention Agent.
    Evaluates customer sentiment, cross-references churn probability,
    and dynamically activates retention playbooks (e.g. fee waivers, rate discounts).
    """
    try:
        agent = get_retention_agent()
        response = agent.process(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
