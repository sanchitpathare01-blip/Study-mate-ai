# StudyMate AI — Phase 1: Foundation, Authentication, Landing Page & Dashboard

StudyMate AI is a modern AI-powered study assistant application designed to transform complex study materials into concise summaries, interactive quizzes, and smart flashcards.

This repository contains **Phase 1**: the responsive design system, landing page, Firebase Authentication, protected dashboard shell, and settings page.

---

## 🚀 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Modern ES Modules — zero build step required).
- **Authentication:** Firebase Authentication (Email & Password).
- **Database:** Firebase Cloud Firestore.
- **Theme System:** Dark Navy (default) & Clean Light mode with `localStorage` persistence.
- **Hosting Ready:** Netlify configuration included (`netlify.toml`).
- **AI Integration:** Google Gemini API *(Scheduled for Phase 2)*.

---

## 📁 Project Structure

```text
studymate-ai/
│
├── index.html                  # Landing page with interactive preview mockup
├── login.html                  # Login page with password reset modal
├── signup.html                 # Registration page with validation & profile creation
├── dashboard.html              # Protected user dashboard shell
├── settings.html               # User profile, appearance & account settings
│
├── css/
│   ├── variables.css           # Design tokens, color palettes & transitions
│   ├── base.css                # Global typography, resets & accessibility
│   ├── components.css          # Reusable buttons, cards, modals, inputs & toasts
│   └── pages/
│       ├── landing.css         # Landing page styles & mockup animations
│       ├── auth.css            # Login & signup styling
│       ├── dashboard.css       # Sidebar, topbar & dashboard grid styles
│       └── settings.css        # Settings panels & theme selector styles
│
├── js/
│   ├── firebase-config.js      # Firebase app initialization & configuration check
│   ├── auth.js                 # Authentication service & route guard listeners
│   ├── theme.js                # Dark/light theme manager & persistence
│   ├── ui.js                   # Reusable UI helpers (toasts, modals, button loaders)
│   └── pages/
│       ├── landing.js          # Landing page navigation & interactive mockup
│       ├── login.js            # Login validation & password reset flow
│       ├── signup.js           # Signup validation & Firestore user document creation
│       ├── dashboard.js        # Dashboard state, route guard & Phase 2 modals
│       └── settings.js         # Profile updates, theme selection & logout
│
├── assets/                     # Static media & illustrations
├── netlify/
│   └── functions/              # Placeholder for future backend/AI endpoints
│
├── firestore.rules             # Production security rules for Cloud Firestore
├── .gitignore                  # Git exclusions for secrets and environment files
├── .env.example                # Template for Firebase credentials
├── netlify.toml                # Netlify deployment and security headers
└── README.md                   # Full documentation & setup guide
```

---

## 🔥 Step-by-Step Firebase Setup Instructions

Follow these steps to connect your own Firebase project for authentication and database storage:

### 1. Create a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g. `studymate-ai`).
4. (Optional) Disable Google Analytics for development speed, then click **Create project**.

### 2. Register a Web Application
1. In your project dashboard, click the **Web icon (`</>`)** to add an app.
2. Enter an App nickname (e.g., `StudyMate Web App`).
3. Leave "Also set up Firebase Hosting" unchecked for now.
4. Click **Register app**.
5. Copy the `firebaseConfig` object provided by Firebase.

### 3. Add Firebase Configuration to the Project
Open `js/firebase-config.js` and replace the placeholder values with your copied config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_FIREBASE_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### 4. Enable Email & Password Authentication
1. In the Firebase Console left sidebar, click **Build** -> **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, select **Email/Password**.
4. Toggle **Enable** (leave Email link passwordless sign-in disabled).
5. Click **Save**.

### 5. Enable Cloud Firestore
1. In the Firebase Console left sidebar, click **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Choose a Firestore location close to your users (e.g. `asia-south1` or `us-central1`).
4. Select **Start in production mode** (or test mode for 30 days of testing).
5. Click **Create**.

### 6. Set Firestore Security Rules
Go to the **Rules** tab in Cloud Firestore, paste the contents of `firestore.rules`, and click **Publish**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🧪 Testing Checklist

1. **Landing Page:** Open `index.html` in your browser. Verify the navbar links, the interactive mockup tabs, the theme toggle, and mobile menu.
2. **Registration:** Navigate to `signup.html`. Try submitting an empty form to test client-side validation. Enter valid details and click "Create Account".
3. **Firestore Verification:** In Firebase Console -> Firestore Database, check the `users` collection to confirm a document matching the user's UID was created.
4. **Dashboard Access:** Confirm redirection to `dashboard.html`. The user's name should appear in the greeting, sidebar, and avatar.
5. **Phase 2 Placeholders:** Click on Summary, Quiz, Flashcards, or History in the dashboard to verify the informative Phase 2 modal appears without breaking the application.
6. **Settings & Profile Edit:** Go to `settings.html`. Edit the name, save changes, and verify the name updates across the page and in Firestore.
7. **Theme Switcher:** Switch between Dark Navy and Clean Light mode in the Settings page or via the navbar icon. Refresh the page to verify your theme selection persists.
8. **Route Protection:** Open an incognito browser window and attempt to open `dashboard.html` or `settings.html` directly. Verify you are automatically redirected to `login.html`.
9. **Password Reset:** On `login.html`, click "Forgot password?", enter your email, and verify the password reset link is sent.
10. **Logout:** Click "Log Out" in the sidebar or Settings page. Confirm that your session is terminated and you are returned to `login.html`.

---

## 🌐 Netlify Deployment

1. Push this repository to your GitHub account (`sanchitpathare01-blip/Study-mate-ai`).
2. Log in to [Netlify](https://app.netlify.com/).
3. Click **Add new site** -> **Import an existing project** -> **GitHub**.
4. Select `Study-mate-ai`.
5. Leave Build Command blank (plain HTML/CSS/JS requires no build step). Set Publish directory to `.`.
6. Click **Deploy StudyMate AI**.

---

## 📌 Phase Roadmap

- [x] **Phase 1 (Completed):** Foundation, Design System, Responsive Landing Page, Firebase Authentication, Protected Dashboard Shell, and Settings.
- [ ] **Phase 2 (Upcoming):** Gemini API Integration, Notes Input Processing, AI Summary Generation, 5-Question Quiz Generator, and Interactive Flashcards.
- [ ] **Phase 3 (Upcoming):** Daily Study Progress Tracking, 30-Day Streak Consolidation, Spaced Repetition Algorithms, and Export Features.
