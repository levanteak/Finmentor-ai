import logging
from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chroma_service import chroma_service
from app.services.llm_factory import get_chat_service, get_embed_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    embed_service = get_embed_service()
    query_embedding = await embed_service.get_embedding(request.message)

    user_chunks = chroma_service.search_user_docs(request.user_id, query_embedding, n_results=3)
    static_chunks = chroma_service.search_static_kb(query_embedding, n_results=2)
    rag_chunks = user_chunks + static_chunks

    logger.info("RAG retrieved %d chunks (%d user + %d static) for: '%s'",
                len(rag_chunks), len(user_chunks), len(static_chunks), request.message[:60])
    for i, chunk in enumerate(rag_chunks):
        logger.info("  chunk[%d]: %s", i, chunk[:100].replace("\n", " "))

    chat_service = get_chat_service()
    logger.info("Using chat provider: %s", type(chat_service).__name__)

    history = [{"role": h.role, "content": h.content} for h in request.chat_history]
    user_context = request.user_context.model_dump()

    response = await chat_service.chat(user_context, history, request.message, rag_chunks)
    return ChatResponse(response=response)
