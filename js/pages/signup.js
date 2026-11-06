/**
 * StudyMate AI - Signup Page Controller
 */

import { initTheme } from '../theme.js';
import { registerUser, redirectIfAuthenticated, getFriendlyErrorMessage } from '../auth.js';
import { showToast, setButtonLoading } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  redirectIfAuthenticated();

  const signupForm = document.getElementById('signup-form');
  const nameInput = document.getElementById('name-input');
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const confirmPasswordInput = document.getElementById('confirm-password-input');
  const submitBtn = document.getElementById('signup-submit-btn');

  // Password visibility toggle buttons
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');
  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        const isPassword = targetInput.type === 'password';
        targetInput.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? '🔒' : '👁️';
        btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      }
    });
  });

  // Clear errors on input
  [nameInput, emailInput, passwordInput, confirmPasswordInput].forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('has-error');
      const errorSpan = document.getElementById(`${input.id.replace('-input', '')}-error`);
      if (errorSpan) errorSpan.classList.remove('is-visible');
    });
  });

  // Handle Form Submission
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    let hasErrors = false;

    // Validate Name
    if (!name) {
      setError(nameInput, 'name-error', 'Please enter your full name.');
      hasErrors = true;
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError(emailInput, 'email-error', 'Please enter a valid email address.');
      hasErrors = true;
    }

    // Validate Password
    if (!password || password.length < 6) {
      setError(passwordInput, 'password-error', 'Password must be at least 6 characters.');
      hasErrors = true;
    }

    // Validate Password Confirmation
    if (password !== confirmPassword) {
      setError(confirmPasswordInput, 'confirm-password-error', 'Passwords do not match.');
      hasErrors = true;
    }

    if (hasErrors) {
      showToast('Please fix the errors in the form.', 'error');
      return;
    }

    // Begin registration
    setButtonLoading(submitBtn, true, 'Creating Account...');

    try {
      await registerUser(name, email, password);
      showToast('Account created successfully! Redirecting...', 'success', 2000);
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);
    } catch (error) {
      setButtonLoading(submitBtn, false);
      const friendlyMessage = getFriendlyErrorMessage(error);
      showToast(friendlyMessage, 'error', 6000);

      if (error.code === 'auth/email-already-in-use') {
        setError(emailInput, 'email-error', 'This email is already registered.');
      }
    }
  });

  function setError(inputElement, errorElementId, message) {
    inputElement.classList.add('has-error');
    const errorSpan = document.getElementById(errorElementId);
    if (errorSpan) {
      if (message) errorSpan.textContent = message;
      errorSpan.classList.add('is-visible');
    }
  }

  // 1-Click Demo Access
  const demoBtn = document.getElementById('demo-mode-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', async () => {
      setButtonLoading(demoBtn, true, 'Starting Demo...');
      try {
        await registerUser('Sanchit Pathare', 'sanchitpathare01@gmail.com', 'demo123456');
        showToast('Demo session started! Loading dashboard...', 'success', 1500);
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      } catch (err) {
        setButtonLoading(demoBtn, false);
        window.location.href = 'dashboard.html';
      }
    });
  }
});

