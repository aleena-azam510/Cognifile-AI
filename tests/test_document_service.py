import pytest
from unittest.mock import patch

from app.services import document_service


@pytest.fixture
def mock_ingestion_dependencies():

    with patch(
        "app.services.document_service.extract_text_from_pdf"
    ) as mock_extract, patch(
        "app.services.document_service.create_chunks"
    ) as mock_chunk, patch(
        "app.services.document_service.generate_embeddings"
    ) as mock_embed, patch(
        "app.services.document_service.create_collection"
    ) as mock_collection, patch(
        "app.services.document_service.store_embeddings"
    ) as mock_store, patch(
        "app.services.document_service.register_document"
    ) as mock_register:

        mock_extract.return_value = [
            {
                "page_number": 1,
                "text": "Artificial intelligence is transforming technology."
            },
            {
                "page_number": 2,
                "text": "Machine learning is a branch of artificial intelligence."
            }
        ]

        mock_chunk.return_value = [
            {
                "chunk_id": 1,
                "page_number": 1,
                "text": "Artificial intelligence is transforming technology."
            },
            {
                "chunk_id": 2,
                "page_number": 2,
                "text": "Machine learning is a branch of artificial intelligence."
            }
        ]

        mock_embed.return_value = [
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

        yield {
            "extract": mock_extract,
            "chunk": mock_chunk,
            "embed": mock_embed,
            "collection": mock_collection,
            "store": mock_store,
            "register": mock_register
        }


def test_ingest_document_success(mock_ingestion_dependencies):

    result = document_service.ingest_document(
        file_path="uploads/sample.pdf",
        document_name="sample.pdf",
        document_id="test-doc-001"
    )

    assert result["document_id"] == "test-doc-001"
    assert result["document_name"] == "sample.pdf"
    assert result["total_pages"] == 2
    assert result["total_chunks"] == 2
    assert result["status"] == "success"

    mock_ingestion_dependencies["extract"].assert_called_once()
    mock_ingestion_dependencies["chunk"].assert_called_once()
    mock_ingestion_dependencies["embed"].assert_called_once()
    mock_ingestion_dependencies["collection"].assert_called_once()
    mock_ingestion_dependencies["store"].assert_called_once()
    mock_ingestion_dependencies["register"].assert_called_once()


def test_ingest_document_with_no_extractable_text(
    mock_ingestion_dependencies
):

    mock_ingestion_dependencies["extract"].return_value = []

    with pytest.raises(
        ValueError,
        match="No extractable text found"
    ):
        document_service.ingest_document(
            "uploads/empty.pdf",
            "empty.pdf",
            "test-doc-002"
        )

    mock_ingestion_dependencies["chunk"].assert_not_called()
    mock_ingestion_dependencies["embed"].assert_not_called()
    mock_ingestion_dependencies["store"].assert_not_called()
    mock_ingestion_dependencies["register"].assert_not_called()


def test_ingest_document_with_no_chunks(
    mock_ingestion_dependencies
):

    mock_ingestion_dependencies["chunk"].return_value = []

    with pytest.raises(
        ValueError,
        match="No text chunks could be generated"
    ):
        document_service.ingest_document(
            "uploads/sample.pdf",
            "sample.pdf",
            "test-doc-003"
        )

    mock_ingestion_dependencies["embed"].assert_not_called()
    mock_ingestion_dependencies["store"].assert_not_called()
    mock_ingestion_dependencies["register"].assert_not_called()


def test_ingest_document_registers_correct_metadata(
    mock_ingestion_dependencies
):

    document_service.ingest_document(
        file_path="uploads/report.pdf",
        document_name="report.pdf",
        document_id="test-doc-004"
    )

    mock_ingestion_dependencies["register"].assert_called_once_with(
        document_id="test-doc-004",
        document_name="report.pdf",
        file_path="uploads/report.pdf",
        total_pages=2,
        total_chunks=2
    )


def test_ingest_document_stores_embeddings(
    mock_ingestion_dependencies
):

    document_service.ingest_document(
        file_path="uploads/sample.pdf",
        document_name="sample.pdf",
        document_id="test-doc-005"
    )

    mock_ingestion_dependencies["store"].assert_called_once_with(
        embedded_chunks=mock_ingestion_dependencies["embed"].return_value,
        document_id="test-doc-005",
        document_name="sample.pdf"
    )