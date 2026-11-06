# StudyMate AI — AI-Powered Study Assistant Web Application

StudyMate AI is a modern, responsive web application that turns your study notes into concise summaries, interactive 5-question quizzes, and smart 3D flashcards using Google Gemini AI.

---

## 🚀 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Modern ES Modules — zero build step or framework required).
- **Authentication:** Firebase Authentication with automatic fallback to instant Demo Mode.
- **Database:** Firebase Cloud Firestore with automatic local storage adapter.
- **AI Integration:** Google Gemini API (`gemini-2.5-flash`) via secure serverless endpoint.
- **Design System:** Responsive CSS variable-based theme system (Dark Navy default & Clean Light mode).
- **Hosting Ready:** Netlify configuration and serverless functions (`netlify.toml`).

---

## 📁 Project Structure

```text
studymate-ai/
│
├── index.html                  # Landing page with feature overview & preview
├── study.html                  # AI Study Workspace (Summary, Quiz, Flashcards)
├── dashboard.html              # User dashboard with live stats & recent sessions
├── history.html                # Study session history, search, and session recall
├── login.html                  # Login page with 1-click instant demo access
├── signup.html                 # Registration page with validation & demo access
├── settings.html               # User profile, appearance & AI service status
│
├── css/
│   ├── variables.css           # Design tokens, color palettes & transitions
│   ├── base.css                # Global typography, resets & accessibility
│   ├── components.css          # Reusable buttons, cards, modals, inputs & toasts
│   └── pages/
│       ├── landing.css         # Landing page styles
│       ├── study.css           # Workspace, 3D flashcard flip & quiz styles
│       ├── dashboard.css       # Sidebar, topbar & dashboard grid styles
│       ├── history.css         # History cards grid & search styles
│       ├── auth.css            # Login & signup styling
│       └── settings.css        # Settings panels & theme selector styles
│
├── js/
│   ├── firebase-config.js      # Firebase app initialization & configuration check
│   ├── session-store.js        # Unified store (Firestore + LocalStorage demo fallback)
│   ├── auth.js                 # Authentication service & route guard listeners
│   ├── theme.js                # Dark/light theme manager & persistence
│   ├── ui.js                   # Reusable UI helpers (toasts, modals, button loaders)
│   └── pages/
│       ├── landing.js          # Landing page navigation & interactive mockup
│       ├── study.js            # Workspace controller (AI summary, quiz & flashcards)
│       ├── dashboard.js        # Dashboard state & live session telemetry
│       ├── history.js          # History manager, search filter & session restoration
│       ├── login.js            # Login validation & password reset flow
│       ├── signup.js           # Signup validation & user profile creation
│       └── settings.js         # Profile updates, theme selection & logout
│
├── netlify/
│   └── functions/
│       └── generate.js         # Secure serverless Gemini AI endpoint
│
├── firestore.rules             # Production security rules for Cloud Firestore
├── dev-server.js               # Local development server with Netlify function proxy
├── netlify.toml                # Netlify deployment and routing configuration
├── .gitignore                  # Git exclusions for secrets and environment files
├── .env.example                # Template for Gemini API and Firebase credentials
└── README.md                   # Full documentation & setup guide
```

---

## ⚡ Core Features (Phase 1 & Phase 2)

### 1. 📝 AI Summary Generator
- Converts pasted study notes or topics into easy-to-read, structured summaries.
- Generates key takeaway points and essential keywords with explanations.
- Features: One-click Copy, Text-to-Speech narration, and Text File Download.

### 2. 🎯 AI Quiz Generator
- Generates **exactly 5 multiple-choice questions** based strictly on the input material.
- 4 options per question with real-time feedback, correct answer reveal, and detailed explanations.
- Final score badge and completion percentage saved with the session.

### 3. 🃏 Interactive Flashcards
- 3D flip card animations showing Question on front and Answer on back.
- Interactive status tracking: mark cards as **Known** or **Needs Revision**.
- Progress bar and flip counters automatically saved.

### 4. 🕒 Study History Management
- Browsable archive of all previous study sessions.
- Client-side search by topic name.
- Single-session deletion and complete clear-all actions with confirmation dialogs.
- **Instant Restore:** Opening any past session restores the full summary, quiz answers, and flashcard states without re-calling the AI API.

### 5. 🌓 Theme System
- Seamless toggle between **Dark Navy** and **Clean Light** themes.
- Preferences automatically saved in `localStorage` across page navigations.

---

## 💻 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sanchitpathare01-blip/Study-mate-ai.git
   cd Study-mate-ai
   ```

2. **Configure your Gemini API Key:**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

3. **Start the local development server:**
   ```bash
   node dev-server.js
   ```

4. **Open in your browser:**
   ```text
   http://localhost:8080
   ```

---

## 🔒 Security Best Practices
- The **Gemini API key is kept server-side only** inside Netlify serverless functions (`netlify/functions/generate.js`) and local `.env`.
- Secrets are excluded from version control via `.gitignore`.
