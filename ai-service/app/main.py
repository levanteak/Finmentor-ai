import logging
from fastapi import FastAPI
from app.api.routes import analyze, chat, documents, static_docs, admin, criteria

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="FinMentor AI Service", version="1.0.0")

app.include_router(analyze.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(static_docs.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(criteria.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "FinMentor AI Service"}
