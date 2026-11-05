/**
 * StudyMate AI - Settings Page Controller
 */

import { initTheme, getCurrentTheme, setTheme } from '../theme.js';
import { requireAuth, logoutUser } from '../auth.js';
import { db } from '../firebase-config.js';
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { openModal, closeModal, showToast, setButtonLoading } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  let currentUser = null;

  const nameInput = document.getElementById('settings-name-input');
  const emailInput = document.getElementById('settings-email-input');
  const profileForm = document.getElementById('profile-form');
  const saveProfileBtn = document.getElementById('save-profile-btn');

  const themeCardDark = document.getElementById('theme-card-dark');
  const themeCardLight = document.getElementById('theme-card-light');

  // Guard page: requires valid Firebase authentication
  requireAuth((user, userData) => {
    currentUser = user;

    const displayName = (userData && userData.name) || user.displayName || user.email.split('@')[0] || 'Student';
    const email = user.email || '';
    const initial = displayName.charAt(0).toUpperCase() || 'U';

    // Populate sidebar
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayEmail = document.getElementById('user-display-email');
    const userAvatarBadge = document.getElementById('user-avatar-badge');

    if (userDisplayName) userDisplayName.textContent = displayName;
    if (userDisplayEmail) userDisplayEmail.textContent = email;
    if (userAvatarBadge) userAvatarBadge.textContent = initial;

    // Populate form fields
    if (nameInput) nameInput.value = displayName;
    if (emailInput) emailInput.value = email;

    // Update Theme selector cards based on current active theme
    updateThemeCardsUI(getCurrentTheme());
  });

  // Profile Form Submission
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentUser) return;

      const newName = nameInput.value.trim();
      if (!newName) {
        showToast('Please enter a valid name.', 'error');
        return;
      }

      setButtonLoading(saveProfileBtn, true, 'Saving...');

      try {
        // 1. Update Firebase Auth displayName
        await updateProfile(currentUser, { displayName: newName });

        // 2. Update Firestore user document
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            name: newName,
            updatedAt: serverTimestamp()
          });
        } catch (dbErr) {
          console.warn("Could not update Firestore document:", dbErr);
        }

        // Update UI
        const userDisplayName = document.getElementById('user-display-name');
        const userAvatarBadge = document.getElementById('user-avatar-badge');
        if (userDisplayName) userDisplayName.textContent = newName;
        if (userAvatarBadge) userAvatarBadge.textContent = newName.charAt(0).toUpperCase();

        setButtonLoading(saveProfileBtn, false);
        showToast('Profile updated successfully!', 'success');
      } catch (error) {
        setButtonLoading(saveProfileBtn, false);
        showToast(error.message || 'Failed to update profile.', 'error');
      }
    });
  }

  // Theme option cards selection
  function updateThemeCardsUI(activeTheme) {
    if (themeCardDark && themeCardLight) {
      if (activeTheme === 'dark') {
        themeCardDark.classList.add('selected');
        themeCardLight.classList.remove('selected');
      } else {
        themeCardLight.classList.add('selected');
        themeCardDark.classList.remove('selected');
      }
    }
  }

  if (themeCardDark) {
    themeCardDark.addEventListener('click', async () => {
      setTheme('dark');
      updateThemeCardsUI('dark');
      showToast('Dark navy theme applied.', 'info', 2000);
      saveThemeToFirestore('dark');
    });
  }

  if (themeCardLight) {
    themeCardLight.addEventListener('click', async () => {
      setTheme('light');
      updateThemeCardsUI('light');
      showToast('Clean light theme applied.', 'info', 2000);
      saveThemeToFirestore('light');
    });
  }

  // Listen for global theme changes from topbar toggle button
  window.addEventListener('studymate-theme-change', (e) => {
    updateThemeCardsUI(e.detail.theme);
  });

  async function saveThemeToFirestore(theme) {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { theme });
    } catch (e) {
      // Non-blocking
    }
  }

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

  // Logout modal
  const logoutModal = document.getElementById('logout-modal');
  const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
  const settingsLogoutBtn = document.getElementById('settings-logout-btn');
  const confirmLogoutBtn = document.getElementById('confirm-logout-btn');

  [sidebarLogoutBtn, settingsLogoutBtn].forEach((btn) => {
    if (btn && logoutModal) {
      btn.addEventListener('click', () => {
        openModal(logoutModal);
      });
    }
  });

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
