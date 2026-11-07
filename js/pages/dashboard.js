/**
 * StudyMate AI — Dashboard Page Controller (Phase 3 Complete)
 *
 * Responsibilities:
 *  - Route guard via requireAuth
 *  - Welcome section with personalized greeting, real date & dynamic motivation
 *  - Overall telemetry statistics calculated from actual user data
 *  - Daily study progress tracking & interactive completion bar
 *  - 30-Day streak calendar with real calendar dates, month adaptability & statistics
 *  - Recent sessions panel displaying latest 5 sessions with zero AI re-calls
 *  - Mobile sidebar drawer and safe logout modal
 */

import { initTheme } from '../theme.js';
import { requireAuth, logoutUser } from '../auth.js';
import { openModal, closeModal, showToast } from '../ui.js';
import { listUserSessions } from '../session-store.js';
import {
  getStreakData,
  getLocalDateString,
  getMotivationalMessage,
  buildMonthCalendarDays
} from '../streak.js';

// ─── Format & Date Helpers ───────────────────────────────────────────────────

function formatFullDate(date = new Date()) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

function formatSessionDate(ts) {
  if (!ts) return 'Just now';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getSessionLocalDate(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return getLocalDateString(d);
}

// ─── Telemetry & Metrics Computations ────────────────────────────────────────

function computeDashboardMetrics(sessions, streakData) {
  const todayStr = getLocalDateString();
  const totalSessions = sessions.length;

  // Quizzes
  const completedQuizzes = sessions.filter(s => s.quizResult && typeof s.quizResult.percentage === 'number');
  const totalQuizzes = completedQuizzes.length;
  const avgQuizScore = totalQuizzes > 0
    ? Math.round(completedQuizzes.reduce((acc, s) => acc + (s.quizResult.percentage || 0), 0) / totalQuizzes)
    : 0;

  // Flashcards
  let knownFlashcardsCount = 0;
  let totalFlashcardsCount = 0;
  sessions.forEach(s => {
    if (Array.isArray(s.flashcards)) {
      totalFlashcardsCount += s.flashcards.length;
      knownFlashcardsCount += s.flashcards.filter(f => f.status === 'known').length;
    }
  });

  // Daily Progress (Today)
  const sessionsToday = sessions.filter(s => getSessionLocalDate(s.createdAt) === todayStr).length;
  const quizzesToday = sessions.filter(s => {
    if (!s.quizResult) return false;
    const completedAt = s.quizResult.completedAt;
    return getSessionLocalDate(completedAt) === todayStr;
  }).length;

  const hasFlashcardsReviewedToday = (streakData.lastActivityDate === todayStr && streakData.lastActivityType === 'flashcard') ||
    sessions.some(s => Array.isArray(s.flashcards) && s.flashcards.some(f => f.status === 'known' || f.status === 'needs_revision'));

  // Calculate daily targets completion (Target 1: session, Target 2: quiz, Target 3: flashcards)
  let dailyCompletedTargets = 0;
  if (sessionsToday >= 1) dailyCompletedTargets++;
  if (quizzesToday >= 1) dailyCompletedTargets++;
  if (hasFlashcardsReviewedToday) dailyCompletedTargets++;

  const dailyProgressPct = Math.round((dailyCompletedTargets / 3) * 100);

  return {
    overall: {
      totalSessions,
      totalQuizzes,
      avgQuizScore: totalQuizzes > 0 ? `${avgQuizScore}%` : 'N/A',
      knownFlashcardsCount,
      currentStreak: streakData.currentStreak || 0,
      longestStreak: streakData.longestStreak || 0,
      totalActiveDays: streakData.totalActiveDays || 0
    },
    daily: {
      sessionsToday,
      quizzesToday,
      hasFlashcardsReviewedToday,
      dailyCompletedTargets,
      dailyProgressPct
    }
  };
}

// ─── Render: Recent Sessions (Up to 5) ────────────────────────────────────────

function renderRecentSessions(sessions) {
  const container = document.getElementById('recent-sessions-container');
  if (!container) return;

  if (!sessions || sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon" aria-hidden="true">📚</span>
        <h4>No study sessions yet</h4>
        <p>Turn your notes into AI summaries, practice quizzes, and 3D flashcards. Your progress will be tracked here.</p>
        <a href="study.html" class="btn btn-primary btn-sm" style="margin-top: var(--space-3);">Create Your First Session</a>
      </div>`;
    return;
  }

  const latestSessions = sessions.slice(0, 5);
  const rowsHtml = latestSessions.map(session => {
    const topic = session.topic || 'Untitled Study Session';
    const dateStr = formatSessionDate(session.createdAt);
    const fcCount = Array.isArray(session.flashcards) ? session.flashcards.length : 0;
    const quizScoreBadge = session.quizResult
      ? `<span class="badge badge-purple" title="Score on 5 questions">🎯 ${Math.round(session.quizResult.percentage)}%</span>`
      : `<span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-muted); font-size: 10px;">No quiz yet</span>`;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--border-subtle); gap: var(--space-3); flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
          <p style="font-weight: 600; font-size: var(--font-sm); margin: 0; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtmlText(topic)}
          </p>
          <p style="font-size: var(--font-xs); color: var(--text-muted); margin: 2px 0 0;">
            🕒 ${dateStr} · 🃏 ${fcCount} flashcard${fcCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0;">
          ${quizScoreBadge}
          <a href="study.html?session=${session.id}" class="btn btn-outline btn-sm">Open Session →</a>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div>${rowsHtml}</div>
    ${sessions.length > 5 ? `
      <div style="text-align: center; margin-top: var(--space-4);">
        <a href="history.html" class="btn btn-ghost btn-sm">View all ${sessions.length} sessions in History →</a>
      </div>` : ''}
  `;
}

// ─── Render: 30-Day Calendar Grid ────────────────────────────────────────────

function renderCalendar(streakData) {
  const calendarGrid = document.getElementById('calendar-grid');
  const monthTitle = document.getElementById('calendar-month-title');
  if (!calendarGrid) return;

  const now = new Date();
  const monthName = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  if (monthTitle) {
    monthTitle.textContent = `${monthName} (30-Day Activity View)`;
  }

  const days = buildMonthCalendarDays(streakData.activeDates || [], now);

  // Calculate day-of-week offset for first day of current month so calendar aligns with Sun..Sat
  const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), 1).getDay(); // 0 is Sunday

  let gridHtml = '';

  // Empty placeholder cells before 1st of month for proper weekday alignment
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridHtml += `<div class="cal-day future" style="opacity: 0.15;" aria-hidden="true"></div>`;
  }

  // Days of month
  days.forEach(day => {
    let classes = `cal-day ${day.status}`;
    if (day.isToday) classes += ' today';
    if (day.hasStreak) classes += ' completed';

    let titleText = `${day.dateStr}: ${day.status.toUpperCase()}`;
    if (day.hasStreak) titleText = `${day.dateStr}: Completed study activity ✓`;

    gridHtml += `
      <div class="${classes}" title="${titleText}" role="gridcell" aria-label="${day.dateStr} ${day.status}">
        <span style="font-weight: 600; font-size: 11px;">${day.dayNumber}</span>
      </div>`;
  });

  calendarGrid.innerHTML = gridHtml;
}

// ─── Render: Telemetry UI Elements ───────────────────────────────────────────

function updateDashboardUI(metrics, streakData, displayName) {
  // 1. Welcome Section
  const welcomeName = document.getElementById('welcome-user-name');
  const welcomeDate = document.getElementById('welcome-date');
  const welcomeMotivational = document.getElementById('welcome-motivational-text');

  if (welcomeName) welcomeName.textContent = displayName;
  if (welcomeDate) welcomeDate.textContent = `📅 ${formatFullDate()}`;
  if (welcomeMotivational) {
    welcomeMotivational.textContent = getMotivationalMessage(streakData.currentStreak, metrics.daily.dailyCompletedTargets > 0);
  }

  // 2. Overall Telemetry
  const statSessions = document.getElementById('stat-total-sessions');
  const statQuizzes = document.getElementById('stat-total-quizzes');
  const statAvgScore = document.getElementById('stat-avg-score');
  const statKnownFc = document.getElementById('stat-known-flashcards');
  const statStreak = document.getElementById('stat-current-streak');

  if (statSessions) statSessions.textContent = metrics.overall.totalSessions;
  if (statQuizzes) statQuizzes.textContent = metrics.overall.totalQuizzes;
  if (statAvgScore) statAvgScore.textContent = metrics.overall.avgQuizScore;
  if (statKnownFc) statKnownFc.textContent = metrics.overall.knownFlashcardsCount;
  if (statStreak) statStreak.textContent = `${metrics.overall.currentStreak} 🔥`;

  // 3. Daily Progress
  const dailyBarFill = document.getElementById('daily-progress-bar-fill');
  const dailyGoalsCount = document.getElementById('daily-goals-count');
  const dailyGoalsPct = document.getElementById('daily-goals-pct');
  const targetSessionVal = document.getElementById('target-session-val');
  const targetSessionIcon = document.getElementById('target-session-icon');
  const targetQuizVal = document.getElementById('target-quiz-val');
  const targetQuizIcon = document.getElementById('target-quiz-icon');
  const targetFcVal = document.getElementById('target-fc-val');
  const targetFcIcon = document.getElementById('target-fc-icon');

  if (dailyBarFill) dailyBarFill.style.width = `${metrics.daily.dailyProgressPct}%`;
  if (dailyGoalsCount) dailyGoalsCount.textContent = `${metrics.daily.dailyCompletedTargets} of 3 targets completed today`;
  if (dailyGoalsPct) dailyGoalsPct.textContent = `${metrics.daily.dailyProgressPct}%`;

  if (targetSessionVal) targetSessionVal.textContent = `${metrics.daily.sessionsToday} / 1`;
  if (targetSessionIcon) targetSessionIcon.textContent = metrics.daily.sessionsToday >= 1 ? '✅' : '⚪';

  if (targetQuizVal) targetQuizVal.textContent = `${metrics.daily.quizzesToday} / 1`;
  if (targetQuizIcon) targetQuizIcon.textContent = metrics.daily.quizzesToday >= 1 ? '✅' : '⚪';

  if (targetFcVal) targetFcVal.textContent = metrics.daily.hasFlashcardsReviewedToday ? '1 / 1' : '0 / 1';
  if (targetFcIcon) targetFcIcon.textContent = metrics.daily.hasFlashcardsReviewedToday ? '✅' : '⚪';

  // 4. Streak Panel
  const streakBadge = document.getElementById('streak-header-badge');
  const streakCurrentNum = document.getElementById('streak-current-num');
  const streakLongestNum = document.getElementById('streak-longest-num');
  const streakTotalActiveNum = document.getElementById('streak-total-active-num');
  const streakSessionsNum = document.getElementById('streak-sessions-num');
  const streakMotivationalText = document.getElementById('streak-motivational-text');

  if (streakBadge) streakBadge.textContent = `Streak: ${metrics.overall.currentStreak} Day${metrics.overall.currentStreak !== 1 ? 's' : ''} 🔥`;
  if (streakCurrentNum) streakCurrentNum.textContent = metrics.overall.currentStreak;
  if (streakLongestNum) streakLongestNum.textContent = metrics.overall.longestStreak;
  if (streakTotalActiveNum) streakTotalActiveNum.textContent = metrics.overall.totalActiveDays;
  if (streakSessionsNum) streakSessionsNum.textContent = metrics.overall.totalSessions;
  if (streakMotivationalText) {
    streakMotivationalText.textContent = getMotivationalMessage(metrics.overall.currentStreak, metrics.daily.dailyCompletedTargets > 0);
  }
}

function escapeHtmlText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Main Initialization ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  requireAuth(async (user, userData) => {
    const displayName = (userData && userData.name) || user.displayName || user.email.split('@')[0] || 'Student';
    const email = user.email || '';
    const initial = displayName.charAt(0).toUpperCase() || 'U';

    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayEmail = document.getElementById('user-display-email');
    const userAvatarBadge = document.getElementById('user-avatar-badge');

    if (userDisplayName) userDisplayName.textContent = displayName;
    if (userDisplayEmail) userDisplayEmail.textContent = email;
    if (userAvatarBadge) userAvatarBadge.textContent = initial;

    // Load Sessions & Streak concurrently
    try {
      const [sessions, streakData] = await Promise.all([
        listUserSessions(user.uid, 50),
        getStreakData(user.uid)
      ]);

      const metrics = computeDashboardMetrics(sessions, streakData);

      updateDashboardUI(metrics, streakData, displayName);
      renderCalendar(streakData);
      renderRecentSessions(sessions);
    } catch (err) {
      console.error('Error loading dashboard telemetry:', err);
      showToast('Could not load some dashboard statistics. Please refresh.', 'warning');
    }
  });

  // Mobile sidebar drawer
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const topbarToggle = document.getElementById('topbar-toggle-btn');
  const sidebarClose = document.getElementById('sidebar-close-btn');

  function openSidebar() { sidebar?.classList.add('is-open'); sidebarOverlay?.classList.add('is-open'); }
  function closeSidebar() { sidebar?.classList.remove('is-open'); sidebarOverlay?.classList.remove('is-open'); }

  topbarToggle?.addEventListener('click', openSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  sidebarClose?.addEventListener('click', closeSidebar);

  // Logout modal
  const logoutModal = document.getElementById('logout-modal');
  const sidebarLogout = document.getElementById('sidebar-logout-btn');
  const confirmLogout = document.getElementById('confirm-logout-btn');

  sidebarLogout?.addEventListener('click', () => openModal(logoutModal));

  confirmLogout?.addEventListener('click', async () => {
    confirmLogout.disabled = true;
    confirmLogout.textContent = 'Logging out...';
    try {
      await logoutUser();
    } catch (err) {
      showToast('Error logging out. Please try again.', 'error');
      confirmLogout.disabled = false;
      confirmLogout.textContent = 'Log Out';
    }
  });

  // Modal dismiss buttons
  document.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const overlay = btn.closest('.modal-overlay');
      if (overlay) closeModal(overlay);
    });
  });

  document.querySelectorAll('.modal-close-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const overlay = btn.closest('.modal-overlay');
      if (overlay) closeModal(overlay);
    });
  });
});
