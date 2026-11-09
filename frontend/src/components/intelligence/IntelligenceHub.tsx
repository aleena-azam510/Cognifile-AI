
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Files,
  FileText,
  Network,
  Sparkles,
  Layers3,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import {
  getDocumentTopics,
  type Document,
  type DocumentTopicsResponse,
} from '../../services/api'

type Props = {
  documents: Document[]
  isLoading: boolean
  onOpenDocuments: () => void
}

function IntelligenceHub({
  documents,
  isLoading,
  onOpenDocuments,
}: Props) {
  const [selectedDocumentId, setSelectedDocumentId] = useState('')
  const [topicData, setTopicData] = useState<DocumentTopicsResponse | null>(null)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [topicsError, setTopicsError] = useState('')
  const [expandedTopics, setExpandedTopics] = useState<number[]>([])
  const [selectedGraphTopic, setSelectedGraphTopic] = useState<number | null>(null)
  const [minimumSharedPages, setMinimumSharedPages] = useState(5)

  const totalPages = documents.reduce(
    (total, document) => total + document.total_pages,
    0,
  )

  const totalChunks = documents.reduce(
    (total, document) => total + document.total_chunks,
    0,
  )

  const averageChunks = totalPages
    ? (totalChunks / totalPages).toFixed(1)
    : '0'

  const largestDocument = [...documents].sort(
    (a, b) => b.total_chunks - a.total_chunks,
  )[0]

  const maxPages = Math.max(
    ...documents.map((document) => document.total_pages),
    1,
  )

  const maxChunks = Math.max(
    ...documents.map((document) => document.total_chunks),
    1,
  )

  const stats = [
    {
      label: 'Knowledge sources',
      value: documents.length,
      detail: 'Indexed PDF documents',
      icon: Files,
      color: 'text-violet-300',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Pages analyzed',
      value: totalPages.toLocaleString(),
      detail: 'Pages extracted from PDFs',
      icon: FileText,
      color: 'text-blue-300',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Knowledge chunks',
      value: totalChunks.toLocaleString(),
      detail: 'Vectorized text segments',
      icon: Layers3,
      color: 'text-emerald-300',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Chunks per page',
      value: averageChunks,
      detail: 'Average indexing density',
      icon: Activity,
      color: 'text-amber-300',
      bg: 'bg-amber-500/10',
    },
  ]

  useEffect(() => {
    if (!documents.length) {
      setSelectedDocumentId('')
      setTopicData(null)
      setTopicsError('')
      return
    }

    const selectedExists = documents.some(
      (document) => document.document_id === selectedDocumentId,
    )

    if (!selectedExists) {
      setSelectedDocumentId(documents[0].document_id)
    }
  }, [documents, selectedDocumentId])

  useEffect(() => {
    if (!selectedDocumentId) {
      setTopicData(null)
      return
    }

    let cancelled = false

    async function loadTopics() {
      setTopicsLoading(true)
      setTopicsError('')
      setTopicData(null)
      setExpandedTopics([])
      setSelectedGraphTopic(null)

      try {
        const data = await getDocumentTopics(selectedDocumentId)

        if (!cancelled) {
          setTopicData(data)
        }
      } catch (error) {
        if (!cancelled) {
          setTopicsError(
            error instanceof Error
              ? error.message
              : 'Unable to load document topics.',
          )
        }
      } finally {
        if (!cancelled) {
          setTopicsLoading(false)
        }
      }
    }

    loadTopics()

    return () => {
      cancelled = true
    }
  }, [selectedDocumentId])

  const selectedDocument = documents.find(
    (document) => document.document_id === selectedDocumentId,
  )

  const toggleTopicPages = (rank: number) => {
    setExpandedTopics((current) =>
      current.includes(rank)
        ? current.filter((item) => item !== rank)
        : [...current, rank],
    )
  }

  // Calculate topic relationships using shared page references.
  const graph = useMemo(() => {
    const topics = topicData?.topics ?? []
    const centerX = 250
    const centerY = 175
    const radius = topics.length <= 4 ? 105 : 125

    const nodes = topics.map((topic, index) => {
      const angle =
        (2 * Math.PI * index) / Math.max(topics.length, 1) - Math.PI / 2

      return {
        ...topic,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    })

    const allEdges: {
      source: number
      target: number
      sharedPages: number
    }[] = []

    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const sharedPages = topics[i].pages.filter((page) =>
          topics[j].pages.includes(page),
        ).length

        if (sharedPages > 0) {
          allEdges.push({
            source: topics[i].rank,
            target: topics[j].rank,
            sharedPages,
          })
        }
      }
    }

    const filteredEdges = allEdges.filter(
      (edge) => edge.sharedPages >= minimumSharedPages,
    )

    const connectedRanks = new Set(
      filteredEdges.flatMap((edge) => [edge.source, edge.target]),
    )

    const isolatedNodes = nodes.filter(
      (node) => !connectedRanks.has(node.rank),
    )

    return {
      nodes,
      edges: filteredEdges,
      allEdges,
      isolatedNodes,
    }
  }, [topicData, minimumSharedPages])

  const selectedNode = graph.nodes.find(
    (node) => node.rank === selectedGraphTopic,
  )

  const connectedRanks = selectedGraphTopic === null
    ? []
    : graph.edges
        .filter(
          (edge) =>
            edge.source === selectedGraphTopic ||
            edge.target === selectedGraphTopic,
        )
        .flatMap((edge) => [edge.source, edge.target])
        .filter((rank) => rank !== selectedGraphTopic)

  const selectedNodeHasConnections = selectedNode
    ? graph.edges.some(
        (edge) =>
          edge.source === selectedNode.rank ||
          edge.target === selectedNode.rank,
      )
    : false

  return (
    <div className="mx-auto max-w-362.5 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-9"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/[0.07] px-3 py-1.5">
          <BrainCircuit size={13} className="text-violet-300" />
          <span className="text-[10px] font-semibold tracking-wide text-violet-200">
            DOCUMENT INTELLIGENCE ENGINE
          </span>
        </div>

        <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold tracking-tight text-white sm:text-[38px]">
          Intelligence Hub<span className="text-violet-400">.</span>
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
          Explore your document knowledge base, understand its structure,
          and monitor your indexed information.
        </p>
      </motion.div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              className="rounded-2xl border border-white/[0.07] bg-[#11141e] p-5 transition hover:border-violet-400/20"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  {stat.label}
                </span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                  <Icon size={17} />
                </div>
              </div>

              <p className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-white">
                {isLoading ? '—' : stat.value}
              </p>

              <p className="mt-1 text-[10px] text-slate-500">
                {stat.detail}
              </p>
            </motion.div>
          )
        })}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-2xl border border-white/[0.07] bg-[#11141e] p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">
                Knowledge distribution
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Indexed pages and chunks by document
              </p>
            </div>
            <BarChart3 size={19} className="text-violet-300" />
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-xs text-slate-500">
              Loading document analytics...
            </p>
          ) : documents.length === 0 ? (
            <div className="py-10 text-center">
              <Files size={27} className="mx-auto text-slate-600" />
              <p className="mt-3 text-xs text-slate-400">
                Upload a PDF to start building your knowledge base.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {documents.map((document, index) => (
                <div key={document.document_id}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="truncate text-xs font-semibold text-slate-200">
                      {document.document_name}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {document.total_pages} pages
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                      <span>Page distribution</span>
                      <span>
                        {Math.round(
                          (document.total_pages / Math.max(totalPages, 1)) * 100,
                        )}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/6">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(document.total_pages / maxPages) * 100}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className="h-full rounded-full bg-linear-to-r from-violet-500 to-indigo-400"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                      <span>Indexed chunks</span>
                      <span>{document.total_chunks.toLocaleString()}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/6">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(document.total_chunks / maxChunks) * 100}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 + 0.1 }}
                        className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-linear-to-br from-[#201b3c] to-[#111827] p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl" />

          <div className="relative">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/10 text-violet-200">
              <Sparkles size={21} />
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
              Knowledge snapshot
            </p>

            <h2 className="mt-3 font-['Plus_Jakarta_Sans'] text-xl font-bold text-white">
              Your documents,
              <br /> one knowledge base.
            </h2>

            <p className="mt-3 text-xs leading-6 text-slate-400">
              Your PDFs are extracted, divided into searchable chunks,
              and stored in your vector database for semantic retrieval.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <span className="text-[11px] text-slate-400">
                  Largest document
                </span>
                <span className="max-w-[55%] truncate text-[11px] font-semibold text-white">
                  {isLoading ? '—' : largestDocument?.document_name ?? 'None'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Average chunks / page
                </span>
                <span className="text-sm font-bold text-white">
                  {isLoading ? '—' : averageChunks}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenDocuments}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#17152a] transition hover:bg-violet-100"
            >
              Explore documents
              <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.07] bg-[#11141e] p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                <BookOpen size={19} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Topic Explorer
                </h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  Locally extracted document themes
                </p>
              </div>
            </div>

            {topicData && (
              <span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-2.5 py-1 text-[9px] font-semibold text-emerald-300">
                LOCAL ANALYSIS
              </span>
            )}
          </div>

          {documents.length > 0 && (
            <div className="relative mb-5">
              <select
                value={selectedDocumentId}
                onChange={(event) => setSelectedDocumentId(event.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#171b28] px-4 py-3 pr-10 text-xs text-slate-200 outline-none transition focus:border-violet-400/40"
              >
                {documents.map((document) => (
                  <option
                    key={document.document_id}
                    value={document.document_id}
                  >
                    {document.document_name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          )}

          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <Files size={25} className="mx-auto text-slate-600" />
              <p className="mt-3 text-xs text-slate-400">
                Upload a PDF to discover its topics.
              </p>
            </div>
          ) : topicsLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <RefreshCw size={22} className="animate-spin text-violet-300" />
              <p className="text-xs text-slate-400">
                Extracting document topics...
              </p>
            </div>
          ) : topicsError ? (
            <div className="rounded-xl border border-red-400/15 bg-red-400/5 p-5">
              <p className="text-xs font-semibold text-red-300">
                Unable to load topics
              </p>
              <p className="mt-2 wrap-break-word text-[11px] leading-5 text-slate-400">
                {topicsError}
              </p>
            </div>
          ) : topicData && topicData.topics.length > 0 ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] text-slate-500">
                  {topicData.total_chunks} chunks analyzed
                </p>
                <p className="text-[10px] text-slate-500">
                  {topicData.topics.length} key topics
                </p>
              </div>

              <div className="space-y-3">
                {topicData.topics.map((topic, index) => {
                  const maxScore = Math.max(
                    ...topicData.topics.map((item) => item.score),
                    0.001,
                  )
                  const isExpanded = expandedTopics.includes(topic.rank)

                  return (
                    <motion.div
                      key={topic.topic}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="overflow-hidden rounded-xl border border-white/6 bg-white/2 transition hover:border-violet-400/20"
                    >
                      <div className="p-3.5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-[11px] font-bold text-violet-300">
                              {topic.rank}
                            </span>
                            <span className="truncate text-sm font-semibold capitalize text-slate-200">
                              {topic.topic}
                            </span>
                          </div>

                          <span className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] text-slate-400">
                            {topic.related_chunks} chunks
                          </span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(topic.score / maxScore) * 100}%`,
                            }}
                            transition={{ duration: 0.7, delay: index * 0.05 }}
                            className="h-full rounded-full bg-linear-to-r from-violet-500 to-blue-400"
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500">
                            Relevance: {topic.score.toFixed(4)}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleTopicPages(topic.rank)}
                            className="inline-flex items-center gap-1.5 text-[10px] font-medium text-violet-300 transition hover:text-violet-200"
                          >
                            {topic.pages.length} pages
                            <ChevronDown
                              size={12}
                              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-white/6 bg-black/10 px-4 py-3">
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                            Referenced pages
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {topic.pages.map((page) => (
                              <span
                                key={page}
                                className="rounded-md border border-white/[0.07] bg-white/4 px-2 py-1 text-[10px] tabular-nums text-slate-400"
                              >
                                {page}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-7 text-center">
              <BookOpen size={24} className="mx-auto text-slate-600" />
              <p className="mt-3 text-xs text-slate-400">
                No topics were found in this document.
              </p>
            </div>
          )}

          {selectedDocument && (
            <p className="mt-4 truncate text-[9px] text-slate-600">
              Analyzed: {selectedDocument.document_name}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#11141e] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <Network size={19} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Knowledge Connections
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">
                Filtered topic relationships
              </p>
            </div>
          </div>

          {topicsLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <RefreshCw size={22} className="animate-spin text-violet-300" />
              <p className="text-xs text-slate-400">
                Building topic connections...
              </p>
            </div>
          ) : topicsError ? (
            <div className="rounded-xl border border-red-400/15 bg-red-400/5 p-5">
              <p className="text-xs text-red-300">
                Topic relationships are unavailable.
              </p>
            </div>
          ) : graph.nodes.length > 0 ? (
            <>
              <div className="mb-5 rounded-xl border border-white/6 bg-white/2 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">
                      Minimum shared pages
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Hide connections weaker than this value.
                    </p>
                  </div>
                  <span className="rounded-lg bg-violet-500/10 px-2.5 py-1 text-xs font-bold tabular-nums text-violet-300">
                    {minimumSharedPages}
                  </span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={Math.max(
                    10,
                    ...graph.allEdges.map((edge) => edge.sharedPages),
                  )}
                  step={1}
                  value={minimumSharedPages}
                  onChange={(event) => {
                    setMinimumSharedPages(Number(event.target.value))
                    setSelectedGraphTopic(null)
                  }}
                  className="w-full cursor-pointer accent-violet-500"
                />

                <div className="mt-2 flex justify-between text-[9px] text-slate-500">
                  <span>1 page</span>
                  <span>
                    {Math.max(
                      10,
                      ...graph.allEdges.map((edge) => edge.sharedPages),
                    )} pages
                  </span>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] text-slate-500">
                  {graph.nodes.length} topics · {graph.edges.length} connections
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGraphTopic(null)
                    setMinimumSharedPages(1)
                  }}
                  className="text-[10px] font-medium text-violet-300 transition hover:text-violet-200"
                >
                  Reset filters
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/6 bg-[#0d111b]">
                <svg
                  viewBox="0 0 500 350"
                  role="img"
                  aria-label="Interactive topic relationship graph"
                  className="h-auto w-full"
                >
                  <defs>
                    <radialGradient id="graphGlow">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <circle
                    cx="250"
                    cy="175"
                    r="160"
                    fill="url(#graphGlow)"
                  />

                  {graph.edges.map((edge) => {
                    const source = graph.nodes.find(
                      (node) => node.rank === edge.source,
                    )
                    const target = graph.nodes.find(
                      (node) => node.rank === edge.target,
                    )

                    if (!source || !target) return null

                    const isConnected =
                      selectedGraphTopic === null ||
                      edge.source === selectedGraphTopic ||
                      edge.target === selectedGraphTopic

                    const strength = Math.min(
                      edge.sharedPages / 50,
                      1,
                    )

                    return (
                      <motion.line
                        key={`${edge.source}-${edge.target}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: isConnected
                            ? 0.25 + strength * 0.65
                            : 0.04,
                        }}
                        stroke={strength > 0.6 ? '#a78bfa' : '#7c3aed'}
                        strokeWidth={1 + strength * 4}
                        strokeLinecap="round"
                      />
                    )
                  })}

                  {graph.nodes.map((node, index) => {
                    const isSelected = selectedGraphTopic === node.rank
                    const isConnected = connectedRanks.includes(node.rank)
                    const isIsolated = graph.isolatedNodes.some(
                      (item) => item.rank === node.rank,
                    )

                    const isDimmed =
                      selectedGraphTopic !== null &&
                      !isSelected &&
                      !isConnected

                    const nodeRadius = Math.max(
                      13,
                      Math.min(22, 12 + node.related_chunks / 10),
                    )

                    return (
                      <g
                        key={node.rank}
                        onClick={() =>
                          setSelectedGraphTopic((current) =>
                            current === node.rank ? null : node.rank,
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedGraphTopic((current) =>
                              current === node.rank ? null : node.rank,
                            )
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Select topic ${node.topic}`}
                        style={{ cursor: 'pointer', outline: 'none' }}
                      >
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={nodeRadius + (isSelected ? 5 : 0)}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{
                            opacity: isDimmed ? 0.25 : 1,
                            scale: 1,
                          }}
                          transition={{ delay: index * 0.06 }}
                          fill={
                            isSelected
                              ? '#a78bfa'
                              : isIsolated
                                ? '#475569'
                                : '#7c3aed'
                          }
                          stroke={
                            isSelected
                              ? '#ddd6fe'
                              : isIsolated
                                ? '#94a3b8'
                                : '#a78bfa'
                          }
                          strokeWidth={isSelected ? 3 : isIsolated ? 1.5 : 2}
                        />

                        <text
                          x={node.x}
                          y={node.y + 4}
                          textAnchor="middle"
                          fill="white"
                          fontSize="11"
                          fontWeight="700"
                          pointerEvents="none"
                        >
                          {node.rank}
                        </text>

                        <text
                          x={node.x}
                          y={node.y + nodeRadius + 17}
                          textAnchor="middle"
                          fill={isDimmed ? '#64748b' : '#cbd5e1'}
                          fontSize="10"
                          fontWeight="500"
                          pointerEvents="none"
                        >
                          {node.topic.length > 15
                            ? `${node.topic.slice(0, 14)}…`
                            : node.topic}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  Connected topic
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                  Isolated topic
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-5 rounded-full bg-violet-300" />
                  Stronger connection
                </span>
              </div>

              {graph.isolatedNodes.length > 0 && (
                <div className="mt-4 rounded-xl border border-white/6 bg-white/2 p-3">
                  <p className="text-[10px] font-semibold text-slate-300">
                    Isolated topics ({graph.isolatedNodes.length})
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    These topics have no connections at the current threshold.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {graph.isolatedNodes.map((node) => (
                      <button
                        key={node.rank}
                        type="button"
                        onClick={() => setSelectedGraphTopic(node.rank)}
                        className="rounded-lg border border-slate-500/20 bg-slate-500/10 px-2.5 py-1.5 text-[10px] text-slate-300 transition hover:bg-slate-500/20"
                      >
                        {node.topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode && (
                <motion.div
                  key={selectedNode.rank}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 rounded-xl border border-violet-400/15 bg-violet-400/5 p-4"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-300">
                    Selected topic
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">
                    {selectedNode.topic}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-400">
                    Appears on {selectedNode.pages.length} pages.
                    {' '}
                    {connectedRanks.length} connected topics found.
                  </p>

                  {selectedNodeHasConnections ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {connectedRanks.map((rank) => {
                        const related = graph.nodes.find(
                          (node) => node.rank === rank,
                        )
                        const edge = graph.edges.find(
                          (item) =>
                            (item.source === selectedNode.rank && item.target === rank) ||
                            (item.target === selectedNode.rank && item.source === rank),
                        )

                        return (
                          <button
                            key={rank}
                            type="button"
                            onClick={() => setSelectedGraphTopic(rank)}
                            className="rounded-lg border border-violet-400/15 bg-violet-400/5 px-2.5 py-1.5 text-[10px] text-violet-200 transition hover:bg-violet-400/15"
                          >
                            {related?.topic}
                            <span className="ml-1.5 text-violet-400">
                              · {edge?.sharedPages} shared
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] text-slate-500">
                      This topic has no connections at the current threshold.
                      Try lowering the minimum shared pages value.
                    </p>
                  )}
                </motion.div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
              <Network size={26} className="mx-auto text-slate-600" />
              <p className="mt-3 text-xs text-slate-400">
                Upload a document to generate topic connections.
              </p>
            </div>
          )}

          <p className="mt-4 text-[9px] leading-5 text-slate-600">
            Connections represent shared page references, not verified
            semantic relationships. A connection indicates that two topics
            appear on at least one common page.
          </p>
        </section>
      </div>
    </div>
  )
}

export default IntelligenceHub
