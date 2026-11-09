from app.services.chunking_service import create_chunks


def test_create_chunks():
    pages = [
        {
            "page_number": 1,
            "text": "A" * 2500
        }
    ]

    chunks = create_chunks(
        pages,
        chunk_size=1000,
        overlap=200
    )

    assert len(chunks) == 4

    assert chunks[0]["page_number"] == 1
    assert len(chunks[0]["text"]) == 1000
    assert len(chunks[1]["text"]) == 1000
    assert len(chunks[2]["text"]) == 900
    assert len(chunks[3]["text"]) == 100


def test_empty_pages_return_empty_chunks():
    pages = [
        {"page_number": 1, "text": ""},
        {"page_number": 2, "text": "   "}
    ]

    chunks = create_chunks(pages)

    assert chunks == []


def test_invalid_chunk_size():
    pages = [{"page_number": 1, "text": "Sample text"}]

    try:
        create_chunks(pages, chunk_size=0)
        assert False, "Expected ValueError"
    except ValueError:
        pass