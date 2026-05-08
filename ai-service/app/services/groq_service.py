import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

_SYSTEM_TEMPLATE = """Ты FinMentor — персональный AI финансовый советник для самозанятых в Казахстане.

ЯЗЫК: Всегда отвечай на том же языке, на котором задан вопрос.
Если вопрос на казахском — отвечай на казахском.
Если на русском — на русском. Если на английском — на английском.
Если вопрос на казахско-русском миксе — отвечай так же.

Профиль пользователя:
- Имя: {name}
- Тип занятости: {employment_type}
- Общий доход: {total_income:.0f} тг
- Общий налог: {total_tax:.0f} тг
- Чистый доход: {net_income:.0f} тг
- {last_income_info}

ВАЖНЫЕ ПРАВИЛА:
1. При вопросах о налогах используй точные ставки РК 2025-2026 (ИПН, ОПВ, ОСМС).
2. При вопросах о кредитах: НЕ ВЫДУМЫВАЙ конкретные ставки банков.
   Укажи реальный диапазон по рынку РК и посоветуй проверить на сайтах банков.
3. При расчёте аннуитетного платежа: M = P × (r × (1+r)^n) / ((1+r)^n - 1).
4. Давай конкретные цифры и практичные советы. Предупреждай о рисках.
{rag_section}"""


MAX_HISTORY_MESSAGES = 8
MAX_CHUNK_CHARS = 600


class GroqService:

    async def chat(
        self,
        user_context: dict,
        chat_history: list[dict],
        user_message: str,
        rag_chunks: list[str],
    ) -> str:
        rag_section = ""
        if rag_chunks:
            trimmed = [c[:MAX_CHUNK_CHARS] for c in rag_chunks]
            rag_section = "\n\nКОНТЕКСТ ИЗ ДОКУМЕНТОВ И БАЗЫ ЗНАНИЙ:\n"
            rag_section += "\n".join(f"---\n{c}" for c in trimmed)

        system_prompt = _SYSTEM_TEMPLATE.format(
            name=user_context.get("name", "Пользователь"),
            employment_type=user_context.get("employment_type", ""),
            total_income=float(user_context.get("total_income", 0)),
            total_tax=float(user_context.get("total_tax", 0)),
            net_income=float(user_context.get("total_income", 0)) - float(user_context.get("total_tax", 0)),
            last_income_info=user_context.get("last_income_info", "Данных о доходах нет"),
            rag_section=rag_section,
        )

        # Keep only the most recent messages to stay within token limits
        truncated_history = chat_history[-MAX_HISTORY_MESSAGES:]

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(truncated_history)
        messages.append({"role": "user", "content": user_message})

        headers = {
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": MODEL,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024,
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(GROQ_URL, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]


groq_service = GroqService()
