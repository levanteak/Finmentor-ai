from fastapi import APIRouter
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.llm_factory import get_analyze_service

router = APIRouter()


@router.post("/documents/analyze", response_model=AnalyzeResponse)
async def analyze_document(request: AnalyzeRequest):
    analysis = await get_analyze_service().analyze_document(request.text)
    return AnalyzeResponse(analysis=analysis)
