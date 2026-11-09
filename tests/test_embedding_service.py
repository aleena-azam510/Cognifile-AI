import numpy as np
import pytest

from app.services import embedding_service


class FakeEmbeddingModel:
    """A lightweight replacement for the real embedding model."""

    def encode(self, texts, **kwargs):
        if isinstance(texts, str):
            return np.ones(384)

        return np.ones((len(texts), 384))


@pytest.fixture
def mock_embedding_model(monkeypatch):
    fake_model = FakeEmbeddingModel()

    monkeypatch.setattr(
        embedding_service,
        "model",
        fake_model
    )


def test_generate_embedding(mock_embedding_model):
    embedding = embedding_service.generate_embedding(
        "What is artificial intelligence?"
    )

    assert isinstance(embedding, list)
    assert len(embedding) == 384


def test_generate_embedding_with_empty_text():
    with pytest.raises(ValueError):
        embedding_service.generate_embedding("   ")


def test_generate_embeddings(mock_embedding_model):
    chunks = [
        {
            "chunk_id": 1,
            "page_number": 1,
            "text": "First document chunk"
        },
        {
            "chunk_id": 2,
            "page_number": 1,
            "text": "Second document chunk"
        }
    ]

    results = embedding_service.generate_embeddings(chunks)

    assert len(results) == 2
    assert len(results[0]["embedding"]) == 384
    assert len(results[1]["embedding"]) == 384

    # Original metadata must be preserved.
    assert results[0]["chunk_id"] == 1
    assert results[1]["chunk_id"] == 2


def test_generate_embeddings_with_empty_list():
    results = embedding_service.generate_embeddings([])

    assert results == []