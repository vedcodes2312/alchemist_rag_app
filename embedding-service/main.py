"""Alchemist AI — Local Python Embedding Service
FastAPI service generating 384-dimensional normalized embeddings using
sentence-transformers/all-MiniLM-L6-v2.
"""

import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
EXPECTED_DIMENSION = 384
MAX_BATCH_SIZE = int(os.getenv("EMBEDDING_MAX_BATCH", "64"))
MAX_TEXT_CHARS = int(os.getenv("EMBEDDING_MAX_TEXT_CHARS", "4000"))
API_KEY = os.getenv("EMBEDDING_SERVICE_API_KEY", "").strip()

# Global model container
model_instance: Optional[SentenceTransformer] = None
model_load_error: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the embedding model once at startup."""
    global model_instance, model_load_error
    try:
        # Load SentenceTransformer model
        model_instance = SentenceTransformer(MODEL_NAME)
    except Exception as exc:  # pylint: disable=broad-except
        model_load_error = str(exc)
        print(f"[ERROR] Failed to load model '{MODEL_NAME}': {exc}")
    yield
    model_instance = None


app = FastAPI(
    title="Alchemist AI Embedding Service",
    description="Local embedding generation with sentence-transformers",
    version="1.0.0",
    lifespan=lifespan,
)


# ------------------------------------------------------------------------------
# Custom Error Handlers
# ------------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload. Ensure 'texts' is an array of non-empty strings.",
                "details": exc.errors(),
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "UNAUTHORIZED"
    elif exc.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE:
        code = "PAYLOAD_TOO_LARGE"
    elif exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY:
        code = "VALIDATION_ERROR"
    elif exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR:
        code = "EMBEDDING_FAILED"
    elif exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        code = "SERVICE_UNAVAILABLE"

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": exc.detail}},
    )


# ------------------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------------------
class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, description="Array of non-empty strings to embed")


class EmbedResponse(BaseModel):
    model: str
    dimension: int
    count: int
    embeddings: List[List[float]]


class HealthResponse(BaseModel):
    status: str
    model: str
    dimension: int


# ------------------------------------------------------------------------------
# Security Helper
# ------------------------------------------------------------------------------
def verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    if API_KEY:
        if not x_api_key or x_api_key != API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing API key in X-API-Key header",
            )


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse)
def health():
    if model_load_error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model failed to load: {model_load_error}",
        )
    return HealthResponse(
        status="ok",
        model=MODEL_NAME,
        dimension=EXPECTED_DIMENSION,
    )


@app.post("/embed", response_model=EmbedResponse)
def embed(
    payload: EmbedRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    # Verify authentication if key is configured
    verify_api_key(x_api_key)

    # Batch size check
    if len(payload.texts) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Batch size {len(payload.texts)} exceeds maximum allowed batch size ({MAX_BATCH_SIZE})",
        )

    # Validate each text element
    cleaned_texts: List[str] = []
    for idx, text in enumerate(payload.texts):
        if not isinstance(text, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Text at index {idx} must be a string",
            )
        trimmed = text.strip()
        if not trimmed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Text at index {idx} cannot be empty or whitespace only",
            )
        if len(text) > MAX_TEXT_CHARS:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Text at index {idx} exceeds maximum length ({MAX_TEXT_CHARS} characters)",
            )
        cleaned_texts.append(trimmed)

    # Check model readiness
    if model_instance is None:
        detail = "Model is not initialized"
        if model_load_error:
            detail = f"Model load error: {model_load_error}"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )

    # Inference with SentenceTransformers (L2 normalized)
    try:
        embeddings = model_instance.encode(
            cleaned_texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        embeddings_list = [emb.tolist() for emb in embeddings]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding generation failed: {exc}",
        ) from exc

    # Sanity check vector count and dimension
    if len(embeddings_list) != len(cleaned_texts):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Output vector count mismatch",
        )

    for idx, vec in enumerate(embeddings_list):
        if len(vec) != EXPECTED_DIMENSION:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Vector at index {idx} has dimension {len(vec)}, expected {EXPECTED_DIMENSION}",
            )

    return EmbedResponse(
        model=MODEL_NAME,
        dimension=EXPECTED_DIMENSION,
        count=len(embeddings_list),
        embeddings=embeddings_list,
    )
