import pytest
from qdrant_client import QdrantClient

from app.services import vector_service


@pytest.fixture
def test_qdrant(monkeypatch, tmp_path):
    """Create an isolated temporary Qdrant database for testing."""

    test_client = QdrantClient(
        path=str(tmp_path / "test_qdrant")
    )

    monkeypatch.setattr(
        vector_service,
        "client",
        test_client
    )

    monkeypatch.setattr(
        vector_service,
        "COLLECTION_NAME",
        "test_documents"
    )

    vector_service.create_collection()

    yield test_client

    test_client.close()


def test_create_collection(test_qdrant):
    assert test_qdrant.collection_exists(
        "test_documents"
    )


def test_store_and_search_embeddings(test_qdrant):
    embedded_chunks = [
        {
            "chunk_id": 1,
            "page_number": 1,
            "text": "Artificial intelligence is transforming technology.",
            "embedding": [0.1] * 384
        },
        {
            "chunk_id": 2,
            "page_number": 2,
            "text": "Machine learning is a branch of artificial intelligence.",
            "embedding": [0.2] * 384
        }
    ]

    vector_service.store_embeddings(
        embedded_chunks,
        document_id="test-doc-001",
        document_name="sample.pdf"
    )

    results = vector_service.search_similar_chunks(
        query_embedding=[0.1] * 384,
        limit=5
    )

    assert len(results) == 2

    assert results[0].payload["document_id"] == "test-doc-001"
    assert results[0].payload["document_name"] == "sample.pdf"
    assert results[0].payload["page_number"] in [1, 2]


def test_search_with_document_filter(test_qdrant):
    embedded_chunks = [
        {
            "chunk_id": 1,
            "page_number": 1,
            "text": "Document one content.",
            "embedding": [0.1] * 384
        },
        {
            "chunk_id": 1,
            "page_number": 1,
            "text": "Document two content.",
            "embedding": [0.2] * 384
        }
    ]

    vector_service.store_embeddings(
        [embedded_chunks[0]],
        document_id="doc-001",
        document_name="first.pdf"
    )

    vector_service.store_embeddings(
        [embedded_chunks[1]],
        document_id="doc-002",
        document_name="second.pdf"
    )

    results = vector_service.search_similar_chunks(
        query_embedding=[0.1] * 384,
        limit=5,
        document_ids=["doc-001"]
    )

    assert len(results) == 1
    assert results[0].payload["document_id"] == "doc-001"


def test_delete_document_vectors(test_qdrant):
    embedded_chunks = [
        {
            "chunk_id": 1,
            "page_number": 1,
            "text": "First chunk.",
            "embedding": [0.1] * 384
        },
        {
            "chunk_id": 2,
            "page_number": 2,
            "text": "Second chunk.",
            "embedding": [0.2] * 384
        }
    ]

    vector_service.store_embeddings(
        embedded_chunks,
        document_id="delete-doc",
        document_name="delete.pdf"
    )

    deleted_count = vector_service.delete_document_vectors(
        "delete-doc"
    )

    assert deleted_count == 2

    results = vector_service.search_similar_chunks(
        query_embedding=[0.1] * 384,
        limit=5
    )

    assert len(results) == 0


def test_delete_nonexistent_document_vectors(test_qdrant):
    deleted_count = vector_service.delete_document_vectors(
        "missing-doc"
    )

    assert deleted_count == 0


def test_delete_document_vectors_with_empty_id(test_qdrant):
    with pytest.raises(ValueError):
        vector_service.delete_document_vectors("   ")
