
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_home_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Welcome to DocuMind AI!",
        "status": "Application is running"
    }


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "application": "DocuMind AI"
    }


def test_upload_pdf_success(client, tmp_path, monkeypatch):

    monkeypatch.setattr(
        "app.main.UPLOAD_DIR",
        tmp_path
    )

    mock_result = {
        "document_id": "test-doc-001",
        "document_name": "sample.pdf",
        "total_pages": 5,
        "total_chunks": 12,
        "status": "success"
    }

    with patch(
        "app.main.ingest_document",
        return_value=mock_result
    ) as mock_ingest:

        response = client.post(
            "/upload-pdf",
            files={
                "file": (
                    "sample.pdf",
                    b"Fake PDF content",
                    "application/pdf"
                )
            }
        )

    assert response.status_code == 200
    assert response.json() == mock_result

    mock_ingest.assert_called_once()

    # Verify the uploaded file was saved.
    saved_files = list(tmp_path.iterdir())
    assert len(saved_files) == 1
    assert saved_files[0].suffix == ".pdf"


def test_upload_non_pdf_file(client):

    response = client.post(
        "/upload-pdf",
        files={
            "file": (
                "sample.txt",
                b"Not a PDF",
                "text/plain"
            )
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Only PDF files are allowed."
    )


def test_ask_endpoint_success(client):

    mock_result = {
        "answer": "The document discusses skin diseases.",
        "sources": [
            {
                "document_id": "test-doc-001",
                "document_name": "sample.pdf",
                "page_number": 5
            }
        ]
    }

    with patch(
        "app.main.answer_question",
        return_value=mock_result
    ) as mock_answer:

        response = client.post(
            "/ask",
            json={
                "question": "What does the document discuss?",
                "document_ids": ["test-doc-001"]
            }
        )

    assert response.status_code == 200

    data = response.json()

    assert data["answer"] == mock_result["answer"]
    assert data["sources"] == mock_result["sources"]
    assert data["status"] == "success"

    mock_answer.assert_called_once_with(
        question="What does the document discuss?",
        document_ids=["test-doc-001"]
    )


def test_ask_endpoint_validation_error(client):

    with patch(
        "app.main.answer_question",
        side_effect=ValueError("Question cannot be empty.")
    ):

        response = client.post(
            "/ask",
            json={"question": " "}
        )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Question cannot be empty."
    )


def test_ask_endpoint_llm_unavailable(client):

    with patch(
        "app.main.answer_question",
        side_effect=RuntimeError("Gemini is unavailable.")
    ):

        response = client.post(
            "/ask",
            json={"question": "What is AI?"}
        )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Gemini is unavailable."
    )


def test_list_documents_success(client):

    mock_documents = [
        {
            "document_id": "doc-001",
            "document_name": "sample1.pdf",
            "total_pages": 10,
            "total_chunks": 20,
            "uploaded_at": "2026-11-08T10:00:00+00:00"
        },
        {
            "document_id": "doc-002",
            "document_name": "sample2.pdf",
            "total_pages": 5,
            "total_chunks": 12,
            "uploaded_at": "2026-11-08T11:00:00+00:00"
        }
    ]

    with patch(
        "app.main.get_all_documents",
        return_value=mock_documents
    ):

        response = client.get("/documents")

    assert response.status_code == 200
    assert response.json()["total_documents"] == 2
    assert response.json()["documents"] == mock_documents


def test_list_documents_failure(client):

    with patch(
        "app.main.get_all_documents",
        side_effect=Exception("Database error")
    ):

        response = client.get("/documents")

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Could not retrieve documents."
    )


def test_get_document_success(client):

    mock_document = {
        "document_id": "doc-001",
        "document_name": "sample.pdf",
        "total_pages": 10,
        "total_chunks": 20,
        "uploaded_at": "2026-11-08T10:00:00+00:00"
    }

    with patch(
        "app.main.get_document_by_id",
        return_value=mock_document
    ):

        response = client.get("/documents/doc-001")

    assert response.status_code == 200
    assert response.json()["document"] == mock_document


def test_get_nonexistent_document(client):

    with patch(
        "app.main.get_document_by_id",
        return_value=None
    ):

        response = client.get("/documents/missing-doc")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_delete_document_success(client):

    mock_result = {
        "document_id": "doc-001",
        "document_name": "sample.pdf",
        "deleted_vectors": 20,
        "metadata_deleted": True,
        "file_deleted": True,
        "status": "success"
    }

    with patch(
        "app.main.delete_document",
        return_value=mock_result
    ) as mock_delete:

        response = client.delete("/documents/doc-001")

    assert response.status_code == 200

    assert response.json() == {
        "message": "Document deleted successfully.",
        "details": mock_result
    }

    mock_delete.assert_called_once_with("doc-001")


def test_delete_nonexistent_document(client):

    with patch(
        "app.main.delete_document",
        side_effect=ValueError("Document not found.")
    ):

        response = client.delete("/documents/missing-doc")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found."


def test_delete_document_failure(client):

    with patch(
        "app.main.delete_document",
        side_effect=RuntimeError("Database deletion failed.")
    ):

        response = client.delete("/documents/doc-001")

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Database deletion failed."
    )
