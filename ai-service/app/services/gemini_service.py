import httpx
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"
GENERATION_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

_ANALYZE_PROMPT = """Ты финансовый эксперт из Казахстана. Проанализируй текст финансового договора.
Верни ТОЛЬКО JSON без markdown, без пояснений, только чистый JSON.

Текст:
{text}

Верни JSON в точно таком формате:
{{
  "realAnnualRate": "реальная годовая ставка",
  "advertisedRate": "рекламируемая ставка",
  "hiddenFees": ["список скрытых комиссий"],
  "penalties": ["список штрафов"],
  "redFlags": ["критические риски"],
  "monthlyPayment": "ежемесячный платёж если есть",
  "recommendation": "SIGN или DONT_SIGN или NEGOTIATE",
  "summary": "краткое объяснение на русском 2-3 предложения"
}}"""

_METADATA_PROMPT = """Ты юридический эксперт. Извлеки все структурированные метаданные из текста договора.
Верни ТОЛЬКО JSON без markdown, без пояснений, только чистый JSON.

Текст договора:
{text}

Верни JSON в точно таком формате (если поле не найдено — пустая строка или пустой массив):
{{
  "contractType": "тип договора (кредитный, трудовой, ГПХ, поставки, аренды и т.д.)",
  "contractNumber": "номер договора",
  "contractDate": "дата заключения",
  "validUntil": "срок действия / дата окончания",
  "subject": "предмет договора одним предложением",
  "totalAmount": "общая сумма договора с валютой",
  "currency": "валюта (KZT, USD, EUR...)",
  "parties": [
    {{
      "role": "роль стороны (Займодатель, Заёмщик, Заказчик, Исполнитель, Работодатель, Работник...)",
      "name": "полное наименование / ФИО",
      "bin_iin": "БИН или ИИН",
      "address": "юридический / фактический адрес",
      "iban": "IBAN / расчётный счёт",
      "bik": "БИК банка"
    }}
  ],
  "governingLaw": "применимое право / законодательство",
  "disputeResolution": "порядок разрешения споров",
  "terminationConditions": ["условие расторжения 1", "условие расторжения 2"],
  "specialConditions": ["особое условие 1", "особое условие 2"],
  "signatories": ["подписант 1 (должность ФИО)", "подписант 2"],
  "documentLanguage": "язык документа"
}}"""

_FALLBACK_METADATA = {
    "contractType": "Не удалось определить",
    "contractNumber": "",
    "contractDate": "",
    "validUntil": "",
    "subject": "Анализ временно недоступен",
    "totalAmount": "",
    "currency": "",
    "parties": [],
    "governingLaw": "",
    "disputeResolution": "",
    "terminationConditions": [],
    "specialConditions": [],
    "signatories": [],
    "documentLanguage": "",
}

_FALLBACK_ANALYSIS = {
    "realAnnualRate": "Не удалось определить",
    "advertisedRate": "Не удалось определить",
    "hiddenFees": ["Анализ временно недоступен"],
    "penalties": ["Анализ временно недоступен"],
    "redFlags": ["AI сервис недоступен"],
    "monthlyPayment": "Не удалось определить",
    "recommendation": "NEGOTIATE",
    "summary": "Не удалось выполнить анализ. Рекомендуем обратиться к финансовому консультанту.",
}


class GeminiService:

    async def get_embedding(self, text: str) -> list[float]:
        import asyncio
        url = f"{EMBEDDING_URL}?key={settings.gemini_api_key}"
        payload = {"content": {"parts": [{"text": text[:2000]}]}}
        for attempt in range(4):
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 429:
                    wait = 15 * (attempt + 1)
                    logger.warning("Gemini embedding 429, waiting %ds (attempt %d)", wait, attempt + 1)
                    await asyncio.sleep(wait)
                    continue
                resp.raise_for_status()
                return resp.json()["embedding"]["values"]
        raise RuntimeError("Gemini embedding rate limit exceeded after retries")

    async def analyze_document(self, text: str) -> dict:
        url = f"{GENERATION_URL}?key={settings.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": _ANALYZE_PROMPT.format(text=text[:6000])}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                return json.loads(clean)
        except Exception as e:
            logger.warning("Gemini analyze failed (%s), trying Groq fallback", type(e).__name__)
            return await self._analyze_with_groq(text)

    async def extract_metadata(self, text: str) -> dict:
        url = f"{GENERATION_URL}?key={settings.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": _METADATA_PROMPT.format(text=text[:8000])}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                return json.loads(clean)
        except Exception as e:
            logger.warning("Gemini metadata extraction failed (%s), trying Groq fallback", type(e).__name__)
            return await self._extract_metadata_with_groq(text)

    async def _extract_metadata_with_groq(self, text: str) -> dict:
        from app.core.config import settings as s
        url = "https://api.groq.com/openai/v1/chat/completions"
        prompt = _METADATA_PROMPT.format(text=text[:8000])
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "Ты юридический эксперт. Отвечай строго в JSON формате без markdown."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 2048,
        }
        headers = {"Authorization": f"Bearer {s.groq_api_key}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                raw = resp.json()["choices"][0]["message"]["content"]
                clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                return json.loads(clean)
        except Exception as e:
            logger.error("Groq metadata fallback also failed: %s", e)
            return _FALLBACK_METADATA

    async def _analyze_with_groq(self, text: str) -> dict:
        from app.core.config import settings as s
        url = "https://api.groq.com/openai/v1/chat/completions"
        prompt = _ANALYZE_PROMPT.format(text=text[:6000])
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "Ты финансовый эксперт. Отвечай строго в JSON формате без markdown."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 1024,
        }
        headers = {"Authorization": f"Bearer {s.groq_api_key}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                raw = resp.json()["choices"][0]["message"]["content"]
                clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                return json.loads(clean)
        except Exception as e:
            logger.error("Groq fallback also failed: %s", e)
            return _FALLBACK_ANALYSIS


    async def extract_criteria_values(self, text: str, criteria: list) -> list[dict]:
        criteria_list = "\n".join(f"- {c['label']} (тип: {c['type']})" for c in criteria)
        prompt = f"""Ты юридический эксперт. Извлеки значения для каждого критерия из текста договора.

Критерии:
{criteria_list}

Текст договора:
{text[:8000]}

Верни ТОЛЬКО JSON без markdown, без пояснений:
{{
  "values": [
    {{"label": "точное название критерия", "extracted_value": "значение из договора или 'Не указано'"}}
  ]
}}"""
        url = f"{GENERATION_URL}?key={settings.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
        }
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                data = json.loads(clean)
                return data.get("values", [])
        except Exception as e:
            logger.warning("Gemini criteria extraction failed (%s), trying Groq fallback", type(e).__name__)
            return await self._extract_criteria_with_groq(text, criteria)

    async def _extract_criteria_with_groq(self, text: str, criteria: list) -> list[dict]:
        from app.core.config import settings as s
        criteria_list = "\n".join(f"- {c['label']} (тип: {c['type']})" for c in criteria)
        prompt = f"""Извлеки значения для каждого критерия из текста договора.

Критерии:
{criteria_list}

Текст:
{text[:8000]}

Верни ТОЛЬКО JSON без markdown:
{{"values": [{{"label": "название", "extracted_value": "значение или Не указано"}}]}}"""
        url = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "Ты юридический эксперт. Отвечай строго в JSON формате."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 2048,
        }
        headers = {"Authorization": f"Bearer {s.groq_api_key}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                raw = resp.json()["choices"][0]["message"]["content"]
                clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                data = json.loads(clean)
                return data.get("values", [])
        except Exception as e:
            logger.error("Groq criteria fallback failed: %s", e)
            return [{"label": c["label"], "extracted_value": "Не удалось извлечь"} for c in criteria]


gemini_service = GeminiService()
