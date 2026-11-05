/**
 * StudyMate AI - Landing Page Interactions
 * Mobile navigation, dashboard mockup preview tabs, and smooth scrolling.
 */

import { initTheme } from '../theme.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme
  initTheme();

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navMenu = document.getElementById('nav-menu');

  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('is-active');
    });

    // Close mobile menu when clicking outside or clicking any nav link
    navMenu.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('is-active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Dashboard preview mockup tab switching
  const mockupNavItems = document.querySelectorAll('.mockup-nav-item[data-preview-tab]');
  const mockupTabContents = document.querySelectorAll('.mockup-tab-content');

  mockupNavItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-preview-tab');

      // Update button active state
      mockupNavItems.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panel visibility
      mockupTabContents.forEach((panel) => {
        if (panel.id === `preview-tab-${targetTab}`) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // Sample interactive flashcard flip in mockup
  const previewFlashcard = document.getElementById('preview-mockup-flashcard');
  if (previewFlashcard) {
    previewFlashcard.addEventListener('click', () => {
      previewFlashcard.classList.toggle('is-flipped');
      const textElement = previewFlashcard.querySelector('.mockup-card-text');
      if (textElement) {
        if (previewFlashcard.classList.contains('is-flipped')) {
          textElement.textContent = 'Answer: Photosynthesis converts light energy into chemical energy stored in glucose molecules.';
          textElement.style.color = 'var(--primary-light)';
        } else {
          textElement.textContent = 'Question: What is the primary biological purpose of Photosynthesis?';
          textElement.style.color = 'var(--text-primary)';
        }
      }
    });
  }
});
