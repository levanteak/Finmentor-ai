from app.core.config import settings
from app.services.openai_service import openai_service
from app.services.groq_service import groq_service
from app.services.gemini_service import gemini_service


def get_embed_service():
    """Returns embedding service. Gemini supports embeddings; Groq does not (falls back to OpenAI)."""
    if settings.llm_provider == "gemini" and settings.gemini_api_key:
        return gemini_service
    return openai_service


def get_chat_service():
    """Returns chat service based on LLM_PROVIDER env var."""
    if settings.llm_provider == "groq" and settings.groq_api_key:
        return groq_service
    if settings.llm_provider == "gemini" and settings.gemini_api_key:
        return gemini_service
    return openai_service


def get_analyze_service():
    """Returns analysis service. Gemini supported; Groq falls back to OpenAI (no JSON mode)."""
    if settings.llm_provider == "gemini" and settings.gemini_api_key:
        return gemini_service
    return openai_service
