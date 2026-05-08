import logging
from fastapi import APIRouter
from app.models.schemas import (
    MatchTemplateRequest, MatchTemplateResponse,
    ExtractCriteriaRequest, ExtractCriteriaResponse, ExtractedCriterion,
    ClassifyContractRequest, ClassifyContractResponse,
    ExtractExtraFieldsRequest, ExtractExtraFieldsResponse, ExtraField,
)
from app.services.chroma_service import chroma_service
from app.services.llm_factory import get_embed_service, get_analyze_service

router = APIRouter()
logger = logging.getLogger(__name__)

MIN_CONFIDENCE = 0.55


@router.post("/match-template", response_model=MatchTemplateResponse)
async def match_template(request: MatchTemplateRequest):
    embed_service = get_embed_service()
    embedding = await embed_service.get_embedding(request.document_text[:2000])
    results = chroma_service.search_static_kb_with_source(embedding, n_results=1)
    if not results:
        return MatchTemplateResponse(source_key=None, confidence=0.0)
    source_key, distance = results[0]
    confidence = round(max(0.0, 1.0 - distance), 3)
    logger.info("Template candidate: source=%s confidence=%.3f", source_key, confidence)
    if confidence < MIN_CONFIDENCE:
        logger.info("Confidence %.3f below threshold %.2f — no match returned", confidence, MIN_CONFIDENCE)
        return MatchTemplateResponse(source_key=None, confidence=confidence)
    return MatchTemplateResponse(source_key=source_key, confidence=confidence)


@router.post("/classify-contract-type", response_model=ClassifyContractResponse)
async def classify_contract_type(request: ClassifyContractRequest):
    analyze_service = get_analyze_service()
    matched = await analyze_service.classify_contract_type(
        request.document_text, request.template_types
    )
    logger.info("Contract classified as: %s", matched)
    return ClassifyContractResponse(matched_type=matched)


@router.post("/extract-criteria-values", response_model=ExtractCriteriaResponse)
async def extract_criteria_values(request: ExtractCriteriaRequest):
    analyze_service = get_analyze_service()
    logger.info("extract_criteria_values: text_len=%d criteria=%s",
                len(request.document_text), [c.label for c in request.criteria])
    logger.info("text_preview: %r", request.document_text[:400])
    raw_values = await analyze_service.extract_criteria_values(
        request.document_text,
        [c.model_dump() for c in request.criteria],
    )
    logger.info("raw LLM result: %s", raw_values)
    values = [ExtractedCriterion(**v) for v in raw_values]
    return ExtractCriteriaResponse(values=values)


@router.post("/extract-extra-fields", response_model=ExtractExtraFieldsResponse)
async def extract_extra_fields(request: ExtractExtraFieldsRequest):
    analyze_service = get_analyze_service()
    logger.info("extract_extra_fields: text_len=%d defined_labels=%s",
                len(request.document_text), request.defined_labels)
    raw_fields = await analyze_service.extract_extra_fields(
        request.document_text, request.defined_labels
    )
    logger.info("extra_fields found: %d", len(raw_fields))
    fields = [ExtraField(**f) for f in raw_fields]
    return ExtractExtraFieldsResponse(fields=fields)
