
import pytest
from unittest.mock import patch, MagicMock

from app.services import rag_service


@pytest.fixture
def mock_rag_dependencies():
    """Mock embedding, retrieval, and Gemini services."""

    with patch(
        "app.services.rag_service.generate_embedding"
    ) as mock_embedding, patch(
        "app.services.rag_service.search_similar_chunks"
    ) as mock_search, patch(
        "app.services.rag_service.generate_answer"
    ) as mock_answer:

        mock_embedding.return_value = [0.1] * 384

        yield {
            "embedding": mock_embedding,
            "search": mock_search,
            "answer": mock_answer
        }


def create_mock_chunk(
    document_id="doc-001",
    document_name="sample.pdf",
    page_number=1,
    chunk_id=1,
    text="Artificial intelligence is transforming technology.",
    score=0.95
):
    """Create a mock Qdrant search result."""

    chunk = MagicMock()

    chunk.payload = {
        "document_id": document_id,
        "document_name": document_name,
        "page_number": page_number,
        "chunk_id": chunk_id,
        "text": text
    }

    chunk.score = score

    return chunk


def test_answer_question_success(mock_rag_dependencies):

    mock_rag_dependencies["search"].return_value = [
        create_mock_chunk()
    ]

    mock_rag_dependencies["answer"].return_value = (
        "Artificial intelligence is transforming technology. [S1]"
    )

    result = rag_service.answer_question(
        "What is artificial intelligence?"
    )

    assert "Artificial intelligence" in result["answer"]
    assert len(result["sources"]) == 1

    assert result["sources"][0]["source_id"] == "S1"
    assert result["sources"][0]["document_id"] == "doc-001"
    assert result["sources"][0]["document_name"] == "sample.pdf"
    assert result["sources"][0]["page_number"] == 1

    mock_rag_dependencies["embedding"].assert_called_once()
    mock_rag_dependencies["search"].assert_called_once()
    mock_rag_dependencies["answer"].assert_called_once()


def test_answer_question_with_no_results(mock_rag_dependencies):

    mock_rag_dependencies["search"].return_value = []

    result = rag_service.answer_question(
        "What is artificial intelligence?"
    )

    assert result["answer"] == (
        "I could not find relevant information in the selected documents."
    )

    assert result["sources"] == []

    mock_rag_dependencies["answer"].assert_not_called()


def test_answer_question_with_multiple_documents(mock_rag_dependencies):

    mock_rag_dependencies["search"].return_value = [
        create_mock_chunk(
            document_id="doc-001",
            document_name="first.pdf",
            page_number=2,
            chunk_id=1
        ),
        create_mock_chunk(
            document_id="doc-002",
            document_name="second.pdf",
            page_number=5,
            chunk_id=3
        )
    ]

    mock_rag_dependencies["answer"].return_value = (
        "Information from both documents. [S1] [S2]"
    )

    result = rag_service.answer_question(
        "Compare these documents.",
        document_ids=["doc-001", "doc-002"]
    )

    assert len(result["sources"]) == 2

    assert result["sources"][0]["source_id"] == "S1"
    assert result["sources"][1]["source_id"] == "S2"

    assert result["sources"][0]["document_name"] == "first.pdf"
    assert result["sources"][1]["document_name"] == "second.pdf"

    mock_rag_dependencies["search"].assert_called_once()

    search_arguments = mock_rag_dependencies["search"].call_args.kwargs

    assert search_arguments["document_ids"] == [
        "doc-001",
        "doc-002"
    ]


def test_answer_question_rejects_empty_question():

    with pytest.raises(ValueError, match="Question cannot be empty"):
        rag_service.answer_question("   ")


def test_answer_question_rejects_invalid_limit():

    with pytest.raises(ValueError, match="Limit must be greater than zero"):
        rag_service.answer_question(
            "What is AI?",
            limit=0
        )


def test_answer_question_rejects_empty_document_list():

    with pytest.raises(
        ValueError,
        match="At least one document ID is required"
    ):
        rag_service.answer_question(
            "What is AI?",
            document_ids=[]
        )


def test_answer_question_rejects_empty_document_id():

    with pytest.raises(
        ValueError,
        match="Document IDs cannot be empty"
    ):
        rag_service.answer_question(
            "What is AI?",
            document_ids=["doc-001", "   "]
        )


def test_answer_question_removes_duplicate_document_ids(
    mock_rag_dependencies
):

    mock_rag_dependencies["search"].return_value = []

    rag_service.answer_question(
        "What is AI?",
        document_ids=[
            "doc-001",
            "doc-002",
            "doc-001"
        ]
    )

    search_arguments = mock_rag_dependencies["search"].call_args.kwargs

    assert search_arguments["document_ids"] == [
        "doc-001",
        "doc-002"
    ]


def test_answer_question_uses_requested_limit(mock_rag_dependencies):

    mock_rag_dependencies["search"].return_value = []

    rag_service.answer_question(
        "What is AI?",
        limit=10
    )

    search_arguments = mock_rag_dependencies["search"].call_args.kwargs

    assert search_arguments["limit"] == 10


def test_answer_question_removes_invalid_citations(mock_rag_dependencies):

    mock_rag_dependencies["search"].return_value = [
        create_mock_chunk()
    ]

    mock_rag_dependencies["answer"].return_value = (
        "Artificial intelligence transforms technology. [S1] [S99]"
    )

    result = rag_service.answer_question(
        "What is artificial intelligence?"
    )

    assert "[S1]" in result["answer"]
    assert "[S99]" not in result["answer"]

    assert len(result["sources"]) == 1
    assert result["sources"][0]["source_id"] == "S1"


def test_answer_question_without_citations(mock_rag_dependencies):

    mock_rag_dependencies["search"].return_value = [
        create_mock_chunk()
    ]

    mock_rag_dependencies["answer"].return_value = (
        "I could not find sufficient information in the selected documents."
    )

    result = rag_service.answer_question(
        "What is artificial intelligence?"
    )

    assert result["answer"] == (
        "I could not find sufficient information in the selected documents."
    )

    assert result["sources"] == []


def test_answer_question_rejects_low_similarity_chunks(
    mock_rag_dependencies
):

    mock_rag_dependencies["search"].return_value = [
        create_mock_chunk(score=0.20)
    ]

    result = rag_service.answer_question(
        "What is the population of Japan?"
    )

    assert result["sources"] == []

    assert result["answer"] == (
        "I could not find relevant information "
        "in the selected documents."
    )

    mock_rag_dependencies["answer"].assert_not_called()


def test_answer_question_accepts_high_similarity_chunks(
    mock_rag_dependencies
):

    mock_rag_dependencies["search"].return_value = [
        create_mock_chunk(score=0.60)
    ]

    mock_rag_dependencies["answer"].return_value = (
        "Artificial intelligence transforms technology. [S1]"
    )

    result = rag_service.answer_question(
        "What is artificial intelligence?"
    )

    assert len(result["sources"]) == 1
    assert result["sources"][0]["score"] == 0.60

    mock_rag_dependencies["answer"].assert_called_once()
