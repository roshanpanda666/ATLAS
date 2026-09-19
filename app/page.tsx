'use client'
import test from "./actions/simpleaction"
import { getDynamicSuggestions } from "./actions/getDynamicSuggestions"
import { exportResponseToPdf } from "./actions/exportPdf"
import { DEFAULT_SUGGESTIONS, DEFAULT_SETTINGS, type Message, type Suggestion, type ChatSettings } from "./types/chat"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export default function Home() {
  const [data, setData] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(DEFAULT_SUGGESTIONS)
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [pdfData, setPdfData] = useState<{ url: string; title: string } | null>(null)
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

  const nameholder = useRef<HTMLInputElement>(null)
  const chatHistory = useRef<Message[]>([])

  // Load Settings and check Auto-login
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('antigravity_chat_settings')
      if (savedSettings) {
        setCustomSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) })
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

    let fullResponse = ''

    try {
      const stream = await test(recentMessages, customSettings)
      for await (const chunk of stream) {
        if (chunk.startsWith('__TOOL__:')) {
          setToolStatus(chunk.slice('__TOOL__:'.length))
        } else if (chunk.startsWith('__PDF__:')) {
          const raw = chunk.slice('__PDF__:'.length)
          const [url, title] = raw.split('|')
          setPdfData({ url, title: title || 'Research Report' })
        } else {
          setToolStatus(null)
          fullResponse += chunk
          setData((prev) => prev + chunk)
        }
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

  const handleExportPdf = async () => {
    if (!data || isExportingPdf) return
    setIsExportingPdf(true)
    try {
      const reportTitle = activePrompt || 'Research Report'
      const res = await exportResponseToPdf(reportTitle, data)
      if (res?.downloadUrl) {
        setPdfData({ url: res.downloadUrl, title: reportTitle })
        const link = document.createElement('a')
        link.href = res.downloadUrl
        link.download = res.filename
        link.click()
      }
    } catch (err) {
      console.error("Export PDF error:", err)
    } finally {
      setIsExportingPdf(false)
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
      {/* Top Left: Chat History Button */}
      {token && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="prompt-chip"
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 40,
            padding: '8px 14px',
            fontSize: '0.84rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
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

      {/* Top Right: Settings & Auth */}
      <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 40,
          display: 'flex',
          gap: '10px'
      }}>
        {token ? (
          <button onClick={handleLogout} className="prompt-chip" style={{ padding: '8px 14px', fontSize: '0.84rem' }}>
            Logout ({username})
          </button>
        ) : (
          <button onClick={() => setIsAuthModalOpen(true)} className="prompt-chip" style={{ padding: '8px 14px', fontSize: '0.84rem', borderColor: 'var(--neon-green)', color: 'var(--neon-green)' }}>
            Sign In / Register
          </button>
        )}

        <Link
          href="/settings"
          className="prompt-chip"
          style={{
            padding: '8px 14px',
            fontSize: '0.84rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
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

      {/* Header section */}
      <div className="fade-in" style={{ textAlign: 'center', maxWidth: '680px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div className="neon-badge">
            <span className="neon-badge-dot" />
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
          ATLAS<span style={{ color: 'var(--neon-green)', textShadow: '0 0 16px var(--neon-green)' }}>.</span>
        </h1>

        <div
          style={{
            fontSize: 'clamp(0.82rem, 1.8vw, 0.98rem)',
            fontWeight: 600,
            color: 'var(--neon-green)',
            letterSpacing: '0.05em',
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
              <span style={{ fontSize: '0.72rem', color: 'var(--neon-green)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
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
        <div style={{ display: 'flex', gap: '12px' }}>
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
                borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
                flexWrap: 'wrap',
              }}
            >
              {activePrompt ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--neon-green)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      background: 'rgba(0, 255, 136, 0.1)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(0, 255, 136, 0.25)',
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
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="prompt-chip"
                  style={{
                    marginLeft: 'auto',
                    background: 'rgba(0, 255, 136, 0.08)',
                    borderColor: 'rgba(0, 255, 136, 0.3)',
                    color: 'var(--neon-green)',
                    fontWeight: 600,
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
                  background: 'rgba(0, 255, 136, 0.08)',
                  border: '1px solid rgba(0, 255, 136, 0.35)',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  marginBottom: '20px',
                  boxShadow: '0 0 16px rgba(0, 255, 136, 0.12)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>📄</span>
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.92rem' }}>{pdfData.title}</div>
                    <div style={{ color: 'var(--neon-green)', fontSize: '0.75rem' }}>Downloadable Research Document Ready</div>
                  </div>
                </div>

                <a
                  href={pdfData.url}
                  download
                  className="neon-btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download PDF</span>
                </a>
              </div>
            )}

            {data ? (
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data}
                </ReactMarkdown>
                {isLoading && <span className="neon-cursor" aria-hidden="true" />}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(240, 253, 244, 0.45)', fontSize: '0.98rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="var(--neon-green)" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
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
          color: 'rgba(240, 253, 244, 0.35)',
          fontSize: '0.82rem',
        }}
      >
        <span>Press</span>
        <kbd
          style={{
            background: 'rgba(18, 26, 21, 0.8)',
            border: '1px solid rgba(0, 255, 136, 0.25)',
            color: 'var(--neon-green)',
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
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '320px',
          background: 'rgba(8, 10, 9, 0.95)', borderRight: '1px solid var(--neon-green-border)',
          zIndex: 100, padding: '24px', display: 'flex', flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0, 255, 136, 0.1)', backdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, color: 'var(--neon-green)', fontSize: '1.2rem', fontWeight: 700 }}>Chat History</h2>
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
                    background: session._id === currentChatId ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: session._id === currentChatId ? '1px solid var(--neon-green)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 255, 136, 0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = session._id === currentChatId ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255,255,255,0.03)'}
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

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="neon-card" style={{ width: '400px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setIsAuthModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h2 style={{ margin: '0 0 24px 0', color: 'var(--neon-green)', textAlign: 'center' }}>
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
                <>No account? <span style={{ color: 'var(--neon-green)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setAuthMode('signup')}>Register here</span></>
              ) : (
                <>Already registered? <span style={{ color: 'var(--neon-green)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setAuthMode('login')}>Login here</span></>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
