// ============================================================
// NUREARN — OVERLAY SCRIPT
// Premium Gold & Black Theme
// ============================================================

console.log('[DIAG] overlay.js loaded. URL:', window.location.href);

// ============================================================
// MODE & USERNAME PARSING
// ============================================================
const urlParams = new URLSearchParams(window.location.search);
const pathSegments = window.location.pathname.replace(/^\/overlay\/?/, '').split('/').filter(Boolean);

const KNOWN_MODES = new Set([
  'all', 'chat', 'chats', 'gift', 'gifts', 'video', 'vidio', 'image', 'gambar',
  'media', 'alert', 'alerts', 'topgift', 'top10', 'leaderboard', 'top',
  'join', 'member', 'bergabung', 'follow', 'follower', 'followers',
  'share', 'shares', 'taptap', 'tap', 'toplike', 'toplikes', 'like', 'likes',
  'soundboard', 'sb'
]);

let targetUsername = (urlParams.get('username') || urlParams.get('user') || '').toLowerCase().trim().replace(/^@/, '');
let rawMode = (urlParams.get('type') || urlParams.get('mode') || '').toLowerCase();

if (!rawMode) {
  if (pathSegments.length > 0) {
    if (KNOWN_MODES.has(pathSegments[0].toLowerCase())) {
      rawMode = pathSegments[0].toLowerCase();
    } else {
      // First segment is username (e.g. /overlay/rian_live or /overlay/rian_live/chat)
      if (!targetUsername) {
        targetUsername = pathSegments[0].toLowerCase().trim().replace(/^@/, '');
      }
      if (pathSegments.length > 1 && KNOWN_MODES.has(pathSegments[1].toLowerCase())) {
        rawMode = pathSegments[1].toLowerCase();
      } else {
        rawMode = 'all';
      }
    }
  } else {
    rawMode = 'all';
  }
}

let mode = rawMode;
if (mode === 'vidio') mode = 'video';
if (mode === 'gambar') mode = 'image';
if (mode === 'chats') mode = 'chat';
if (mode === 'top10' || mode === 'leaderboard' || mode === 'top' || mode === 'topgift' || mode === 'topgifts') mode = 'topgift';
if (mode === 'gifts' || mode === 'gift' || mode === 'alert' || mode === 'alerts') mode = 'alert';
if (mode === 'join' || mode === 'member' || mode === 'joins' || mode === 'bergabung') mode = 'join';
if (mode === 'follow' || mode === 'follower' || mode === 'followers') mode = 'follow';
if (mode === 'share' || mode === 'shares') mode = 'share';
if (mode === 'taptap' || mode === 'tap' || mode === 'toplike' || mode === 'toplikes' || mode === 'like' || mode === 'likes') mode = 'taptap';
if (mode === 'soundboard' || mode === 'sb') mode = 'soundboard';

const targetSoundboardId = urlParams.get('id');

const isAll = mode === 'all';
const isChat = isAll || mode === 'chat';
const isTopGift = isAll || mode === 'topgift';
const isTopLike = isAll || mode === 'taptap';
const isVideo = isAll || mode === 'video' || mode === 'media' || mode === 'soundboard';
const isImage = isAll || mode === 'image' || mode === 'media' || mode === 'soundboard';
const isSoundboard = isAll || mode === 'soundboard' || mode === 'media';

// Distinct alert handlers
const isAlertGift = isAll || mode === 'alert' || mode === 'gift';
const isAlertJoin = isAll || mode === 'alert' || mode === 'join';
const isAlertFollow = isAll || mode === 'alert' || mode === 'follow';
const isAlertShare = isAll || mode === 'alert' || mode === 'share';
const isAnyAlert = isAlertGift || isAlertJoin || isAlertFollow || isAlertShare;

const titleMap = {
  all: 'Overlay - All in One',
  chat: 'Overlay - Live Chat',
  gift: 'Overlay - Gift Alert & Social',
  alert: 'Overlay - Gift Alert & Social',
  topgift: 'Overlay - Top 10 Gifter',
  taptap: 'Overlay - Top 10 Tap-Tap (Likes)',
  join: 'Overlay - Viewer Bergabung',
  follow: 'Overlay - Follower Baru',
  share: 'Overlay - Share Live',
  video: 'Overlay - Video',
  image: 'Overlay - Image',
  media: 'Overlay - Media',
  soundboard: targetSoundboardId ? `Overlay - Soundboard [${targetSoundboardId}]` : 'Overlay - Soundboard Media'
};
document.title = titleMap[mode] || `Overlay - ${mode.toUpperCase()}`;

console.log(`[DIAG] Active Mode: ${mode} (targetSoundboardId=${targetSoundboardId}) | isTopGift=${isTopGift} isTopLike=${isTopLike} isAlertGift=${isAlertGift} isAlertJoin=${isAlertJoin} isAlertFollow=${isAlertFollow} isAlertShare=${isAlertShare}`);

// ============================================================
// DOM ELEMENTS
// ============================================================
const alertContainer = document.getElementById('alertContainer');
const joinBox = document.getElementById('joinBox');
const latestChat = document.getElementById('latestChat');
const topGiftBoard = document.getElementById('topGiftBoard');
const topGiftList = document.getElementById('topGiftList');
const topLikeBoard = document.getElementById('topLikeBoard');
const topLikeList = document.getElementById('topLikeList');
const mediaOverlay = document.getElementById('mediaOverlay');
const mediaImage = document.getElementById('mediaImage');
const mediaVideo = document.getElementById('mediaVideo');

// ============================================================
// REMOVE UNUSED ELEMENTS BASED ON MODE
// ============================================================
if (!isChat && latestChat) latestChat.remove();
if (!isAnyAlert && alertContainer) alertContainer.remove();
if (!isAlertJoin && joinBox) joinBox.remove();
if (!isTopGift && topGiftBoard) topGiftBoard.remove();
if (!isTopLike && topLikeBoard) topLikeBoard.remove();

// ============================================================
// WEBSOCKET SETUP
// ============================================================
const defaultOverlayPort = 8642;
const hasLocationHost = Boolean(window.location && window.location.host);
const wsHost = hasLocationHost ? window.location.host : `localhost:${defaultOverlayPort}`;
const isHttps = Boolean(window.location && window.location.protocol === 'https:');
const wsProtocol = isHttps ? 'wss:' : 'ws:';
const httpProtocol = isHttps ? 'https:' : 'http:';
const baseUrl = `${httpProtocol}//${wsHost}`;

console.log('[DIAG] WebSocket URL:', `${wsProtocol}//${wsHost}`);
console.log('[DIAG] baseUrl:', baseUrl);

// ============================================================
// CUSTOM CSS INJECTION
// ============================================================
let customStyleEl = document.getElementById('customOverlayCss');
if (!customStyleEl) {
  customStyleEl = document.createElement('style');
  customStyleEl.id = 'customOverlayCss';
  document.head.appendChild(customStyleEl);
}

function applyCustomCss(css) {
  if (customStyleEl) {
    customStyleEl.textContent = typeof css === 'string' ? css : '';
  }
}

fetch(`${baseUrl}/api/css/${mode}`)
  .then(res => res.text())
  .then(css => applyCustomCss(css))
  .catch(err => console.warn('[DIAG] Gagal memuat custom CSS:', err.message));

// ============================================================
// BOARD MODE TOGGLE (Compact / Normal / Expanded)
// ============================================================
function setupBoardToggles() {
  document.querySelectorAll('.board-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const board = btn.closest('.overlay-board');
      if (!board) return;

      const currentMode = board.dataset.mode || 'compact';
      const modes = ['compact', 'mini', 'expanded'];
      const currentIdx = modes.indexOf(currentMode);
      const nextMode = modes[(currentIdx + 1) % modes.length];
      board.dataset.mode = nextMode;

      // Update icon
      const icons = { compact: '▼', mini: '▲', expanded: '●' };
      btn.textContent = icons[nextMode] || '▼';
      btn.title = `Mode: ${nextMode} — klik untuk ganti`;

      // Save preference
      const boardId = board.id || 'board';
      localStorage.setItem(`overlay_board_mode_${boardId}`, nextMode);
    });

    // Load saved preference
    const board = btn.closest('.overlay-board');
    if (board) {
      const boardId = board.id || 'board';
      const savedMode = localStorage.getItem(`overlay_board_mode_${boardId}`);
      if (savedMode && ['compact', 'mini', 'expanded'].includes(savedMode)) {
        board.dataset.mode = savedMode;
        const icons = { compact: '▼', mini: '▲', expanded: '●' };
        btn.textContent = icons[savedMode] || '▼';
      }
    }
  });
}

setupBoardToggles();

// ============================================================
// TOP LIKE SETTINGS
// ============================================================
let topLikeSettings = {
  alignRight: false,
  showRank: true,
  showCrown: true,
  showTrophy: true,
  showHeart: true,
  heartAnim: true,
  transparentBg: false,
  hideBorder: false,
  hideAvatar: false,
  compactMode: false
};

function parseQueryOverrides() {
  if (urlParams.has('align')) topLikeSettings.alignRight = urlParams.get('align') === 'right';
  if (urlParams.has('rank')) topLikeSettings.showRank = urlParams.get('rank') !== '0' && urlParams.get('rank') !== 'false';
  if (urlParams.has('crown')) topLikeSettings.showCrown = urlParams.get('crown') !== '0' && urlParams.get('crown') !== 'false';
  if (urlParams.has('trophy')) topLikeSettings.showTrophy = urlParams.get('trophy') !== '0' && urlParams.get('trophy') !== 'false';
  if (urlParams.has('heart')) topLikeSettings.showHeart = urlParams.get('heart') !== '0' && urlParams.get('heart') !== 'false';
  if (urlParams.has('heartAnim')) topLikeSettings.heartAnim = urlParams.get('heartAnim') !== '0' && urlParams.get('heartAnim') !== 'false';
  if (urlParams.has('nobg') || urlParams.has('transparent')) topLikeSettings.transparentBg = true;
  if (urlParams.has('noborder')) topLikeSettings.hideBorder = true;
  if (urlParams.has('noavatar')) topLikeSettings.hideAvatar = true;
  if (urlParams.has('compact')) topLikeSettings.compactMode = true;
}

function applyTopLikeDomSettings() {
  if (!topLikeBoard) return;
  topLikeBoard.classList.toggle('align-right', !!topLikeSettings.alignRight);
  topLikeBoard.classList.toggle('hide-rank', !topLikeSettings.showRank);
  topLikeBoard.classList.toggle('hide-heart', !topLikeSettings.showHeart);
  topLikeBoard.classList.toggle('no-heart-anim', !topLikeSettings.heartAnim);
  topLikeBoard.classList.toggle('no-bg', !!topLikeSettings.transparentBg);
  topLikeBoard.classList.toggle('no-border', !!topLikeSettings.hideBorder);
  topLikeBoard.classList.toggle('no-avatar', !!topLikeSettings.hideAvatar);
  topLikeBoard.classList.toggle('compact-mode', !!topLikeSettings.compactMode);
}

function updateTopLikeSettings(newSettings) {
  if (!newSettings) return;
  topLikeSettings = { ...topLikeSettings, ...newSettings };
  parseQueryOverrides();
  applyTopLikeDomSettings();
  renderTopLikers();
}

if (isTopLike) {
  parseQueryOverrides();
  applyTopLikeDomSettings();
  fetch(`${baseUrl}/api/settings/taptap`)
    .then(r => r.json())
    .then(settings => updateTopLikeSettings(settings))
    .catch(err => console.warn('[DIAG] Gagal memuat taptap settings:', err.message));
}

// ============================================================
// TOP GIFT SETTINGS
// ============================================================
let topGiftSettings = {
  alignRight: false,
  showRank: true,
  showCrown: true,
  showTrophy: true,
  showCoin: true,
  transparentBg: false,
  hideBorder: false,
  hideAvatar: false,
  compactMode: false
};

function parseGiftQueryOverrides() {
  if (urlParams.has('giftAlign')) topGiftSettings.alignRight = urlParams.get('giftAlign') === 'right';
  else if (urlParams.has('align') && !isTopLike) topGiftSettings.alignRight = urlParams.get('align') === 'right';

  if (urlParams.has('giftRank')) topGiftSettings.showRank = urlParams.get('giftRank') !== '0' && urlParams.get('giftRank') !== 'false';
  if (urlParams.has('giftCrown')) topGiftSettings.showCrown = urlParams.get('giftCrown') !== '0' && urlParams.get('giftCrown') !== 'false';
  if (urlParams.has('giftTrophy')) topGiftSettings.showTrophy = urlParams.get('giftTrophy') !== '0' && urlParams.get('giftTrophy') !== 'false';
  if (urlParams.has('coin')) topGiftSettings.showCoin = urlParams.get('coin') !== '0' && urlParams.get('coin') !== 'false';
  if (urlParams.has('nobg') || urlParams.has('transparent')) topGiftSettings.transparentBg = true;
  if (urlParams.has('noborder')) topGiftSettings.hideBorder = true;
  if (urlParams.has('noavatar')) topGiftSettings.hideAvatar = true;
  if (urlParams.has('compact')) topGiftSettings.compactMode = true;
}

function applyTopGiftDomSettings() {
  if (!topGiftBoard) return;
  topGiftBoard.classList.toggle('align-right', !!topGiftSettings.alignRight);
  topGiftBoard.classList.toggle('hide-rank', !topGiftSettings.showRank);
  topGiftBoard.classList.toggle('hide-coin', !topGiftSettings.showCoin);
  topGiftBoard.classList.toggle('no-bg', !!topGiftSettings.transparentBg);
  topGiftBoard.classList.toggle('no-border', !!topGiftSettings.hideBorder);
  topGiftBoard.classList.toggle('no-avatar', !!topGiftSettings.hideAvatar);
  topGiftBoard.classList.toggle('compact-mode', !!topGiftSettings.compactMode);
}

function updateTopGiftSettings(newSettings) {
  if (!newSettings) return;
  topGiftSettings = { ...topGiftSettings, ...newSettings };
  parseGiftQueryOverrides();
  applyTopGiftDomSettings();
  renderTopGifters();
}

if (isTopGift) {
  parseGiftQueryOverrides();
  applyTopGiftDomSettings();
  fetch(`${baseUrl}/api/settings/topgift`)
    .then(r => r.json())
    .then(settings => updateTopGiftSettings(settings))
    .catch(err => console.warn('[DIAG] Gagal memuat topgift settings:', err.message));
}

// ============================================================
// REAL-TIME CONNECTION (Socket.IO with Native WebSocket Fallback)
// ============================================================
function handleIncomingMessage(parsed) {
  if (!parsed || !parsed.type) return;
  const { type, payload, username } = parsed;

  // Multi-username isolation:
  // If this overlay is configured for a specific username (e.g. ?username=rian_live),
  // and the incoming event is tagged with a different username, discard it.
  if (targetUsername && username && username !== 'all' && username !== targetUsername) {
    return;
  }

  if (type === 'overlay:css') {
    const targetType = payload?.type || 'all';
    if (mode === 'all' || targetType === 'all' || targetType === mode) {
      fetch(`${baseUrl}/api/css/${mode}`)
        .then(res => res.text())
        .then(css => applyCustomCss(css))
        .catch(() => applyCustomCss(payload.css));
    }
  }

  if (type === 'overlay:taptap-settings' && isTopLike) {
    updateTopLikeSettings(payload);
  }

  if (type === 'overlay:topgift-settings' && isTopGift) {
    updateTopGiftSettings(payload);
  }

  if (type === 'event:gift' || type === 'gift') {
    if (isAlertGift) handleGiftAlert(payload);
    if (isTopGift) handleGiftForTop(payload);
  }
  if (type === 'event:chat' && isChat) handleChat(payload);
  if (type === 'event:like' || type === 'like') {
    if (isTopLike) handleLikeForTop(payload);
    spawnTapTapHeart(Number(payload?.likeCount ?? payload?.count ?? 1));
  }
  if (type === 'event:join' || type === 'event:member' || type === 'join' || type === 'member') {
    if (isAlertJoin) handleJoinAlert(payload);
    if (isChat) handleChatJoin(payload);
  }
  if (type === 'event:follow' || type === 'follow' || type === 'social') {
    if (isAlertFollow) handleFollowAlert(payload);
    if (isChat) handleChatFollow(payload);
  }
  if (type === 'event:share' || type === 'share') {
    if (isAlertShare) handleShareAlert(payload);
    if (isChat) handleChatShare(payload);
  }
  if (type === 'event:stats') {
    if (isTopGift && payload.gifters && Object.keys(payload.gifters).length > 0) {
      if (payload.gifters['unknown']) {
        const stale = payload.gifters['unknown'];
        const cleanKey = (stale.nickname && stale.nickname !== 'unknown') ? stale.nickname.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : null;
        if (cleanKey) payload.gifters[cleanKey] = { ...stale, uniqueId: cleanKey };
        delete payload.gifters['unknown'];
      }
      for (const key of Object.keys(topGifters)) delete topGifters[key];
      Object.assign(topGifters, payload.gifters);
      renderTopGifters();
    }
    if (isTopLike && payload.likers && Object.keys(payload.likers).length > 0) {
      for (const key of Object.keys(topLikers)) delete topLikers[key];
      Object.assign(topLikers, payload.likers);
      renderTopLikers();
    }
  }
  if (type === 'event:media') {
    const isVid = payload.mediaType === 'video';
    if (isVid && isVideo) handleMedia(payload);
    else if (!isVid && isImage) handleMedia(payload);
  }
  if (type === 'event:soundboard-media') {
    if (targetSoundboardId && String(targetSoundboardId).trim() !== String(payload.id).trim()) {
      return;
    }
    if (isVideo || isImage || isSoundboard) {
      handleMedia(payload);
    }
  }
  if (type === 'event:sound') {
    if (payload && payload.file) {
      const audioUrl = payload.file.startsWith('http://') || payload.file.startsWith('https://')
        ? payload.file
        : `${baseUrl}/api/media?path=${encodeURIComponent(payload.file)}`;
      try {
        const audio = new Audio(audioUrl);
        const normVol = typeof payload.volume === 'number' ? Math.max(0, Math.min(1, payload.volume > 1 ? payload.volume / 100 : payload.volume)) : 1;
        audio.volume = normVol;
        audio.play().catch(e => console.warn('[Overlay Sound] Play error:', e));
      } catch (err) {}
    }
  }
}

let isSocketIoConnected = false;

function connect() {
  console.log(`[DIAG] Menghubungkan overlay real-time. Target Username: "${targetUsername || 'SEMUA/DEFAULT'}"`);

  // 1. Coba koneksi Socket.IO jika script /socket.io/socket.io.js berhasil dimuat
  if (typeof io === 'function') {
    try {
      console.log('[DIAG] Menginisialisasi koneksi Socket.IO (Room mode)...');
      const socket = io(baseUrl, {
        query: { username: targetUsername },
        transports: ['websocket', 'polling']
      });
      window.__socket = socket;

      socket.on('connect', () => {
        isSocketIoConnected = true;
        console.log(`[DIAG] ✅ Socket.IO Connected! Room: "room:${targetUsername || 'all'}" | ID: ${socket.id}`);
      });

      socket.on('disconnect', (reason) => {
        isSocketIoConnected = false;
        console.log('[DIAG] ❌ Socket.IO Disconnected:', reason);
      });

      socket.on('connect_error', (err) => {
        console.warn('[DIAG] ⚠️ Socket.IO connect_error, fallback ke WebSocket native:', err.message);
        if (!isSocketIoConnected) {
          connectNativeWebSocket();
        }
      });

      // Tangkap semua event Socket.IO secara universal
      socket.onAny((type, payload) => {
        handleIncomingMessage({ type, payload });
      });

      return;
    } catch (err) {
      console.warn('[DIAG] Gagal inisialisasi Socket.IO, beralih ke Native WebSocket:', err);
    }
  }

  // 2. Fallback langsung ke Native WebSocket (ws)
  connectNativeWebSocket();
}

function connectNativeWebSocket() {
  if (window.__ws && window.__ws.readyState === 1) return;
  const wsQuery = targetUsername ? `?username=${encodeURIComponent(targetUsername)}` : '';
  console.log('[DIAG] Menghubungkan via Native WebSocket:', `${wsProtocol}//${wsHost}${wsQuery}`);
  const ws = new WebSocket(`${wsProtocol}//${wsHost}${wsQuery}`);
  window.__ws = ws;

  ws.addEventListener('open', () => {
    console.log(`[DIAG] ✅ Native WebSocket OPEN (Filter: "${targetUsername || 'SEMUA/DEFAULT'}")`);
  });
  ws.addEventListener('close', (e) => {
    console.log('[DIAG] ❌ Native WebSocket CLOSED. code=', e.code, 'reason=', e.reason);
    if (!isSocketIoConnected) {
      setTimeout(connect, 2500);
    }
  });
  ws.addEventListener('error', (e) => console.error('[DIAG] ⚠️ Native WebSocket ERROR', e));

  ws.addEventListener('message', (msg) => {
    try {
      const parsed = JSON.parse(msg.data);
      handleIncomingMessage(parsed);
    } catch (err) {
      console.error('[DIAG] Failed to parse WebSocket message:', err);
    }
  });
}

connect();

// ============================================================
// UNIFIED ALERT QUEUE (Gift, Join, Follow, Share)
// High-performance, memory-capped, smooth 60fps animations
// ============================================================
const alertQueue = [];
let alertShowing = false;
const MAX_ALERT_QUEUE = 30;

function pushAlert(item) {
  if (!alertContainer) return;
  if (alertQueue.length > MAX_ALERT_QUEUE) {
    alertQueue.shift(); // Drop oldest alert to preserve performance
  }
  alertQueue.push(item);
  processAlertQueue();
}

function handleGiftAlert(payload) {
  if (!isAlertGift) return;
  // Alert for streak ended or every 5 combo increments or non-streak
  if (payload.streakEnded || (payload.repeatCount || 1) % 5 === 0 || !payload.isStreak) {
    pushAlert({
      category: 'gift',
      payload
    });
  }
}

function handleJoinAlert(payload) {
  if (!isAlertJoin) return;
  pushAlert({
    category: 'join',
    payload
  });
}

function handleFollowAlert(payload) {
  if (!isAlertFollow) return;
  pushAlert({
    category: 'follow',
    payload
  });
}

function handleShareAlert(payload) {
  if (!isAlertShare) return;
  pushAlert({
    category: 'share',
    payload
  });
}

function processAlertQueue() {
  if (!alertContainer || alertShowing || alertQueue.length === 0) return;
  alertShowing = true;
  const item = alertQueue.shift();
  const { category, payload } = item;

  const name = escapeHtml(payload.nickname || payload.uniqueId || 'User');
  const avatarHtml = payload.avatar
    ? `<img class="alert-avatar" src="${escapeHtml(payload.avatar)}" onerror="this.outerHTML='<div class=\\'alert-avatar-placeholder\\'>👤</div>';" alt="${name}" />`
    : `<div class="alert-avatar-placeholder">👤</div>`;

  const alertEl = document.createElement('div');
  alertEl.className = `alert-box alert-${category}`;

  if (category === 'gift') {
    const giftName = escapeHtml(payload.giftName || 'Gift');
    const repeatCount = payload.repeatCount || 1;
    const giftImgHtml = payload.giftImage
      ? `<img class="alert-gift-img" src="${escapeHtml(payload.giftImage)}" onerror="this.style.display='none'" alt="${giftName}" />`
      : '';

    alertEl.innerHTML = `
      ${avatarHtml}
      <div class="alert-content">
        <div class="alert-top-row">
          <span class="alert-name">${name}</span>
          <span class="alert-badge alert-badge-gift">🎁 GIFT</span>
        </div>
        <span class="alert-subtext">mengirim <span class="highlight-gold">${giftName}</span> <span class="combo-badge">x${repeatCount}</span></span>
      </div>
      ${giftImgHtml}
    `;
  } else if (category === 'join') {
    alertEl.innerHTML = `
      ${avatarHtml}
      <div class="alert-content">
        <div class="alert-top-row">
          <span class="alert-name">${name}</span>
          <span class="alert-badge alert-badge-join">👋 BERGABUNG</span>
        </div>
        <span class="alert-subtext">Selamat datang di live streaming!</span>
      </div>
    `;
  } else if (category === 'follow') {
    alertEl.innerHTML = `
      ${avatarHtml}
      <div class="alert-content">
        <div class="alert-top-row">
          <span class="alert-name">${name}</span>
          <span class="alert-badge alert-badge-follow">➕ FOLLOWER BARU</span>
        </div>
        <span class="alert-subtext">Mulai mengikuti live streaming!</span>
      </div>
    `;
  } else if (category === 'share') {
    alertEl.innerHTML = `
      ${avatarHtml}
      <div class="alert-content">
        <div class="alert-top-row">
          <span class="alert-name">${name}</span>
          <span class="alert-badge alert-badge-share">🔁 SHARE LIVE</span>
        </div>
        <span class="alert-subtext">Membagikan live streaming!</span>
      </div>
    `;
  }

  alertContainer.appendChild(alertEl);

  // Auto-remove with smooth slide-up
  const displayDuration = category === 'gift' ? 3800 : 3200;
  setTimeout(() => {
    alertEl.classList.add('out');
    setTimeout(() => {
      alertEl.remove();
      alertShowing = false;
      processAlertQueue();
    }, 320);
  }, displayDuration);
}

function handleChatJoin(payload) {
  if (!latestChat) return;
  const line = document.createElement('div');
  line.className = 'chat-line chat-event-join';
  const name = escapeHtml(payload.nickname || payload.uniqueId || 'Penonton');
  line.innerHTML = `<span style="color:#FFD700;">👋 ${name}</span> <span style="color:#888; font-size:11px;">bergabung</span>`;
  latestChat.appendChild(line);
  while (latestChat.children.length > 6) latestChat.removeChild(latestChat.firstChild);
  setTimeout(() => line.remove(), 12000);
}

function handleChatFollow(payload) {
  if (!latestChat) return;
  const line = document.createElement('div');
  line.className = 'chat-line chat-event-follow';
  const name = escapeHtml(payload.nickname || payload.uniqueId || 'Penonton');
  line.innerHTML = `<span style="color:#22D3EE;">➕ ${name}</span> <span style="color:#888; font-size:11px;">mulai mengikuti</span>`;
  latestChat.appendChild(line);
  while (latestChat.children.length > 6) latestChat.removeChild(latestChat.firstChild);
  setTimeout(() => line.remove(), 12000);
}

function handleChatShare(payload) {
  if (!latestChat) return;
  const line = document.createElement('div');
  line.className = 'chat-line chat-event-share';
  const name = escapeHtml(payload.nickname || payload.uniqueId || 'Penonton');
  line.innerHTML = `<span style="color:#E879F9;">🔁 ${name}</span> <span style="color:#888; font-size:11px;">membagikan live</span>`;
  latestChat.appendChild(line);
  while (latestChat.children.length > 6) latestChat.removeChild(latestChat.firstChild);
  setTimeout(() => line.remove(), 12000);
}

// ============================================================
// TOP GIFT TRACKING
// ============================================================
const topGifters = {};
const previousRanks = new Map();

function getOverlayGifterKey(payload) {
  if (payload.uniqueId && payload.uniqueId !== 'unknown') return payload.uniqueId;
  if (payload.nickname && payload.nickname !== 'unknown' && payload.nickname !== 'Penonton') {
    return payload.nickname.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  if (payload.userId) return String(payload.userId);
  return `user_${Date.now()}`;
}

function handleGiftForTop(payload) {
  if (!topGiftBoard || !topGiftList) return;
  const diamonds = Math.max(1, (Number(payload.diamondCost) || 1) * (Number(payload.repeatCount) || 1));
  const key = getOverlayGifterKey(payload);

  if (topGifters['unknown']) {
    const stale = topGifters['unknown'];
    const cleanKey = (stale.nickname && stale.nickname !== 'unknown') ? stale.nickname.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : null;
    if (cleanKey) topGifters[cleanKey] = { ...stale, uniqueId: cleanKey };
    delete topGifters['unknown'];
  }

  if (!topGifters[key]) {
    topGifters[key] = {
      nickname: (payload.nickname && payload.nickname !== 'unknown') ? payload.nickname : key,
      uniqueId: (payload.uniqueId && payload.uniqueId !== 'unknown') ? payload.uniqueId : ((payload.nickname && payload.nickname !== 'unknown') ? payload.nickname : key),
      avatar: payload.avatar || null,
      diamonds: 0,
      topGift: null
    };
  }
  if (payload.nickname && payload.nickname !== 'unknown') topGifters[key].nickname = payload.nickname;
  if (payload.uniqueId && payload.uniqueId !== 'unknown') topGifters[key].uniqueId = payload.uniqueId;
  if (payload.avatar) topGifters[key].avatar = payload.avatar;
  topGifters[key].diamonds += diamonds;
  if (payload.giftName) {
    topGifters[key].topGift = {
      name: payload.giftName,
      image: payload.giftImage || ''
    };
  }
  renderTopGifters();
}

function renderTopGifters() {
  if (!topGiftList) return;
  const sorted = Object.values(topGifters)
    .sort((a, b) => (Number(b.diamonds) || 0) - (Number(a.diamonds) || 0))
    .slice(0, 10);

  const itemsHtml = [];

  for (let idx = 0; idx < 10; idx++) {
    const currentRank = idx + 1;
    const g = sorted[idx];

    let medal = '';
    if (topGiftSettings.showTrophy) {
      if (currentRank === 1) medal = '🥇';
      else if (currentRank === 2) medal = '🥈';
      else if (currentRank === 3) medal = '🥉';
      else medal = `🏆 ${currentRank}.`;
    } else {
      medal = `${currentRank}.`;
    }

    const crownHtml = (topGiftSettings.showCrown && currentRank === 1)
      ? '<span class="crown-icon" title="Juara 1">👑</span>'
      : '';

    const coinIconHtml = topGiftSettings.showCoin
      ? '<img src="/images/tiktok-coin.png" class="coin-icon-sm" alt="Coin" onerror="this.style.display=\'none\'" />'
      : '';

    const rankStyle = topGiftSettings.showRank ? '' : 'display:none;';

    if (g && (Number(g.diamonds) || 0) > 0) {
      const uid = g.uniqueId || g.nickname || `user_${idx}`;
      const prevRank = previousRanks.get(uid);
      const didOvertake = prevRank !== undefined && currentRank < prevRank;
      previousRanks.set(uid, currentRank);

      const avatarEl = g.avatar
        ? `<img class="overlay-avatar" src="${escapeHtml(g.avatar)}" onerror="this.outerHTML='<div class=\\'overlay-avatar-placeholder\\'>👤</div>';" />`
        : `<div class="overlay-avatar-placeholder">👤</div>`;
      const avatarHtml = `<div class="avatar-wrap">${crownHtml}${avatarEl}</div>`;

      const rawName = g.nickname && g.nickname !== 'unknown' ? g.nickname : (g.uniqueId || 'User');
      const cleanName = String(rawName).replace(/^@/, '');
      const nameDisplay = escapeHtml(cleanName);
      const overtakeClass = didOvertake ? ' overtake-pulse' : '';
      const overtakeBadge = didOvertake ? '<span class="overtake-arrow" title="Menyalip!">▲</span>' : '';

      itemsHtml.push(`<li class="rank-${currentRank}${overtakeClass}">
        <span class="rank" style="min-width:26px; font-weight:700; ${rankStyle}">${medal}${overtakeBadge}</span>
        ${avatarHtml}
        <div class="user-meta">
          <span class="nickname">${nameDisplay}</span>
          <span class="diamonds">${coinIconHtml}${Number(g.diamonds || 0).toLocaleString()}</span>
        </div>
      </li>`);
    } else {
      const avatarHtml = `<div class="avatar-wrap">${crownHtml}<div class="overlay-avatar-placeholder" style="opacity:0.4;">👤</div></div>`;
      itemsHtml.push(`<li class="rank-${currentRank} empty-slot">
        <span class="rank" style="min-width:26px; font-weight:700; opacity:0.6; ${rankStyle}">${medal}</span>
        ${avatarHtml}
        <div class="user-meta">
          <span class="nickname">-</span>
          <span class="diamonds" style="opacity:0.4;">${coinIconHtml}0</span>
        </div>
      </li>`);
    }
  }

  topGiftList.innerHTML = itemsHtml.join('');
}

// ============================================================
// TOP LIKES TRACKING & FLOATING HEARTS
// ============================================================
const topLikers = {};
const previousLikeRanks = new Map();

function spawnTapTapHeart(count = 1) {
  let container = document.getElementById('tapTapFloatingContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'tapTapFloatingContainer';
    container.className = 'taptap-floating-container';
    document.body.appendChild(container);
  }
  const heartPool = ['❤️', '💖', '💗', '💓', '💕', '🔥', '✨'];
  const spawnCount = Math.min(Math.max(1, count), 8);
  for (let i = 0; i < spawnCount; i++) {
    const el = document.createElement('div');
    el.className = 'taptap-floating-heart';
    el.textContent = heartPool[Math.floor(Math.random() * heartPool.length)];
    const startX = 15 + Math.random() * 70;
    el.style.left = `${startX}%`;
    el.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
    el.style.animationDelay = `${i * 0.07}s`;
    container.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch (_) {} }, 2500);
  }
}

function handleLikeForTop(payload) {
  if (!topLikeBoard || !topLikeList) return;
  const count = Math.max(1, Number(payload.likeCount ?? payload.count ?? 1));
  const key = getOverlayGifterKey(payload);

  if (!topLikers[key]) {
    topLikers[key] = {
      nickname: (payload.nickname && payload.nickname !== 'unknown') ? payload.nickname : key,
      uniqueId: (payload.uniqueId && payload.uniqueId !== 'unknown') ? payload.uniqueId : ((payload.nickname && payload.nickname !== 'unknown') ? payload.nickname : key),
      avatar: payload.avatar || null,
      likes: 0
    };
  }
  if (payload.nickname && payload.nickname !== 'unknown') topLikers[key].nickname = payload.nickname;
  if (payload.uniqueId && payload.uniqueId !== 'unknown') topLikers[key].uniqueId = payload.uniqueId;
  if (payload.avatar) topLikers[key].avatar = payload.avatar;
  topLikers[key].likes = (topLikers[key].likes || 0) + count;

  renderTopLikers();
}

function renderTopLikers() {
  if (!topLikeList) return;
  const sorted = Object.values(topLikers)
    .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
    .slice(0, 10);

  const itemsHtml = [];

  for (let idx = 0; idx < 10; idx++) {
    const currentRank = idx + 1;
    const g = sorted[idx];

    let medal = '';
    if (topLikeSettings.showTrophy) {
      if (currentRank === 1) medal = '🥇';
      else if (currentRank === 2) medal = '🥈';
      else if (currentRank === 3) medal = '🥉';
      else medal = `🏆 ${currentRank}.`;
    } else {
      medal = `${currentRank}.`;
    }

    const crownHtml = (topLikeSettings.showCrown && currentRank === 1)
      ? '<span class="crown-icon" title="Juara 1">👑</span>'
      : '';

    const heartAnimClass = topLikeSettings.heartAnim ? ' heart-pulse' : '';
    const heartIconHtml = topLikeSettings.showHeart
      ? `<span class="heart-icon-sm${heartAnimClass}">❤️</span>`
      : '';

    const rankStyle = topLikeSettings.showRank ? '' : 'display:none;';

    if (g && (Number(g.likes) || 0) > 0) {
      const uid = g.uniqueId || g.nickname || `user_${idx}`;
      const prevRank = previousLikeRanks.get(uid);
      const didOvertake = prevRank !== undefined && currentRank < prevRank;
      previousLikeRanks.set(uid, currentRank);

      const avatarEl = g.avatar
        ? `<img class="overlay-avatar" src="${escapeHtml(g.avatar)}" onerror="this.outerHTML='<div class=\\'overlay-avatar-placeholder\\'>👤</div>';" />`
        : `<div class="overlay-avatar-placeholder">👤</div>`;
      const avatarHtml = `<div class="avatar-wrap">${crownHtml}${avatarEl}</div>`;

      const rawName = g.nickname && g.nickname !== 'unknown' ? g.nickname : (g.uniqueId || 'User');
      const cleanName = String(rawName).replace(/^@/, '');
      const nameDisplay = escapeHtml(cleanName);
      const overtakeClass = didOvertake ? ' overtake-pulse' : '';
      const overtakeBadge = didOvertake ? '<span class="overtake-arrow" title="Menyalip!">▲</span>' : '';

      itemsHtml.push(`<li class="rank-${currentRank}${overtakeClass}">
        <span class="rank" style="min-width:26px; font-weight:700; ${rankStyle}">${medal}${overtakeBadge}</span>
        ${avatarHtml}
        <div class="user-meta">
          <span class="nickname">${nameDisplay}</span>
          <span class="like-val">${heartIconHtml}${Number(g.likes || 0).toLocaleString()}</span>
        </div>
      </li>`);
    } else {
      const avatarHtml = `<div class="avatar-wrap">${crownHtml}<div class="overlay-avatar-placeholder" style="opacity:0.4;">👤</div></div>`;
      itemsHtml.push(`<li class="rank-${currentRank} empty-slot">
        <span class="rank" style="min-width:26px; font-weight:700; opacity:0.6; ${rankStyle}">${medal}</span>
        ${avatarHtml}
        <div class="user-meta">
          <span class="nickname">-</span>
          <span class="like-val" style="opacity:0.4;">${heartIconHtml}0</span>
        </div>
      </li>`);
    }
  }

  topLikeList.innerHTML = itemsHtml.join('');
}

// ============================================================
// CHAT
// ============================================================
function handleChat(payload) {
  if (!latestChat) return;
  const line = document.createElement('div');
  line.className = 'chat-line';
  line.innerHTML = `<span class="name">${escapeHtml(payload.nickname || payload.uniqueId)}</span>${escapeHtml(payload.comment)}`;
  latestChat.appendChild(line);
  while (latestChat.children.length > 6) latestChat.removeChild(latestChat.firstChild);
  setTimeout(() => line.remove(), 15000);
}

// ============================================================
// MEDIA OVERLAY
// ============================================================
const DEFAULT_IMAGE_DURATION_MS = 5000;
const mediaQueue = [];
let mediaShowing = false;
let mediaTimer = null;

function handleMedia(payload) {
  if (!mediaOverlay) return;
  if (mediaQueue.length > 15) mediaQueue.shift();
  mediaQueue.push(payload);
  processMediaQueue();
}

function processMediaQueue() {
  if (!mediaOverlay || mediaShowing || mediaQueue.length === 0) return;
  mediaShowing = true;
  const item = mediaQueue.shift();

  const rawUrl = item.url || '';
  const url = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
    ? rawUrl
    : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

  const { mediaType, durationMs } = item;

  const finish = () => {
    if (mediaTimer) { clearTimeout(mediaTimer); mediaTimer = null; }
    if (mediaOverlay) mediaOverlay.classList.remove('show');
    if (mediaVideo) {
      mediaVideo.classList.remove('active');
      mediaVideo.onended = null;
      mediaVideo.onerror = null;
      try { mediaVideo.pause(); } catch { }
      mediaVideo.removeAttribute('src');
      mediaVideo.load();
    }
    if (mediaImage) {
      mediaImage.classList.remove('active');
      mediaImage.onload = null;
      mediaImage.onerror = null;
      mediaImage.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    }
    setTimeout(() => {
      mediaShowing = false;
      processMediaQueue();
    }, 300);
  };

  if (mediaType === 'video' && mediaVideo && isVideo) {
    if (mediaImage) {
      mediaImage.classList.remove('active');
      mediaImage.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    }
    mediaVideo.classList.add('active');
    mediaVideo.muted = false;
    mediaVideo.onloadeddata = () => { };
    mediaVideo.onerror = () => finish();
    mediaVideo.onended = finish;
    mediaVideo.src = url;
    mediaVideo.currentTime = 0;
    mediaOverlay.classList.add('show');

    const safeDuration = durationMs > 0 ? durationMs : 60000;
    mediaTimer = setTimeout(finish, safeDuration);

    const playPromise = mediaVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        mediaVideo.muted = true;
        mediaVideo.play().catch(() => finish());
      });
    }
  } else if (mediaImage && isImage) {
    if (mediaVideo) {
      mediaVideo.classList.remove('active');
      try { mediaVideo.pause(); } catch { }
      mediaVideo.removeAttribute('src');
      mediaVideo.load();
    }
    mediaImage.onload = () => { };
    mediaImage.onerror = () => finish();
    mediaImage.classList.add('active');
    mediaImage.src = url;
    mediaOverlay.classList.add('show');

    const duration = durationMs > 0 ? durationMs : DEFAULT_IMAGE_DURATION_MS;
    mediaTimer = setTimeout(finish, duration);
  } else {
    finish();
  }
}

// ============================================================
// HELPERS
// ============================================================
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}