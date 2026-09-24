'use client'
import test from "./actions/simpleaction"
import { getDynamicSuggestions } from "./actions/getDynamicSuggestions"
import { exportResponseToPdf } from "./actions/exportPdf"
import { humanizeContent } from "./actions/humanize"
import { checkAiContent, type AiCheckResult } from "./actions/checkAiContent"
import { DEFAULT_SUGGESTIONS, DEFAULT_SETTINGS, DEFAULT_SYSTEM_PROMPT, type Message, type Suggestion, type ChatSettings } from "./types/chat"
import { applyClientAccent, getClientAccent } from "./lib/theme"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function triggerBrowserDownload(urlOrData: string, filename: string) {
  if (!urlOrData) return

  const downloadFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  let objectUrl = urlOrData
  let isBlob = false

  if (urlOrData.startsWith('data:')) {
    try {
      const parts = urlOrData.split(',')
      const base64 = parts[1] || parts[0]
      const binaryString = window.atob(base64)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'application/pdf' })
      objectUrl = URL.createObjectURL(blob)
      isBlob = true
    } catch (err) {
      console.warn("Base64 to blob conversion failed, using direct dataUrl:", err)
      objectUrl = urlOrData
    }
  }

  const link = document.createElement('a')
  link.href = objectUrl
  link.download = downloadFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  if (isBlob) {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 45000)
  }
}

export default function Home() {
  const [data, setData] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(DEFAULT_SUGGESTIONS)
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [pdfData, setPdfData] = useState<{ url: string; title: string; filename?: string } | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [customSettings, setCustomSettings] = useState<ChatSettings>(DEFAULT_SETTINGS)

  // Auth & DB State
  const [token, setToken] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  // Chat History State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [chatSessions, setChatSessions] = useState<any[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)

  // Humanize State
  const [isHumanizePanelOpen, setIsHumanizePanelOpen] = useState(false)
  const [humanizedText, setHumanizedText] = useState('')
  const [isHumanizing, setIsHumanizing] = useState(false)

  // AI Content Check State
  const [aiCheckResult, setAiCheckResult] = useState<AiCheckResult | null>(null)
  const [isCheckingAi, setIsCheckingAi] = useState(false)
  const [isAiCheckModalOpen, setIsAiCheckModalOpen] = useState(false)

  // Terminal Execution Logs State
  const [toolLogs, setToolLogs] = useState<Array<{ id: string; text: string; time: string }>>([])
  const [isLogsExpanded, setIsLogsExpanded] = useState(true)
  const terminalLogsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isLogsExpanded && terminalLogsEndRef.current) {
      terminalLogsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [toolLogs, isLogsExpanded])

  const nameholder = useRef<HTMLInputElement>(null)
  const chatHistory = useRef<Message[]>([])

  // Load Settings and check Auto-login
  useEffect(() => {
    try {
      const accent = getClientAccent()
      applyClientAccent(accent)

      const savedSettings = localStorage.getItem('antigravity_chat_settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        if (parsed.systemPrompt && (parsed.systemPrompt.includes('{downloadUrl}') || parsed.systemPrompt.includes('example.com'))) {
          parsed.systemPrompt = DEFAULT_SYSTEM_PROMPT
          try {
            localStorage.setItem('antigravity_chat_settings', JSON.stringify(parsed))
          } catch {}
        }
        setCustomSettings({ ...DEFAULT_SETTINGS, ...parsed })
        if (parsed.accentColor) {
          applyClientAccent(parsed.accentColor)
        }
      }
      
      const savedToken = localStorage.getItem('atlas_auth_token')
      if (savedToken) {
        verifyAutoLogin(savedToken)
      }
    } catch (e) {
      console.error("Failed to load initial state:", e)
    }
  }, [])

  const verifyAutoLogin = async (savedToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
      const data = await res.json()
      if (data.success) {
        setToken(savedToken)
        setUsername(data.username)
        fetchChatHistory(savedToken)
      } else {
        localStorage.removeItem('atlas_auth_token')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchChatHistory = async (activeToken: string) => {
    try {
      const res = await fetch('/api/chat/history', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
      const data = await res.json()
      if (data.success) {
        setChatSessions(data.chats)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAuthLoading(true)
    setAuthError('')
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      })
      const data = await res.json()
      if (data.success) {
        setToken(data.token)
        setUsername(data.username)
        localStorage.setItem('atlas_auth_token', data.token)
        setIsAuthModalOpen(false)
        fetchChatHistory(data.token)
        setAuthUsername('')
        setAuthPassword('')
      } else {
        setAuthError(data.error || 'Authentication failed')
      }
    } catch (e: any) {
      setAuthError('Network error. Please try again.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setToken(null)
    setUsername(null)
    setChatSessions([])
    setCurrentChatId(null)
    chatHistory.current = []
    setData('')
    setActivePrompt(null)
    localStorage.removeItem('atlas_auth_token')
  }

  const loadChat = async (id: string) => {
    if (!token) return
    try {
      const res = await fetch(`/api/chat/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) {
        chatHistory.current = data.chat.messages
        setCurrentChatId(data.chat._id)
        
        // Render the last assistant message
        const lastMsg = data.chat.messages[data.chat.messages.length - 1]
        const lastUserMsg = data.chat.messages[data.chat.messages.length - 2]
        
        setData(lastMsg?.content || '')
        setActivePrompt(lastUserMsg?.content || 'Loaded chat')
        setIsSidebarOpen(false)
        setToolLogs([])
        setToolStatus(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const startNewChat = () => {
    setCurrentChatId(null)
    chatHistory.current = []
    setData('')
    setActivePrompt(null)
    setIsSidebarOpen(false)
    setPdfData(null)
    setToolLogs([])
    setToolStatus(null)
    if (nameholder.current) nameholder.current.value = ""
  }

  const syncChat = async (messages: Message[]) => {
    if (!token) return
    try {
      const res = await fetch('/api/chat/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          chatId: currentChatId,
          title: messages[0]?.content.slice(0, 40) + '...',
          messages
        })
      })
      const data = await res.json()
      if (data.success && !currentChatId) {
        setCurrentChatId(data.chatId)
        fetchChatHistory(token)
      }
    } catch (e) {
      console.error("Failed to sync chat:", e)
    }
  }

  const executePrompt = async (promptText: string) => {
    const prompt = promptText.trim()
    if (!prompt || isLoading) return

    setActivePrompt(prompt)
    setPdfData(null)

    // Add user message to history
    chatHistory.current.push({ role: 'user', content: prompt })

    // Keep only the last 5 exchanges (10 messages)
    const recentMessages = chatHistory.current.slice(-10)

    setData('')
    setIsLoading(true)
    setToolStatus(null)
    setToolLogs([])

    let fullResponse = ''
    let generatedPdfUrl: string | null = null

    try {
      const stream = await test(recentMessages, customSettings)
      for await (const chunk of stream) {
        if (chunk.startsWith('__LOG__:')) {
          const logText = chunk.slice('__LOG__:'.length)
          setToolLogs((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              text: logText,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            },
          ])
        } else if (chunk.startsWith('__TOOL__:')) {
          setToolStatus(chunk.slice('__TOOL__:'.length))
        } else if (chunk.startsWith('__PDF__:')) {
          const raw = chunk.slice('__PDF__:'.length)
          const [url, title, filename] = raw.split('|')
          generatedPdfUrl = url
          setPdfData({ url, title: title || 'Research Report', filename: filename || `${(title || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf` })
        } else {
          setToolStatus(null)
          fullResponse += chunk
          setData((prev) => prev + chunk)
        }
      }

      // If user asked for a PDF or response has a PDF download section, but no tool emitted a PDF, generate it automatically as fallback
      const userAskedForPdf = /\b(pdf|download|document|report)\b/i.test(prompt)
      const responseHasPdfSection = /download.*pdf|pdf.*download/i.test(fullResponse)
      if (!generatedPdfUrl && (userAskedForPdf || responseHasPdfSection) && fullResponse.trim().length > 50) {
        const fallbackTitle = prompt.length > 40 ? prompt.slice(0, 40) + '…' : prompt || 'Research Report'
        exportResponseToPdf(fallbackTitle, fullResponse)
          .then((res) => {
            if (res?.downloadUrl) {
              setPdfData({ url: res.downloadUrl, title: fallbackTitle, filename: res.filename })
            }
          })
          .catch((err) => console.error("Auto PDF generation fallback failed:", err))
      }

      // Add assistant response to history
      chatHistory.current.push({ role: 'assistant', content: fullResponse })
      
      // Sync to MongoDB
      await syncChat(chatHistory.current)

      // Dynamically generate intelligent follow-up suggestions based on updated conversation history & settings
      setIsFetchingSuggestions(true)
      getDynamicSuggestions(chatHistory.current, customSettings)
        .then((newSuggestions) => {
          if (newSuggestions && newSuggestions.length > 0) {
            setSuggestions(newSuggestions)
          }
        })
        .catch((err) => console.error("Error fetching dynamic suggestions:", err))
        .finally(() => setIsFetchingSuggestions(false))

    } catch {
      setData('An error occurred while communicating with the assistant. Please try again.')
    } finally {
      setIsLoading(false)
      setToolStatus(null)
      if (nameholder.current) nameholder.current.value = ""
    }
  }

  const runtest = () => {
    const prompt = nameholder.current?.value || ''
    executePrompt(prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runtest()
  }

  const handleChipClick = (query: string) => {
    if (isLoading) return
    if (nameholder.current) {
      nameholder.current.value = query
    }
    executePrompt(query)
  }

  const handleExportPdf = async (customContent?: string, customTitle?: string) => {
    const contentToExport = customContent || data
    if (!contentToExport || isExportingPdf) return
    setIsExportingPdf(true)
    try {
      const reportTitle = customTitle || activePrompt || 'Research Report'
      const res = await exportResponseToPdf(reportTitle, contentToExport)
      if (res?.downloadUrl) {
        setPdfData({ url: res.downloadUrl, title: reportTitle, filename: res.filename })
        triggerBrowserDownload(res.downloadUrl, res.filename)
      }
    } catch (err) {
      console.error("Export PDF error:", err)
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleHumanize = async () => {
    if (!data || isHumanizing) return
    setIsHumanizePanelOpen(true)
    setIsHumanizing(true)
    setHumanizedText('')
    try {
      const stream = await humanizeContent(data, customSettings)
      for await (const chunk of stream) {
        setHumanizedText((prev) => prev + chunk)
      }
    } catch (err) {
      console.error("Humanize error:", err)
      setHumanizedText('⚠️ Failed to humanize content. Please try again.')
    } finally {
      setIsHumanizing(false)
    }
  }

  const handleUseHumanized = () => {
    if (!humanizedText) return
    setData(humanizedText)
    setIsHumanizePanelOpen(false)
    // Update chat history with the humanized version
    if (chatHistory.current.length > 0) {
      const lastIdx = chatHistory.current.length - 1
      if (chatHistory.current[lastIdx].role === 'assistant') {
        chatHistory.current[lastIdx].content = humanizedText
      }
    }
  }

  const handleAiCheck = async () => {
    if (!data || isCheckingAi) return
    setIsCheckingAi(true)
    setAiCheckResult(null)
    setIsAiCheckModalOpen(true)
    try {
      const result = await checkAiContent(data, customSettings)
      setAiCheckResult(result)
    } catch (err) {
      console.error("AI check error:", err)
      setAiCheckResult({
        score: -1,
        verdict: 'Analysis Failed',
        details: [`Error: ${String(err)}`],
      })
    } finally {
      setIsCheckingAi(false)
    }
  }

  const modelDisplayName = customSettings.model.split('/').pop() || 'gpt-oss-120b'

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '36px 20px',
        gap: '24px',
        position: 'relative',
      }}
    >
      <header className="top-nav fade-in">
        <div className="top-nav-left">
          {token && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="prompt-chip"
              style={{
                padding: '8px 14px',
                fontSize: '0.84rem',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              View Chat History
            </button>
          )}
        </div>

        <div className="top-nav-right">
          {token ? (
            <button onClick={handleLogout} className="prompt-chip" style={{ padding: '8px 14px', fontSize: '0.84rem' }}>
              Logout ({username})
            </button>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="prompt-chip" style={{ padding: '8px 14px', fontSize: '0.84rem', borderColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}>
              Sign In / Register
            </button>
          )}

          <button
            onClick={handleHumanize}
            disabled={!data || isHumanizing || isLoading}
            className="prompt-chip"
            style={{
              padding: '8px 14px',
              fontSize: '0.84rem',
              opacity: (!data || isLoading) ? 0.4 : 1,
              borderColor: isHumanizing ? '#ffffff' : undefined,
              color: isHumanizing ? '#ffffff' : undefined,
            }}
            title="Humanize the AI-generated response"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
            <span>{isHumanizing ? 'Humanizing…' : 'Humanize'}</span>
          </button>

          <button
            onClick={handleAiCheck}
            disabled={!data || isCheckingAi || isLoading}
            className="prompt-chip"
            style={{
              padding: '8px 14px',
              fontSize: '0.84rem',
              opacity: (!data || isLoading) ? 0.4 : 1,
              borderColor: isCheckingAi ? '#f59e0b' : undefined,
              color: isCheckingAi ? '#f59e0b' : undefined,
            }}
            title="Check AI content percentage"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>{isCheckingAi ? 'Checking…' : 'AI Check'}</span>
          </button>

          <Link
            href="/settings"
            className="prompt-chip"
            style={{
              padding: '8px 14px',
              fontSize: '0.84rem',
              textDecoration: 'none',
            }}
            title="Open System Settings & Configuration"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </Link>
        </div>
      </header>

      {/* Header section */}
      <div className="fade-in" style={{ textAlign: 'center', maxWidth: '680px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div className="neon-badge">
            <span className="neon-badge-dot" style={{ background: 'var(--accent-color)' }} />
            ATLAS OS • Groq {modelDisplayName}
          </div>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 3.8rem)',
            fontWeight: 800,
            margin: '0 0 8px 0',
            letterSpacing: '-0.035em',
            color: '#ffffff',
            lineHeight: 1.05,
          }}
        >
          ATLAS<span style={{ color: 'var(--accent-color)' }}>.</span>
        </h1>

        <div
          style={{
            fontSize: 'clamp(0.82rem, 1.8vw, 0.92rem)',
            fontWeight: 500,
            color: '#a1a1aa',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          Advanced Toolkit for Learning, Analysis, and Synthesis
        </div>

        <p
          style={{
            color: 'rgba(240, 253, 244, 0.6)',
            fontSize: '0.96rem',
            margin: '0 auto',
            fontWeight: 400,
            maxWidth: '600px',
            lineHeight: 1.5,
          }}
        >
          Authoritative intelligence platform engineered to navigate vast amounts of information with real-time web intelligence, deep research, and automated synthesis.
        </p>
      </div>

      {/* Main card container (enlarged width) */}
      <div
        className="neon-card fade-in"
        style={{
          width: '100%',
          maxWidth: '840px',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
        }}
      >
        {/* Dynamic prompt suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.74rem', color: 'rgba(240, 253, 244, 0.45)', fontWeight: 600, letterSpacing: '0.05em' }}>
              {chatHistory.current.length > 0 ? "⚡ CONTEXTUAL FOLLOW-UPS" : "⚡ SUGGESTED PROMPTS"}
            </span>
            {isFetchingSuggestions && (
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                Generating smart suggestions…
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="prompt-chip"
                onClick={() => handleChipClick(item.query)}
                disabled={isLoading}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input & Action button */}
        <div className="input-area">
          <input
            ref={nameholder}
            type="text"
            className="neon-input"
            placeholder="Type your question or choose a suggested prompt above…"
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            style={{ flex: 1, opacity: isLoading ? 0.6 : 1 }}
          />
          <button
            className="neon-btn"
            onClick={runtest}
            disabled={isLoading}
          >
            {isLoading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                Processing…
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Ask
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </button>
        </div>

        {/* Live tool status pill */}
        {toolStatus && (
          <div className="fade-in" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="tool-status-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1.2s linear infinite', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
              </svg>
              <span>{toolStatus}</span>
            </div>
          </div>
        )}

        {/* Live Terminal Logs Console */}
        {toolLogs.length > 0 && (
          <div className="terminal-console fade-in">
            <div className="terminal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="terminal-dots">
                  <span className="terminal-dot terminal-dot-red" />
                  <span className="terminal-dot terminal-dot-yellow" />
                  <span className="terminal-dot terminal-dot-green" />
                </div>
                <div className="terminal-title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                  <span>terminal ~ web search & tool logs</span>
                </div>
              </div>

              <div className="terminal-actions">
                {isLoading && toolStatus ? (
                  <span className="terminal-badge" style={{ color: '#00f0ff', borderColor: 'rgba(0, 240, 255, 0.3)', background: 'rgba(0, 240, 255, 0.1)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                    Running
                  </span>
                ) : (
                  <span className="terminal-badge">
                    ● {toolLogs.length} events
                  </span>
                )}

                <button
                  type="button"
                  className="terminal-btn"
                  onClick={() => {
                    const text = toolLogs.map(l => `[${l.time}] ${l.text}`).join('\n')
                    navigator.clipboard.writeText(text)
                  }}
                  title="Copy logs to clipboard"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </button>

                <button
                  type="button"
                  className="terminal-btn"
                  onClick={() => setIsLogsExpanded(!isLogsExpanded)}
                  title={isLogsExpanded ? 'Collapse logs' : 'Expand logs'}
                >
                  {isLogsExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {isLogsExpanded && (
              <div className="terminal-body">
                {toolLogs.map((log) => {
                  const isQuery = log.text.startsWith('web search tool running for query:') || log.text.includes('running for query:');
                  const isSuccess = log.text.startsWith('✔');
                  const isToolAction = log.text.startsWith('🔍') || log.text.startsWith('⚙️') || log.text.startsWith('📖') || log.text.startsWith('📺') || log.text.startsWith('🌤️') || log.text.startsWith('📄');

                  return (
                    <div key={log.id} className="terminal-line">
                      <span className="terminal-line-time">[{log.time}]</span>
                      <span className="terminal-line-prompt">
                        {isSuccess ? '✔' : isQuery ? '$' : '>'}
                      </span>
                      <span
                        className={`terminal-line-text ${
                          isQuery
                            ? 'terminal-line-query'
                            : isSuccess
                            ? 'terminal-line-success'
                            : isToolAction
                            ? 'terminal-line-tool'
                            : ''
                        }`}
                      >
                        {log.text}
                      </span>
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="terminal-line" style={{ marginTop: '4px' }}>
                    <span className="terminal-line-prompt">$</span>
                    <span style={{ color: '#38bdf8', fontSize: '0.78rem' }}>
                      executing search & synthesis
                    </span>
                    <span className="terminal-cursor" />
                  </div>
                )}
                <div ref={terminalLogsEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Response Area (Enlarged & Structural) */}
        {(data || (isLoading && !toolStatus)) && (
          <div className="neon-response-box fade-in">
            {/* Top Prompt & Actions Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                paddingBottom: '14px',
                marginBottom: '18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                flexWrap: 'wrap',
              }}
            >
              {activePrompt ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#d4d4d8',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      flexShrink: 0,
                    }}
                  >
                    Prompt
                  </span>
                  <span style={{ color: '#ffffff', fontSize: '0.98rem', fontWeight: 500, lineHeight: 1.4 }}>
                    {activePrompt}
                  </span>
                </div>
              ) : <div />}

              {/* On-demand PDF Export Button */}
              {data && (
                <button
                  type="button"
                  onClick={() => handleExportPdf()}
                  disabled={isExportingPdf}
                  className="prompt-chip"
                  style={{
                    marginLeft: 'auto',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontWeight: 500,
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                  }}
                  title="Export this response as a formatted PDF whenever you want"
                >
                  {isExportingPdf ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                      </svg>
                      <span>Generating PDF…</span>
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      <span>Export as PDF</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Downloadable PDF Banner (if tool generated it or on-demand export completed) */}
            {pdfData && (
              <div
                className="fade-in"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>📄</span>
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.92rem' }}>{pdfData.title}</div>
                    <div style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Downloadable Research Document Ready</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerBrowserDownload(pdfData.url, pdfData.filename || `${pdfData.title}.pdf`)}
                  className="neon-btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download PDF</span>
                </button>
              </div>
            )}

            {data ? (
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children, ...props }) => {
                      const text = String(children || '')
                      const isPdfOrDownload =
                        (href && (href.endsWith('.pdf') || href.includes('/downloads/') || href.includes('example.com') || href.includes('files.atlas.ai'))) ||
                        /download.*pdf|pdf.*download/i.test(text) ||
                        text.includes('📥')

                      if (isPdfOrDownload) {
                        return (
                          <button
                            type="button"
                            className="neon-btn"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              margin: '6px 0',
                              fontSize: '0.84rem',
                              textDecoration: 'none',
                              cursor: 'pointer',
                              verticalAlign: 'middle',
                            }}
                            onClick={async (e) => {
                              e.preventDefault()
                              if (pdfData?.url) {
                                triggerBrowserDownload(pdfData.url, pdfData.filename || `${pdfData.title}.pdf`)
                                return
                              }
                              await handleExportPdf()
                            }}
                            title="Download formatted PDF report"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>{children || 'Download PDF Report'}</span>
                          </button>
                        )
                      }

                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                          {children}
                        </a>
                      )
                    },
                  }}
                >
                  {data}
                </ReactMarkdown>
                {isLoading && <span className="neon-cursor" aria-hidden="true" />}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(240, 253, 244, 0.45)', fontSize: '0.98rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="#71717a" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                <span>Synthesizing structural response…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer keyboard hint */}
      <div
        className="fade-in"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'rgba(255, 255, 255, 0.35)',
          fontSize: '0.82rem',
        }}
      >
        <span>Press</span>
        <kbd
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#d4d4d8',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-geist-mono, monospace)',
          }}
        >
          Enter ↵
        </kbd>
        <span>to send question</span>
      </div>

      {/* Sidebar for Chat History */}
      {isSidebarOpen && (
        <div className="sidebar-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: '#ffffff', fontSize: '1.2rem', fontWeight: 600 }}>Chat History</h2>
            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <button onClick={startNewChat} className="neon-btn" style={{ marginBottom: '24px', width: '100%', justifyContent: 'center' }}>
            + New Chat
          </button>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chatSessions.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center', marginTop: '40px' }}>
                No chat history found.
              </div>
            ) : (
              chatSessions.map((session) => (
                <div
                  key={session._id}
                  onClick={() => loadChat(session._id)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: session._id === currentChatId ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255,255,255,0.025)',
                    border: session._id === currentChatId ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                  onMouseOut={(e) => e.currentTarget.style.background = session._id === currentChatId ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255,255,255,0.025)'}
                >
                  <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.title}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                    {new Date(session.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Humanize Right-Side Panel */}
      {isHumanizePanelOpen && (
        <div className="humanize-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Humanize Content
            </h2>
            <button onClick={() => setIsHumanizePanelOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '8px', lineHeight: 1.4 }}>
            AI-generated text rewritten to sound naturally human — varied sentence lengths, conversational tone, and natural imperfections.
          </div>

          <div className="humanize-content markdown-content">
            {isHumanizing && !humanizedText && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8', fontSize: '0.9rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                <span>Rewriting content with human voice…</span>
              </div>
            )}
            {humanizedText && (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {humanizedText}
              </ReactMarkdown>
            )}
            {isHumanizing && humanizedText && <span className="neon-cursor" aria-hidden="true" />}
          </div>

          <div className="humanize-actions">
            <button
              type="button"
              className="neon-btn"
              onClick={handleUseHumanized}
              disabled={!humanizedText || isHumanizing}
              style={{ justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Use This</span>
            </button>
            <button
              type="button"
              className="prompt-chip"
              onClick={handleHumanize}
              disabled={isHumanizing || !data}
              style={{ justifyContent: 'center', borderColor: 'rgba(255, 255, 255, 0.18)', color: '#ffffff' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              <span>Re-humanize</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Content Check Modal */}
      {isAiCheckModalOpen && (
        <div className="ai-check-overlay" onClick={() => setIsAiCheckModalOpen(false)}>
          <div className="neon-card ai-check-modal" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsAiCheckModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h2 style={{ margin: '0 0 24px 0', color: '#fff', textAlign: 'center', fontSize: '1.15rem', fontWeight: 700 }}>
              🔍 AI Content Analysis
            </h2>

            {isCheckingAi && !aiCheckResult && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="#38bdf8" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem' }}>Analyzing content patterns…</span>
              </div>
            )}

            {aiCheckResult && (() => {
              const score = aiCheckResult.score
              const radius = 56
              const circumference = 2 * Math.PI * radius
              const offset = score >= 0 ? circumference - (score / 100) * circumference : circumference
              const gaugeColor = score < 0 ? '#6b7280' : score <= 30 ? '#22c55e' : score <= 60 ? '#f59e0b' : '#ef4444'

              return (
                <>
                  <div className="ai-score-gauge">
                    <svg viewBox="0 0 128 128">
                      <circle className="gauge-bg" cx="64" cy="64" r={radius} />
                      <circle
                        className="gauge-fill"
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke={gaugeColor}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                      />
                    </svg>
                    <div className="gauge-label">
                      <div className="gauge-score" style={{ color: gaugeColor }}>
                        {score >= 0 ? score : '—'}
                      </div>
                      <div className="gauge-unit">{score >= 0 ? '% AI' : 'Error'}</div>
                    </div>
                  </div>

                  <div style={{
                    textAlign: 'center',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: `${gaugeColor}15`,
                    border: `1px solid ${gaugeColor}40`,
                    color: gaugeColor,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    letterSpacing: '0.02em',
                  }}>
                    {aiCheckResult.verdict}
                  </div>

                  <ul className="ai-check-details">
                    {aiCheckResult.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={handleHumanize}
                      disabled={isHumanizing}
                      style={{ flex: 1, justifyContent: 'center', borderColor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                      <span>Humanize It</span>
                    </button>
                    <button
                      type="button"
                      className="prompt-chip"
                      onClick={() => setIsAiCheckModalOpen(false)}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Close
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="neon-card auth-modal-card">
            <button onClick={() => setIsAuthModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h2 style={{ margin: '0 0 24px 0', color: '#ffffff', textAlign: 'center', fontSize: '1.25rem', fontWeight: 600 }}>
              {authMode === 'login' ? 'System Login' : 'Register Access'}
            </h2>
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#fff' }}>Username</label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="neon-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#fff' }}>Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="neon-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="Enter password"
                />
              </div>
              
              {authError && <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{authError}</div>}
              
              <button type="submit" className="neon-btn" disabled={isAuthLoading} style={{ marginTop: '8px', justifyContent: 'center' }}>
                {isAuthLoading ? 'Processing...' : (authMode === 'login' ? 'Access System' : 'Create Account')}
              </button>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
              {authMode === 'login' ? (
                <>No account? <span style={{ color: '#ffffff', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setAuthMode('signup')}>Register here</span></>
              ) : (
                <>Already registered? <span style={{ color: '#ffffff', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setAuthMode('login')}>Login here</span></>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
