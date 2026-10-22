# ------------------------------------------------------------------------------
# Alchemist AI — Python Embedding Service Dockerfile
# Python 3.11 slim image with CPU-only PyTorch and pre-cached SentenceTransformer
# ------------------------------------------------------------------------------
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TRANSFORMERS_CACHE=/app/.cache \
    HF_HOME=/app/.cache

WORKDIR /app

# Install minimal build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU-only first for compact image size (~180MB vs 2GB GPU wheels)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download and bake the embedding model into the image
# This ensures zero download delay/network failure at container startup
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy application source code
COPY . .

# Expose FastAPI service port
EXPOSE 8001

# Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Start Uvicorn ASGI server bound to 0.0.0.0
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
