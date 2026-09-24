'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { verifyApiKey } from "../actions/verifyApiKey"
import { DEFAULT_SETTINGS, DEFAULT_SYSTEM_PROMPT, type ChatSettings } from "../types/chat"
import { PRESET_ACCENT_COLORS, applyClientAccent, getClientAccent } from "../lib/theme"

const AVAILABLE_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'OpenAI GPT-OSS 120B', desc: 'Flagship reasoning & tool orchestration (Default)' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', desc: 'High intelligence with fast generation speed' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', desc: 'Ultra-fast sub-second latency for snappy responses' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k)', desc: 'Mixture-of-Experts with expanded 32k context' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', desc: 'Google Gemma 2 instruction-tuned model' },
];

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Client-Side Accent Color State
  const [accentColor, setAccentColor] = useState<string>('#38bdf8')
  const [hue, setHue] = useState<number>(199)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('antigravity_chat_settings')
      const initialAccent = getClientAccent('#38bdf8')
      setAccentColor(initialAccent)
      applyClientAccent(initialAccent)

      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        if (parsed.accentColor) {
          setAccentColor(parsed.accentColor)
          applyClientAccent(parsed.accentColor)
        }
      }
    } catch (e) {
      console.error("Failed to load settings:", e)
    }
  }, [])

  const handleColorChange = (newColor: string) => {
    setAccentColor(newColor)
    setSettings((prev) => ({ ...prev, accentColor: newColor }))
    applyClientAccent(newColor)
  }

  const handleHueScaleChange = (newHue: number) => {
    setHue(newHue)
    const hex = hslToHex(newHue, 92, 60)
    handleColorChange(hex)
  }

  const handleSave = () => {
    try {
      localStorage.setItem('antigravity_chat_settings', JSON.stringify(settings))
      applyClientAccent(accentColor)
      setToastMessage('Settings successfully saved!')
      setTimeout(() => setToastMessage(null), 3000)
    } catch (e) {
      console.error("Failed to save settings:", e)
    }
  }

  const handleReset = () => {
    if (confirm('Reset all settings to default values?')) {
      setSettings(DEFAULT_SETTINGS)
      setAccentColor('#38bdf8')
      applyClientAccent('#38bdf8')
      localStorage.removeItem('antigravity_chat_settings')
      localStorage.removeItem('atlas_theme_accent')
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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 20px',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      {/* Top Bar Navigation */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
        }}
      >
        <Link
          href="/"
          className="prompt-chip"
          style={{
            padding: '8px 16px',
            fontSize: '0.86rem',
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
          <span className="neon-badge-dot" style={{ background: accentColor }} />
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
            ATLAS — System Configuration<span style={{ color: accentColor }}>.</span>
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.95rem', margin: 0 }}>
            Configure your Groq API key, client-side accent color scale, model architecture, active tools, and parameters.
          </p>
        </div>

        {/* 1. API Credentials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
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
                  color: 'rgba(255, 255, 255, 0.5)',
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
                borderColor: 'rgba(255, 255, 255, 0.12)',
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
                color: verifyResult.success ? '#34d399' : '#f87171',
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

        {/* 2. Color Theme & Scale (Client-Side Only) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '6px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.02em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                2. Theme Accent &amp; Color Scale
                <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: accentColor, fontWeight: 500, letterSpacing: 'normal' }}>
                  Client-side only
                </span>
              </label>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.45)', marginTop: '4px' }}>
                Select a preset, slide through the continuous spectrum, or input a custom hex code.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#a1a1aa', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                {accentColor}
              </span>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: accentColor,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: `0 0 10px ${accentColor}44`,
                }}
              />
            </div>
          </div>

          {/* Preset Swatches */}
          <div>
            <div style={{ fontSize: '0.74rem', color: '#71717a', marginBottom: '8px', fontWeight: 500 }}>
              Curated Presets:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {PRESET_ACCENT_COLORS.map((preset) => {
                const isSelected = accentColor.toLowerCase() === preset.hex.toLowerCase()
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => handleColorChange(preset.hex)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? accentColor : 'rgba(255, 255, 255, 0.08)'}`,
                      background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      color: isSelected ? '#ffffff' : '#a1a1aa',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: preset.hex,
                        display: 'inline-block',
                        boxShadow: isSelected ? `0 0 8px ${preset.hex}` : 'none',
                      }}
                    />
                    <span>{preset.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Continuous Color Scale (Hue Spectrum Slider) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: '#71717a', fontWeight: 500 }}>
                Continuous Spectrum Scale:
              </span>
              <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontFamily: 'var(--font-geist-mono, monospace)' }}>
                {hue}° Hue
              </span>
            </div>

            <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => handleHueScaleChange(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  height: '12px',
                  borderRadius: '6px',
                  appearance: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              />
            </div>
          </div>

          {/* Custom Hex Picker & Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.74rem', color: '#71717a', fontWeight: 500, minWidth: '85px' }}>
              Custom Hex:
            </span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                style={{
                  width: '32px',
                  height: '32px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: 'transparent',
                  padding: '2px',
                }}
                title="Open native color picker"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#38bdf8"
                className="neon-input"
                style={{
                  width: '110px',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-geist-mono, monospace)',
                }}
              />
            </div>
          </div>

          {/* Live Component Preview Card */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Live Workspace Preview
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${accentColor}66`,
                  color: accentColor,
                  fontSize: '0.78rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor }} />
                Active Badge
              </div>

              <button
                type="button"
                className="prompt-chip"
                style={{
                  borderColor: `${accentColor}88`,
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  padding: '5px 12px',
                }}
              >
                Interactive Chip
              </button>

              <span style={{ color: accentColor, fontSize: '0.8rem', textDecoration: 'underline' }}>
                Sample Accent Link
              </span>
            </div>
          </div>
        </div>

        {/* 3. Model Architecture */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            3. Language Model
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
                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isSelected ? accentColor : 'rgba(255, 255, 255, 0.08)'}`,
                    boxShadow: isSelected ? `0 4px 16px ${accentColor}22` : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ color: isSelected ? '#ffffff' : '#e4e4e7', fontWeight: 600, fontSize: '0.92rem', marginBottom: '4px' }}>
                    {model.name}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.78rem' }}>
                    {model.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 4. Parameters (Temperature & Max Steps) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
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
              style={{ accentColor: accentColor, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
              <span>0.0 (Precise)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
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
              style={{ accentColor: accentColor, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
              <span>1 step</span>
              <span>10 multi-tool chain</span>
            </div>
          </div>
        </div>

        {/* 5. Active Tool Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            5. Enabled AI Tools
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
                    background: isEnabled ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isEnabled ? accentColor : 'rgba(255, 255, 255, 0.06)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem', color: isEnabled ? '#ffffff' : 'rgba(255, 255, 255, 0.4)' }}>
                      {tool.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {tool.desc}
                    </div>
                  </div>
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: `1px solid ${isEnabled ? accentColor : 'rgba(255, 255, 255, 0.2)'}`,
                      background: isEnabled ? accentColor : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#09090b',
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

        {/* 6. System Persona / Prompt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              6. System Prompt &amp; Persona
            </label>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, systemPrompt: DEFAULT_SYSTEM_PROMPT })}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
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
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
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
              <span style={{ color: '#34d399', fontSize: '0.86rem', fontWeight: 500 }} className="fade-in">
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
