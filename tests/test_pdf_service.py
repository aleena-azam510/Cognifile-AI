import pymupdf
import pytest

from app.services.pdf_service import extract_text_from_pdf


def create_test_pdf(file_path):
    """Create a small PDF for testing."""

    document = pymupdf.open()

    page = document.new_page()
    page.insert_text((72, 72), "DocuMind AI PDF extraction test.")

    document.save(file_path)
    document.close()


def test_extract_text_from_pdf(tmp_path):
    pdf_path = tmp_path / "sample.pdf"

    create_test_pdf(pdf_path)

    pages = extract_text_from_pdf(str(pdf_path))

    assert len(pages) == 1
    assert pages[0]["page_number"] == 1
    assert "DocuMind AI PDF extraction test." in pages[0]["text"]


def test_extract_text_from_empty_pdf(tmp_path):
    pdf_path = tmp_path / "empty.pdf"

    document = pymupdf.open()
    document.new_page()
    document.save(pdf_path)
    document.close()

    pages = extract_text_from_pdf(str(pdf_path))

    assert pages == []


def test_extract_text_from_invalid_pdf(tmp_path):
    pdf_path = tmp_path / "invalid.pdf"
    pdf_path.write_text("This is not a valid PDF.")

    with pytest.raises(ValueError, match="Could not read PDF"):
        extract_text_from_pdf(str(pdf_path))