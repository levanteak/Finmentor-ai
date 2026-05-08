import asyncio
from fastapi import APIRouter
from app.models.schemas import IndexRequest, IndexResponse, DeleteDocumentResponse, ExtractMetadataRequest, ExtractMetadataResponse
from app.services.chroma_service import chroma_service
from app.services.chunking_service import chunking_service
from app.services.llm_factory import get_embed_service, get_analyze_service

router = APIRouter()


@router.post("/documents/index", response_model=IndexResponse)
async def index_document(request: IndexRequest):
    embed_service = get_embed_service()
    chunks = chunking_service.chunk(request.text)
    if not chunks:
        return IndexResponse(chunks_indexed=0)
    embeddings = await asyncio.gather(*[embed_service.get_embedding(c) for c in chunks])
    embeddings = [e for e in embeddings if e]
    if not embeddings or len(embeddings) != len(chunks):
        return IndexResponse(chunks_indexed=0)
    chroma_service.add_user_chunks(
        document_id=request.document_id,
        user_id=request.user_id,
        chunks=chunks,
        embeddings=list(embeddings),
    )
    return IndexResponse(chunks_indexed=len(chunks))


@router.post("/documents/extract-metadata", response_model=ExtractMetadataResponse)
async def extract_metadata(request: ExtractMetadataRequest):
    metadata = await get_analyze_service().extract_metadata(request.text)
    return ExtractMetadataResponse(metadata=metadata)


@router.delete("/documents/{document_id}", response_model=DeleteDocumentResponse)
async def delete_document(document_id: int):
    chroma_service.delete_document(document_id)
    return DeleteDocumentResponse(deleted=True)
