// ============================================================
// NUREARN — GOAL OVERLAY SCRIPT
// Premium Gold & Black Theme + Smooth Animations
// ============================================================

console.log('[Goal] Script loaded');

// ============================================================
// PARSE GOAL TYPE
// ============================================================
const urlParams = new URLSearchParams(window.location.search);
const rawPathParts = window.location.pathname.replace(/^\/overlay\/?/, '').split('/').filter(Boolean);
// rawPathParts could be ['goal', 'likes'] or ['@user', 'goal', 'likes'] or ['user', 'goal', 'likes']
let pathUser = '';
let pathGoalType = '';
if (rawPathParts.length >= 2 && rawPathParts[1].toLowerCase() === 'goal') {
  pathUser = rawPathParts[0];
  pathGoalType = rawPathParts[2] || '';
} else if (rawPathParts.length >= 1 && rawPathParts[0].toLowerCase() === 'goal') {
  pathGoalType = rawPathParts[1] || '';
}

const goalType = (urlParams.get('type') || pathGoalType || 'likes').toLowerCase();
const goalTargetUser = (urlParams.get('username') || urlParams.get('user') || pathUser || '').toLowerCase().trim().replace(/^@/, '');

// ============================================================
// DOM ELEMENTS
// ============================================================
const goalContainer = document.getElementById('goalWidgetContainer');
const goalTitleEl = document.getElementById('goalTitle');
const goalCountEl = document.getElementById('goalCount');
const goalTrackEl = document.getElementById('goalTrack');
const goalFillEl = document.getElementById('goalFill');
const goalPercentEl = document.getElementById('goalPercent');
const celebrationLayer = document.getElementById('celebrationLayer');

// ============================================================
// WEBSOCKET SETUP
// ============================================================
const defaultPort = 8642;
const hasLocationHost = Boolean(window.location && window.location.host);
const host = hasLocationHost ? window.location.host : `localhost:${defaultPort}`;
const isHttps = Boolean(window.location && window.location.protocol === 'https:');
const wsProtocol = isHttps ? 'wss:' : 'ws:';
const httpProtocol = isHttps ? 'https:' : 'http:';
const baseUrl = `${httpProtocol}//${host}`;

let currentGoal = null;
let previousProgress = 0;

// ============================================================
// HELPERS
// ============================================================
function hexToRgba(hex, alphaPercent = 85) {
  if (!hex || hex === 'transparent') return 'transparent';
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 8;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 11;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 18;
  const a = Math.max(0, Math.min(1, (Number(alphaPercent) || 0) / 100));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ============================================================
// RENDER GOAL
// ============================================================
function renderGoal(goal, isUpdate = false) {
  if (!goal) return;
  const prev = currentGoal ? Number(currentGoal.current || 0) : 0;
  currentGoal = goal;

  const current = Number(goal.current || 0);
  const target = Math.max(1, Number(goal.target || 1));
  const percent = Math.min(100, Math.max(0, Math.round((current / target) * 100)));

  // Title
  if (goalTitleEl) {
    goalTitleEl.textContent = goal.title || 'Goal Target';
    const titleColor = goal.titleColor || goal.colors?.title || '#FFFFFF';
    goalTitleEl.style.color = titleColor;
    const fontSize = goal.fontSize || 20;
    goalTitleEl.style.fontSize = `${fontSize}px`;
  }

  // Count
  if (goalCountEl) {
    const unit = goal.unit ? ` ${goal.unit}` : '';
    goalCountEl.textContent = `${current.toLocaleString()} / ${target.toLocaleString()}${unit}`;
    const targetColor = goal.targetColor || goal.colors?.target || '#888888';
    goalCountEl.style.color = targetColor;
    const fontSize = goal.fontSize || 20;
    goalCountEl.style.fontSize = `${Math.max(11, Math.round(fontSize * 0.72))}px`;
  }

  // Progress Fill & Percent
  const barColor = goal.barColor || goal.colors?.progress || 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)';
  const glowColor = goal.glowColor || '#FFD700';

  if (goalFillEl) {
    goalFillEl.style.width = `${percent}%`;
    if (barColor.includes('gradient')) {
      goalFillEl.style.background = barColor;
      goalFillEl.style.setProperty('--bar-color', barColor);
      goalFillEl.setAttribute('data-custom', 'true');
    } else {
      goalFillEl.style.backgroundColor = barColor;
      goalFillEl.style.backgroundImage = 'none';
      goalFillEl.style.setProperty('--bar-color', barColor);
      goalFillEl.setAttribute('data-custom', 'true');
    }
    goalFillEl.style.setProperty('--gold-glow', glowColor);
  }

  // Track
  if (goalTrackEl) {
    const remainingColor = goal.barRemainingColor || goal.colors?.remaining || '#151515';
    goalTrackEl.style.background = remainingColor;
    const barHeight = goal.barHeight || 36;
    goalTrackEl.style.height = `${barHeight}px`;
  }

  // Percent Badge
  if (goalPercentEl) {
    goalPercentEl.textContent = `${percent}%`;
    const show = goal.showPercentage !== false && goal.showPercent !== false;
    goalPercentEl.style.display = show ? 'inline-block' : 'none';
  }

  // Container Background & Opacity
  if (goalContainer) {
    const rawBg = goal.bgColor || goal.colors?.background || '#000000';
    const opacity = goal.bgOpacity !== undefined ? goal.bgOpacity : 85;
    const rgbaBg = hexToRgba(rawBg, opacity);
    goalContainer.style.background = rgbaBg;

    // Font
    const font = goal.font || goal.fontFamily || 'Poppins';
    goalContainer.style.fontFamily = `'${font}', 'Inter', sans-serif`;

    // Shape classes
    goalContainer.classList.remove(
      'shape-water', 'shape-liquid', 'shape-crystal', 'shape-neon-capsule',
      'shape-pill', 'shape-rounded', 'shape-glass', 'shape-cyber', 'shape-classic'
    );
    const shape = goal.shape || 'rounded';
    goalContainer.classList.add(`shape-${shape}`);

    // Size mode
    const size = goal.size || 'normal';
    goalContainer.dataset.size = size;
  }

  // Trigger increment animation if progress increased
  if (isUpdate && current > prev) {
    triggerProgressIncrementEffect(current - prev, goal.shape);
  }

  document.title = `Goal - ${goal.title || goalType.toUpperCase()} (${percent}%)`;
}

// ============================================================
// INCREMENT ANIMATION
// ============================================================
function triggerProgressIncrementEffect(delta, shape = 'rounded') {
  if (!goalContainer) return;

  // Pulse on widget
  goalContainer.classList.remove('pulse-active');
  void goalContainer.offsetWidth;
  goalContainer.classList.add('pulse-active');
  setTimeout(() => goalContainer.classList.remove('pulse-active'), 700);

  // Water surge effect if shape is water
  if (shape === 'water' || shape === 'liquid') {
    const waveLayer = goalContainer.querySelector('.water-wave-layer');
    if (waveLayer) {
      waveLayer.classList.add('wave-surge-active');
      setTimeout(() => waveLayer.classList.remove('wave-surge-active'), 1200);
    }
  }

  if (!celebrationLayer) return;

  // Spawn particles based on goal type
  if (goalType === 'likes' || goalType === 'followers') {
    const count = Math.min(8, Math.max(2, Math.round(delta / 3) || 2));
    spawnHearts(count);
  } else if (goalType === 'coins' || goalType === 'gifts') {
    const count = Math.min(10, Math.max(3, Math.round(delta / 5) || 3));
    spawnGoldenSparkles(count);
  } else {
    const count = Math.min(6, Math.max(2, Math.round(delta / 4) || 2));
    spawnGoldenSparkles(count);
  }
}

function spawnHearts(count = 2) {
  if (!celebrationLayer) return;
  const hearts = ['❤️', '💖', '💗', '💕', '💝'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'heart-particle';
    el.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    el.style.left = `${50 + (Math.random() * 30 - 15)}%`;
    el.style.top = '48px';
    const tx = `${(Math.random() - 0.5) * 140}px`;
    const rot = `${(Math.random() - 0.5) * 45}deg`;
    el.style.setProperty('--tx', tx);
    el.style.setProperty('--rot', rot);
    celebrationLayer.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  }
}

function spawnGoldenSparkles(count = 4) {
  if (!celebrationLayer) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'sparkle-particle';
    el.style.left = `${50 + (Math.random() * 40 - 20)}%`;
    el.style.top = '52px';
    const tx = `${(Math.random() - 0.5) * 180}px`;
    const ty = `${(Math.random() - 0.5) * 120 - 30}px`;
    el.style.setProperty('--tx', tx);
    el.style.setProperty('--ty', ty);
    celebrationLayer.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }
}

// ============================================================
// CELEBRATION (Goal Reached)
// ============================================================
function triggerCelebration() {
  if (goalContainer) {
    goalContainer.classList.remove('goal-celebration');
    void goalContainer.offsetWidth;
    goalContainer.classList.add('goal-celebration');
    setTimeout(() => goalContainer.classList.remove('goal-celebration'), 1700);
  }

  if (!celebrationLayer) return;
  celebrationLayer.innerHTML = '';

  // Gold + white confetti palette
  const colors = ['#FFD700', '#FFE44D', '#D4AF37', '#FFFFFF', '#FFF8E7'];

  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = `${50 + (Math.random() * 24 - 12)}%`;
    p.style.top = '50px';
    const tx = `${(Math.random() - 0.5) * 600}px`;
    const ty = `${Math.random() * 420 + 80}px`;
    p.style.setProperty('--tx', tx);
    p.style.setProperty('--ty', ty);
    p.style.animationDelay = `${Math.random() * 0.2}s`;
    celebrationLayer.appendChild(p);
  }

  setTimeout(() => {
    celebrationLayer.innerHTML = '';
  }, 2600);
}

// ============================================================
// INITIAL FETCH
// ============================================================
fetch(`${baseUrl}/api/goals/${goalType}`)
  .then(res => res.json())
  .then(goal => renderGoal(goal, false))
  .catch(err => console.warn('[Goal] Gagal memuat goal:', err.message));

// ============================================================
// WEBSOCKET LISTENER
// ============================================================
function connect() {
  const targetUser = goalTargetUser || (urlParams.get('username') || urlParams.get('user') || '').toLowerCase().trim().replace(/^@/, '');
  const wsQuery = targetUser ? `?username=${encodeURIComponent(targetUser)}` : '';
  const ws = new WebSocket(`${wsProtocol}//${host}${wsQuery}`);

  ws.addEventListener('open', () => {
    console.log('[Goal] WebSocket connected');
  });

  ws.addEventListener('close', () => {
    console.log('[Goal] WebSocket closed. Reconnecting...');
    setTimeout(connect, 2000);
  });

  ws.addEventListener('error', (err) => {
    console.error('[Goal] WebSocket error:', err);
  });

  ws.addEventListener('message', (msg) => {
    try {
      const parsed = JSON.parse(msg.data);
      const { type, payload } = parsed;

      if (type === 'overlay:goal-update') {
        if (payload?.type === goalType) {
          renderGoal(payload.goal, true);
        }
      }

      if (type === 'overlay:goal-reached') {
        if (payload?.type === goalType) {
          renderGoal(payload.goal, true);
          triggerCelebration();
        }
      }

      if (type === 'overlay:goals-all') {
        if (payload && payload[goalType]) {
          renderGoal(payload[goalType], true);
        }
      }

      if (type === 'overlay:css') {
        const targetType = payload?.type || 'all';
        if (targetType === 'goal' || targetType === 'all' || targetType === goalType) {
          const customStyle = document.getElementById('customGoalCss');
          if (customStyle) {
            customStyle.textContent = payload.css || '';
          }
        }
      }
    } catch (err) {
      console.error('[Goal] Gagal memproses pesan WebSocket:', err);
    }
  });
}

connect();