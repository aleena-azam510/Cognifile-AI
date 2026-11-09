
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  User,
  WandSparkles,
} from 'lucide-react'
import {
  askQuestion,
  type Document,
  type Source,
} from '../services/api'

type Message = {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

type ChatWorkspaceProps = {
  documents: Document[]
  isLoading: boolean
}

const suggestions = [
  {
    title: 'Summarize my document',
    description: 'Get the key points and main ideas.',
    icon: FileText,
  },
  {
    title: 'Explain complex topics',
    description: 'Understand difficult concepts simply.',
    icon: Sparkles,
  },
  {
    title: 'Find important details',
    description: 'Locate facts, figures and insights.',
    icon: BookOpen,
  },
]

const SOURCE_PREVIEW_LENGTH = 180

export default function ChatWorkspace({
  documents,
  isLoading,
}: ChatWorkspaceProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDocumentId, setSelectedDocumentId] = useState('all')
  const [expandedSources, setExpandedSources] = useState<
    Record<string, boolean>
  >({})
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null)

  useEffect(() => {
    if (
      selectedDocumentId !== 'all' &&
      !documents.some(
        (document) => document.document_id === selectedDocumentId,
      )
    ) {
      setSelectedDocumentId('all')
    }
  }, [documents, selectedDocumentId])

  const clearConversation = () => {
    if (loading) return

    setMessages([])
    setQuestion('')
    setError('')
    setExpandedSources({})
    setCopiedMessageId(null)
  }

  const toggleSource = (sourceKey: string) => {
    setExpandedSources((current) => ({
      ...current,
      [sourceKey]: !current[sourceKey],
    }))
  }

  const copyAnswer = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedMessageId(message.id)

      window.setTimeout(() => {
        setCopiedMessageId((current) =>
          current === message.id ? null : current,
        )
      }, 2000)
    } catch {
      setError('Unable to copy the answer. Please try again.')
    }
  }

  const sendMessage = async () => {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || loading) return

    if (documents.length === 0) {
      setError('Upload a PDF before asking questions.')
      return
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: trimmedQuestion,
    }

    setMessages((current) => [...current, userMessage])
    setQuestion('')
    setError('')
    setLoading(true)

    try {
      const documentIds =
        selectedDocumentId === 'all'
          ? undefined
          : [selectedDocumentId]

      const response = await askQuestion(trimmedQuestion, documentIds)

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      }

      setMessages((current) => [...current, assistantMessage])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-76px)] flex-col bg-[#0b0d14]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
            <WandSparkles size={19} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Assistant</h2>
            <p className="mt-1 text-[10px] text-slate-500">
              Powered by your document knowledge
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={clearConversation}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold text-violet-300 transition hover:border-violet-400/40 hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={14} />
            New Chat
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearConversation}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={13} />
              Clear Conversation
            </button>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-3 py-2">
            <FileText size={14} className="shrink-0 text-violet-300" />
            <select
              value={selectedDocumentId}
              onChange={(event) =>
                setSelectedDocumentId(event.target.value)
              }
              disabled={isLoading || documents.length === 0}
              aria-label="Select document for questions"
              className="max-w-47.5 cursor-pointer bg-transparent text-[11px] text-slate-300 outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all" className="bg-[#141722]">
                All Documents
              </option>
              {documents.map((document) => (
                <option
                  key={document.document_id}
                  value={document.document_id}
                  className="bg-[#141722]"
                >
                  {document.document_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-8">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="m-auto w-full max-w-2xl py-10"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-linear-to-br from-violet-500/20 to-indigo-500/10 shadow-lg shadow-violet-950/20">
                <Sparkles size={28} className="text-violet-300" />
              </div>

              <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">
                Your knowledge companion
              </p>

              <h1 className="text-center font-['Plus_Jakarta_Sans'] text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ask. Discover.
                <span className="block bg-linear-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
                  Understand more.
                </span>
              </h1>

              <p className="mx-auto mt-4 max-w-md text-center text-sm leading-7 text-slate-400">
                Ask questions about your uploaded PDFs and discover
                answers grounded in their content.
              </p>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {suggestions.map((item, index) => {
                  const Icon = item.icon

                  return (
                    <motion.button
                      key={item.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + index * 0.08 }}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setQuestion(item.title)}
                      className="rounded-2xl border border-white/8 bg-[#11141e] p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-500/4"
                    >
                      <Icon size={19} className="mb-4 text-violet-300" />
                      <p className="text-xs font-semibold text-slate-200">
                        {item.title}
                      </p>
                      <p className="mt-2 text-[10px] leading-5 text-slate-500">
                        {item.description}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto w-full max-w-3xl space-y-7 pb-8"
            >
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      message.role === 'user'
                        ? 'bg-indigo-500/15 text-indigo-300'
                        : 'bg-violet-500/15 text-violet-300'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User size={17} />
                    ) : (
                      <Sparkles size={17} />
                    )}
                  </div>

                  <div className="max-w-[85%] min-w-0">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                        message.role === 'user'
                          ? 'rounded-tr-sm border border-indigo-400/15 bg-indigo-500/10 text-slate-200'
                          : 'rounded-tl-sm border border-white/[0.07] bg-[#141722] text-slate-300'
                      }`}
                    >
                      {message.content}
                    </div>

                    {message.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => void copyAnswer(message)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white/5 hover:text-violet-300"
                        aria-label="Copy answer"
                      >
                        {copiedMessageId === message.id ? (
                          <>
                            <Check size={13} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            Copy answer
                          </>
                        )}
                      </button>
                    )}

                    {message.role === 'assistant' &&
                      message.sources &&
                      message.sources.length > 0 && (
                        <div className="mt-3 rounded-xl border border-white/[0.07] bg-[#11141e] p-3">
                          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                            <BookOpen size={13} />
                            Sources ({message.sources.length})
                          </p>

                          <div className="space-y-3">
                            {message.sources.map((source, sourceIndex) => {
                              const sourceKey = `${message.id}-${source.source_id ?? sourceIndex}`
                              const sourceText = source.text ?? ''
                              const isLong =
                                sourceText.length > SOURCE_PREVIEW_LENGTH
                              const isExpanded =
                                expandedSources[sourceKey] ?? false

                              const displayedText =
                                isLong && !isExpanded
                                  ? `${sourceText.slice(0, SOURCE_PREVIEW_LENGTH).trimEnd()}...`
                                  : sourceText

                              return (
                                <div
                                  key={sourceKey}
                                  className="rounded-lg border border-white/6 bg-white/2 p-3"
                                >
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                                    <FileText
                                      size={13}
                                      className="shrink-0 text-violet-300"
                                    />

                                    <span className="min-w-0 flex-1 truncate font-medium text-slate-300">
                                      {source.document_name ?? 'Document'}
                                    </span>

                                    <span className="shrink-0 text-slate-500">
                                      Page {source.page_number}
                                    </span>
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {source.source_id && (
                                      <span className="rounded-md border border-violet-400/15 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
                                        [{source.source_id}]
                                      </span>
                                    )}

                                    {typeof source.score === 'number' && (
                                      <span className="text-[10px] text-slate-500">
                                        Similarity: {(source.score * 100).toFixed(1)}%
                                      </span>
                                    )}
                                  </div>

                                  {sourceText && (
                                    <div className="mt-3">
                                      <p className="whitespace-pre-wrap wrap-break-word text-[11px] leading-6 text-slate-400">
                                        {displayedText}
                                      </p>

                                      {isLong && (
                                        <button
                                          type="button"
                                          onClick={() => toggleSource(sourceKey)}
                                          className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-300 transition hover:text-violet-200"
                                        >
                                          {isExpanded ? (
                                            <>
                                              Show less
                                              <ChevronUp size={13} />
                                            </>
                                          ) : (
                                            <>
                                              Read full passage
                                              <ChevronDown size={13} />
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                    <Sparkles size={17} />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl border border-white/[0.07] bg-[#141722] px-4 py-4">
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: dot * 0.15,
                        }}
                        className="h-1.5 w-1.5 rounded-full bg-violet-300"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mx-auto mt-4 w-full max-w-3xl rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-white/[0.07] bg-[#0b0d14]/95 px-4 py-5 backdrop-blur-xl sm:px-8">
        <div className="mx-auto max-w-3xl">
          {documents.length === 0 && !isLoading && (
            <p className="mb-3 text-center text-xs text-amber-300/80">
              Upload a PDF to start asking questions.
            </p>
          )}

          <div className="rounded-2xl border border-white/10 bg-[#141722] p-3 shadow-xl shadow-black/10 transition focus-within:border-violet-400/40">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder="Ask a question about your documents..."
              rows={2}
              disabled={loading || documents.length === 0 || isLoading}
              className="max-h-36 min-h-14 w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
            />

            <div className="flex items-center justify-between border-t border-white/6 pt-3">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                  <MessageSquare size={13} />
                </div>
                <span>Answers grounded in your documents</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => void sendMessage()}
                disabled={
                  !question.trim() ||
                  loading ||
                  documents.length === 0 ||
                  isLoading
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-950/30 transition disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Send message"
              >
                <ArrowUp size={18} />
              </motion.button>
            </div>
          </div>

          <p className="mt-3 text-center text-[10px] text-slate-600">
            Cognifile AI can make mistakes. Verify important information against its sources.
          </p>
        </div>
      </div>
    </div>
  )
}
