# FinMentor AI

AI-powered financial advisor platform for self-employed individuals in Kazakhstan. Analyzes contracts, extracts key criteria, provides financial insights via RAG-based chat.

## Architecture

```
finmentor-ai/
├── ai-service/      Python · FastAPI · ChromaDB · OpenAI GPT-4o · OCR (Tesseract)
├── backend/         Java 17 · Spring Boot 3 · PostgreSQL · JWT Auth
├── frontend/        React 18 · Vite · Recharts · Axios
└── docker-compose.yml
```

## Features

- **Document Analysis** — upload PDF/DOCX contracts, extract text (with OCR fallback for scanned PDFs)
- **Contract Template System** — define contract types with mandatory/additional criteria, auto-extract values from documents using LLM
- **Auto-discovery** — AI finds extra fields in the document beyond the defined template criteria
- **Risk Analysis** — GPT-4o analyzes contracts for red flags, hidden fees, penalties
- **RAG Chat** — ask questions about uploaded documents via ChromaDB vector search
- **Knowledge Base** — manage contract type registry with criteria definitions
- **Finance Tracker** — income/expense tracking with tax calculations for self-employed (Kazakhstan)
- **Dark / Light theme**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | OpenAI GPT-4o / GPT-4o-mini |
| Vector DB | ChromaDB (cosine similarity) |
| Embeddings | text-embedding-3-small |
| OCR | Tesseract + pdf2image (rus+kaz+eng) |
| Backend | Spring Boot 3, Spring Security, JPA/Hibernate |
| Database | PostgreSQL 15 |
| Frontend | React 18, Vite, React Router, Recharts |
| Auth | JWT (Bearer token) |
| Infra | Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- OpenAI API key

### 1. Clone

```bash
git clone <repo-url>
cd finmentor-ai
```

### 2. Environment

```bash
# ai-service/.env
OPENAI_API_KEY=sk-...
```

### 3. Run with Docker

```bash
docker-compose up --build
```

Services:
- Frontend: `http://localhost:5173` (run separately, see below)
- Backend API: `http://localhost:8080`
- AI Service: `http://localhost:8000`
- PostgreSQL: `localhost:5433`

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## Local Development (without Docker)

### AI Service

```bash
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install Tesseract OCR (macOS)
brew install tesseract tesseract-lang

# Create .env
echo "OPENAI_API_KEY=sk-..." > .env

uvicorn app.main:app --reload --port 8000
```

### Backend

```bash
cd backend

# Requires PostgreSQL running on localhost:5433
# Default: postgres/postgres, db: ai_system

./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Overview

### Backend (Spring Boot · :8080)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/documents` | List user documents |
| POST | `/api/documents/upload` | Upload PDF/DOCX |
| GET | `/api/templates` | List contract types |
| POST | `/api/templates` | Create contract type |
| PUT | `/api/templates/{id}` | Update contract type |
| DELETE | `/api/templates/{id}` | Delete contract type |
| POST | `/api/templates/documents/{id}/analyze-criteria` | Analyze document with template |
| GET | `/api/templates/documents/{id}/criteria-values` | Get extracted criteria |
| POST | `/api/chat` | RAG chat message |

### AI Service (FastAPI · :8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/documents/index` | Index document chunks to ChromaDB |
| POST | `/api/v1/extract-criteria-values` | Extract template criteria via GPT-4o |
| POST | `/api/v1/extract-extra-fields` | Auto-discover extra fields from document |
| POST | `/api/v1/documents/extract-metadata` | Extract contract metadata |
| POST | `/api/v1/admin/extract-text` | Extract text from file (with OCR fallback) |
| POST | `/api/v1/chat` | RAG-based chat |

## Project Structure

```
backend/src/main/java/kz/finmentor/
├── controller/       REST controllers
├── service/          Business logic (TemplateService, DocumentService, AiServiceClient)
├── model/            JPA entities (Document, ContractTemplate, TemplateCriteria, DocumentCriteriaValue)
├── repository/       Spring Data JPA repositories
├── dto/              Request/Response DTOs
└── security/         JWT filter, config

ai-service/app/
├── api/routes/       FastAPI routers (chat, criteria, documents, admin)
├── services/         openai_service, chroma_service, llm_factory
├── models/           Pydantic schemas
└── core/             Config (settings)

frontend/src/
├── pages/            Dashboard, Documents, Finance, Chat, KnowledgeBase
├── components/       Layout, ProtectedRoute
├── context/          AuthContext, ThemeContext
└── api/              Axios client
```

## Environment Variables

### ai-service/.env
```env
OPENAI_API_KEY=sk-...
```

### docker-compose (optional overrides)
```env
LLM_PROVIDER=openai       # openai | groq | gemini
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

## License

MIT
