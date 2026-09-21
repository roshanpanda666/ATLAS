# ATLAS ⚡

### Advanced Toolkit for Learning, Analysis, and Synthesis

ATLAS is an authoritative, full-stack AI research and synthesis platform built with **Next.js (Turbopack)**, **Vercel AI SDK**, and **Groq**. It combines multi-source web intelligence, autonomous tool-calling loops, an AI humanizer agent, content authenticity analysis, and downloadable PDF report generation into a dark-neon interface.

---

## ✨ Features & Architecture

### 🌐 1. Multi-Source Web Intelligence
Beyond Wikipedia, ATLAS concurrently retrieves real-time data across multiple domains:
- **DuckDuckGo Web Search**: General web crawling with decoded destination links.
- **ArXiv.org**: Academic surveys, preprints, and research papers with direct abstracts.
- **Hacker News (Algolia)**: Developer discussions, engineering articles, and community insights.
- **GitHub**: Open-source repositories, libraries, star metrics, and descriptions.
- **Wikipedia**: Historical overviews and encyclopedic context.

### 🖥️ 2. Live Terminal Logs Console
- Live streamed terminal logs displayed directly in the web UI.
- Real-time query execution visibility (`web search tool running for query: ...`).
- Source attribution indicators (`✔ Fetched data across N websites`).
- macOS/Linux terminal controls, monospace font, copy-to-clipboard, and expand/collapse toggles.

### ✍️ 3. AI Humanizer Agent
- Dedicated secondary agent with specialized prompting to transform AI text into natural human writing.
- Eliminates common AI cliches, balances sentence lengths, and adds organic conversational transitions.
- Interactive slide-in drawer with real-time streaming and a single-click **"Use This"** button to replace the main workspace content.

### 🔍 4. AI Content Authenticity Detector
- Built-in evaluation of perplexity, burstiness, and formulaic AI language markers.
- Visual circular score gauge (0–100%), verdict tags (*Likely Human*, *Mixed*, *Likely AI-Generated*), and pattern breakdowns.
- Seamless one-click transition to the Humanizer tool.

### 📄 5. Serverless PDF Report Generator
- Automatic and on-demand downloadable PDF research reports with clean formatting.
- Robust cross-environment compilation (Node.js & serverless/Vercel) using base64/blob generation.
- Interactive in-app download banner and direct download triggers.

### 🛠️ 6. Tool Suite
- **Web Search**: Multi-platform search across DDG, ArXiv, HN, GitHub, and Wiki.
- **YouTube Recommendations**: Video tutorials, lectures, and educational content.
- **Weather Forecaster**: Live meteorological conditions for global locations.
- **Date & Time Synchronizer**: Real-time UTC temporal reference.
- **Wikipedia Lookup**: In-depth article section scraping.
- **PDF Generation**: Document compilation from synthesized research.

### 🔐 7. Authentication & Chat History
- JWT authentication (Sign Up / Sign In).
- MongoDB session storage for saving, syncing, and reloading past research threads.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (Turbopack)](https://nextjs.org/) + React 19
- **LLM Orchestration**: [Vercel AI SDK](https://sdk.vercel.ai/) (`streamText`, `stepCountIs`, `tool`)
- **Model Inference**: [Groq Cloud](https://groq.com/) (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`)
- **Styling**: Cyberpunk dark-neon aesthetics with custom CSS tokens and glassmorphism
- **Document Engine**: `jspdf` for document synthesis
- **Database**: MongoDB with Mongoose (chat history & user credentials)

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- A [Groq API Key](https://console.groq.com/keys)
- (Optional) MongoDB connection string for chat history and auth

### 1. Installation

```bash
git clone <repo-url>
cd my-app
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Required for AI inference
GROQ_API_KEY=your_groq_api_key_here

# Optional: For Authentication & Cloud Chat History
MONGODB_URI=mongodb://localhost:27017/atlas
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Running Locally

Start the development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Production Build

To build and verify the application for production deployment:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

---

## ⚙️ Configuration & Settings

Click the **Settings** icon in the navigation bar to configure:
- **Custom Groq API Key**: Override the server default with your personal key.
- **Model Selector**: Switch between `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, etc.
- **Temperature & Max Steps**: Adjust generation randomness and autonomous tool-call loops.
- **Tool Toggles**: Enable or disable specific tools (Web Search, YouTube, Weather, PDF, etc.).
- **System Prompt**: Customize the core agent behavior and synthesis instructions.

---

## 📄 License

MIT License. Designed and built with ATLAS.
