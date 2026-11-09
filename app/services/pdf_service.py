import pymupdf


def extract_text_from_pdf(file_path: str) -> list[dict]:
    pages = []

    try:
        with pymupdf.open(file_path) as pdf_document:

            for page_index, page in enumerate(pdf_document):
                text = page.get_text("text").strip()

                if text:
                    pages.append({
                        "page_number": page_index + 1,
                        "text": text
                    })

    except Exception as error:
        raise ValueError(f"Could not read PDF: {error}") from error

    return pages