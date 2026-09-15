// ============================================================
// NUREARN — YOUTUBE MUSIC OVERLAY SCRIPT
// Premium Gold & Black Theme
// ============================================================

console.log('[YouTube Overlay] Script loaded');

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}`;

// DOM Elements
const overlay = document.getElementById('ytOverlay');
const nowPlaying = document.getElementById('ytNowPlaying');
const thumb = document.getElementById('ytThumb');
const thumbPlaceholder = document.getElementById('ytThumbPlaceholder');
const title = document.getElementById('ytTitle');
const channel = document.getElementById('ytChannel');
const requester = document.getElementById('ytRequester');
const queueList = document.getElementById('ytQueueList');

// State
let currentSong = null;
let upcomingQueue = [];
let ws;
let hideTimeout;

// ============================================================
// PARSE SIZE MODE FROM URL
// ============================================================
const urlParams = new URLSearchParams(window.location.search);
const sizeMode = urlParams.get('size') || 'normal';
if (overlay) overlay.dataset.size = sizeMode;

// ============================================================
// HELPERS
// ============================================================
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// WEBSOCKET CONNECTION
// ============================================================
function connect() {
  console.log('[YouTube Overlay] Connecting WebSocket...');
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[YouTube Overlay] ✅ Connected');
    try {
      ws.send(JSON.stringify({ type: 'youtube:request-state' }));
    } catch (_) { }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const { type, payload } = data;

      if (type === 'youtube:play') {
        showSong(payload);
        renderQueue();
      } else if (type === 'youtube:stop') {
        hideWidget();
      } else if (type === 'youtube:queue') {
        upcomingQueue = (payload || []).filter(q => q.status !== 'playing').slice(0, 3);
        renderQueue();
      } else if (type === 'overlay:css') {
        const targetType = payload?.type || 'all';
        if (targetType === 'youtube' || targetType === 'all') {
          let styleEl = document.getElementById('customYoutubeCss');
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'customYoutubeCss';
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = payload.css || '';
        }
      }
    } catch (err) {
      console.error('[YouTube Overlay] Parse error:', err);
    }
  };

  ws.onclose = () => {
    console.log('[YouTube Overlay] ❌ Closed. Reconnecting...');
    setTimeout(connect, 3000);
  };

  ws.onerror = (err) => {
    console.error('[YouTube Overlay] ⚠️ Error:', err);
  };
}

// ============================================================
// SHOW SONG (NOW PLAYING)
// ============================================================
function showSong(song) {
  if (!song) return;
  currentSong = song;

  if (song.thumbnail && thumb) {
    thumb.src = song.thumbnail;
    thumb.style.display = 'block';
    if (thumbPlaceholder) thumbPlaceholder.style.display = 'none';
  } else {
    if (thumb) thumb.style.display = 'none';
    if (thumbPlaceholder) thumbPlaceholder.style.display = 'flex';
  }

  if (title) title.textContent = song.title || 'Unknown Title';
  if (channel) channel.textContent = song.channel || 'YouTube Music';
  if (requester) {
    const reqName = song.requester || 'Auto';
    requester.textContent = `🎵 Req: @${reqName}`;
  }

  if (overlay) overlay.classList.add('visible');
}

// ============================================================
// HIDE WIDGET
// ============================================================
function hideWidget() {
  currentSong = null;
  if (overlay) overlay.classList.remove('visible');
}

// ============================================================
// RENDER QUEUE
// ============================================================
function renderQueue() {
  if (!queueList) return;

  if (!currentSong && upcomingQueue.length === 0) {
    queueList.innerHTML = `
      <div class="yt-empty-state">
        <svg viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        <span>Menunggu request lagu...</span>
      </div>
    `;
    return;
  }

  let html = '';

  upcomingQueue.forEach((song, idx) => {
    const thumbHTML = song.thumbnail
      ? `<img src="${esc(song.thumbnail)}" alt="" onerror="this.style.display='none'">`
      : `<svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#888;margin:10px;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;

    const title = esc(song.title || 'Unknown');
    const req = esc(song.requester || 'auto');

    html += `
      <div class="yt-queue-item">
        <div class="yt-queue-index">${idx + 1}</div>
        <div class="yt-queue-thumb">${thumbHTML}</div>
        <div class="yt-queue-info">
          <span class="yt-queue-title">${title}</span>
          <span class="yt-queue-requester">@${req}</span>
        </div>
      </div>
    `;
  });

  queueList.innerHTML = html;
}

// ============================================================
// INIT
// ============================================================
renderQueue();
connect();