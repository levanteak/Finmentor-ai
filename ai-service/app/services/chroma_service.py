import chromadb
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class ChromaService:

    def __init__(self):
        self.client = chromadb.PersistentClient(path=settings.chroma_path)
        self.user_docs = self.client.get_or_create_collection(
            name="user_documents",
            metadata={"hnsw:space": "cosine"},
        )
        self.static_kb = self.client.get_or_create_collection(
            name="static_knowledge",
            metadata={"hnsw:space": "cosine"},
        )

    def add_user_chunks(
        self,
        document_id: int,
        user_id: int,
        chunks: list[str],
        embeddings: list[list[float]],
    ):
        if not chunks or not embeddings:
            logger.warning("Skipping upsert for document %d: empty chunks or embeddings", document_id)
            return
        ids = [f"doc_{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {"document_id": str(document_id), "user_id": str(user_id), "chunk_index": i}
            for i in range(len(chunks))
        ]
        self.user_docs.upsert(
            documents=chunks, embeddings=embeddings, metadatas=metadatas, ids=ids
        )
        logger.info("Indexed %d chunks for document %d", len(chunks), document_id)

    def search_user_docs(
        self, user_id: int, query_embedding: list[float], n_results: int = 5
    ) -> list[str]:
        try:
            result = self.user_docs.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where={"user_id": str(user_id)},
            )
            return result["documents"][0] if result["documents"] else []
        except Exception as e:
            logger.warning("User doc search error: %s", e)
            return []

    def search_static_kb(
        self, query_embedding: list[float], n_results: int = 3
    ) -> list[str]:
        try:
            if self.static_kb.count() == 0:
                return []
            result = self.static_kb.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
            )
            return result["documents"][0] if result["documents"] else []
        except Exception as e:
            logger.warning("Static KB search error: %s", e)
            return []

    def search_static_kb_with_source(
        self, query_embedding: list[float], n_results: int = 1
    ) -> list[tuple[str, float]]:
        """Returns list of (source_key, distance) for template matching."""
        try:
            if self.static_kb.count() == 0:
                return []
            result = self.static_kb.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=["metadatas", "distances"],
            )
            if not result["metadatas"] or not result["metadatas"][0]:
                return []
            return [
                (meta["source"], dist)
                for meta, dist in zip(result["metadatas"][0], result["distances"][0])
            ]
        except Exception as e:
            logger.warning("Static KB source search error: %s", e)
            return []

    def delete_document(self, document_id: int):
        self.user_docs.delete(where={"document_id": str(document_id)})
        logger.info("Deleted chunks for document %d", document_id)

    def add_static_chunks(
        self, chunks: list[str], embeddings: list[list[float]], source: str
    ):
        ids = [f"static_{source}_{i}" for i in range(len(chunks))]
        metadatas = [{"source": source, "chunk_index": i} for i in range(len(chunks))]
        self.static_kb.upsert(
            documents=chunks, embeddings=embeddings, metadatas=metadatas, ids=ids
        )
        logger.info("Indexed %d static chunks from %s", len(chunks), source)

    def count_static(self) -> int:
        return self.static_kb.count()

    def list_static_sources(self) -> list[str]:
        if self.static_kb.count() == 0:
            return []
        result = self.static_kb.get(include=["metadatas"])
        sources = list({m["source"] for m in result["metadatas"]})
        return sorted(sources)

    def delete_static_source(self, source: str):
        self.static_kb.delete(where={"source": source})
        logger.info("Deleted static chunks for source: %s", source)


chroma_service = ChromaService()
