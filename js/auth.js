/**
 * StudyMate AI - Authentication & User State Service
 * 
 * Supports two seamless operational modes:
 *  1. Cloud Firebase Auth: Active when valid Firebase project credentials are provided.
 *  2. Local Demo Mode: Automatically activates when Firebase credentials are not yet configured,
 *     allowing users to test all features (AI Summaries, Quizzes, Flashcards, History) immediately.
 */

import { auth, db, isFirebaseConfigured } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getCurrentTheme } from './theme.js';

const DEMO_USER_STORAGE_KEY = 'studymate_demo_user';

/**
 * Get the currently logged-in demo user from local storage
 * @returns {object|null}
 */
export function getDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Save demo user to local storage
 * @param {object} user
 */
export function setDemoUser(user) {
  try {
    localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn("Could not save demo user to localStorage", e);
  }
}

/**
 * Clear demo user
 */
export function clearDemoUser() {
  try {
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
  } catch (e) {
    // Ignore
  }
}

/**
 * Register a new user with Email, Password and Name
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} User credential
 */
export async function registerUser(name, email, password) {
  if (!isFirebaseConfigured()) {
    // Local Demo Registration
    const demoUser = {
      uid: 'demo_user_' + Date.now().toString(36),
      displayName: name.trim(),
      email: email.trim().toLowerCase(),
      isDemo: true,
      createdAt: new Date().toISOString()
    };
    setDemoUser(demoUser);
    return { user: demoUser };
  }

  // 1. Create auth user in Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = userCredential.user;

  // 2. Update display name in Firebase Auth Profile
  await updateProfile(user, {
    displayName: name.trim()
  });

  // 3. Create Firestore user document at users/{uid}
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: serverTimestamp(),
      theme: getCurrentTheme(),
      apiKeyPreference: {
        mode: 'default',
        configured: false
      }
    });
  } catch (firestoreError) {
    console.warn("Could not create Firestore user document (check Firestore security rules):", firestoreError);
  }

  return userCredential;
}

/**
 * Log in an existing user
 * @param {string} email
 * @param {string} password
 * @param {boolean} [rememberMe=true]
 * @returns {Promise<object>} User credential
 */
export async function loginUser(email, password, rememberMe = true) {
  if (!isFirebaseConfigured()) {
    // Local Demo Login
    const existing = getDemoUser();
    const demoUser = {
      uid: existing ? existing.uid : 'demo_user_default',
      displayName: existing ? existing.displayName : (email.split('@')[0] || 'Student'),
      email: email.trim().toLowerCase(),
      isDemo: true
    };
    setDemoUser(demoUser);
    return { user: demoUser };
  }

  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, persistence);

  return await signInWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Log out the current user and redirect to login
 */
export async function logoutUser() {
  clearDemoUser();

  if (isFirebaseConfigured() && auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("SignOut error:", e);
    }
  }

  window.location.href = 'login.html';
}

/**
 * Send password reset email
 * @param {string} email
 */
export async function resetPassword(email) {
  if (!isFirebaseConfigured()) {
    // Simulated reset in demo mode
    return true;
  }
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Guard protected pages (dashboard.html, settings.html, study.html, history.html).
 * Redirects unauthenticated users to login.html.
 * @param {Function} onAuthenticated - Callback receiving (user, userData)
 */
export function requireAuth(onAuthenticated) {
  const loadingOverlay = document.getElementById('auth-loading-overlay');

  if (!isFirebaseConfigured()) {
    let demoUser = getDemoUser();

    // In demo mode, if there's no stored demo user yet, create a default session for instant access
    if (!demoUser) {
      demoUser = {
        uid: 'demo_user_default',
        displayName: 'Sanchit Pathare',
        email: 'sanchitpathare01@gmail.com',
        isDemo: true
      };
      setDemoUser(demoUser);
    }

    showConfigurationBanner();

    if (loadingOverlay) {
      loadingOverlay.classList.add('is-hidden');
    }

    if (typeof onAuthenticated === 'function') {
      onAuthenticated(demoUser, {
        name: demoUser.displayName,
        email: demoUser.email
      });
    }
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Not logged in -> redirect to login page
      window.location.href = 'login.html';
      return;
    }

    // Fetch extra user details from Firestore
    let userData = null;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
      }
    } catch (err) {
      console.warn("Error fetching user data from Firestore:", err);
    }

    // Hide loading overlay
    if (loadingOverlay) {
      loadingOverlay.classList.add('is-hidden');
    }

    if (typeof onAuthenticated === 'function') {
      onAuthenticated(user, userData);
    }
  });
}

/**
 * Guard public auth pages (login.html, signup.html).
 * Redirects logged in users to dashboard.html.
 */
export function redirectIfAuthenticated() {
  const loadingOverlay = document.getElementById('auth-loading-overlay');

  if (!isFirebaseConfigured()) {
    const demoUser = getDemoUser();
    if (demoUser) {
      window.location.href = 'dashboard.html';
      return;
    }
    showConfigurationBanner();
    if (loadingOverlay) {
      loadingOverlay.classList.add('is-hidden');
    }
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = 'dashboard.html';
    } else {
      if (loadingOverlay) {
        loadingOverlay.classList.add('is-hidden');
      }
    }
  });
}

/**
 * Display helper banner when running in demo/offline mode
 */
function showConfigurationBanner() {
  const existing = document.getElementById('firebase-config-notice');
  if (existing) return;

  const notice = document.createElement('div');
  notice.id = 'firebase-config-notice';
  notice.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30, 27, 75, 0.95);
    border: 1px solid rgba(139, 92, 246, 0.5);
    backdrop-filter: blur(8px);
    color: #e0e7ff;
    padding: 10px 18px;
    border-radius: 9999px;
    font-size: 13px;
    z-index: 9999;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    max-width: 92%;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
  `;
  notice.innerHTML = `
    <span>⚡ <strong>Demo Mode:</strong> Using browser storage. Add keys to <code>js/firebase-config.js</code> anytime for cloud sync.</span>
    <button type="button" aria-label="Dismiss notice" onclick="this.parentElement.remove()" style="background: transparent; border: none; color: #a5b4fc; cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 4px;">✕</button>
  `;
  document.body.prepend(notice);
}

/**
 * Convert Firebase Auth error codes into helpful user messages
 * @param {Error|object} error
 * @returns {string}
 */
export function getFriendlyErrorMessage(error) {
  if (!error) return "An unexpected error occurred. Please try again.";

  const code = error.code || "";
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email address is already registered. Please log in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in your Firebase Console.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account was found with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes before trying again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      return error.message || 'An error occurred during authentication. Please try again.';
  }
}
