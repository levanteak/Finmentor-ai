from typing import Optional
from pydantic import BaseModel


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class UserContext(BaseModel):
    user_id: int
    name: str
    employment_type: str
    total_income: float
    total_tax: float
    last_income_info: str


class ChatRequest(BaseModel):
    user_id: int
    message: str
    chat_history: list[ChatHistoryItem] = []
    user_context: UserContext


class ChatResponse(BaseModel):
    response: str
    rag_chunks_used: int = 0


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    analysis: dict


class IndexRequest(BaseModel):
    document_id: int
    user_id: int
    text: str


class IndexResponse(BaseModel):
    chunks_indexed: int


class DeleteDocumentResponse(BaseModel):
    deleted: bool


class LoadStaticResponse(BaseModel):
    documents_loaded: int
    chunks_indexed: int


class DatasetUploadResponse(BaseModel):
    source: str
    chunks_indexed: int


class DatasetListResponse(BaseModel):
    sources: list[str]


class ExtractMetadataRequest(BaseModel):
    text: str


class ExtractMetadataResponse(BaseModel):
    metadata: dict


class MatchTemplateRequest(BaseModel):
    document_text: str


class MatchTemplateResponse(BaseModel):
    source_key: Optional[str]
    confidence: float


class CriterionInput(BaseModel):
    label: str
    type: str  # "MANDATORY" | "ADDITIONAL"


class ExtractCriteriaRequest(BaseModel):
    document_text: str
    criteria: list[CriterionInput]


class ExtractedCriterion(BaseModel):
    label: str
    extracted_value: str


class ExtractCriteriaResponse(BaseModel):
    values: list[ExtractedCriterion]


class ClassifyContractRequest(BaseModel):
    document_text: str
    template_types: list[str]


class ClassifyContractResponse(BaseModel):
    matched_type: Optional[str]


class ExtractExtraFieldsRequest(BaseModel):
    document_text: str
    defined_labels: list[str]


class ExtraField(BaseModel):
    label: str
    value: str


class ExtractExtraFieldsResponse(BaseModel):
    fields: list[ExtraField]
