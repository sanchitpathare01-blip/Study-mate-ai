/**
 * StudyMate AI - Study Streak & Calendar Service
 * 
 * Manages daily study streak calculations, activity tracking,
 * calendar generation, and Firestore / LocalStorage persistence.
 * 
 * Rules:
 * - A day is marked completed if the user performs at least ONE meaningful action:
 *   1. Generates study materials
 *   2. Completes a quiz
 *   3. Reviews flashcards (marks Known or Needs Revision)
 * - Multiple activities on the same calendar day count as ONE active day.
 * - Logging in or browsing does NOT count as study activity.
 * - Handles local timezone calendar dates, month/year boundaries, and consecutive days.
 */

import { db, isFirebaseConfigured } from './firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const LOCAL_STREAK_KEY_PREFIX = 'studymate_streak_';

/**
 * Returns the user's current local date formatted as YYYY-MM-DD
 * @param {Date} [date]
 * @returns {string}
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates yesterday's date string in YYYY-MM-DD
 * @param {string} dateStr YYYY-MM-DD
 * @returns {string}
 */
export function getPreviousDayString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prevDate = new Date(y, m - 1, d - 1);
  return getLocalDateString(prevDate);
}

/**
 * Calculates current & longest streaks from a set of unique active date strings
 * @param {string[]} activeDates Array of 'YYYY-MM-DD' strings
 * @param {string} [todayStr] Optional today date string
 * @returns {{ currentStreak: number, longestStreak: number, totalActiveDays: number }}
 */
export function calculateStreakStats(activeDates = [], todayStr = getLocalDateString()) {
  if (!Array.isArray(activeDates) || activeDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };
  }

  // Deduplicate and sort ascending
  const uniqueDates = Array.from(new Set(activeDates)).sort();
  const dateSet = new Set(uniqueDates);

  // 1. Calculate Current Streak
  // Streak is alive if active today, or if active yesterday (meaning today is still pending)
  const yesterdayStr = getPreviousDayString(todayStr);

  let currentStreak = 0;
  let checkDate = null;

  if (dateSet.has(todayStr)) {
    checkDate = todayStr;
  } else if (dateSet.has(yesterdayStr)) {
    checkDate = yesterdayStr;
  }

  if (checkDate) {
    currentStreak = 1;
    let prev = getPreviousDayString(checkDate);
    while (dateSet.has(prev)) {
      currentStreak++;
      prev = getPreviousDayString(prev);
    }
  }

  // 2. Calculate Longest Historical Streak
  let longestStreak = 0;
  let runningStreak = 0;
  let lastChecked = null;

  for (const date of uniqueDates) {
    if (!lastChecked) {
      runningStreak = 1;
    } else {
      const expectedNext = getPreviousDayString(date);
      if (expectedNext === lastChecked) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    lastChecked = date;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalActiveDays: dateSet.size
  };
}

/**
 * Get dynamic motivational message according to streak length
 * @param {number} streak
 * @param {boolean} [completedToday=false]
 * @returns {string}
 */
export function getMotivationalMessage(streak, completedToday = false) {
  if (streak === 0) {
    return "Complete an activity today to start your study streak!";
  }
  if (streak === 1) {
    return completedToday 
      ? "Great start! Day 1 completed. Keep learning tomorrow!"
      : "You're at 1 day streak! Study today to keep it going.";
  }
  if (streak < 3) {
    return "2 days strong! Consistency is turning into a habit.";
  }
  if (streak < 7) {
    return "🔥 You're building an unstoppable study habit!";
  }
  if (streak < 14) {
    return "⚡ Over one full week of dedication! Excellent work.";
  }
  if (streak < 30) {
    return "🌟 Amazing dedication! Two weeks of continuous learning.";
  }
  return "🏆 StudyMate Champion! 30+ days of excellence!";
}

/**
 * Fetch streak data for a user
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getStreakData(userId) {
  if (!userId) {
    userId = 'local-user';
  }

  if (isFirebaseConfigured() && db) {
    try {
      const streakRef = doc(db, 'users', userId, 'streak', 'summary');
      const snap = await getDoc(streakRef);
      if (snap.exists()) {
        const data = snap.data();
        const activeDates = data.activeDates || [];
        const stats = calculateStreakStats(activeDates);
        return {
          ...data,
          ...stats,
          activeDates
        };
      }
    } catch (err) {
      console.warn("Could not fetch streak from Firestore, using local fallback:", err);
    }
  }

  // Local storage fallback
  try {
    const raw = localStorage.getItem(`${LOCAL_STREAK_KEY_PREFIX}${userId}`);
    if (raw) {
      const data = JSON.parse(raw);
      const activeDates = data.activeDates || [];
      const stats = calculateStreakStats(activeDates);
      return {
        ...data,
        ...stats,
        activeDates
      };
    }
  } catch (err) {
    console.warn("Error reading local streak:", err);
  }

  return {
    activeDates: [],
    currentStreak: 0,
    longestStreak: 0,
    totalActiveDays: 0,
    lastActivityDate: null
  };
}

/**
 * Record a meaningful study activity (Generation, Quiz completion, Flashcard review)
 * @param {string} userId
 * @param {string} [activityType='general']
 * @returns {Promise<object>} Updated streak state
 */
export async function recordStudyActivity(userId, activityType = 'general') {
  if (!userId) {
    userId = 'local-user';
  }

  const todayStr = getLocalDateString();
  const currentData = await getStreakData(userId);
  const dateSet = new Set(currentData.activeDates || []);

  const isNewDay = !dateSet.has(todayStr);
  dateSet.add(todayStr);

  const activeDates = Array.from(dateSet).sort();
  const stats = calculateStreakStats(activeDates, todayStr);

  const updatedPayload = {
    activeDates,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    totalActiveDays: stats.totalActiveDays,
    lastActivityDate: todayStr,
    lastActivityType: activityType,
    updatedAt: new Date().toISOString()
  };

  // Save to local storage
  try {
    localStorage.setItem(`${LOCAL_STREAK_KEY_PREFIX}${userId}`, JSON.stringify(updatedPayload));
  } catch (err) {
    console.warn("Could not save streak to localStorage:", err);
  }

  // Save to Firestore if configured
  if (isFirebaseConfigured() && db) {
    try {
      const streakRef = doc(db, 'users', userId, 'streak', 'summary');
      await setDoc(streakRef, {
        ...updatedPayload,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn("Could not save streak to Firestore:", err);
    }
  }

  return {
    ...updatedPayload,
    isNewDay
  };
}

/**
 * Builds real calendar day items for a 30-day view adapting to current month & year
 * @param {string[]} activeDates List of active YYYY-MM-DD dates
 * @param {Date} [referenceDate]
 * @returns {Array<{ dayNumber: number, dateStr: string, status: 'completed'|'missed'|'today'|'future', label: string }>}
 */
export function buildMonthCalendarDays(activeDates = [], referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed
  const todayStr = getLocalDateString(referenceDate);
  const dateSet = new Set(activeDates);

  // Total days in current month (e.g., 28, 29, 30, or 31)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month, day);
    const dateStr = getLocalDateString(dayDate);

    let status = 'future';
    if (dateStr === todayStr) {
      status = dateSet.has(dateStr) ? 'completed' : 'today';
    } else if (dateStr < todayStr) {
      status = dateSet.has(dateStr) ? 'completed' : 'missed';
    } else {
      status = 'future';
    }

    days.push({
      dayNumber: day,
      dateStr,
      status,
      isToday: dateStr === todayStr,
      hasStreak: dateSet.has(dateStr)
    });
  }

  return days;
}

