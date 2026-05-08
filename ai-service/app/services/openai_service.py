import json
import logging
from typing import Optional
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

EMBED_MODEL = "text-embedding-3-small"
CHAT_MODEL = "gpt-4o-mini"
ANALYZE_MODEL = "gpt-4o"

_CHAT_SYSTEM = """Ты FinMentor — персональный AI финансовый советник для самозанятых в Казахстане.

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
      "role": "роль стороны",
      "name": "полное наименование / ФИО",
      "bin_iin": "БИН или ИИН",
      "address": "юридический / фактический адрес",
      "iban": "IBAN / расчётный счёт",
      "bik": "БИК банка"
    }}
  ],
  "governingLaw": "применимое право / законодательство",
  "disputeResolution": "порядок разрешения споров",
  "terminationConditions": ["условие расторжения 1"],
  "specialConditions": ["особое условие 1"],
  "signatories": ["подписант 1"],
  "documentLanguage": "язык документа"
}}"""

_CRITERIA_PROMPT = """Ты юридический эксперт. Извлеки значения для каждого критерия из текста договора.

Критерии:
{criteria_list}

Текст договора:
{text}

Верни ТОЛЬКО JSON без markdown:
{{
  "values": [
    {{"label": "точное название критерия", "extracted_value": "значение из договора или 'Не указано'"}}
  ]
}}"""

_EXTRA_FIELDS_PROMPT = """Ты юридический эксперт. В тексте договора найди важные поля и значения, которых НЕТ в уже известных критериях.

Уже извлечённые критерии (НЕ дублируй их):
{defined_labels}

Текст договора:
{text}

Найди другие важные юридические/финансовые поля и их значения из документа (суммы, сроки, условия, реквизиты, проценты и т.д.).
Верни ТОЛЬКО JSON без markdown:
{{
  "fields": [
    {{"label": "название поля", "value": "значение из договора"}}
  ]
}}
Если дополнительных полей нет — верни {{"fields": []}}"""

_CLASSIFY_PROMPT = """Определи, какой шаблон из списка соответствует данному договору.

Доступные шаблоны:
{templates}

Текст договора (фрагмент):
{text}

Ответь ТОЛЬКО одной строкой — точным названием шаблона из списка.
Если ни один не подходит — ответь строго: НЕТ СОВПАДЕНИЙ"""

MAX_HISTORY = 8
MAX_CHUNK_CHARS = 600


class OpenAIService:

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    # ── Embeddings ──────────────────────────────────────────────────────────

    async def get_embedding(self, text: str) -> list[float]:
        resp = await self.client.embeddings.create(
            input=text[:8000],
            model=EMBED_MODEL,
        )
        return resp.data[0].embedding

    # ── Chat ────────────────────────────────────────────────────────────────

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

        system_prompt = _CHAT_SYSTEM.format(
            name=user_context.get("name", "Пользователь"),
            employment_type=user_context.get("employment_type", ""),
            total_income=float(user_context.get("total_income", 0)),
            total_tax=float(user_context.get("total_tax", 0)),
            net_income=float(user_context.get("total_income", 0)) - float(user_context.get("total_tax", 0)),
            last_income_info=user_context.get("last_income_info", "Данных о доходах нет"),
            rag_section=rag_section,
        )

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(chat_history[-MAX_HISTORY:])
        messages.append({"role": "user", "content": user_message})

        resp = await self.client.chat.completions.create(
            model=CHAT_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        return resp.choices[0].message.content

    # ── Document analysis ───────────────────────────────────────────────────

    async def analyze_document(self, text: str) -> dict:
        prompt = _ANALYZE_PROMPT.format(text=text[:6000])
        try:
            resp = await self.client.chat.completions.create(
                model=ANALYZE_MODEL,
                messages=[
                    {"role": "system", "content": "Отвечай строго в JSON формате без markdown."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            logger.error("OpenAI analyze_document failed: %s", e)
            return self._fallback_analysis()

    async def extract_metadata(self, text: str) -> dict:
        prompt = _METADATA_PROMPT.format(text=text[:8000])
        try:
            resp = await self.client.chat.completions.create(
                model=ANALYZE_MODEL,
                messages=[
                    {"role": "system", "content": "Отвечай строго в JSON формате без markdown."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            logger.error("OpenAI extract_metadata failed: %s", e)
            return self._fallback_metadata()

    async def extract_criteria_values(self, text: str, criteria: list) -> list[dict]:
        criteria_list = "\n".join(f"- {c['label']} (тип: {c['type']})" for c in criteria)
        prompt = _CRITERIA_PROMPT.format(criteria_list=criteria_list, text=text[:8000])
        try:
            resp = await self.client.chat.completions.create(
                model=ANALYZE_MODEL,
                messages=[
                    {"role": "system", "content": "Отвечай строго в JSON формате без markdown."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content)
            return data.get("values", [])
        except Exception as e:
            logger.error("OpenAI extract_criteria_values failed: %s", e)
            return [{"label": c["label"], "extracted_value": "Не удалось извлечь"} for c in criteria]

    async def extract_extra_fields(self, text: str, defined_labels: list[str]) -> list[dict]:
        defined_str = "\n".join(f"- {l}" for l in defined_labels)
        prompt = _EXTRA_FIELDS_PROMPT.format(defined_labels=defined_str, text=text[:8000])
        try:
            resp = await self.client.chat.completions.create(
                model=ANALYZE_MODEL,
                messages=[
                    {"role": "system", "content": "Отвечай строго в JSON формате без markdown."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content)
            return data.get("fields", [])
        except Exception as e:
            logger.error("OpenAI extract_extra_fields failed: %s", e)
            return []

    # ── LLM classification for template matching ────────────────────────────

    async def classify_contract_type(self, text: str, template_types: list[str]) -> Optional[str]:
        if not template_types:
            return None
        templates_str = "\n".join(f"- {t}" for t in template_types)
        prompt = _CLASSIFY_PROMPT.format(templates=templates_str, text=text[:3000])
        try:
            resp = await self.client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=60,
            )
            answer = resp.choices[0].message.content.strip()
            if answer == "НЕТ СОВПАДЕНИЙ" or answer not in template_types:
                return None
            return answer
        except Exception as e:
            logger.error("OpenAI classify_contract_type failed: %s", e)
            return None

    def _fallback_analysis(self) -> dict:
        return {
            "realAnnualRate": "Не удалось определить",
            "advertisedRate": "Не удалось определить",
            "hiddenFees": ["AI сервис временно недоступен"],
            "penalties": ["AI сервис временно недоступен"],
            "redFlags": ["Не удалось выполнить анализ"],
            "monthlyPayment": "Не удалось определить",
            "recommendation": "NEGOTIATE",
            "summary": "Не удалось выполнить анализ. Обратитесь к финансовому консультанту.",
        }

    def _fallback_metadata(self) -> dict:
        return {
            "contractType": "Не удалось определить",
            "contractNumber": "", "contractDate": "", "validUntil": "",
            "subject": "Анализ временно недоступен", "totalAmount": "",
            "currency": "", "parties": [], "governingLaw": "",
            "disputeResolution": "", "terminationConditions": [],
            "specialConditions": [], "signatories": [], "documentLanguage": "",
        }


openai_service = OpenAIService()
