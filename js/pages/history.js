/**
 * StudyMate AI — History Page Controller
 *
 * Responsibilities:
 *  - Protected route (requireAuth)
 *  - Load all sessions for the user from Firestore (ordered newest first)
 *  - Render session cards with topic, metadata, quiz score and flashcard count
 *  - Client-side search / filter
 *  - Open session → study.html?session=<id>  (no AI re-call)
 *  - Delete single session with confirmation modal
 *  - Clear all sessions with confirmation modal
 */

import { initTheme } from '../theme.js';
import { requireAuth, logoutUser } from '../auth.js';
import { openModal, closeModal, showToast } from '../ui.js';
import {
  listUserSessions,
  deleteUserSession,
  clearAllUserSessions
} from '../session-store.js';

// ─── Rendering ────────────────────────────────────────────────────────────────

/**
 * Format a Firestore Timestamp or Date object as a human-readable string.
 * @param {object|Date|null} ts
 * @returns {string}
 */
function formatDate(ts) {
  if (!ts) return 'Unknown date';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Build a CSS class for the quiz score badge.
 * @param {number} pct  0-100
 * @returns {string}
 */
function scoreCssClass(pct) {
  if (pct >= 80) return '';           // green (default)
  if (pct >= 50) return 'score-mid';  // amber
  return 'score-low';                 // red
}

/**
 * Build the HTML string for a single session card.
 * @param {object} session  Session document with id field
 * @returns {string}
 */
function buildSessionCard(session) {
  const topic = session.topic || 'Untitled Session';
  const style = session.explanationStyle || '';
  const difficulty = session.difficulty || '';

  // Flashcard count
  const flashcardCount = Array.isArray(session.flashcards) ? session.flashcards.length : 0;

  // Quiz result
  let quizScoreHtml = '';
  if (session.quizResult) {
    const pct = Math.round(session.quizResult.percentage ?? 0);
    const cssClass = scoreCssClass(pct);
    quizScoreHtml = `
      <span class="session-quiz-score ${cssClass}" title="Quiz score">
        🎯 ${pct}%
      </span>`;
  }

  // Difficulty chip colour modifier
  const diffClass = difficulty === 'easy' ? 'easy' : difficulty === 'hard' ? 'hard' : '';

  return `
    <article class="session-card" data-session-id="${session.id}" data-topic="${topic.toLowerCase()}">
      <div class="session-card-header">
        <h3 class="session-topic">${escapeHtml(topic)}</h3>
        <button
          type="button"
          class="session-delete-btn"
          aria-label="Delete session: ${escapeHtml(topic)}"
          data-delete-id="${session.id}"
          data-delete-topic="${escapeHtml(topic)}"
          title="Delete session"
        >🗑</button>
      </div>

      <div class="session-meta-row">
        ${style ? `<span class="session-chip session-chip--style">${capitalize(style)}</span>` : ''}
        ${difficulty ? `<span class="session-chip session-chip--difficulty ${diffClass}">${capitalize(difficulty)}</span>` : ''}
        ${quizScoreHtml}
      </div>

      <div class="session-stats-row">
        <span class="session-stat">📝 Summary</span>
        <span class="session-stat">🃏 ${flashcardCount} flashcard${flashcardCount !== 1 ? 's' : ''}</span>
        <span class="session-stat">❓ 5 questions</span>
      </div>

      <span class="session-date">🕒 ${formatDate(session.createdAt)}</span>

      <a
        href="study.html?session=${session.id}"
        class="btn btn-secondary btn-sm session-open-btn"
        aria-label="Open session: ${escapeHtml(topic)}"
      >Open Session →</a>
    </article>`;
}

/**
 * Simple HTML escape to prevent XSS from Firestore strings.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Main controller ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // DOM references
  const sessionsGrid      = document.getElementById('sessions-grid');
  const historyLoading    = document.getElementById('history-loading');
  const historyEmpty      = document.getElementById('history-empty');
  const historyNoResults  = document.getElementById('history-no-results');
  const historyCountLabel = document.getElementById('history-count-label');
  const searchInput       = document.getElementById('history-search-input');
  const clearAllBtn       = document.getElementById('clear-all-btn');

  // Delete modal refs
  const deleteModal       = document.getElementById('delete-modal');
  const deleteTopicLabel  = document.getElementById('delete-session-topic');
  const confirmDeleteBtn  = document.getElementById('confirm-delete-btn');

  // Clear all modal refs
  const clearAllModal     = document.getElementById('clear-all-modal');
  const confirmClearAllBtn= document.getElementById('confirm-clear-all-btn');

  // Logout modal refs
  const logoutModal       = document.getElementById('logout-modal');
  const sidebarLogoutBtn  = document.getElementById('sidebar-logout-btn');
  const confirmLogoutBtn  = document.getElementById('confirm-logout-btn');

  // State
  let allSessions = [];   // Full list from Firestore
  let currentUid  = null;
  let pendingDeleteId    = null;
  let pendingDeleteTopic = null;

  // ── Helpers to show/hide states ──────────────────────────────────────────

  function showLoading() {
    historyLoading.style.display   = 'flex';
    historyEmpty.style.display     = 'none';
    historyNoResults.style.display = 'none';
    sessionsGrid.innerHTML         = '';
  }

  function showEmpty() {
    historyLoading.style.display   = 'none';
    historyEmpty.style.display     = 'flex';
    historyNoResults.style.display = 'none';
    sessionsGrid.innerHTML         = '';
    if (clearAllBtn) clearAllBtn.style.display = 'none';
  }

  function showNoResults() {
    historyLoading.style.display   = 'none';
    historyEmpty.style.display     = 'none';
    historyNoResults.style.display = 'flex';
  }

  function hideStates() {
    historyLoading.style.display   = 'none';
    historyEmpty.style.display     = 'none';
    historyNoResults.style.display = 'none';
  }

  // ── Render sessions to the grid ──────────────────────────────────────────

  function renderSessions(sessions) {
    if (!sessions.length) {
      showNoResults();
      sessionsGrid.innerHTML = '';
      return;
    }
    hideStates();
    sessionsGrid.innerHTML = sessions.map(buildSessionCard).join('');

    // Attach delete button listeners after render
    sessionsGrid.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        pendingDeleteId    = btn.getAttribute('data-delete-id');
        pendingDeleteTopic = btn.getAttribute('data-delete-topic');
        if (deleteTopicLabel) deleteTopicLabel.textContent = `"${pendingDeleteTopic}"`;
        openModal(deleteModal);
      });
    });
  }

  // ── Search / filter ──────────────────────────────────────────────────────

  function applySearch(term) {
    const q = term.trim().toLowerCase();
    if (!q) {
      updateCountLabel(allSessions.length);
      renderSessions(allSessions);
      return;
    }
    const filtered = allSessions.filter((s) =>
      (s.topic || '').toLowerCase().includes(q)
    );
    updateCountLabel(filtered.length);
    renderSessions(filtered);
  }

  function updateCountLabel(count) {
    if (historyCountLabel) {
      historyCountLabel.textContent = `${count} session${count !== 1 ? 's' : ''}`;
    }
  }

  // ── Load sessions from Firestore ─────────────────────────────────────────

  async function loadSessions() {
    showLoading();
    try {
      allSessions = await listUserSessions(currentUid);
      updateCountLabel(allSessions.length);

      if (!allSessions.length) {
        showEmpty();
        return;
      }

      if (clearAllBtn) clearAllBtn.style.display = 'inline-flex';
      renderSessions(allSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      historyLoading.style.display = 'none';
      showToast('Failed to load your sessions. Please refresh.', 'error');
    }
  }

  // ── Delete handlers ───────────────────────────────────────────────────────

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!pendingDeleteId) return;
      confirmDeleteBtn.disabled    = true;
      confirmDeleteBtn.textContent = 'Deleting…';

      try {
        await deleteUserSession(currentUid, pendingDeleteId);
        // Remove from local list
        allSessions = allSessions.filter((s) => s.id !== pendingDeleteId);
        closeModal(deleteModal);
        showToast('Session deleted.', 'success');
        updateCountLabel(allSessions.length);

        if (!allSessions.length) {
          showEmpty();
        } else {
          applySearch(searchInput ? searchInput.value : '');
          if (clearAllBtn) clearAllBtn.style.display = 'inline-flex';
        }
      } catch (err) {
        console.error('Delete failed:', err);
        showToast('Could not delete session. Try again.', 'error');
      } finally {
        confirmDeleteBtn.disabled    = false;
        confirmDeleteBtn.textContent = 'Delete Session';
        pendingDeleteId    = null;
        pendingDeleteTopic = null;
      }
    });
  }

  // ── Clear all handler ─────────────────────────────────────────────────────

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => openModal(clearAllModal));
  }

  if (confirmClearAllBtn) {
    confirmClearAllBtn.addEventListener('click', async () => {
      confirmClearAllBtn.disabled    = true;
      confirmClearAllBtn.textContent = 'Deleting all…';

      try {
        await clearAllUserSessions(currentUid);
        allSessions = [];
        closeModal(clearAllModal);
        showToast('All sessions deleted.', 'success');
        showEmpty();
      } catch (err) {
        console.error('Clear all failed:', err);
        showToast('Could not delete all sessions. Try again.', 'error');
      } finally {
        confirmClearAllBtn.disabled    = false;
        confirmClearAllBtn.textContent = 'Yes, Delete All';
      }
    });
  }

  // ── Search input ──────────────────────────────────────────────────────────

  if (searchInput) {
    searchInput.addEventListener('input', () => applySearch(searchInput.value));
  }

  // ── Modal close buttons ───────────────────────────────────────────────────

  document.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Find the ancestor modal-overlay and close it
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

  // ── Mobile sidebar ────────────────────────────────────────────────────────

  const sidebar        = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const topbarToggle   = document.getElementById('topbar-toggle-btn');
  const sidebarClose   = document.getElementById('sidebar-close-btn');

  function openSidebar()  { sidebar?.classList.add('is-open');    sidebarOverlay?.classList.add('is-open'); }
  function closeSidebar() { sidebar?.classList.remove('is-open'); sidebarOverlay?.classList.remove('is-open'); }

  topbarToggle?.addEventListener('click', openSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  sidebarClose?.addEventListener('click', closeSidebar);

  // ── Logout ────────────────────────────────────────────────────────────────

  sidebarLogoutBtn?.addEventListener('click', () => openModal(logoutModal));

  confirmLogoutBtn?.addEventListener('click', async () => {
    confirmLogoutBtn.disabled    = true;
    confirmLogoutBtn.textContent = 'Logging out…';
    try {
      await logoutUser();
    } catch (err) {
      showToast('Error logging out. Please try again.', 'error');
      confirmLogoutBtn.disabled    = false;
      confirmLogoutBtn.textContent = 'Log Out';
    }
  });

  // ── Auth guard & initial load ─────────────────────────────────────────────

  requireAuth((user, userData) => {
    currentUid = user.uid;

    // Populate sidebar user info
    const displayName = (userData && userData.name) || user.displayName || user.email.split('@')[0] || 'Student';
    const email       = user.email || '';
    const initial     = displayName.charAt(0).toUpperCase() || 'U';

    const nameEl    = document.getElementById('user-display-name');
    const emailEl   = document.getElementById('user-display-email');
    const avatarEl  = document.getElementById('user-avatar-badge');

    if (nameEl)   nameEl.textContent   = displayName;
    if (emailEl)  emailEl.textContent  = email;
    if (avatarEl) avatarEl.textContent = initial;

    // Load sessions
    loadSessions();
  });
});

