
import uuid
import shutil

from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.services.document_service import ingest_document
from app.services.rag_service import answer_question
from app.services.document_registry import (
    initialize_database,
    get_all_documents,
    get_document_by_id
)
from app.services.document_deletion_service import delete_document
from app.services.vector_service import close_qdrant_client
from app.services.topic_service import extract_document_topics


# Directory for storing uploaded PDFs
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_qdrant_client()


# Create the FastAPI application
app = FastAPI(
    title="Cognifile AI",
    description="Intelligent Document Assistant",
    version="1.0.0",
    lifespan=lifespan
)

initialize_database()


# Request model for asking questions
class QuestionRequest(BaseModel):
    question: str
    document_ids: list[str] | None = None


# Home endpoint
@app.get("/")
def home():
    return {
        "message": "Welcome to Cognifile AI!",
        "status": "Application is running"
    }


# Health check endpoint
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Cognifile AI"
    }


# Upload and ingest PDF endpoint
@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    document_id = str(uuid.uuid4())
    saved_path = UPLOAD_DIR / f"{document_id}.pdf"

    try:
        with saved_path.open("wb") as destination:
            shutil.copyfileobj(file.file, destination)

        result = ingest_document(
            file_path=str(saved_path),
            document_name=file.filename,
            document_id=document_id
        )

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Document ingestion failed."
        ) from error

    finally:
        await file.close()


# Ask questions about uploaded documents
@app.post("/ask")
def ask_question(request: QuestionRequest):

    try:
        result = answer_question(
            question=request.question,
            document_ids=request.document_ids
        )

        return {
            "question": request.question,
            "answer": result["answer"],
            "sources": result["sources"],
            "status": "success"
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error)
        )


# Get all registered documents
@app.get("/documents")
def list_documents():

    try:
        documents = get_all_documents()

        return {
            "total_documents": len(documents),
            "documents": documents
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve documents."
        ) from error


# Get details of a specific document
@app.get("/documents/{document_id}")
def get_document(document_id: str):

    try:
        document = get_document_by_id(document_id)

        if document is None:
            raise HTTPException(
                status_code=404,
                detail="Document not found."
            )

        return {
            "document": document
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve document."
        ) from error


# Extract topics from a specific document
@app.get("/documents/{document_id}/topics")
def get_document_topics(document_id: str):

    try:
        document = get_document_by_id(document_id)

        if document is None:
            raise HTTPException(
                status_code=404,
                detail="Document not found."
            )

        topics = extract_document_topics(document_id)

        return {
            "document_name": document["document_name"],
            **topics,
            "status": "success"
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Could not extract document topics."
        ) from error


# Delete a document
@app.delete("/documents/{document_id}")
def delete_document_endpoint(document_id: str):

    try:
        result = delete_document(document_id)

        return {
            "message": "Document deleted successfully.",
            "details": result
        }

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Document deletion failed."
        )
