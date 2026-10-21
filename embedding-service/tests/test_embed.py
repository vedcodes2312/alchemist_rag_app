"""Tests for the local embedding service API and input validation."""

import pytest
from fastapi.testclient import TestClient
import main
from main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["dimension"] == 384
    assert "sentence-transformers" in data["model"]


def test_embed_empty_payload(client):
    response = client.post("/embed", json={"texts": []})
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_embed_whitespace_text(client):
    response = client.post("/embed", json={"texts": ["   "]})
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_embed_batch_too_large(client):
    response = client.post("/embed", json={"texts": [f"Text {i}" for i in range(70)]})
    assert response.status_code == 413
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"


def test_embed_text_too_long(client):
    long_text = "a" * 4001
    response = client.post("/embed", json={"texts": [long_text]})
    assert response.status_code == 413
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"


def test_embed_valid_texts(client):
    # Only test if model is loaded (e.g. online or cached)
    if main.model_instance is None:
        pytest.skip("Model is not initialized in this environment")

    response = client.post(
        "/embed",
        json={"texts": ["The desert is endless.", "Santiago watched the hawks."]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["dimension"] == 384
    assert data["count"] == 2
    assert len(data["embeddings"]) == 2
    assert len(data["embeddings"][0]) == 384
    assert len(data["embeddings"][1]) == 384
