/**
 * StudyMate AI — Dashboard Page Controller
 *
 * Phase 2 update:
 *  - All sidebar links now point to real pages (no Phase 2 placeholder modal).
 *  - Loads live stats from Firestore: total sessions, latest quiz score, flashcard count.
 *  - Renders up to 3 most recent sessions in the "Recent Sessions" panel.
 */

import { initTheme } from '../theme.js';
import { requireAuth, logoutUser } from '../auth.js';
import { openModal, closeModal, showToast } from '../ui.js';
import { listUserSessions } from '../session-store.js';

// ─── Stats calculation ────────────────────────────────────────────────────────

/**
 * Calculate dashboard stats from a session array.
 * @param {Array} sessions
 * @returns {{ total: number, latestScore: string, totalFlashcards: number }}
 */
function calcStats(sessions) {
  const total = sessions.length;

  // Find the latest session that has a quiz result
  const withScore = sessions.filter((s) => s.quizResult);
  const latestScore = withScore.length
    ? `${Math.round(withScore[0].quizResult.percentage ?? 0)}%`
    : 'N/A';

  // Sum flashcard counts across all sessions
  const totalFlashcards = sessions.reduce(
    (acc, s) => acc + (Array.isArray(s.flashcards) ? s.flashcards.length : 0),
    0
  );

  return { total, latestScore, totalFlashcards };
}

// ─── Render helpers ───────────────────────────────────────────────────────────

/**
 * Format a Firestore Timestamp or Date.
 * @param {object|null} ts
 * @returns {string}
 */
function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Build HTML for the recent sessions panel.
 * @param {Array} sessions  Up to 3 sessions
 * @returns {string}
 */
function buildRecentSessionsHtml(sessions) {
  if (!sessions.length) {
    return `
      <div class="empty-state">
        <span class="empty-state-icon" aria-hidden="true">📚</span>
        <h4>No sessions yet</h4>
        <p>Your study sessions will appear here once you generate your first summary, quiz or flashcard set.</p>
        <a href="study.html" class="btn btn-outline btn-sm" style="margin-top: var(--space-3);">Create First Session</a>
      </div>`;
  }

  const rows = sessions.slice(0, 3).map((s) => {
    const topic       = s.topic || 'Untitled Session';
    const date        = formatDate(s.createdAt);
    const fcCount     = Array.isArray(s.flashcards) ? s.flashcards.length : 0;
    const scoreHtml   = s.quizResult
      ? `<span class="badge badge-purple">${Math.round(s.quizResult.percentage ?? 0)}%</span>`
      : '';

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) 0; border-bottom: 1px solid var(--border); gap: var(--space-3); flex-wrap: wrap;">
        <div style="flex: 1; min-width: 0;">
          <p style="font-weight: 600; font-size: var(--font-sm); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${topic}</p>
          <p style="font-size: var(--font-xs); color: var(--text-muted); margin: 0; margin-top: 2px;">🃏 ${fcCount} flashcards · 🕒 ${date}</p>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0;">
          ${scoreHtml}
          <a href="study.html?session=${s.id}" class="btn btn-outline btn-sm">Open →</a>
        </div>
      </div>`;
  }).join('');

  return `
    <div>${rows}</div>
    ${sessions.length > 3 ? `<div style="text-align: center; margin-top: var(--space-4);"><a href="history.html" class="btn btn-ghost btn-sm">View all ${sessions.length} sessions →</a></div>` : ''}`;
}

// ─── Main controller ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Guard page: requires valid Firebase authentication
  requireAuth(async (user, userData) => {
    // Populate user profile information
    const displayName = (userData && userData.name) || user.displayName || user.email.split('@')[0] || 'Student';
    const email       = user.email || '';
    const initial     = displayName.charAt(0).toUpperCase() || 'U';

    const welcomeUserName  = document.getElementById('welcome-user-name');
    const userDisplayName  = document.getElementById('user-display-name');
    const userDisplayEmail = document.getElementById('user-display-email');
    const userAvatarBadge  = document.getElementById('user-avatar-badge');

    if (welcomeUserName)  welcomeUserName.textContent  = displayName;
    if (userDisplayName)  userDisplayName.textContent  = displayName;
    if (userDisplayEmail) userDisplayEmail.textContent = email;
    if (userAvatarBadge)  userAvatarBadge.textContent  = initial;

    // Load live stats & recent sessions
    try {
      const sessions = await listUserSessions(user.uid, 10);
      const { total, latestScore, totalFlashcards } = calcStats(sessions);

      const statTotal   = document.getElementById('stat-total-sessions');
      const statScore   = document.getElementById('stat-latest-score');
      const statFlash   = document.getElementById('stat-flashcards');
      const recentPanel = document.getElementById('recent-sessions-container');

      if (statTotal)   statTotal.textContent   = total;
      if (statScore)   statScore.textContent   = latestScore;
      if (statFlash)   statFlash.textContent   = totalFlashcards;
      if (recentPanel) recentPanel.innerHTML   = buildRecentSessionsHtml(sessions);
    } catch (err) {
      console.error('Dashboard: failed to load stats', err);
      // Non-fatal — the page still works, stats just stay at "—"
    }
  });

  // Mobile sidebar open / close
  const sidebar        = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const topbarToggle   = document.getElementById('topbar-toggle-btn');
  const sidebarClose   = document.getElementById('sidebar-close-btn');

  function openSidebar()  { sidebar?.classList.add('is-open');    sidebarOverlay?.classList.add('is-open'); }
  function closeSidebar() { sidebar?.classList.remove('is-open'); sidebarOverlay?.classList.remove('is-open'); }

  topbarToggle?.addEventListener('click', openSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  sidebarClose?.addEventListener('click', closeSidebar);

  // Logout modal
  const logoutModal     = document.getElementById('logout-modal');
  const sidebarLogout   = document.getElementById('sidebar-logout-btn');
  const confirmLogout   = document.getElementById('confirm-logout-btn');

  sidebarLogout?.addEventListener('click', () => openModal(logoutModal));

  confirmLogout?.addEventListener('click', async () => {
    confirmLogout.disabled    = true;
    confirmLogout.textContent = 'Logging out...';
    try {
      await logoutUser();
    } catch (err) {
      showToast('Error logging out. Please try again.', 'error');
      confirmLogout.disabled    = false;
      confirmLogout.textContent = 'Log Out';
    }
  });

  // Modal close buttons
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
