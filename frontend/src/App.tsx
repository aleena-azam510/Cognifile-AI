
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ChatWorkspace from './components/ChatWorkspace'
import IntelligenceHub from './components/intelligence/IntelligenceHub'

import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Files,
  FileUp,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  BrainCircuit,
  X,
} from 'lucide-react'

import {
  deleteDocument,
  getDocuments,
  uploadDocument,
  type Document,
} from './services/api'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'My documents', icon: Files },
  { label: 'Document Intelligence', icon: BrainCircuit },
  { label: 'AI Assistant', icon: MessageSquare },
]

function formatDate(dateString: string) {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function App() {
  const [activePage, setActivePage] = useState('Overview')
  const [search, setSearch] = useState('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await getDocuments()
      setDocuments(data)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not load your documents.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const filteredDocuments = useMemo(
    () =>
      documents.filter((document) =>
        document.document_name
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [documents, search],
  )

  const totalPages = documents.reduce(
    (total, document) => total + document.total_pages,
    0,
  )

  const totalChunks = documents.reduce(
    (total, document) => total + document.total_chunks,
    0,
  )

  const handleFiles = (files: FileList | null) => {
    if (!files) return

    const selected = Array.from(files)
    const pdfFiles = selected.filter(
      (file) =>
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf'),
    )

    if (pdfFiles.length !== selected.length) {
      setErrorMessage('Only PDF files are supported.')
    } else {
      setErrorMessage('')
    }

    if (pdfFiles.length > 0) {
      setSelectedFiles((current) => [...current, ...pdfFiles])
      setSuccessMessage('')
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || isUploading) return

    setIsUploading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const failedFiles: string[] = []
    let uploadedCount = 0

    for (const file of selectedFiles) {
      try {
        await uploadDocument(file)
        uploadedCount += 1
      } catch (error) {
        failedFiles.push(
          `${file.name}: ${
            error instanceof Error ? error.message : 'Upload failed'
          }`,
        )
      }
    }

    setSelectedFiles([])

    if (failedFiles.length > 0) {
      setErrorMessage(
        `${uploadedCount} file(s) uploaded. ${failedFiles.join(' | ')}`,
      )
    } else {
      setSuccessMessage(
        `${uploadedCount} document(s) uploaded and indexed successfully.`,
      )
    }

    await loadDocuments()
    setIsUploading(false)
  }

  const handleDelete = async (document: Document) => {
    const confirmed = window.confirm(
      `Delete "${document.document_name}"? This will remove the document and its indexed data.`,
    )

    if (!confirmed) return

    setDeletingId(document.document_id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteDocument(document.document_id)

      setDocuments((current) =>
        current.filter(
          (item) => item.document_id !== document.document_id,
        ),
      )

      setSuccessMessage(
        `"${document.document_name}" was deleted successfully.`,
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not delete this document.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  const openPage = (page: string) => {
    setActivePage(page)
    setSearch('')
    setErrorMessage('')
    setSuccessMessage('')
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const renderDocument = (document: Document) => (
    <div
      key={document.document_id}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-white/[0.07] hover:bg-white/2.5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
        <FileText size={19} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-200">
          {document.document_name}
        </p>

        <p className="mt-1 text-[10px] text-slate-500">
          PDF document · {document.total_pages} pages · {document.total_chunks} chunks
        </p>
      </div>

      <div className="hidden text-right sm:block">
        <p className="text-[10px] text-slate-400">
          {formatDate(document.uploaded_at)}
        </p>

        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-emerald-400">
          <CheckCircle2 size={10} />
          Indexed
        </div>
      </div>

      <button
        onClick={() => void handleDelete(document)}
        disabled={deletingId === document.document_id}
        className="rounded-lg p-2 text-slate-600 opacity-100 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label={`Delete ${document.document_name}`}
        title="Delete document"
      >
        {deletingId === document.document_id ? (
          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-violet-400" />
        ) : (
          <Trash2 size={16} />
        )}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0b0d14] text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-63 shrink-0 flex-col border-r border-white/[0.07] bg-[#0e1019] px-5 py-6 lg:flex">
          <div className="mb-11 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-900/30">
              <BookOpen size={21} strokeWidth={2.2} />
            </div>

            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-[17px] font-extrabold tracking-tight text-white">
                DocuMind<span className="text-violet-400"> AI</span>
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Document intelligence
              </p>
            </div>
          </div>

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => openPage(label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition ${
                  activePage === label
                    ? 'border border-violet-400/15 bg-violet-500/10 text-violet-300'
                    : 'text-slate-400 hover:bg-white/4 hover:text-white'
                }`}
              >
                <Icon size={17} />
                {label}

                {label === 'My documents' && (
                  <span className="ml-auto rounded-md bg-white/6 px-2 py-0.5 text-[10px] text-slate-400">
                    {documents.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
            Preferences
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => openPage('Settings')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] text-slate-400 transition hover:bg-white/4 hover:text-white"
            >
              <Settings size={17} /> Settings
            </button>

            <button
              onClick={() => openPage('Help & support')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] text-slate-400 transition hover:bg-white/4 hover:text-white"
            >
              <CircleHelp size={17} /> Help & support
            </button>
          </nav>

          <div className="mt-auto">
            <div className="mb-5 rounded-2xl border border-violet-400/15 bg-linear-to-br from-violet-500/10 to-indigo-500/4 p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                <Sparkles size={16} />
              </div>

              <p className="text-[13px] font-semibold text-white">
                Your AI workspace
              </p>

              <p className="mt-1 text-[11px] leading-5 text-slate-400">
                Upload your documents and turn information into insights.
              </p>

              <button
                onClick={openFilePicker}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 px-3 py-2.5 text-[11px] font-semibold text-white transition hover:bg-violet-400"
              >
                <Plus size={14} /> Add a document
              </button>
            </div>

            <div className="flex items-center gap-3 border-t border-white/[0.07] px-1 pt-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-violet-600 text-xs font-bold text-white">
                DM
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  My Workspace
                </p>
                <p className="text-[10px] text-slate-500">
                  Personal account
                </p>
              </div>

              <MoreHorizontal size={18} className="text-slate-500" />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex h-19 items-center justify-between border-b border-white/[0.07] px-5 sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 lg:hidden">
                <BookOpen size={18} />
              </div>

              <div>
                <p className="text-[11px] text-slate-500">
                  Workspace / <span className="text-slate-300">{activePage}</span>
                </p>

                <p className="mt-0.5 text-sm font-semibold text-white">
                  {activePage}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/6 px-3 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[10px] font-medium text-emerald-300">
                  Backend connected
                </span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications((value) => !value)}
                  className="relative rounded-xl border border-white/8 p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-violet-400" />
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-white/10 bg-[#171a27] p-4 shadow-2xl">
                    <p className="text-sm font-semibold text-white">
                      Notifications
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      You're all caught up. New activity will appear here.
                    </p>
                  </div>
                )}
              </div>

              <button className="flex items-center gap-2 rounded-xl border border-white/8 p-1.5 pr-3 transition hover:bg-white/5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 text-[10px] font-bold text-violet-300">
                  DM
                </div>
                <ChevronDown size={14} className="text-slate-500" />
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            {activePage === 'AI Assistant' ? (
              <motion.div
                key="ai-chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="min-h-[calc(100vh-76px)]"
              >
                <ChatWorkspace documents={documents} isLoading={isLoading} />
              </motion.div>
            ) : activePage === 'Document Intelligence' ? (
              <motion.div
                key="intelligence-hub"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <IntelligenceHub
                  documents={documents}
                  isLoading={isLoading}
                  onOpenDocuments={() => openPage('My documents')}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mx-auto max-w-362.5 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
                  {errorMessage && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-500/5 p-4">
                      <X size={16} className="mt-0.5 shrink-0 text-red-400" />
                      <p className="flex-1 text-xs leading-5 text-red-300">
                        {errorMessage}
                      </p>
                      <button
                        onClick={() => setErrorMessage('')}
                        aria-label="Dismiss error"
                        className="text-red-400 hover:text-white"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {successMessage && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                      <p className="flex-1 text-xs leading-5 text-emerald-300">
                        {successMessage}
                      </p>
                      <button
                        onClick={() => setSuccessMessage('')}
                        aria-label="Dismiss message"
                        className="text-emerald-400 hover:text-white"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {activePage === 'My documents' ? (
                    <>
                      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                        <div>
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/[0.07] px-3 py-1.5">
                            <Files size={12} className="text-violet-300" />
                            <span className="text-[10px] font-semibold tracking-wide text-violet-200">
                              YOUR DOCUMENT LIBRARY
                            </span>
                          </div>

                          <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold tracking-tight text-white">
                            My documents<span className="text-violet-400">.</span>
                          </h1>

                          <p className="mt-2 text-sm text-slate-400">
                            Manage your uploaded and indexed PDF files.
                          </p>
                        </div>

                        <button
                          onClick={openFilePicker}
                          className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-indigo-500"
                        >
                          <FileUp size={16} /> Upload documents
                        </button>
                      </div>

                      <section className="rounded-2xl border border-white/[0.07] bg-[#11141e] p-5 sm:p-6">
                        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div>
                            <h3 className="text-sm font-bold text-white">
                              All documents
                            </h3>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {documents.length} document(s) in your workspace
                            </p>
                          </div>

                          <div className="relative sm:w-60">
                            <Search
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                            />
                            <input
                              value={search}
                              onChange={(event) => setSearch(event.target.value)}
                              placeholder="Search documents..."
                              className="w-full rounded-lg border border-white/8 bg-[#0c0f18] py-2 pl-9 pr-3 text-[11px] text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                            />
                          </div>
                        </div>

                        {isLoading ? (
                          <div className="py-12 text-center">
                            <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-violet-400" />
                            <p className="mt-3 text-xs text-slate-400">
                              Loading your documents...
                            </p>
                          </div>
                        ) : filteredDocuments.length > 0 ? (
                          <div className="space-y-2">
                            {filteredDocuments.map(renderDocument)}
                          </div>
                        ) : (
                          <div className="py-12 text-center">
                            <FolderOpen size={28} className="mx-auto text-slate-600" />
                            <p className="mt-3 text-xs text-slate-300">
                              {search
                                ? 'No matching documents found.'
                                : 'Your document library is empty.'}
                            </p>
                            {!search && (
                              <button
                                onClick={openFilePicker}
                                className="mt-4 text-xs font-semibold text-violet-300 hover:text-violet-200"
                              >
                                Upload your first PDF
                              </button>
                            )}
                          </div>
                        )}
                      </section>
                    </>
                  ) : activePage === 'Overview' ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                        className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
                      >
                        <div>
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/[0.07] px-3 py-1.5">
                            <Sparkles size={12} className="text-violet-300" />
                            <span className="text-[10px] font-semibold tracking-wide text-violet-200">
                              YOUR INTELLIGENT DOCUMENT WORKSPACE
                            </span>
                          </div>

                          <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold tracking-tight text-white sm:text-[38px]">
                            Good morning<span className="text-violet-400">.</span>
                          </h1>

                          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                            Your knowledge, organized and ready to explore.
                            What would you like to discover today?
                          </p>
                        </div>

                        <button
                          onClick={openFilePicker}
                          className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-indigo-500"
                        >
                          <FileUp size={16} /> Upload documents
                        </button>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.08 }}
                        className="relative mb-8 overflow-hidden rounded-2xl border border-violet-400/20 bg-linear-to-r from-[#211b3c] via-[#191a35] to-[#151b31] p-6 sm:p-8"
                      >
                        <div className="pointer-events-none absolute -right-10 -top-32 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-25 right-[25%] h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

                        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                          <div className="max-w-xl">
                            <div className="mb-3 flex items-center gap-2 text-violet-300">
                              <Sparkles size={16} />
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                                Meet your AI assistant
                              </span>
                            </div>

                            <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold leading-snug text-white sm:text-2xl">
                              Don't just store documents.
                              <br className="hidden sm:block" /> Understand them.
                            </h2>

                            <p className="mt-3 max-w-md text-xs leading-6 text-slate-300/75">
                              Ask questions across your PDFs, discover key
                              insights, and get answers grounded in your own
                              documents.
                            </p>

                            <button
                              onClick={() => openPage('AI Assistant')}
                              className="mt-5 flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-[#17152a] transition hover:bg-violet-100"
                            >
                              Open AI assistant <ArrowRight size={15} />
                            </button>
                          </div>

                          <div className="hidden h-36 w-36 shrink-0 items-center justify-center rounded-[28px] border border-white/10 bg-white/4 shadow-2xl shadow-black/20 md:flex">
                            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-linear-to-br from-violet-500 to-indigo-600 shadow-xl shadow-violet-950/50">
                              <BookOpen size={39} strokeWidth={1.5} className="text-white" />
                              <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-[#211b3c] text-violet-200">
                                <Sparkles size={15} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          {
                            label: 'Total documents',
                            value: isLoading ? '—' : documents.length.toString(),
                            note: 'In your workspace',
                            icon: Files,
                            color: 'violet',
                          },
                          {
                            label: 'Pages indexed',
                            value: isLoading ? '—' : totalPages.toLocaleString(),
                            note: 'Across your PDFs',
                            icon: FileText,
                            color: 'blue',
                          },
                          {
                            label: 'Chunks indexed',
                            value: isLoading ? '—' : totalChunks.toLocaleString(),
                            note: 'Available for retrieval',
                            icon: Activity,
                            color: 'emerald',
                          },
                          {
                            label: 'Secure workspace',
                            value: 'Active',
                            note: 'Your documents stay yours',
                            icon: ShieldCheck,
                            color: 'amber',
                          },
                        ].map((stat, index) => {
                          const Icon = stat.icon

                          const iconStyles: Record<string, string> = {
                            violet: 'bg-violet-500/10 text-violet-300',
                            blue: 'bg-blue-500/10 text-blue-300',
                            emerald: 'bg-emerald-500/10 text-emerald-300',
                            amber: 'bg-amber-500/10 text-amber-300',
                          }

                          return (
                            <motion.div
                              key={stat.label}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.12 + index * 0.06 }}
                              className="rounded-2xl border border-white/[0.07] bg-[#11141e] p-5 transition hover:border-white/13"
                            >
                              <div className="mb-4 flex items-center justify-between">
                                <span className="text-[11px] font-medium text-slate-400">
                                  {stat.label}
                                </span>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconStyles[stat.color]}`}>
                                  <Icon size={17} />
                                </div>
                              </div>

                              <p className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">
                                {stat.value}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-500">
                                {stat.note}
                              </p>
                            </motion.div>
                          )
                        })}
                      </div>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_0.85fr]">
                        <section className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#11141e] p-5 sm:p-6">
                          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                              <h3 className="text-sm font-bold text-white">
                                Recent documents
                              </h3>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Your latest uploaded files
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                  value={search}
                                  onChange={(event) => setSearch(event.target.value)}
                                  placeholder="Search documents..."
                                  className="w-full rounded-lg border border-white/8 bg-[#0c0f18] py-2 pl-9 pr-3 text-[11px] text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
                                />
                              </div>

                              <button
                                onClick={() => openPage('My documents')}
                                className="whitespace-nowrap rounded-lg border border-white/8 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:bg-white/5"
                              >
                                View all
                              </button>
                            </div>
                          </div>

                          {isLoading ? (
                            <div className="py-10 text-center">
                              <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-violet-400" />
                              <p className="mt-3 text-xs text-slate-400">
                                Loading documents...
                              </p>
                            </div>
                          ) : filteredDocuments.length > 0 ? (
                            <div className="space-y-2">
                              {filteredDocuments.slice(0, 5).map(renderDocument)}
                            </div>
                          ) : (
                            <div className="py-10 text-center">
                              <FolderOpen size={25} className="mx-auto text-slate-600" />
                              <p className="mt-3 text-xs text-slate-400">
                                {search ? 'No matching documents found.' : 'No documents uploaded yet.'}
                              </p>
                            </div>
                          )}
                        </section>

                        <section className="rounded-2xl border border-white/[0.07] bg-[#11141e] p-5 sm:p-6">
                          <div className="mb-5">
                            <h3 className="text-sm font-bold text-white">
                              Quick actions
                            </h3>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Get things done faster
                            </p>
                          </div>

                          <button
                            onClick={openFilePicker}
                            className="group mb-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-violet-400/25 bg-violet-500/4.5 p-4 text-left transition hover:border-violet-400/50 hover:bg-violet-500/8"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 transition group-hover:scale-105">
                              <UploadCloud size={19} />
                            </div>

                            <div className="flex-1">
                              <p className="text-xs font-semibold text-white">Upload a PDF</p>
                              <p className="mt-1 text-[10px] text-slate-500">Add documents to your library</p>
                            </div>

                            <ArrowRight size={15} className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-violet-300" />
                          </button>

                          <button
                            onClick={() => openPage('AI Assistant')}
                            className="group mb-3 flex w-full items-center gap-3 rounded-xl border border-white/[0.07] p-4 text-left transition hover:border-white/15 hover:bg-white/2.5"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                              <MessageSquare size={18} />
                            </div>

                            <div className="flex-1">
                              <p className="text-xs font-semibold text-white">Ask your documents</p>
                              <p className="mt-1 text-[10px] text-slate-500">Get answers with source citations</p>
                            </div>

                            <ArrowRight size={15} className="text-slate-500 transition group-hover:translate-x-1" />
                          </button>

                          <div className="mt-6 border-t border-white/[0.07] pt-5">
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                              Workspace activity
                            </p>

                            <div className="flex gap-3">
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                                <CheckCircle2 size={14} />
                              </div>
                              <div>
                                <p className="text-[11px] font-medium text-slate-300">Document storage connected</p>
                                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                                  Your library is synchronized with the backend.
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-3">
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                                <Clock3 size={14} />
                              </div>
                              <div>
                                <p className="text-[11px] font-medium text-slate-300">Keep your knowledge together</p>
                                <p className="mt-1 text-[10px] leading-5 text-slate-500">
                                  Upload PDFs to make them searchable in one place.
                                </p>
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-white/[0.07] bg-[#11141e] p-8">
                      <h2 className="text-lg font-bold text-white">
                        {activePage}
                      </h2>
                      <p className="mt-2 text-sm text-slate-400">
                        This section is not implemented yet.
                      </p>
                    </div>
                  )}

                  {selectedFiles.length > 0 && (
                    <div className="fixed bottom-5 right-5 z-30 w-[min(390px,calc(100vw-40px))] rounded-2xl border border-violet-400/20 bg-[#191b2a] p-4 shadow-2xl shadow-black/50">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold text-white">
                          Selected PDF files ({selectedFiles.length})
                        </p>

                        <button
                          onClick={() => setSelectedFiles([])}
                          disabled={isUploading}
                          aria-label="Clear selected files"
                          className="text-slate-500 hover:text-white disabled:opacity-40"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="mb-3 max-h-28 space-y-2 overflow-auto">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 text-[11px] text-slate-300"
                          >
                            <FileText size={14} className="shrink-0 text-violet-300" />
                            <span className="truncate">{file.name}</span>
                            <span className="ml-auto shrink-0 text-slate-500">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => void handleUpload()}
                        disabled={isUploading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Uploading and indexing...
                          </>
                        ) : (
                          <>
                            <UploadCloud size={14} />
                            Upload {selectedFiles.length} PDF(s)
                          </>
                        )}
                      </button>

                      {isUploading && (
                        <p className="mt-2 text-center text-[10px] text-slate-500">
                          Processing files. Please keep this page open.
                        </p>
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />

                  <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-white/6 pt-5 text-[10px] text-slate-600 sm:flex-row">
                    <span>
                      © 2026 DocuMind AI. Intelligent document workspace.
                    </span>
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={12} />
                      Built for smarter document workflows
                    </span>
                  </footer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App
