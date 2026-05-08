from app.services.openai_service import openai_service


def get_embed_service():
    """OpenAI text-embedding-3-small — reads documents into ChromaDB."""
    return openai_service


def get_chat_service():
    """OpenAI gpt-4o-mini — chat responses."""
    return openai_service


def get_analyze_service():
    """OpenAI gpt-4o — document analysis, metadata, criteria extraction."""
    return openai_service
