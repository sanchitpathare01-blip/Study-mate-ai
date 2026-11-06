/**
 * StudyMate AI - Unified Session Store
 * 
 * Automatically switches between:
 *  1. Cloud Firestore (when real Firebase credentials are configured)
 *  2. Local Browser Storage (when running in Demo/Offline mode)
 * 
 * This ensures the app is 100% testable immediately with the Gemini AI engine,
 * while seamlessly syncing with Firebase Firestore when real keys are provided.
 */

import { db, isFirebaseConfigured } from './firebase-config.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const LOCAL_STORAGE_KEY_PREFIX = 'studymate_sessions_';

function getLocalKey(userId) {
  return `${LOCAL_STORAGE_KEY_PREFIX}${userId || 'local-user'}`;
}

function getLocalSessions(userId) {
  try {
    const raw = localStorage.getItem(getLocalKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading local sessions:', err);
    return [];
  }
}

function saveLocalSessions(userId, sessions) {
  try {
    localStorage.setItem(getLocalKey(userId), JSON.stringify(sessions));
  } catch (err) {
    console.warn('Error saving local sessions:', err);
  }
}

/**
 * Save a brand new session
 * @param {string} userId
 * @param {object} payload
 * @returns {Promise<string>} The new sessionId
 */
export async function createSession(userId, payload) {
  if (isFirebaseConfigured() && db) {
    const newRef = doc(collection(db, 'users', userId, 'sessions'));
    const sessionData = {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(newRef, sessionData);
    return newRef.id;
  }

  // Local storage fallback
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const now = new Date().toISOString();
  const sessionData = {
    ...payload,
    id: sessionId,
    createdAt: now,
    updatedAt: now
  };

  const sessions = getLocalSessions(userId);
  sessions.unshift(sessionData);
  saveLocalSessions(userId, sessions);
  return sessionId;
}

/**
 * Fetch a session by its ID
 * @param {string} userId
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
export async function getSessionById(userId, sessionId) {
  if (isFirebaseConfigured() && db) {
    const ref = doc(db, 'users', userId, 'sessions', sessionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }

  const sessions = getLocalSessions(userId);
  return sessions.find(s => s.id === sessionId) || null;
}

/**
 * Update an existing session (e.g. quiz results or flashcard status)
 * @param {string} userId
 * @param {string} sessionId
 * @param {object} updates
 */
export async function updateSessionData(userId, sessionId, updates) {
  if (isFirebaseConfigured() && db) {
    const ref = doc(db, 'users', userId, 'sessions', sessionId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return;
  }

  const sessions = getLocalSessions(userId);
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx !== -1) {
    sessions[idx] = {
      ...sessions[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveLocalSessions(userId, sessions);
  }
}

/**
 * List sessions for a user, ordered newest first
 * @param {string} userId
 * @param {number} [maxItems]
 * @returns {Promise<Array>}
 */
export async function listUserSessions(userId, maxItems) {
  if (isFirebaseConfigured() && db) {
    const ref = collection(db, 'users', userId, 'sessions');
    const constraints = [orderBy('createdAt', 'desc')];
    if (maxItems) constraints.push(limit(maxItems));
    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  const sessions = getLocalSessions(userId);
  // Sort descending by createdAt
  sessions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return maxItems ? sessions.slice(0, maxItems) : sessions;
}

/**
 * Delete a session
 * @param {string} userId
 * @param {string} sessionId
 */
export async function deleteUserSession(userId, sessionId) {
  if (isFirebaseConfigured() && db) {
    const ref = doc(db, 'users', userId, 'sessions', sessionId);
    await deleteDoc(ref);
    return;
  }

  let sessions = getLocalSessions(userId);
  sessions = sessions.filter(s => s.id !== sessionId);
  saveLocalSessions(userId, sessions);
}

/**
 * Clear all sessions for a user
 * @param {string} userId
 */
export async function clearAllUserSessions(userId) {
  if (isFirebaseConfigured() && db) {
    const ref = collection(db, 'users', userId, 'sessions');
    const snap = await getDocs(ref);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
    return;
  }

  saveLocalSessions(userId, []);
}

