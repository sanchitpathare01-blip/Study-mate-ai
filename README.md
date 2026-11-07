# StudyMate AI — AI-Powered Study Assistant Web Application

StudyMate AI is a production-ready, full-stack web application designed to help students study smarter and faster. By leveraging Google Gemini AI, it transforms raw notes and topics into concise study summaries, interactive 5-question quizzes, and smart 3D flashcards, all while tracking daily habits with an interactive 30-day streak calendar and progress telemetry.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Objectives](#2-project-objectives)
3. [Features](#3-features)
4. [Technologies Used](#4-technologies-used)
5. [Project Folder Structure](#5-project-folder-structure)
6. [Firebase Project Setup](#6-firebase-project-setup)
7. [Firebase Authentication Setup](#7-firebase-authentication-setup)
8. [Firestore Database Setup](#8-firestore-database-setup)
9. [Firestore Security Rules](#9-firestore-security-rules)
10. [Gemini API Setup](#10-gemini-api-setup)
11. [Netlify Environment Variables](#11-netlify-environment-variables)
12. [Local Development Instructions](#12-local-development-instructions)
13. [GitHub Setup](#13-github-setup)
14. [Netlify Deployment Instructions](#14-netlify-deployment-instructions)
15. [Application Screenshots](#15-application-screenshots)
16. [Known Limitations](#16-known-limitations)

---

## 1. Project Overview

StudyMate AI is built specifically for self-learners, high school students, and university scholars looking to optimize their study sessions. Instead of spending hours rereading unstructured lecture notes or textbooks, learners can paste text or enter topics to receive:
- Clear, structured summaries with key takeaways and definitions.
- Instant 5-question quizzes with immediate grading and rationale.
- 3D interactive flashcards with active-recall rating (Known vs. Needs Revision).
- Habit-building tools like a 30-day calendar, streak counters, and daily progress bars.

The entire frontend is built with pure Vanilla JavaScript (ES modules) with zero build steps or frontend frameworks, backed by Google Cloud Firebase and Netlify serverless functions.

---

## 2. Project Objectives

- **Enhance Retention with Active Recall:** Reinforce concepts immediately after reading summaries through targeted quizzes and spaced-repetition-style flashcards.
- **Provide Habit Consistency:** Foster daily learning habits using consecutive streak tracking and motivational milestones.
- **Ensure Privacy and Security:** Keep AI credentials strictly server-side, preventing API key leakage, and protect user data with strict Firestore security rules.
- **Zero Friction Onboarding:** Provide an immediate fallback Demo Mode so anyone can test the full AI feature suite directly in browser storage even before configuring Firebase keys.
- **Fully Responsive & Accessible Design:** Provide a high-end SaaS user experience that functions cleanly on mobile phones, tablets, and desktop computers.

---

## 3. Features

### 📅 30-Day Study Streak Calendar & Habit Tracking (Phase 3)
- **Live 30-Day Calendar Grid:** Adapts dynamically to the current month, year, and day boundaries.
- **Color-Coded Statuses:** 
  - Completed Days: Highlighted green/purple with checkmarks.
  - Today: Glowing cyan border.
  - Missed Days: Muted dashed border.
  - Future Days: Semi-transparent disabled state.
- **Meaningful Activity Rules:** Streaks advance only when meaningful learning happens (generating a session, submitting a quiz, or grading flashcards). Merely logging in never marks a day as completed.
- **Consecutive Streak Metrics:** Tracks Current Streak, Longest Streak, Total Active Days, and Total Completed Sessions.
- **Dynamic Motivational Messages:** Tailored encouragement based on streak milestones (1 day, 3 days, 7 days, 14 days, 30+ days).

### 📊 Real-Time Dashboard & Telemetry (Phase 3)
- **Personalized Welcome Banner:** Displays user's name, local date, and motivational status.
- **Live Metric Panels:** Sessions created, quizzes completed, average quiz percentage, and flashcards mastered.
- **Daily Progress Bar:** Tracks progress toward daily study targets (1 session generated, 1 quiz submitted, 1 flashcard reviewed).
- **Recent Sessions List:** Quick access to the 5 most recent study sessions with instant restore.

### ⚙️ Enhanced Settings & User Preferences (Phase 3)
- **Profile Management:** Update display name and sync directly to Firestore.
- **Theme Selection:** Seamless switching between Dark Navy mode and Clean Light mode with persistent storage.
- **Study Preferences:** Set default explanation styles (Simple, Detailed, Exam-focused) and default quiz difficulty (Easy, Medium, Hard). These preferences automatically pre-populate the Create Material page.
- **API Status Indicator:** Clear verification that Gemini API keys are safely managed server-side.

### 📝 AI Summary Generator (Phase 2)
- Structured AI summaries with title, main concept breakdown, bulleted key takeaways, and keyword glossaries.
- One-click copy to clipboard, text-to-speech voice narration, and `.txt` file export.

### 🎯 AI Quiz Generator (Phase 2)
- Exactly 5 multiple-choice questions tailored to the input material.
- 4 options per question with immediate correct/incorrect feedback, answer explanations, and final percentage scoring.

### 🃏 Interactive 3D Flashcards (Phase 2)
- Realistic 3D flip card animations showing question and answer.
- Status buttons to classify cards as "Known" or "Needs Revision" with automatic progress saves.

### 🕒 Study History Management (Phase 2)
- Searchable archive of all historical study sessions.
- Open any saved session to review summaries, retake quizzes, or practice flashcards without invoking the AI API again.

---

## 4. Technologies Used

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+ Modules).
- **Styling Architecture:** Modern CSS custom properties (variables), Flexbox, CSS Grid, 3D CSS transforms.
- **Authentication:** Firebase Authentication (Email/Password, password reset, session persistence).
- **Cloud Database:** Google Cloud Firestore (documents, subcollections, and server timestamps).
- **AI Processing:** Google Gemini API (`gemini-2.5-flash` model).
- **Serverless Backend:** Netlify Functions (Node.js runtime for proxying AI requests).
- **Local Dev Server:** Built-in Node.js HTTP dev server (`dev-server.js`).
- **Version Control:** Git & GitHub.

---

## 5. Project Folder Structure

```text
studymate-ai/
├── .env.example                # Example environment variables template
├── .gitignore                  # Git ignore rules for node_modules, .env, and logs
├── dev-server.js               # Node.js development server with Netlify function emulation
├── firestore.rules             # Production security rules for Firestore
├── netlify.toml                # Netlify build, routing, and header configuration
├── README.md                   # Complete application guide and documentation
│
├── index.html                  # Landing page
├── login.html                  # Authentication login page
├── signup.html                 # Authentication registration page
├── dashboard.html              # Main analytics & streak calendar dashboard
├── study.html                  # AI material generation & study workspace
├── history.html                # Session archive and search page
├── settings.html               # User profile, theme, and study preferences
│
├── css/
│   ├── base.css                # Base resets, typography, and layout rules
│   ├── components.css          # Shared UI components (buttons, badges, modals, toasts)
│   ├── variables.css           # Design tokens, color schemes, spacing, and transitions
│   └── pages/
│       ├── auth.css            # Login & signup styling
│       ├── dashboard.css       # Dashboard grid, calendar, and telemetry cards
│       ├── history.css         # History listing and search filters
│       ├── landing.css         # Landing hero and features showcase
│       ├── settings.css        # Settings cards, preferences, and profile controls
│       └── study.css           # Study workspace, 3D flashcards, and quiz forms
│
├── js/
│   ├── auth.js                 # Authentication logic, state listeners, and guards
│   ├── firebase-config.js      # Firebase SDK initialization and credentials check
│   ├── session-store.js        # Firestore session storage with demo localStorage fallback
│   ├── streak.js               # Streak calculation, calendar builder, and habit tracker
│   ├── theme.js                # Dark/light theme switcher with persistence
│   ├── ui.js                   # UI utilities (modal popups, toast notifications, loaders)
│   └── pages/
│       ├── dashboard.js        # Dashboard view controller and stats aggregator
│       ├── history.js          # History page controller with search and filters
│       ├── landing.js          # Landing page navigation and interactive demo
│       ├── login.js            # Login form validation and demo login flow
│       ├── settings.js         # Settings form controller and Firestore sync
│       ├── signup.js           # Registration controller and profile creation
│       └── study.js            # AI generation handler, quiz engine, and flashcard manager
│
└── netlify/
    └── functions/
        └── generate.js         # Secure serverless Gemini API handler
```

---

## 6. Firebase Project Setup

To connect StudyMate AI to your own live Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g., `studymate-ai-prod`) and complete the creation wizard (Google Analytics is optional).
4. In the Project Overview page, click the **Web icon (`</>`)** to register a web application.
5. Enter an app nickname (e.g., `StudyMate Web`) and click **Register app**.
6. Firebase will display your SDK configuration object. Copy these values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
7. Open `js/firebase-config.js` in your codebase and update the `firebaseConfig` object with your keys.

---

## 7. Firebase Authentication Setup

1. In your Firebase Console sidebar, navigate to **Build > Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable the first toggle (**Email/Password**). Leave Email link (passwordless sign-in) disabled unless desired.
5. Click **Save**.
6. Under **Settings > Authorized domains**, ensure `localhost` and your Netlify deployment domain (e.g. `your-app.netlify.app`) are listed.

---

## 8. Firestore Database Setup

1. In your Firebase Console sidebar, navigate to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose a Firestore location closest to your users (e.g., `nam5 (us-central)` or `asia-south1`).
4. Choose **Start in production mode** (or test mode if developing locally; our security rules will secure it completely).
5. Click **Enable**.

---

## 9. Firestore Security Rules

StudyMate AI includes a comprehensive, production-grade `firestore.rules` file in the root of the repository.

### Key Security Policies Enforced:
- **Default Deny:** All unauthenticated or unmapped read/write requests are blocked.
- **User Document Privacy:** `users/{userId}` is strictly readable and writable only by the authenticated owner (`request.auth.uid == userId`). Critical fields like `uid`, `email`, and `createdAt` are immutable.
- **Session Scoping:** `users/{userId}/sessions/{sessionId}` allows CRUD operations solely for the document owner. Content length bounds and schemas are strictly validated.
- **Streak Data Protection:** `users/{userId}/streak/{streakDoc}` allows reads and updates only by the owner, validating date string formats and non-negative streak counters.
- **Zero API Key Storage:** Private API keys are never stored in client documents.

### Deploying the Rules:
To deploy rules directly using Firebase CLI:
```bash
npx firebase-tools deploy --only firestore:rules
```
Or simply copy the contents of `firestore.rules` and paste them into the **Rules** tab of your Firestore Database console, then click **Publish**.

---

## 10. Gemini API Setup

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** and select or create a Google Cloud project.
4. Copy your API key.
5. Keep your API key strictly private. Never paste it into frontend JavaScript files or commit it to GitHub.

---

## 11. Netlify Environment Variables

When deploying to Netlify, serverless functions access environment variables securely through Node's `process.env`.

Configure the following variables in Netlify:
- `GEMINI_API_KEY`: Your Google AI Studio API key.
- `GEMINI_MODEL`: (Optional, defaults to `gemini-2.5-flash`).

### How to Add Variables in Netlify:
1. Log in to your Netlify dashboard and open your site.
2. Go to **Site configuration > Environment variables**.
3. Click **Add a variable** -> **Add a single variable**.
4. Set the key to `GEMINI_API_KEY` and value to your key.
5. Click **Create variable**.

---

## 12. Local Development Instructions

StudyMate AI comes with a built-in zero-dependency local development server that serves static files and proxies `/api/generate` requests to Gemini using your local `.env`.

### Prerequisites:
- Node.js (version 18 or higher recommended).

### Steps:
1. **Clone the repository:**
   ```bash
   git clone https://github.com/sanchitpathare01-blip/Study-mate-ai.git
   cd Study-mate-ai
   ```

2. **Create your local `.env` file:**
   Copy the example file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your key:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualKeyHere
   GEMINI_MODEL=gemini-2.5-flash
   ```

3. **Start the local server:**
   ```bash
   node dev-server.js
   ```

4. **Open your browser:**
   Navigate to:
   ```text
   http://localhost:8080
   ```

*(Alternatively, if you use the Netlify CLI: run `netlify dev` to test both static hosting and functions simultaneously).*

---

## 13. GitHub Setup

1. Initialize Git in your project if needed:
   ```bash
   git init
   ```
2. Verify that your `.gitignore` contains `.env`, `.netlify`, and any sensitive logs.
3. Stage and commit your changes:
   ```bash
   git add .
   git commit -m "Complete Phase 3: Streak Calendar, Progress Tracking & Security"
   ```
4. Push to your GitHub repository:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git branch -M main
   git push -u origin main
   ```

---

## 14. Netlify Deployment Instructions

Deploying StudyMate AI to production on Netlify takes less than 3 minutes:

1. **Log in to Netlify:** Visit [app.netlify.com](https://app.netlify.com/).
2. **Add New Site:** Click **Add new site > Import an existing project**.
3. **Connect to GitHub:** Authorize Netlify and select the `Study-mate-ai` repository.
4. **Build & Deploy Settings:**
   - **Branch to deploy:** `main`
   - **Base directory:** (leave empty)
   - **Build command:** (leave empty — pure static assets)
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions` (auto-detected via `netlify.toml`)
5. **Add Environment Variables:**
   - Before deploying, click **Add environment variables** and enter `GEMINI_API_KEY`.
6. **Deploy:** Click **Deploy site**.
7. **Verify Firebase Authorization:**
   - Copy your new Netlify live URL (e.g. `https://studymate-ai.netlify.app`).
   - Go to your Firebase Console > Authentication > Settings > Authorized domains.
   - Add your Netlify domain so users can authenticate on production.

---

## 15. Application Screenshots

| Page | Preview Placeholder | Description |
|---|---|---|
| **Landing Page** | `[Screenshot Placeholder: Landing Page]` | Hero banner, features overview, study benefits, and responsive navbar. |
| **User Dashboard** | `[Screenshot Placeholder: Dashboard]` | Real-time telemetry, 30-day streak calendar, and daily study targets. |
| **Study Workspace** | `[Screenshot Placeholder: Workspace]` | Note submission panel, AI summary generator, and text-to-speech toolbar. |
| **Interactive Quiz** | `[Screenshot Placeholder: Quiz]` | 5-question multiple choice test with immediate answer validation and explanations. |
| **3D Flashcards** | `[Screenshot Placeholder: Flashcards]` | 3D flippable flashcards with active recall status tracking (Known vs. Needs Revision). |
| **Study History** | `[Screenshot Placeholder: History]` | Searchable archive of saved sessions with instant reload without API calls. |
| **Settings** | `[Screenshot Placeholder: Settings]` | User profile editor, Dark/Light theme toggles, and study preference defaults. |

*(To add real screenshots, place PNG or JPG files in an `assets/screenshots/` folder and replace the placeholders with Markdown image links).*

---

## 16. Known Limitations

- **Text-Only Note Input:** The current version accepts text and notes up to 30,000 characters. Uploading binary documents (PDFs, PPTX, DOCX) requires converting or pasting text.
- **Netlify Function Timeout:** Free-tier Netlify serverless functions have a 10-second execution timeout. Very large study notes (>25,000 characters) may occasionally hit timeout limits depending on Gemini API latency.
- **Browser Text-to-Speech Voices:** Voice quality and available accents for audio summaries rely on the host device's Web Speech Synthesis API.
- **Offline Mode Persistence:** When running in Demo Mode without Firebase configured, sessions and streaks are preserved in the user's browser `localStorage` and will not sync across multiple devices. Configuring Firebase keys enables seamless multi-device cloud synchronization.

---

## 📄 License

MIT License. Feel free to use, modify, and build upon this application for personal or educational projects!
