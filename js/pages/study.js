/**
 * StudyMate AI - Study Materials Generator & Interactive Workspace Controller
 * Features:
 * - AI Summary Generator (Formatted content, Keywords, Copy, Download, Text-to-Speech)
 * - AI Quiz Generator (5 Questions, Option selection, Scoring, Explanations, Retake)
 * - Interactive Flashcards (3D Flip, Known/Need Revision, Persistence)
 * - Single-session Firestore Persistence (users/{uid}/sessions/{sessionId})
 */

import { initTheme } from '../theme.js';
import { requireAuth, logoutUser } from '../auth.js';
import { createSession, getSessionById, updateSessionData } from '../session-store.js';
import { recordStudyActivity } from '../streak.js';
import { showToast, setButtonLoading, openModal, closeModal, escapeHtml } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  let currentUser = null;
  let currentSessionId = null;
  let currentSessionData = null;

  // Generator Input State
  let inputMode = 'notes'; // 'notes' | 'topic'
  let explanationStyle = 'detailed'; // 'simple' | 'detailed' | 'exam-focused'
  let difficulty = 'medium'; // 'easy' | 'medium' | 'hard'

  // Quiz State
  let currentQuestionIdx = 0;
  let userAnswers = [null, null, null, null, null];
  let isQuizSubmitted = false;

  // Flashcards State
  let currentFlashcardIdx = 0;
  let isCardFlipped = false;

  // Text to Speech State
  let ttsUtterance = null;
  let ttsIsSpeaking = false;

  // DOM Elements
  const inputSection = document.getElementById('generation-input-section');
  const spinnerCard = document.getElementById('generation-spinner');
  const resultsWorkspace = document.getElementById('results-workspace');
  const studyInputText = document.getElementById('study-input-text');
  const inputLabelText = document.getElementById('input-label-text');
  const charCount = document.getElementById('char-count');
  const generateBtn = document.getElementById('generate-btn');
  const clearInputBtn = document.getElementById('clear-input-btn');
  const newMaterialBtn = document.getElementById('new-material-btn');

  // Mode and Pill Selectors
  const modeSelector = document.getElementById('mode-selector');
  const styleSelector = document.getElementById('style-selector');
  const difficultySelector = document.getElementById('difficulty-selector');

  // Workspace Tabs
  const workspaceTabBtns = document.querySelectorAll('.workspace-tab-btn');
  const workspacePanels = document.querySelectorAll('.workspace-tab-panel');

  // 1. Authenticate & Check for Query Parameters
  requireAuth(async (user, userData) => {
    currentUser = user;

    const displayName = (userData && userData.name) || user.displayName || user.email.split('@')[0] || 'Student';
    const email = user.email || '';
    const initial = displayName.charAt(0).toUpperCase() || 'U';

    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayEmail = document.getElementById('user-display-email');
    const userAvatarBadge = document.getElementById('user-avatar-badge');

    if (userDisplayName) userDisplayName.textContent = displayName;
    if (userDisplayEmail) userDisplayEmail.textContent = email;
    if (userAvatarBadge) userAvatarBadge.textContent = initial;

    // Check URL parameters (e.g. ?session=<id>&tab=<tab>)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session');
    const tabParam = urlParams.get('tab');
    const modeParam = urlParams.get('mode');

    if (sessionIdParam) {
      await loadSessionFromFirestore(sessionIdParam);
    }

    if (tabParam) {
      switchWorkspaceTab(`panel-${tabParam}`);
    }

    if (modeParam === 'topic') {
      selectMode('topic');
    }

    // Load user study preferences as initial defaults
    try {
      const storedPrefs = localStorage.getItem(`studymate_preferences_${user.uid}`);
      const prefs = (userData && userData.preferences) || (storedPrefs ? JSON.parse(storedPrefs) : null);
      if (prefs) {
        if (prefs.defaultStyle) selectStyle(prefs.defaultStyle);
        if (prefs.defaultDifficulty) selectDifficulty(prefs.defaultDifficulty);
      }
    } catch (e) {
      console.warn("Could not load user study preferences:", e);
    }
  });

  // 2. Input Mode Switching (Paste Notes vs Enter a Topic)
  if (modeSelector) {
    modeSelector.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        selectMode(mode);
      });
    });
  }

  function selectMode(mode) {
    inputMode = mode;
    modeSelector.querySelectorAll('.pill-btn').forEach((b) => {
      const isActive = b.getAttribute('data-mode') === mode;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-checked', isActive);
    });

    if (inputLabelText && studyInputText) {
      if (mode === 'topic') {
        inputLabelText.textContent = 'Enter Study Topic:';
        studyInputText.placeholder = 'e.g. Mitochondria and Cellular Respiration, Object-Oriented Inheritance, French Revolution...';
        studyInputText.style.minHeight = '100px';
      } else {
        inputLabelText.textContent = 'Enter or Paste Your Study Notes:';
        studyInputText.placeholder = 'Paste your class notes, textbook passage, or lecture transcript here...';
        studyInputText.style.minHeight = '180px';
      }
    }
  }

  function selectStyle(style) {
    if (!style) return;
    explanationStyle = style;
    if (styleSelector) {
      styleSelector.querySelectorAll('.pill-btn').forEach((b) => {
        const isActive = b.getAttribute('data-style') === style;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-checked', isActive);
      });
    }
  }

  function selectDifficulty(diff) {
    if (!diff) return;
    difficulty = diff;
    if (difficultySelector) {
      difficultySelector.querySelectorAll('.pill-btn').forEach((b) => {
        const isActive = b.getAttribute('data-difficulty') === diff;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-checked', isActive);
      });
    }
  }

  // Explanation Style Selector
  if (styleSelector) {
    styleSelector.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectStyle(btn.getAttribute('data-style'));
      });
    });
  }

  // Difficulty Selector
  if (difficultySelector) {
    difficultySelector.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectDifficulty(btn.getAttribute('data-difficulty'));
      });
    });
  }

  // Character Counter
  if (studyInputText && charCount) {
    studyInputText.addEventListener('input', () => {
      const len = studyInputText.value.length;
      charCount.textContent = len.toLocaleString();
    });
  }

  // Clear Input Button
  if (clearInputBtn && studyInputText) {
    clearInputBtn.addEventListener('click', () => {
      studyInputText.value = '';
      if (charCount) charCount.textContent = '0';
      studyInputText.focus();
    });
  }

  // New Material Button (Scroll back to input)
  if (newMaterialBtn) {
    newMaterialBtn.addEventListener('click', () => {
      if (inputSection) {
        inputSection.scrollIntoView({ behavior: 'smooth' });
        studyInputText.focus();
      }
    });
  }

  // Workspace Tabs Switching
  workspaceTabBtns.forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const targetPanelId = tabBtn.getAttribute('data-target');
      switchWorkspaceTab(targetPanelId);
    });
  });

  function switchWorkspaceTab(panelId) {
    workspaceTabBtns.forEach((btn) => {
      const isActive = btn.getAttribute('data-target') === panelId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });

    workspacePanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === panelId);
    });

    // Stop Text-to-Speech if leaving summary tab
    if (panelId !== 'panel-summary' && ttsIsSpeaking) {
      stopTTS();
    }
  }

  // 3. Generate Study Materials (Gemini API Integration)
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const inputText = studyInputText.value.trim();

      if (!inputText || inputText.length < 5) {
        showToast('Please enter at least 5 characters of study notes or a topic.', 'error');
        studyInputText.focus();
        return;
      }

      if (inputText.length > 30000) {
        showToast('Input exceeds 30,000 characters limit. Please shorten your notes.', 'error');
        return;
      }

      // Show loading spinner
      if (spinnerCard) spinnerCard.style.display = 'block';
      if (resultsWorkspace) resultsWorkspace.classList.remove('is-visible');
      generateBtn.disabled = true;
      spinnerCard.scrollIntoView({ behavior: 'smooth' });

      try {
        // Send request to secure serverless endpoint
        const apiEndpoint = '/api/generate';
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: inputText,
            mode: inputMode,
            explanationStyle,
            difficulty
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to generate study materials.');
        }

        const data = result.data;

        const sessionPayload = {
          topic: data.topic,
          originalMaterial: inputText,
          explanationStyle,
          difficulty,
          summary: data.summary,
          quiz: data.quiz,
          flashcards: data.flashcards,
          quizResult: null
        };

        const newSessionId = await createSession(currentUser.uid, sessionPayload);

        // Update local state
        currentSessionId = newSessionId;
        currentSessionData = {
          ...sessionPayload,
          id: newSessionId,
          createdAt: new Date()
        };

        // Render everything
        renderWorkspace(currentSessionData);
        showToast('Study materials generated successfully!', 'success');

        // Record study activity for streak tracking
        try {
          await recordStudyActivity(currentUser.uid, 'generation');
        } catch (streakErr) {
          console.warn("Could not record streak activity:", streakErr);
        }

        // Update URL query without page reload
        window.history.pushState({}, '', `study.html?session=${newSessionId}`);
      } catch (err) {
        console.error('Generation Error:', err);
        showToast(err.message || 'An error occurred during AI generation.', 'error', 7000);
      } finally {
        if (spinnerCard) spinnerCard.style.display = 'none';
        generateBtn.disabled = false;
      }
    });
  }

  // 4. Load Existing Session (Does NOT call Gemini again)
  async function loadSessionFromFirestore(sessionId) {
    if (!currentUser) return;

    try {
      const session = await getSessionById(currentUser.uid, sessionId);

      if (!session) {
        showToast('Requested study session was not found.', 'warning');
        return;
      }

      currentSessionId = sessionId;
      currentSessionData = {
        ...session,
        id: sessionId
      };

      // Populate original material into textarea if available
      if (studyInputText && currentSessionData.originalMaterial) {
        studyInputText.value = currentSessionData.originalMaterial;
        if (charCount) charCount.textContent = currentSessionData.originalMaterial.length.toLocaleString();
      }

      renderWorkspace(currentSessionData);
      showToast(`Loaded session: "${currentSessionData.topic}"`, 'info', 2500);
    } catch (err) {
      console.error('Error loading session:', err);
      showToast('Error loading study session.', 'error');
    }
  }

  // 5. Render Complete Workspace
  function renderWorkspace(session) {
    if (!session || !resultsWorkspace) return;

    // Header Meta
    const topicHeading = document.getElementById('ws-session-topic');
    const badgeStyle = document.getElementById('ws-badge-style');
    const badgeDiff = document.getElementById('ws-badge-difficulty');

    if (topicHeading) topicHeading.textContent = session.topic || 'Study Session';
    if (badgeStyle) badgeStyle.textContent = `${capitalize(session.explanationStyle || 'Detailed')} Style`;
    if (badgeDiff) badgeDiff.textContent = `${capitalize(session.difficulty || 'Medium')} Difficulty`;

    // Render Feature 1: Summary
    renderSummary(session.summary, session.topic);

    // Render Feature 2: Quiz
    renderQuiz(session.quiz, session.difficulty, session.quizResult);

    // Render Feature 3: Flashcards
    renderFlashcards(session.flashcards);

    // Show workspace
    resultsWorkspace.classList.add('is-visible');
    resultsWorkspace.scrollIntoView({ behavior: 'smooth' });
  }

  // ========================================================================
  // FEATURE 1: AI SUMMARY GENERATOR CONTROLS & RENDERING
  // ========================================================================
  function renderSummary(summary, topic) {
    if (!summary) return;

    const titleEl = document.getElementById('summary-display-title');
    const contentEl = document.getElementById('summary-display-content');
    const keypointsListEl = document.getElementById('summary-keypoints-list');
    const keywordsEl = document.getElementById('summary-keywords-container');

    if (titleEl) titleEl.textContent = summary.title || `${topic} Summary`;

    if (contentEl) {
      // Split paragraphs nicely
      const paragraphs = (summary.content || '').split('\n').filter((p) => p.trim().length > 0);
      contentEl.innerHTML = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    }

    if (keypointsListEl && Array.isArray(summary.keyPoints)) {
      keypointsListEl.innerHTML = summary.keyPoints
        .map((point) => `<li>${escapeHtml(point)}</li>`)
        .join('');
    }

    if (keywordsEl && Array.isArray(summary.keywords)) {
      keywordsEl.innerHTML = summary.keywords
        .map((kw) => `<span class="keyword-badge"># ${escapeHtml(kw)}</span>`)
        .join('');
    }

    // Reset TTS
    stopTTS();
  }

  // Copy Summary
  const copySummaryBtn = document.getElementById('copy-summary-btn');
  if (copySummaryBtn) {
    copySummaryBtn.addEventListener('click', () => {
      if (!currentSessionData || !currentSessionData.summary) return;

      const summary = currentSessionData.summary;
      const formatted = `# ${currentSessionData.topic} — ${summary.title}

${summary.content}

## Key Takeaways:
${(summary.keyPoints || []).map((p) => `- ${p}`).join('\n')}

Keywords: ${(summary.keywords || []).join(', ')}
`;

      navigator.clipboard.writeText(formatted).then(() => {
        showToast('Summary copied to clipboard in markdown format!', 'success');
      }).catch(() => {
        showToast('Failed to copy to clipboard.', 'error');
      });
    });
  }

  // Download Summary (.md)
  const downloadSummaryBtn = document.getElementById('download-summary-btn');
  if (downloadSummaryBtn) {
    downloadSummaryBtn.addEventListener('click', () => {
      if (!currentSessionData || !currentSessionData.summary) return;

      const summary = currentSessionData.summary;
      const topic = currentSessionData.topic || 'Study_Summary';
      const fileContent = `# StudyMate AI Summary: ${topic}
Generated: ${new Date().toLocaleDateString()}
Explanation Style: ${currentSessionData.explanationStyle}

---

## ${summary.title}

${summary.content}

### Key Takeaways
${(summary.keyPoints || []).map((p) => `* ${p}`).join('\n')}

### Core Keywords
${(summary.keywords || []).map((k) => `* ${k}`).join('\n')}

---
Created with StudyMate AI
`;

      const blob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic.replace(/[^a-zA-Z0-9_-]/g, '_')}_Summary.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Summary downloaded as markdown file.', 'success');
    });
  }

  // Regenerate Summary
  const regenBtn = document.getElementById('regenerate-summary-btn');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      if (generateBtn) generateBtn.click();
    });
  }

  // Text to Speech (TTS) Controls
  const ttsPlayBtn = document.getElementById('tts-play-btn');
  const ttsPauseBtn = document.getElementById('tts-pause-btn');
  const ttsStopBtn = document.getElementById('tts-stop-btn');
  const ttsPulse = document.getElementById('tts-pulse-indicator');
  const ttsStatusText = document.getElementById('tts-status-text');

  if ('speechSynthesis' in window) {
    if (ttsPlayBtn) {
      ttsPlayBtn.addEventListener('click', () => {
        if (!currentSessionData || !currentSessionData.summary) return;

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          updateTTSState('playing');
          return;
        }

        stopTTS();

        const summary = currentSessionData.summary;
        const textToSpeak = `${summary.title}. ${summary.content}. Key takeaways: ${(summary.keyPoints || []).join('. ')}`;

        ttsUtterance = new SpeechSynthesisUtterance(textToSpeak);
        ttsUtterance.rate = 1.0;
        ttsUtterance.pitch = 1.0;

        ttsUtterance.onstart = () => updateTTSState('playing');
        ttsUtterance.onend = () => updateTTSState('stopped');
        ttsUtterance.onerror = () => updateTTSState('stopped');

        window.speechSynthesis.speak(ttsUtterance);
      });
    }

    if (ttsPauseBtn) {
      ttsPauseBtn.addEventListener('click', () => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          updateTTSState('paused');
        }
      });
    }

    if (ttsStopBtn) {
      ttsStopBtn.addEventListener('click', stopTTS);
    }
  }

  function stopTTS() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      updateTTSState('stopped');
    }
  }

  function updateTTSState(state) {
    ttsIsSpeaking = state === 'playing';

    if (ttsPulse) ttsPulse.classList.toggle('is-speaking', state === 'playing');
    if (ttsStatusText) {
      if (state === 'playing') ttsStatusText.textContent = 'Speaking...';
      else if (state === 'paused') ttsStatusText.textContent = 'Paused:';
      else ttsStatusText.textContent = 'Read Aloud:';
    }

    if (ttsPlayBtn) ttsPlayBtn.disabled = state === 'playing';
    if (ttsPauseBtn) ttsPauseBtn.disabled = state !== 'playing';
    if (ttsStopBtn) ttsStopBtn.disabled = state === 'stopped';
  }

  // ========================================================================
  // FEATURE 2: AI QUIZ GENERATOR (EXACTLY 5 QUESTIONS)
  // ========================================================================
  function renderQuiz(quizArray, quizDifficulty, existingResult) {
    if (!Array.isArray(quizArray) || quizArray.length !== 5) return;

    // Reset quiz state
    currentQuestionIdx = 0;
    userAnswers = [null, null, null, null, null];
    isQuizSubmitted = false;

    // Restore previous result if completed
    if (existingResult && Array.isArray(existingResult.userAnswers)) {
      userAnswers = existingResult.userAnswers;
      isQuizSubmitted = true;
    }

    const diffTag = document.getElementById('quiz-difficulty-tag');
    if (diffTag) diffTag.textContent = capitalize(quizDifficulty || 'Medium');

    // Build question dots navigation
    const dotsNav = document.getElementById('quiz-dots-nav');
    if (dotsNav) {
      dotsNav.innerHTML = '';
      quizArray.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = `quiz-dot ${idx === 0 ? 'active' : ''}`;
        dot.textContent = idx + 1;
        dot.setAttribute('data-q-idx', idx);
        dot.addEventListener('click', () => goToQuestion(idx));
        dotsNav.appendChild(dot);
      });
    }

    // Display first question
    displayCurrentQuestion();

    // Show or hide score summary
    const summaryCard = document.getElementById('quiz-result-summary');
    if (summaryCard) {
      if (isQuizSubmitted && existingResult) {
        showQuizScoreCard(existingResult.score, existingResult.percentage);
      } else {
        summaryCard.style.display = 'none';
      }
    }
  }

  function displayCurrentQuestion() {
    if (!currentSessionData || !currentSessionData.quiz) return;

    const quiz = currentSessionData.quiz;
    const q = quiz[currentQuestionIdx];
    const currentAnswer = userAnswers[currentQuestionIdx];
    const isAnswered = currentAnswer !== null;

    const counter = document.getElementById('quiz-question-counter');
    const qText = document.getElementById('quiz-question-text');
    const optionsContainer = document.getElementById('quiz-options-list');
    const explanationBox = document.getElementById('quiz-explanation-box');
    const prevBtn = document.getElementById('quiz-prev-btn');
    const nextBtn = document.getElementById('quiz-next-btn');
    const submitBtn = document.getElementById('quiz-submit-btn');

    if (counter) counter.textContent = `Question ${currentQuestionIdx + 1} of 5`;
    if (qText) qText.textContent = q.question;

    // Update dots with immediate correct/wrong feedback
    document.querySelectorAll('.quiz-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentQuestionIdx);
      const ans = userAnswers[idx];
      const answered = ans !== null;
      dot.classList.toggle('answered', answered);

      dot.classList.remove('is-correct', 'is-wrong');
      if (answered && quiz[idx]) {
        const isRight = ans === quiz[idx].correctAnswer;
        dot.classList.add(isRight ? 'is-correct' : 'is-wrong');
      }
    });

    // Populate options with immediate right/wrong reveal
    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      const letters = ['A', 'B', 'C', 'D'];

      q.options.forEach((opt, optIdx) => {
        const optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.className = 'option-btn';

        const isSelected = currentAnswer === optIdx;
        if (isSelected) optBtn.classList.add('selected');

        let statusTag = '';
        if (isAnswered) {
          const isCorrect = optIdx === q.correctAnswer;
          const isWrongSelection = isSelected && !isCorrect;

          if (isCorrect) {
            optBtn.classList.add('is-correct');
            statusTag = `<span class="option-status-tag correct">✓ Correct Answer</span>`;
          } else if (isWrongSelection) {
            optBtn.classList.add('is-wrong');
            statusTag = `<span class="option-status-tag wrong">✗ Incorrect</span>`;
          }
          optBtn.disabled = true; // Lock question once answered
        } else {
          optBtn.addEventListener('click', () => selectAnswer(optIdx));
        }

        optBtn.innerHTML = `
          <div style="display: flex; align-items: center; gap: var(--space-3); flex: 1; text-align: left;">
            <span class="option-indicator">${letters[optIdx]}</span>
            <span>${escapeHtml(opt)}</span>
          </div>
          ${statusTag}
        `;
        optionsContainer.appendChild(optBtn);
      });
    }

    // Immediate Explanation Display
    if (explanationBox) {
      if (isAnswered) {
        explanationBox.classList.add('is-visible');
        const isRight = currentAnswer === q.correctAnswer;
        const feedbackHeader = isRight
          ? `<span style="color: var(--success); font-weight: 700;">✓ Correct!</span>`
          : `<span style="color: var(--error); font-weight: 700;">✗ Incorrect.</span>`;

        explanationBox.innerHTML = `
          <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2);">
            <span style="font-size: 1.15rem;" aria-hidden="true">💡</span>
            <div>${feedbackHeader} <strong>Explanation:</strong></div>
          </div>
          <p id="quiz-explanation-text" style="margin: 0; line-height: 1.6; color: var(--text-primary);">
            ${escapeHtml(q.explanation || 'Option is correct.')}
          </p>
        `;
      } else {
        explanationBox.classList.remove('is-visible');
      }
    }

    // Prev / Next button states
    if (prevBtn) prevBtn.disabled = currentQuestionIdx === 0;

    if (nextBtn && submitBtn) {
      if (currentQuestionIdx === 4) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-flex';
        submitBtn.textContent = isQuizSubmitted ? '✓ Overall Marks & Review' : '✓ Submit & View Overall Marks';
      } else {
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';
      }
    }
  }

  function selectAnswer(optIdx) {
    if (userAnswers[currentQuestionIdx] !== null) return; // Prevent changing after marked
    userAnswers[currentQuestionIdx] = optIdx;
    displayCurrentQuestion();

    // If on the last question, automatically scroll slightly if needed so the submit button is in view
    if (currentQuestionIdx === 4) {
      const submitBtn = document.getElementById('quiz-submit-btn');
      if (submitBtn) {
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  function goToQuestion(idx) {
    currentQuestionIdx = idx;
    displayCurrentQuestion();
  }

  // Quiz Navigation Button listeners
  const quizPrevBtn = document.getElementById('quiz-prev-btn');
  const quizNextBtn = document.getElementById('quiz-next-btn');
  const quizSubmitBtn = document.getElementById('quiz-submit-btn');
  const retakeQuizBtn = document.getElementById('retake-quiz-btn');

  if (quizPrevBtn) {
    quizPrevBtn.addEventListener('click', () => {
      if (currentQuestionIdx > 0) {
        goToQuestion(currentQuestionIdx - 1);
      }
    });
  }

  if (quizNextBtn) {
    quizNextBtn.addEventListener('click', () => {
      if (currentQuestionIdx < 4) {
        goToQuestion(currentQuestionIdx + 1);
      }
    });
  }

  if (quizSubmitBtn) {
    quizSubmitBtn.addEventListener('click', async () => {
      if (isQuizSubmitted) {
        const summaryCard = document.getElementById('quiz-result-summary');
        if (summaryCard) {
          summaryCard.style.display = 'block';
          summaryCard.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      const unansweredCount = userAnswers.filter((a) => a === null).length;
      if (unansweredCount > 0) {
        const confirmSubmit = confirm(`You have ${unansweredCount} unanswered question(s). Are you sure you want to view your final score?`);
        if (!confirmSubmit) return;
      }

      setButtonLoading(quizSubmitBtn, true, 'Scoring...');

      // Calculate score
      let score = 0;
      currentSessionData.quiz.forEach((q, idx) => {
        if (userAnswers[idx] === q.correctAnswer) {
          score++;
        }
      });

      const percentage = Math.round((score / 5) * 100);
      isQuizSubmitted = true;

      const quizResult = {
        score,
        totalQuestions: 5,
        percentage,
        userAnswers,
        difficulty: currentSessionData.difficulty,
        completedAt: new Date().toISOString()
      };

      // Save quiz result under the study session
      try {
        await updateSessionData(currentUser.uid, currentSessionId, { quizResult });
        currentSessionData.quizResult = quizResult;
      } catch (err) {
        console.warn('Failed to update quiz result:', err);
      }

      setButtonLoading(quizSubmitBtn, false);
      displayCurrentQuestion();
      showQuizScoreCard(score, percentage);
      showToast(`Quiz completed! You scored ${score}/5 (${percentage}%)`, 'success');

      // Record streak activity for quiz completion
      try {
        await recordStudyActivity(currentUser.uid, 'quiz');
      } catch (streakErr) {
        console.warn("Could not record streak activity for quiz:", streakErr);
      }
    });
  }

  function showQuizScoreCard(score, percentage) {
    const summaryCard = document.getElementById('quiz-result-summary');
    const circle = document.getElementById('quiz-final-score-circle');
    const pctBadge = document.getElementById('quiz-final-score-pct');
    const title = document.getElementById('quiz-final-score-title');
    const desc = document.getElementById('quiz-final-score-desc');

    if (summaryCard) summaryCard.style.display = 'block';
    if (circle) circle.textContent = `${score}/5`;
    if (pctBadge) pctBadge.textContent = `${percentage}% Overall Score`;

    if (title && desc) {
      if (score === 5) {
        title.textContent = '🌟 Perfect Score (5/5)!';
        desc.textContent = `Incredible work! You answered 100% correctly. You have fully mastered this topic!`;
      } else if (score >= 4) {
        title.textContent = '🎉 Great Job!';
        desc.textContent = `You scored ${percentage}% (${score} out of 5 correct). You have a strong grasp of the material!`;
      } else if (score >= 3) {
        title.textContent = '👍 Good Effort!';
        desc.textContent = `You scored ${percentage}% (${score} out of 5 correct). Review the explanations to solidify your understanding.`;
      } else {
        title.textContent = '📚 Needs Review';
        desc.textContent = `You scored ${percentage}% (${score} out of 5 correct). Review the summary and flashcards, then give it another try!`;
      }
    }

    if (summaryCard) summaryCard.scrollIntoView({ behavior: 'smooth' });
  }

  if (retakeQuizBtn) {
    retakeQuizBtn.addEventListener('click', () => {
      userAnswers = [null, null, null, null, null];
      isQuizSubmitted = false;
      const summaryCard = document.getElementById('quiz-result-summary');
      if (summaryCard) summaryCard.style.display = 'none';
      goToQuestion(0);
      showToast('Quiz reset. Best of luck!', 'info');
    });
  }

  // ========================================================================
  // FEATURE 3: INTERACTIVE FLASHCARDS (3D FLIP & PERSISTENCE)
  // ========================================================================
  function renderFlashcards(flashcardsArray) {
    if (!Array.isArray(flashcardsArray) || flashcardsArray.length === 0) return;

    currentFlashcardIdx = 0;
    isCardFlipped = false;

    displayCurrentFlashcard();
    updateFlashcardCounts();
  }

  function displayCurrentFlashcard() {
    if (!currentSessionData || !currentSessionData.flashcards) return;

    const cards = currentSessionData.flashcards;
    const card = cards[currentFlashcardIdx];

    const indicator = document.getElementById('flashcard-card-indicator');
    const card3d = document.getElementById('flashcard-card-3d');
    const frontText = document.getElementById('fc-front-text');
    const backText = document.getElementById('fc-back-text');
    const prevBtn = document.getElementById('fc-prev-btn');
    const nextBtn = document.getElementById('fc-next-btn');

    // Reset 3D flip rotation
    isCardFlipped = false;
    if (card3d) card3d.classList.remove('is-flipped');

    if (indicator) indicator.textContent = `Card ${currentFlashcardIdx + 1} of ${cards.length}`;
    if (frontText) frontText.textContent = card.question || '';
    if (backText) backText.textContent = card.answer || '';

    if (prevBtn) prevBtn.disabled = currentFlashcardIdx === 0;
    if (nextBtn) nextBtn.disabled = currentFlashcardIdx === cards.length - 1;

    // Highlight active mastery button
    const knownBtn = document.getElementById('fc-mark-known-btn');
    const revisionBtn = document.getElementById('fc-mark-revision-btn');

    if (knownBtn) knownBtn.classList.toggle('active', card.status === 'known');
    if (revisionBtn) revisionBtn.classList.toggle('active', card.status === 'needs_revision');
  }

  function toggleCardFlip() {
    const card3d = document.getElementById('flashcard-card-3d');
    if (card3d) {
      isCardFlipped = !isCardFlipped;
      card3d.classList.toggle('is-flipped', isCardFlipped);
    }
  }

  // Flashcard flip listeners (click scene, flip button, spacebar)
  const fcScene = document.getElementById('flashcard-scene');
  const fcFlipBtn = document.getElementById('fc-flip-btn');
  const fcPrevBtn = document.getElementById('fc-prev-btn');
  const fcNextBtn = document.getElementById('fc-next-btn');
  const fcMarkKnownBtn = document.getElementById('fc-mark-known-btn');
  const fcMarkRevisionBtn = document.getElementById('fc-mark-revision-btn');

  if (fcScene) {
    fcScene.addEventListener('click', toggleCardFlip);
    fcScene.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        toggleCardFlip();
      }
    });
  }

  if (fcFlipBtn) fcFlipBtn.addEventListener('click', toggleCardFlip);

  if (fcPrevBtn) {
    fcPrevBtn.addEventListener('click', () => {
      if (currentFlashcardIdx > 0) {
        currentFlashcardIdx--;
        displayCurrentFlashcard();
      }
    });
  }

  if (fcNextBtn) {
    fcNextBtn.addEventListener('click', () => {
      if (currentFlashcardIdx < currentSessionData.flashcards.length - 1) {
        currentFlashcardIdx++;
        displayCurrentFlashcard();
      }
    });
  }

  // Update card mastery status & persist immediately to Firestore
  async function updateCardStatus(status) {
    if (!currentSessionData || !currentSessionData.flashcards) return;

    const cards = currentSessionData.flashcards;
    cards[currentFlashcardIdx].status = status;

    displayCurrentFlashcard();
    updateFlashcardCounts();

    // Auto advance to next card for frictionless study flow
    if (currentFlashcardIdx < cards.length - 1) {
      setTimeout(() => {
        currentFlashcardIdx++;
        displayCurrentFlashcard();
      }, 350);
    }

    // Persist flashcard status
    try {
      await updateSessionData(currentUser.uid, currentSessionId, { flashcards: cards });
      // Record streak activity for flashcard review
      await recordStudyActivity(currentUser.uid, 'flashcard');
    } catch (err) {
      console.warn('Could not save flashcard status:', err);
    }
  }

  if (fcMarkKnownBtn) {
    fcMarkKnownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCardStatus('known');
    });
  }

  if (fcMarkRevisionBtn) {
    fcMarkRevisionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCardStatus('needs_revision');
    });
  }

  function updateFlashcardCounts() {
    if (!currentSessionData || !currentSessionData.flashcards) return;

    const cards = currentSessionData.flashcards;
    const known = cards.filter((c) => c.status === 'known').length;
    const revision = cards.filter((c) => c.status === 'needs_revision').length;
    const unreviewed = cards.filter((c) => !c.status || c.status === 'unreviewed').length;

    const knownEl = document.getElementById('count-known');
    const revEl = document.getElementById('count-revision');
    const unrevEl = document.getElementById('count-unreviewed');

    if (knownEl) knownEl.textContent = `Known: ${known}`;
    if (revEl) revEl.textContent = `Need Revision: ${revision}`;
    if (unrevEl) unrevEl.textContent = `Unreviewed: ${unreviewed}`;
  }

  // Helper function
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
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

