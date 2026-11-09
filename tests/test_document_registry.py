
import pytest

from app.services import document_registry


@pytest.fixture
def test_database(tmp_path, monkeypatch):
    """
    Create a temporary SQLite database for testing.
    """

    test_db_path = tmp_path / "test_documind.db"

    monkeypatch.setattr(
        document_registry,
        "DB_PATH",
        test_db_path
    )

    document_registry.initialize_database()

    return test_db_path


def test_register_and_retrieve_document(test_database):
    document_registry.register_document(
        document_id="test-doc-001",
        document_name="sample.pdf",
        file_path="uploads/sample.pdf",
        total_pages=10,
        total_chunks=25
    )

    document = document_registry.get_document_by_id(
        "test-doc-001"
    )

    assert document is not None
    assert document["document_id"] == "test-doc-001"
    assert document["document_name"] == "sample.pdf"
    assert document["total_pages"] == 10
    assert document["total_chunks"] == 25


def test_delete_document_record(test_database):
    document_registry.register_document(
        document_id="test-doc-002",
        document_name="delete_me.pdf",
        file_path="uploads/delete_me.pdf",
        total_pages=5,
        total_chunks=12
    )

    deleted = document_registry.delete_document_record(
        "test-doc-002"
    )

    assert deleted is True

    document = document_registry.get_document_by_id(
        "test-doc-002"
    )

    assert document is None


def test_delete_nonexistent_document(test_database):
    deleted = document_registry.delete_document_record(
        "missing-document"
    )

    assert deleted is False
