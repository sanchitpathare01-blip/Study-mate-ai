/**
 * StudyMate AI - Dashboard Page Controller
 */

import { initTheme } from '../theme.js';
import { requireAuth, logoutUser } from '../auth.js';
import { openModal, closeModal, showToast } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Guard page: requires valid Firebase authentication
  requireAuth((user, userData) => {
    // Populate user profile information
    const displayName = (userData && userData.name) || user.displayName || user.email.split('@')[0] || 'Student';
    const email = user.email || '';
    const initial = displayName.charAt(0).toUpperCase() || 'U';

    const welcomeUserName = document.getElementById('welcome-user-name');
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayEmail = document.getElementById('user-display-email');
    const userAvatarBadge = document.getElementById('user-avatar-badge');

    if (welcomeUserName) welcomeUserName.textContent = displayName;
    if (userDisplayName) userDisplayName.textContent = displayName;
    if (userDisplayEmail) userDisplayEmail.textContent = email;
    if (userAvatarBadge) userAvatarBadge.textContent = initial;
  });

  // Mobile sidebar open / close
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const topbarToggleBtn = document.getElementById('topbar-toggle-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('is-open');
    if (sidebarOverlay) sidebarOverlay.classList.add('is-open');
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('is-open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('is-open');
  }

  if (topbarToggleBtn) topbarToggleBtn.addEventListener('click', openSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);

  // Phase 2 feature placeholder modal
  const phase2Modal = document.getElementById('phase2-modal');
  const phase2FeatureName = document.getElementById('phase2-feature-name');
  const phase2Buttons = document.querySelectorAll('[data-phase2-feature]');

  phase2Buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const feature = btn.getAttribute('data-phase2-feature') || 'AI Feature';
      if (phase2FeatureName) {
        phase2FeatureName.textContent = feature;
      }
      openModal(phase2Modal);
    });
  });

  // Logout modal
  const logoutModal = document.getElementById('logout-modal');
  const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
  const confirmLogoutBtn = document.getElementById('confirm-logout-btn');

  if (sidebarLogoutBtn && logoutModal) {
    sidebarLogoutBtn.addEventListener('click', () => {
      openModal(logoutModal);
    });
  }

  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', async () => {
      confirmLogoutBtn.disabled = true;
      confirmLogoutBtn.textContent = 'Logging out...';
      try {
        await logoutUser();
      } catch (err) {
        showToast('Error logging out. Please try again.', 'error');
        confirmLogoutBtn.disabled = false;
        confirmLogoutBtn.textContent = 'Log Out';
      }
    });
  }
});

