from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    groq_api_key: str = ""
    gemini_api_key: str = ""

    # "openai" | "groq" | "gemini"
    llm_provider: str = "openai"

    chroma_path: str = "./chroma_data"
    ai_service_port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
