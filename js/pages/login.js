/**
 * StudyMate AI - Login Page Controller
 */

import { initTheme } from '../theme.js';
import { loginUser, resetPassword, redirectIfAuthenticated, getFriendlyErrorMessage } from '../auth.js';
import { showToast, setButtonLoading, openModal, closeModal } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  redirectIfAuthenticated();

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email-input');
  const passwordInput = document.getElementById('login-password-input');
  const rememberMeCheckbox = document.getElementById('remember-me-checkbox');
  const submitBtn = document.getElementById('login-submit-btn');

  // Password visibility toggle
  const toggleBtn = document.querySelector('.password-toggle-btn[data-target="login-password-input"]');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? '🔒' : '👁️';
      toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }

  // Clear errors on input
  [emailInput, passwordInput].forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('has-error');
      const errorSpan = document.getElementById(`${input.id.replace('-input', '')}-error`);
      if (errorSpan) errorSpan.classList.remove('is-visible');
    });
  });

  // Handle Login Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : true;

    let hasErrors = false;

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      emailInput.classList.add('has-error');
      const errorSpan = document.getElementById('login-email-error');
      if (errorSpan) errorSpan.classList.add('is-visible');
      hasErrors = true;
    }

    // Validate Password
    if (!password) {
      passwordInput.classList.add('has-error');
      const errorSpan = document.getElementById('login-password-error');
      if (errorSpan) errorSpan.classList.add('is-visible');
      hasErrors = true;
    }

    if (hasErrors) {
      showToast('Please enter both your email and password.', 'error');
      return;
    }

    // Begin login
    setButtonLoading(submitBtn, true, 'Logging In...');

    try {
      await loginUser(email, password, rememberMe);
      showToast('Login successful! Redirecting to dashboard...', 'success', 2000);
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } catch (error) {
      setButtonLoading(submitBtn, false);
      const friendlyMessage = getFriendlyErrorMessage(error);
      showToast(friendlyMessage, 'error', 6000);
    }
  });

  // Forgot Password Modal
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotPasswordModal = document.getElementById('forgot-password-modal');
  const resetEmailInput = document.getElementById('reset-email-input');
  const sendResetBtn = document.getElementById('send-reset-btn');

  if (forgotPasswordLink && forgotPasswordModal) {
    forgotPasswordLink.addEventListener('click', () => {
      // Pre-fill email if user already typed it in login form
      if (emailInput.value && !resetEmailInput.value) {
        resetEmailInput.value = emailInput.value.trim();
      }
      openModal(forgotPasswordModal);
    });
  }

  if (sendResetBtn && resetEmailInput) {
    sendResetBtn.addEventListener('click', async () => {
      const email = resetEmailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        showToast('Please enter a valid email address for password reset.', 'error');
        return;
      }

      setButtonLoading(sendResetBtn, true, 'Sending...');

      try {
        await resetPassword(email);
        setButtonLoading(sendResetBtn, false);
        closeModal(forgotPasswordModal);
        showToast(`Password reset link sent to ${email}. Please check your inbox.`, 'success', 6000);
      } catch (error) {
        setButtonLoading(sendResetBtn, false);
        showToast(getFriendlyErrorMessage(error), 'error');
      }
    });
  }
});

