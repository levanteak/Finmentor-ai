import asyncio
from pathlib import Path
from fastapi import APIRouter
from app.models.schemas import LoadStaticResponse
from app.services.chroma_service import chroma_service
from app.services.chunking_service import chunking_service
from app.services.llm_factory import get_embed_service

router = APIRouter()

STATIC_DOCS_DIR = Path(__file__).parent.parent.parent.parent / "static_docs"


@router.post("/static/load", response_model=LoadStaticResponse)
async def load_static_docs():
    total_docs = 0
    total_chunks = 0

    embed_service = get_embed_service()
    for doc_file in STATIC_DOCS_DIR.glob("*.txt"):
        text = doc_file.read_text(encoding="utf-8")
        chunks = chunking_service.chunk(text)
        embeddings = await asyncio.gather(*[embed_service.get_embedding(c) for c in chunks])
        chroma_service.add_static_chunks(list(chunks), list(embeddings), doc_file.stem)
        total_docs += 1
        total_chunks += len(chunks)

    return LoadStaticResponse(documents_loaded=total_docs, chunks_indexed=total_chunks)


@router.get("/static/count")
async def count_static():
    return {"count": chroma_service.count_static()}
