
const API_BASE = '/api'

export type Document = {
  document_id: string
  document_name: string
  file_path?: string
  total_pages: number
  total_chunks: number
  uploaded_at: string
}

export type UploadResponse = {
  document_id: string
  document_name: string
  total_pages: number
  total_chunks: number
  status: string
}

export type Source = {
  source_id?: string
  document_id?: string
  document_name?: string
  page_number: number
  chunk_id?: string
  text?: string
  score?: number
}

export type AskResponse = {
  question: string
  answer: string
  sources: Source[]
  status: string
}

export type DocumentTopic = {
  rank: number
  topic: string
  score: number
  pages: number[]
  related_chunks: number
}

export type DocumentTopicsResponse = {
  document_name: string
  document_id: string
  total_chunks: number
  topics: DocumentTopic[]
  status: string
}

type DocumentsResponse = {
  total_documents: number
  documents: Document[]
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const error = await response.json()
      message = error.detail || message
    } catch {
      // Keep the default error message.
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function getDocuments(): Promise<Document[]> {
  const response = await fetch(`${API_BASE}/documents`)
  const data = await handleResponse<DocumentsResponse>(response)

  return data.documents
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/upload-pdf`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse<UploadResponse>(response)
}

export async function deleteDocument(
  documentId: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${API_BASE}/documents/${encodeURIComponent(documentId)}`,
    {
      method: 'DELETE',
    },
  )

  return handleResponse<Record<string, unknown>>(response)
}

export async function askQuestion(
  question: string,
  documentIds?: string[],
): Promise<AskResponse> {
  const response = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      document_ids: documentIds?.length ? documentIds : null,
    }),
  })

  return handleResponse<AskResponse>(response)
}

export async function getDocumentTopics(
  documentId: string,
): Promise<DocumentTopicsResponse> {
  const response = await fetch(
    `${API_BASE}/documents/${encodeURIComponent(documentId)}/topics`,
  )

  return handleResponse<DocumentTopicsResponse>(response)
}
