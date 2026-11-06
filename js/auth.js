/**
 * StudyMate AI - Firebase Authentication & User State Service
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

/**
 * Register a new user with Email, Password and Name
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} User credential
 */
export async function registerUser(name, email, password) {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured yet. Please update 'js/firebase-config.js' with your Firebase project keys."
    );
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
    throw new Error(
      "Firebase is not configured yet. Please update 'js/firebase-config.js' with your Firebase project keys."
    );
  }

  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, persistence);

  return await signInWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Log out the current user and redirect to login
 */
export async function logoutUser() {
  if (!auth) {
    window.location.href = 'login.html';
    return;
  }
  await signOut(auth);
  window.location.href = 'login.html';
}

/**
 * Send password reset email
 * @param {string} email
 */
export async function resetPassword(email) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured yet. Please configure your Firebase project credentials.");
  }
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Guard protected pages (dashboard.html, settings.html).
 * Redirects unauthenticated users to login.html.
 * @param {Function} onAuthenticated - Callback receiving (user, userData)
 */
export function requireAuth(onAuthenticated) {
  const loadingOverlay = document.getElementById('auth-loading-overlay');

  if (!isFirebaseConfigured()) {
    // If Firebase is not configured, show instructional banner on page
    showConfigurationBanner();
    if (loadingOverlay) loadingOverlay.classList.add('is-hidden');
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
    showConfigurationBanner();
    if (loadingOverlay) loadingOverlay.classList.add('is-hidden');
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Already authenticated -> redirect to dashboard
      window.location.href = 'dashboard.html';
    } else {
      if (loadingOverlay) {
        loadingOverlay.classList.add('is-hidden');
      }
    }
  });
}

/**
 * Display helper banner if Firebase keys have not been added yet
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
    background: #1e1b4b;
    border: 1px solid #7c3aed;
    color: #e0e7ff;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    max-width: 90%;
    text-align: center;
  `;
  notice.innerHTML = `
    <strong>Firebase Setup Required:</strong> To enable real authentication, update
    <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">js/firebase-config.js</code> with your Firebase project keys.
    <a href="README.md" target="_blank" style="color: #a5b4fc; text-decoration: underline; margin-left: 8px;">View Setup Guide</a>
    <button type="button" onclick="this.parentElement.remove()" style="margin-left: 12px; background: transparent; border: none; color: #fff; cursor: pointer; font-weight: bold;">✕</button>
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

