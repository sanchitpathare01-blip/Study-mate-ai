/**
 * StudyMate AI - Firebase Configuration & Initialization
 * 
 * Paste your web app configuration from Firebase Console:
 * Project Settings -> General -> Your apps -> Web app -> Firebase configuration
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Check for runtime config or environment variables (can be loaded via window.__ENV__ or replaced below)
const firebaseConfig = window.__FIREBASE_CONFIG__ || {
  apiKey: "AIzaSyYOUR_API_KEY_HERE",
  authDomain: "studymate-ai-demo.firebaseapp.com",
  projectId: "studymate-ai-demo",
  storageBucket: "studymate-ai-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

/**
 * Checks whether Firebase has been configured with real project credentials
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_API_KEY_HERE") &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes("demo")
  );
}

// Initialize Firebase App
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase initialization note:", error.message);
}

export { app, auth, db, firebaseConfig };
