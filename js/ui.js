/**
 * StudyMate AI - Reusable UI Utilities
 * Provides standard modal, toast notification, and button loading handlers.
 */

/**
 * Toast notification manager
 */
let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

/**
 * Show a toast notification
 * @param {string} message - Message text
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Type of toast
 * @param {number} [duration=4000] - Duration in ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${TOAST_ICONS[type] || 'ℹ'}</span>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button type="button" class="toast-close-btn" aria-label="Dismiss notification">✕</button>
  `;

  container.appendChild(toast);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const dismiss = () => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, { once: true });
  };

  // Close button click
  const closeBtn = toast.querySelector('.toast-close-btn');
  closeBtn.addEventListener('click', dismiss);

  // Auto dismiss
  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return toast;
}

/**
 * Open a modal dialog
 * @param {string|HTMLElement} modalTarget - Modal element or selector
 */
export function openModal(modalTarget) {
  const modal = typeof modalTarget === 'string' ? document.querySelector(modalTarget) : modalTarget;
  if (!modal) return;

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Attach Escape key listener
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeModal(modal);
      document.removeEventListener('keydown', onKeyDown);
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });

  // Close buttons inside modal
  const closeButtons = modal.querySelectorAll('.modal-close-btn, [data-modal-close]');
  closeButtons.forEach((btn) => {
    btn.addEventListener('click', () => closeModal(modal), { once: true });
  });
}

/**
 * Close a modal dialog
 * @param {string|HTMLElement} modalTarget - Modal element or selector
 */
export function closeModal(modalTarget) {
  const modal = typeof modalTarget === 'string' ? document.querySelector(modalTarget) : modalTarget;
  if (!modal) return;

  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Set button into loading state or restore it
 * @param {HTMLButtonElement} button
 * @param {boolean} isLoading
 * @param {string} [loadingText='Loading...']
 */
export function setButtonLoading(button, isLoading, loadingText = 'Please wait...') {
  if (!button) return;

  if (isLoading) {
    button.setAttribute('data-original-html', button.innerHTML);
    button.disabled = true;
    button.innerHTML = `<span class="spinner spinner-sm" aria-hidden="true"></span> <span>${escapeHtml(loadingText)}</span>`;
  } else {
    button.disabled = false;
    const originalHtml = button.getAttribute('data-original-html');
    if (originalHtml) {
      button.innerHTML = originalHtml;
      button.removeAttribute('data-original-html');
    }
  }
}

/**
 * Escape HTML to prevent XSS in text rendering
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

