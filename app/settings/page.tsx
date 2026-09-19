'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { verifyApiKey } from "../actions/verifyApiKey"
import { DEFAULT_SETTINGS, DEFAULT_SYSTEM_PROMPT, type ChatSettings } from "../types/chat"

const AVAILABLE_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT-OSS 120B', desc: 'Flagship reasoning & tool orchestration (Default)' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', desc: 'High intelligence with fast generation speed' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', desc: 'Ultra-fast sub-second latency for snappy responses' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k)', desc: 'Mixture-of-Experts with expanded 32k context' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', desc: 'Google Gemma 2 instruction-tuned model' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('antigravity_chat_settings')
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
      }
    } catch (e) {
      console.error("Failed to load settings:", e)
    }
  }, [])

  const handleSave = () => {
    try {
      localStorage.setItem('antigravity_chat_settings', JSON.stringify(settings))
      setToastMessage('Settings successfully saved!')
      setTimeout(() => setToastMessage(null), 3000)
    } catch (e) {
      console.error("Failed to save settings:", e)
    }
  }

  const handleReset = () => {
    if (confirm('Reset all settings to default values?')) {
      setSettings(DEFAULT_SETTINGS)
      localStorage.removeItem('antigravity_chat_settings')
      setToastMessage('Reset to default configuration.')
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  const handleTestApiKey = async () => {
    setIsVerifying(true)
    setVerifyResult(null)
    try {
      const res = await verifyApiKey(settings.apiKey)
      setVerifyResult(res)
    } catch (err) {
      setVerifyResult({ success: false, message: String(err) })
    } finally {
      setIsVerifying(false)
    }
  }

  const toggleTool = (toolKey: keyof ChatSettings['enabledTools']) => {
    setSettings((prev) => ({
      ...prev,
      enabledTools: {
        ...prev.enabledTools,
        [toolKey]: !prev.enabledTools[toolKey],
      },
    }))
  }

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '40px 20px',
        gap: '24px',
      }}
    >
      {/* Top navigation */}
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <Link
          href="/"
          className="prompt-chip"
          style={{
            padding: '8px 16px',
            fontSize: '0.84rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>←</span>
          <span>Back to Chat</span>
        </Link>

        <div className="neon-badge">
          <span className="neon-badge-dot" />
          ATLAS Settings Manager
        </div>
      </div>

      {/* Main Settings Card */}
      <div
        className="neon-card fade-in"
        style={{
          width: '100%',
          maxWidth: '820px',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              margin: '0 0 8px 0',
              color: '#ffffff',
            }}
          >
            ATLAS — System Configuration<span style={{ color: 'var(--neon-green)' }}>.</span>
          </h1>
          <p style={{ color: 'rgba(240, 253, 244, 0.55)', fontSize: '0.95rem', margin: 0 }}>
            Configure your Groq API key, model architecture, active tools, system persona, and generation parameters for ATLAS.
          </p>
        </div>

        {/* 1. API Credentials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--neon-green)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            1. Groq API Key
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type={showApiKey ? "text" : "password"}
                className="neon-input"
                placeholder="Leave blank to use default server .env key, or enter custom gsk_…"
                value={settings.apiKey || ''}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                style={{ paddingRight: '80px' }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(240, 253, 244, 0.6)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <button
              type="button"
              onClick={handleTestApiKey}
              disabled={isVerifying}
              className="prompt-chip"
              style={{
                padding: '0 16px',
                fontSize: '0.84rem',
                borderColor: 'var(--neon-green-border)',
                whiteSpace: 'nowrap',
              }}
            >
              {isVerifying ? 'Verifying…' : 'Test Key'}
            </button>
          </div>
          {verifyResult && (
            <div
              style={{
                fontSize: '0.84rem',
                color: verifyResult.success ? 'var(--neon-green)' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{verifyResult.success ? '✓' : '✕'}</span>
              <span>{verifyResult.message}</span>
            </div>
          )}
        </div>

        {/* 2. Model Architecture */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--neon-green)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            2. Language Model
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = settings.model === model.id
              return (
                <div
                  key={model.id}
                  onClick={() => setSettings({ ...settings, model: model.id })}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(0, 255, 136, 0.09)' : 'rgba(18, 26, 21, 0.6)',
                    border: `1px solid ${isSelected ? 'var(--neon-green)' : 'rgba(0, 255, 136, 0.15)'}`,
                    boxShadow: isSelected ? '0 0 16px rgba(0, 255, 136, 0.18)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ color: isSelected ? 'var(--neon-green)' : '#ffffff', fontWeight: 600, fontSize: '0.92rem', marginBottom: '4px' }}>
                    {model.name}
                  </div>
                  <div style={{ color: 'rgba(240, 253, 244, 0.45)', fontSize: '0.78rem' }}>
                    {model.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. Parameters (Temperature & Max Steps) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--neon-green)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Temperature
              </label>
              <span style={{ fontSize: '0.84rem', color: '#ffffff', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                {settings.temperature}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              style={{ accentColor: 'var(--neon-green)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(240, 253, 244, 0.4)' }}>
              <span>0.0 (Precise)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--neon-green)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Max Tool Steps
              </label>
              <span style={{ fontSize: '0.84rem', color: '#ffffff', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                {settings.maxSteps} steps
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={settings.maxSteps}
              onChange={(e) => setSettings({ ...settings, maxSteps: parseInt(e.target.value, 10) })}
              style={{ accentColor: 'var(--neon-green)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(240, 253, 244, 0.4)' }}>
              <span>1 step</span>
              <span>10 multi-tool chain</span>
            </div>
          </div>
        </div>

        {/* 4. Active Tool Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--neon-green)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            4. Enabled AI Tools
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            {[
              { key: 'webSearch' as const, label: '🔍 Web Search', desc: 'DuckDuckGo real-time data' },
              { key: 'getCurrentDateTime' as const, label: '🕐 Date & Time', desc: 'Timezones & live clock' },
              { key: 'getWeather' as const, label: '🌤️ Weather Forecast', desc: 'Open-Meteo live weather' },
              { key: 'wikiLookup' as const, label: '📖 Wikipedia Scraper', desc: 'Articles & summaries' },
              { key: 'generatePdf' as const, label: '📄 PDF Report Generator', desc: 'Downloadable PDF export' },
              { key: 'searchYouTube' as const, label: '📺 YouTube Search', desc: 'Videos & tutorials recommendation' },
            ].map((tool) => {
              const isEnabled = settings.enabledTools[tool.key]
              return (
                <div
                  key={tool.key}
                  onClick={() => toggleTool(tool.key)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isEnabled ? 'rgba(0, 255, 136, 0.08)' : 'rgba(18, 26, 21, 0.4)',
                    border: `1px solid ${isEnabled ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: isEnabled ? '#ffffff' : 'rgba(255, 255, 255, 0.4)' }}>
                      {tool.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(240, 253, 244, 0.4)' }}>
                      {tool.desc}
                    </div>
                  </div>
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: `1px solid ${isEnabled ? 'var(--neon-green)' : 'rgba(255, 255, 255, 0.2)'}`,
                      background: isEnabled ? 'var(--neon-green)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#04140b',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    {isEnabled ? '✓' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 5. System Persona / Prompt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--neon-green)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              5. System Prompt &amp; Persona
            </label>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, systemPrompt: DEFAULT_SYSTEM_PROMPT })}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(0, 255, 136, 0.7)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset Prompt to Default
            </button>
          </div>
          <textarea
            className="neon-input"
            rows={6}
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            style={{
              fontFamily: 'var(--font-geist-mono, monospace)',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid rgba(0, 255, 136, 0.15)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            className="prompt-chip"
            style={{
              padding: '10px 18px',
              color: '#f87171',
              borderColor: 'rgba(248, 113, 113, 0.3)',
            }}
          >
            Reset to Defaults
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {toastMessage && (
              <span style={{ color: 'var(--neon-green)', fontSize: '0.86rem', fontWeight: 500 }} className="fade-in">
                ✓ {toastMessage}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="neon-btn"
              style={{
                padding: '12px 28px',
              }}
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
