from pathlib import Path
from unittest.mock import patch

import pytest

from app.services import document_deletion_service


@pytest.fixture
def mock_deletion_dependencies():

    with patch(
        "app.services.document_deletion_service.get_document_by_id"
    ) as mock_get_document, patch(
        "app.services.document_deletion_service.get_document_file_path"
    ) as mock_get_path, patch(
        "app.services.document_deletion_service.delete_document_vectors"
    ) as mock_delete_vectors, patch(
        "app.services.document_deletion_service.delete_document_record"
    ) as mock_delete_record:

        mock_get_document.return_value = {
            "document_id": "test-doc-001",
            "document_name": "sample.pdf"
        }

        mock_delete_vectors.return_value = 10
        mock_delete_record.return_value = True

        yield {
            "get_document": mock_get_document,
            "get_path": mock_get_path,
            "delete_vectors": mock_delete_vectors,
            "delete_record": mock_delete_record
        }


def test_delete_document_success(
    mock_deletion_dependencies,
    tmp_path,
    monkeypatch
):

    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir()

    pdf_path = uploads_dir / "sample.pdf"
    pdf_path.write_text("Test PDF")

    monkeypatch.setattr(
        Path,
        "resolve",
        lambda self, *args, **kwargs: self
    )

    monkeypatch.setattr(
        document_deletion_service,
        "__file__",
        str(tmp_path / "app" / "services" / "document_deletion_service.py")
    )

    mock_deletion_dependencies["get_path"].return_value = str(pdf_path)

    result = document_deletion_service.delete_document(
        "test-doc-001"
    )

    assert result["document_id"] == "test-doc-001"
    assert result["document_name"] == "sample.pdf"
    assert result["deleted_vectors"] == 10
    assert result["metadata_deleted"] is True
    assert result["file_deleted"] is True
    assert result["status"] == "success"

    assert not pdf_path.exists()

    mock_deletion_dependencies["delete_vectors"].assert_called_once_with(
        "test-doc-001"
    )

    mock_deletion_dependencies["delete_record"].assert_called_once_with(
        "test-doc-001"
    )


def test_delete_document_with_empty_id():

    with pytest.raises(
        ValueError,
        match="Document ID cannot be empty"
    ):
        document_deletion_service.delete_document("   ")


def test_delete_nonexistent_document(
    mock_deletion_dependencies
):

    mock_deletion_dependencies["get_document"].return_value = None

    with pytest.raises(
        ValueError,
        match="Document not found"
    ):
        document_deletion_service.delete_document(
            "missing-doc"
        )

    mock_deletion_dependencies["delete_vectors"].assert_not_called()
    mock_deletion_dependencies["delete_record"].assert_not_called()


def test_delete_document_with_unsafe_path(
    mock_deletion_dependencies,
    tmp_path,
    monkeypatch
):

    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir()

    unsafe_path = tmp_path / "outside" / "sample.pdf"

    monkeypatch.setattr(
        Path,
        "resolve",
        lambda self, *args, **kwargs: self
    )

    monkeypatch.setattr(
        document_deletion_service,
        "__file__",
        str(tmp_path / "app" / "services" / "document_deletion_service.py")
    )

    mock_deletion_dependencies["get_path"].return_value = str(
        unsafe_path
    )

    with pytest.raises(
        RuntimeError,
        match="Unsafe file path"
    ):
        document_deletion_service.delete_document(
            "test-doc-001"
        )

    mock_deletion_dependencies["delete_vectors"].assert_not_called()
    mock_deletion_dependencies["delete_record"].assert_not_called()


def test_delete_document_when_file_is_missing(
    mock_deletion_dependencies
):

    mock_deletion_dependencies["get_path"].return_value = None

    result = document_deletion_service.delete_document(
        "test-doc-001"
    )

    assert result["metadata_deleted"] is True
    assert result["file_deleted"] is False
    assert result["status"] == "success"


def test_delete_document_when_metadata_deletion_fails(
    mock_deletion_dependencies
):

    mock_deletion_dependencies["get_path"].return_value = None

    mock_deletion_dependencies["delete_record"].return_value = False

    with pytest.raises(
        RuntimeError,
        match="metadata deletion failed"
    ):
        document_deletion_service.delete_document(
            "test-doc-001"
        )

    mock_deletion_dependencies["delete_vectors"].assert_called_once()
    mock_deletion_dependencies["delete_record"].assert_called_once()