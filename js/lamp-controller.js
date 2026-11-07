/**
 * StudyMate AI - Interactive Lamp Controller
 * 
 * Manages:
 * - Interactive pull-cord drag physics with elastic spring return
 * - Procedural Web Audio API switch click synthesizer
 * - Illuminating light cone, radial glow, and lampshade states
 * - High-DPI floating golden dust particles inside the light beam
 * - Smooth reveal transition for the login panel
 * - Mobile touch, desktop pointer, and keyboard accessibility
 */

export function initLampExperience() {
  const container = document.getElementById('lamp-scene-container');
  if (!container) return;

  const cordSvg = document.getElementById('lamp-cord-svg');
  const cordPath = document.getElementById('lamp-cord-path');
  const pullHandle = document.getElementById('lamp-pull-handle');
  const instruction = document.getElementById('lamp-instruction');
  const loginStage = document.getElementById('login-stage');
  const canvas = document.getElementById('particles-canvas');

  let isLampOn = false;
  let isDragging = false;
  let startY = 0;
  let currentY = 0;
  let restingLength = 70; // Default distance from socket to handle
  let maxDragDistance = 90; // Maximum downward drag
  let triggerThreshold = 40; // Distance needed to activate switch
  let springAnimId = null;

  // Sound Synthesizer: Procedural Mechanical Switch Click
  function playSwitchSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Click transient 1: mechanical pull latch
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(650, now);
      osc1.frequency.exponentialRampToValueAtTime(110, now + 0.035);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.045);

      // Click transient 2: sharp electrical toggle contact
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1200, now + 0.012);
      osc2.frequency.exponentialRampToValueAtTime(180, now + 0.04);
      gain2.gain.setValueAtTime(0.2, now + 0.012);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.012);
      osc2.stop(now + 0.055);
    } catch (e) {
      // Audio not permitted or not supported, ignore gracefully
    }
  }

  // Update SVG cord path based on handle offset
  function updateCord(offsetY, curveX = 0) {
    if (!cordPath || !pullHandle) return;

    // The cord starts at (20, 0) in the SVG coordinate space
    const startX = 20;
    const startY = 0;
    const endX = 20 + curveX;
    const endY = restingLength + offsetY;

    // Slight natural curve when moving
    const cpX = 20 + curveX * 0.5;
    const cpY = (startY + endY) * 0.5;

    cordPath.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`);
    pullHandle.style.transform = `translate3d(${curveX}px, ${offsetY}px, 0)`;
  }

  // Elastic Spring Return Animation
  function springBack(fromOffset, onComplete) {
    cancelAnimationFrame(springAnimId);
    let current = fromOffset;
    let velocity = -12; // Initial upward snap
    const spring = 0.22; // Spring stiffness
    const damping = 0.72; // Friction damping

    function step() {
      const force = -spring * current;
      velocity = (velocity + force) * damping;
      current += velocity;

      updateCord(current);

      if (Math.abs(current) < 0.4 && Math.abs(velocity) < 0.4) {
        updateCord(0);
        if (onComplete) onComplete();
      } else {
        springAnimId = requestAnimationFrame(step);
      }
    }
    springAnimId = requestAnimationFrame(step);
  }

  // Activate Lamp Switch
  function turnLampOn() {
    if (isLampOn) return;
    isLampOn = true;

    playSwitchSound();

    container.classList.add('lamp-lit');
    document.body.classList.add('scene-illuminated');

    if (pullHandle) {
      pullHandle.setAttribute('aria-checked', 'true');
    }

    if (instruction) {
      instruction.classList.add('is-hidden');
    }

    if (loginStage) {
      loginStage.classList.add('is-visible');
    }

    // Start golden floating particles
    startParticles();
  }

  // Pointer Event Listeners for Pull Cord
  if (pullHandle) {
    pullHandle.addEventListener('pointerdown', (e) => {
      if (isLampOn) return; // Already on
      isDragging = true;
      startY = e.clientY;
      currentY = e.clientY;
      cancelAnimationFrame(springAnimId);
      pullHandle.setPointerCapture(e.pointerId);
      pullHandle.classList.add('is-pulling');
      e.preventDefault();
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      currentY = e.clientY;
      const rawDelta = currentY - startY;

      // Only allow downward pulling with smooth damping
      const clampedDelta = Math.max(0, Math.min(maxDragDistance, rawDelta * 0.9));
      updateCord(clampedDelta);

      // If user pulled far enough, trigger immediately or prepare
      if (clampedDelta >= triggerThreshold && !isLampOn) {
        pullHandle.classList.add('trigger-ready');
      } else {
        pullHandle.classList.remove('trigger-ready');
      }
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      pullHandle.classList.remove('is-pulling', 'trigger-ready');

      const rawDelta = currentY - startY;
      const clampedDelta = Math.max(0, Math.min(maxDragDistance, rawDelta * 0.9));

      if (clampedDelta >= triggerThreshold) {
        // Pulled far enough -> Turn Lamp ON!
        springBack(clampedDelta, () => {
          turnLampOn();
        });
      } else if (rawDelta < 6) {
        // Click without substantial dragging -> Friendly toggle fallback
        pullCordTugEffect();
      } else {
        // Didn't pull far enough -> Snap back
        springBack(clampedDelta);
      }
    }

    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // Keyboard Accessibility (Enter or Space)
    pullHandle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pullCordTugEffect();
      }
    });

    // Click handler fallback
    pullHandle.addEventListener('click', (e) => {
      if (!isLampOn && !isDragging) {
        pullCordTugEffect();
      }
    });
  }

  // Tug effect when clicked directly or keyboard-activated
  function pullCordTugEffect() {
    if (isLampOn) return;
    cancelAnimationFrame(springAnimId);
    let progress = 0;

    function tugDown() {
      progress += 6;
      updateCord(progress);
      if (progress < triggerThreshold + 10) {
        requestAnimationFrame(tugDown);
      } else {
        turnLampOn();
        springBack(triggerThreshold + 10);
      }
    }
    requestAnimationFrame(tugDown);
  }

  // Floating Golden Particles Canvas
  let particlesAnimationId = null;
  function startParticles() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);

    // Particle definition
    const particles = [];
    const count = window.innerWidth < 768 ? 24 : 45;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.6 + 0.2,
        speedY: Math.random() * 0.45 + 0.15,
        speedX: (Math.random() - 0.5) * 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y -= p.speedY;
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.25 + p.speedX;

        // Reset if drifted outside light cone
        if (p.y < 0) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        // Draw glowing particle
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253, 224, 71, ${p.alpha})`;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      });

      particlesAnimationId = requestAnimationFrame(render);
    }

    cancelAnimationFrame(particlesAnimationId);
    particlesAnimationId = requestAnimationFrame(render);
  }

  // Reduced motion preference support
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // If user prefers reduced motion, automatically turn the lamp on cleanly
    turnLampOn();
  }

  // Initialize cord at resting length
  updateCord(0);
}

