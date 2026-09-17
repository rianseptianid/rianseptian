const { app, BrowserWindow, BrowserView, ipcMain, shell, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Enforce single instance lock to prevent disk cache / quota corruption (0x5 Access is Denied)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// Bring existing window to front if user opens a second instance
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});


// ============================================================
// PERFORMANCE & AUDIO OPTIMIZATIONS
// ============================================================
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,IntensiveWakeUpThrottling');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=384 --expose-gc');
app.commandLine.appendSwitch('disable-spell-checking');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('renderer-process-limit', '2');


const Logger = require('./src/logger');
const { ConfigManager } = require('./src/configManager');
const TiktokConnector = require('./src/tiktokConnector');
const TriggerEngine = require('./src/triggerEngine');
const OverlayServer = require('./src/overlayServer');
const GiftManager = require('./src/giftManager');
const { GoalManager } = require('./src/goalManager');
const YoutubeManager = require('./src/youtubeManager');
const TtsReader = require('./src/ttsReader');
const ttsEngine = require('./src/ttsEngine');
const licenseManager = require('./src/LicenseManager');
const UpdateChecker = require('./src/updater');
const TunnelManager = require('./src/tunnelManager');

// Baca versi dari package.json sekali saja di startup
const APP_VERSION = (() => {
  try { return require('./package.json').version || '1.3.0'; }
  catch (_) { return '1.3.0'; }
})();

let mainWindow = null;
let licenseWindow = null;
let logger, configManager, connector, triggerEngine, overlayServer, giftManager, goalManager, youtubeManager, ttsReader, tunnelManager;
let statsThrottleTimer = null;
let currentTikTokUsername = '';
let currentBroadcasterNickname = '';
let currentBroadcasterAvatar = null;
let nurearnLiveHeartbeatTimer = null;

// ── Guard: cegah connect() dobel sebelum disconnect selesai (Tugas 1) ──
let _isConnecting = false;

// Global hotkeys state via uiohook-napi
let uiohook = null;
let uiohookKeyMap = null;
let activeSoundboardHotkeys = [];
let uiohookStarted = false;

function initUiohook() {
  try {
    const uiohookPkg = require('uiohook-napi');
    uiohook = uiohookPkg.uIOhook || uiohookPkg;
    const UiohookKey = uiohookPkg.UiohookKey;
    if (UiohookKey) {
      uiohookKeyMap = {};
      for (const [k, code] of Object.entries(UiohookKey)) {
        uiohookKeyMap[code] = k;
      }
    }
  } catch (err) {
    if (logger) logger.warn(`[uiohook-napi] Not available: ${err.message}`);
  }
}

function registerSoundboardHotkeys(items = null, enabled = true) {
  if (!Array.isArray(items)) {
    items = (configManager && typeof configManager.getSoundboard === 'function')
      ? configManager.getSoundboard()
      : [];
  }
  activeSoundboardHotkeys = (items || []).filter(item => item && item.key);
  if (!enabled || activeSoundboardHotkeys.length === 0) {
    return;
  }

  if (!uiohook) {
    initUiohook();
  }

  if (uiohook && !uiohookStarted) {
    try {
      uiohook.on('keydown', (e) => {
        if (!uiohookKeyMap) return;
        const keyName = uiohookKeyMap[e.keycode];
        if (!keyName) return;

        const cleanEventKey = String(keyName).toLowerCase().replace(/^(digit|key)/i, '').trim();

        const match = activeSoundboardHotkeys.find(item => {
          if (!item.key) return false;
          const cleanItemKey = String(item.key).toLowerCase().replace(/^(digit|key)/i, '').trim();
          return cleanItemKey === cleanEventKey;
        });

        if (match) {
          send('soundboard:trigger', { id: match.id, key: match.key });

          if (match.mediaFile && overlayServer) {
            overlayServer.broadcast('event:soundboard-media', {
              id: match.id,
              name: match.name,
              url: `/api/media?path=${encodeURIComponent(match.mediaFile)}`,
              mediaType: match.mediaType || 'video',
              durationMs: (match.mediaDuration ? Number(match.mediaDuration) : 5) * 1000
            });
          }
        }
      });

      uiohook.start();
      uiohookStarted = true;
      if (logger) logger.info('[Soundboard] Global low-level hotkeys active via uiohook-napi');
    } catch (err) {
      if (logger) logger.warn(`[Soundboard] Gagal memulai uiohook: ${err.message}`);
    }
  }
}

// Throttle high-frequency stats broadcasts (up to 25 updates/sec)
function scheduleStatsBroadcast(immediate = false) {
  if (immediate) {
    if (statsThrottleTimer) {
      clearTimeout(statsThrottleTimer);
      statsThrottleTimer = null;
    }
    if (configManager) {
      const stats = configManager.get()?.stats;
      if (stats) {
        send('stats:update', stats);
        if (overlayServer) overlayServer.broadcast('event:stats', stats);
      }
    }
    return;
  }
  if (statsThrottleTimer) return;
  statsThrottleTimer = setTimeout(() => {
    statsThrottleTimer = null;
    if (configManager) {
      const stats = configManager.get()?.stats;
      if (stats) {
        send('stats:update', stats);
        if (overlayServer) overlayServer.broadcast('event:stats', stats);
      }
    }
  }, 40);
}

// ============================================================
// YOUTUBE MUSIC — BROWSER WINDOW ENGINE
// ============================================================
let ytWindow = null;
let ytWindowVisible = false;
let ytProgressTimer = null;
let isPollingYt = false;
let isNavigatingYt = false;
let currentExpectedVideoId = null;

// Anti false-positive ended confirmation
let __endedConfirmCount = 0;
let __lastEndedVideoId = null;

// Anti-spam playNext (di main side)
let __mainPlayNextGuard = false;

// ── Referensi tunggal polling interval (Tugas 4) ──
// Dipakai HANYA lewat startWatchPlayerPolling() / stopWatchPlayerPolling().
// Tidak boleh ada clearInterval/setInterval ytProgressTimer di luar kedua fungsi ini.
let _watchPollingInterval = null;

function stopWatchPlayerPolling() {
  // Bersihkan SEMUA kemungkinan referensi interval agar tidak ada ghost interval
  if (_watchPollingInterval) {
    clearInterval(_watchPollingInterval);
    _watchPollingInterval = null;
  }
  if (ytProgressTimer && ytProgressTimer !== _watchPollingInterval) {
    clearInterval(ytProgressTimer);
  }
  ytProgressTimer = null;
  isPollingYt = false;
  __endedConfirmCount = 0;
  __lastEndedVideoId = null;
}

function getOrCreateYtWindow() {
  if (ytWindow && !ytWindow.isDestroyed()) return ytWindow;

  ytWindow = new BrowserWindow({
    width: 720,
    height: 450,
    show: false,
    skipTaskbar: false,
    title: '🎵 YouTube Player — Nurearn',
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:ytplayer',
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  ytWindow.webContents.setMaxListeners(0);

  // ============================================================
  // AD-SKIPPER (SAFE FOR MSE) + INJECTED CLEANER
  // ============================================================
  ytWindow.webContents.on('dom-ready', () => {
    ytWindow.webContents.executeJavaScript(`
      (() => {
        try {
          const s = document.createElement('style');
          s.id = 'nurearn-yt-cleaner';
          s.textContent = \`
            #comments, #chat, #ticker, ytd-merch-shelf-renderer { display: none !important; }
            .ytp-autonav-endscreen-countdown-overlay { display: none !important; }
            .ytp-popup { z-index: 100000 !important; }
          \`;
          if (!document.getElementById('nurearn-yt-cleaner')) {
            document.head.appendChild(s);
          }
        } catch (_) {}

        if (window.__adSkipperInstalled) return;
        window.__adSkipperInstalled = true;

        // State untuk skip iklan yang aman (tidak seek ke akhir)
        let __lastAdState = false;
        let __adEndGraceUntil = 0;

        setInterval(() => {
          const v = document.querySelector('video');
          const p = document.getElementById('movie_player');
          if (!v || !p) return;

          // Deteksi ad dengan validasi ketat
          const adClasses = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
          const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button');
          const adBadge = document.querySelector('.ytp-ad-badge, .ytp-ad-simple-ad-badge, .ytp-ad-preview-container');
          let isAd = !!(adClasses && (skipBtn || adBadge));

          // Grace period 2 detik setelah ad berakhir → jangan ganggu video utama
          if (isAd && Date.now() < __adEndGraceUntil) {
            isAd = false;
          }

          // Deteksi transisi ad → konten
          if (__lastAdState && !isAd) {
            __adEndGraceUntil = Date.now() + 2000;
            try {
              if (v.muted && !window.__userMuted) v.muted = false;
              if (v.playbackRate > 1.0) v.playbackRate = 1.0;
            } catch (_) {}
          }
          __lastAdState = isAd;

          if (isAd) {
            // ── AD MODE: mute + speed 16x, JANGAN seek (MSE stall) ──
            try {
              if (!v.muted) v.muted = true;
              if (v.playbackRate < 16.0) v.playbackRate = 16.0;
            } catch (_) {}

            if (skipBtn) {
              try { skipBtn.click(); } catch (_) {}
            }
            return;
          }

          // ── NON-AD MODE: normalisasi state ──
          try {
            if (v.muted && !window.__userMuted) v.muted = false;
            if (v.playbackRate > 1.0) v.playbackRate = 1.0;
          } catch (_) {}

          // Auto-resume kalau stuck paused (hormati user pause)
          if (v.paused && !window.__userPaused && !v.ended) {
            try {
              const state = typeof p.getPlayerState === 'function' ? p.getPlayerState() : -1;
              if (state === 2 || state === -1 || state === 5) {
                if (typeof p.playVideo === 'function') p.playVideo();
              }
            } catch (_) {}
          }
        }, 400);
      })()
    `).catch(() => { });
  });

  // Intercept close: hide instead of destroy
  ytWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      ytWindow.hide();
      ytWindowVisible = false;
      send('youtube:playerVisibility', false);
    }
  });

  ytWindow.on('show', () => {
    ytWindowVisible = true;
    send('youtube:playerVisibility', true);
  });

  ytWindow.on('hide', () => {
    ytWindowVisible = false;
    send('youtube:playerVisibility', false);
  });

  // Block non-YouTube navigations
  ytWindow.webContents.on('will-navigate', (e, targetUrl) => {
    try {
      if (targetUrl.startsWith('about:blank')) return;
      const u = new URL(targetUrl);
      if (u.hostname.includes('youtube.com') || u.hostname.includes('google.com') || u.hostname.includes('gstatic.com')) {
        return;
      }
    } catch (_) { }
    e.preventDefault();
    if (logger) logger.info(`[YT Player] Blocked non-YouTube navigation to: ${targetUrl}`);
  });

  // Sync when user navigates inside the YouTube browser player
  ytWindow.webContents.on('did-navigate-in-page', (e, url) => {
    try {
      const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        currentExpectedVideoId = match[1];
        ytWindow.webContents.executeJavaScript(`
          (() => {
            window.__userPaused = false;
            window.__expectedId = ${JSON.stringify(match[1])};
            const p = document.getElementById('movie_player');
            if (p && typeof p.playVideo === 'function') p.playVideo();
            const v = document.querySelector('video');
            if (v && v.paused) v.play().catch(() => {});
            return p && typeof p.getVideoData === 'function' ? p.getVideoData()?.title : document.title;
          })()
        `).then(title => {
          if (youtubeManager) {
            const newSong = { videoId: match[1], title: title || 'YouTube Video', channel: 'YouTube', requester: 'Host' };
            youtubeManager.currentSong = newSong;
            send('youtube:play', newSong);
            if (overlayServer) overlayServer.broadcast('youtube:play', newSong);
          }
        }).catch(() => { });
        startWatchPlayerPolling();
      }
    } catch (_) { }
  });

  ytWindow.webContents.on('did-finish-load', () => {
    if (!ytWindow || ytWindow.isDestroyed()) return;
    const curUrl = ytWindow.webContents.getURL() || '';
    if (!curUrl.includes('youtube.com/watch') || !currentExpectedVideoId) return;

    ytWindow.webContents.executeJavaScript(`
      (() => {
        window.__userPaused = false;
        window.__expectedId = ${JSON.stringify(currentExpectedVideoId)};
        // Disable autonav
        try {
          const p = document.getElementById('movie_player');
          if (p && typeof p.setAutonavState === 'function') p.setAutonavState(false);
          const autoNavBtn = document.querySelector('.ytp-autonav-toggle-button[aria-checked="true"]');
          if (autoNavBtn) autoNavBtn.click();
        } catch (_) {}

        // Initial play attempt (stops once playing)
        let attempts = 0;
        const starter = setInterval(() => {
          attempts++;
          if (window.__userPaused || attempts > 12) {
            clearInterval(starter);
            return;
          }
          try {
            const p = document.getElementById('movie_player');
            if (p) {
              const state = typeof p.getPlayerState === 'function' ? p.getPlayerState() : -1;
              if (state === 1) { clearInterval(starter); return; }
              if (state === 2 || state === -1 || state === 5) p.playVideo();
            }
          } catch (_) {}
          const v = document.querySelector('video');
          if (v && v.paused && !v.ended) v.play().catch(() => {});
        }, 500);
      })()
    `).catch(() => { });

    startWatchPlayerPolling();
  });

  if (logger) logger.info('[YT Player] BrowserWindow engine ready (persist:ytplayer session)');
  return ytWindow;
}

function startWatchPlayerPolling() {
  // ── Tugas 4: Wajib stop dulu, tidak boleh ada 2 interval jalan paralel ──
  stopWatchPlayerPolling();
  isPollingYt = false;

  _watchPollingInterval = setInterval(async () => {
    if (!ytWindow || ytWindow.isDestroyed()) { stopWatchPlayerPolling(); return; }
    if (!currentExpectedVideoId) { stopWatchPlayerPolling(); return; }
    if (ytWindow.webContents.isLoading()) return;
    if (isNavigatingYt) return;
    if (isPollingYt) return;

    isPollingYt = true;
    try {
      const stats = await ytWindow.webContents.executeJavaScript(`
        (() => {
          const v = document.querySelector('video');
          const p = document.getElementById('movie_player');
          if (!v || !p) return { ready: false };

          // Deteksi ad ketat: butuh adClasses + (skipBtn ATAU adBadge)
          const adClasses = document.querySelector('.ad-showing, .ad-interrupting, .ytp-ad-player-overlay');
          const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button');
          const adBadge = document.querySelector('.ytp-ad-badge, .ytp-ad-simple-ad-badge, .ytp-ad-preview-container');
          const isAd = !!(adClasses && (skipBtn || adBadge));

          let pState = -1, pDur = 0, pCur = 0, currentId = null;
          try { pState = typeof p.getPlayerState === 'function' ? p.getPlayerState() : -1; } catch (_) {}
          try { pDur = typeof p.getDuration === 'function' ? (p.getDuration() || 0) : 0; } catch (_) {}
          try { pCur = typeof p.getCurrentTime === 'function' ? (p.getCurrentTime() || 0) : 0; } catch (_) {}
          try {
            const vd = typeof p.getVideoData === 'function' ? p.getVideoData() : null;
            if (vd && vd.video_id) currentId = vd.video_id;
          } catch (_) {}

          let duration = pDur, time = pCur, paused = pState === 2;
          if (!duration || duration <= 0) {
            if (v && !isAd) {
              duration = v.duration || 0;
              time = v.currentTime || 0;
              paused = v.paused;
            }
          }

          const isCurrentVideo = (!currentId || !window.__expectedId || currentId === window.__expectedId);

          // Ended HANYA kalau semua kondisi terpenuhi
          const videoEnded = v && v.ended === true;
          const ended = !isAd
                     && isCurrentVideo
                     && pState === 0
                     && duration >= 10
                     && time >= duration - 1
                     && time >= 5
                     && videoEnded;

          return { ready: true, isAd, duration: Math.round(duration), time: Math.round(time), paused, ended, currentId };
        })()
      `);

      if (stats && stats.ready && currentExpectedVideoId) {
        if (!stats.isAd && (stats.duration > 0 || stats.time > 0)) {
          send('youtube:progress', { current: stats.time, total: stats.duration });
          send('youtube:state', { isPlaying: !stats.paused });
          if (overlayServer) {
            overlayServer.broadcast('youtube:progress', { current: stats.time, total: stats.duration });
          }
        }

        // Konfirmasi ended 2x berturut-turut
        if (stats.ended && stats.currentId === currentExpectedVideoId) {
          if (__lastEndedVideoId === stats.currentId) {
            __endedConfirmCount++;
          } else {
            __endedConfirmCount = 1;
            __lastEndedVideoId = stats.currentId;
          }

          if (__endedConfirmCount >= 2) {
            if (logger) logger.info(`[YT Player] ✓ Confirmed ended: ${stats.currentId}`);
            stopWatchPlayerPolling();
            currentExpectedVideoId = null;
            __endedConfirmCount = 0;
            __lastEndedVideoId = null;
            if (youtubeManager) {
              if (youtubeManager.queue && youtubeManager.queue.length > 0) {
                youtubeManager.playNext();
              } else {
                youtubeManager.stopCurrent();
              }
            }
          }
        } else {
          __endedConfirmCount = 0;
        }
      }
    } catch (_) { } finally {
      isPollingYt = false;
    }
  }, 1000);
  // Sinkronkan ytProgressTimer agar stopWatchPlayerPolling() lama juga bekerja
  ytProgressTimer = _watchPollingInterval;
}

async function playSongInWatchWindow(song) {
  if (!song || !song.videoId) return;

  stopWatchPlayerPolling();
  isNavigatingYt = true;
  currentExpectedVideoId = song.videoId;

  const win = getOrCreateYtWindow();
  if (!win) { isNavigatingYt = false; return; }

  // Set expected ID di window context untuk validasi polling
  try {
    await win.webContents.executeJavaScript(`window.__expectedId = ${JSON.stringify(song.videoId)}; window.__userPaused = false;`);
  } catch (_) { }

  if (logger) logger.info(`[YT Player] ▶ Playing: ${song.title} (${song.videoId})`);

  const targetUrl = `https://www.youtube.com/watch?v=${song.videoId}`;
  const curUrl = win.webContents.getURL() || '';

  // ── Case A: sudah di video yang sama → restart
  if (curUrl.includes(`v=${song.videoId}`) && !win.webContents.isLoading()) {
    try {
      await win.webContents.executeJavaScript(`
        (() => {
          window.__userPaused = false;
          const p = document.getElementById('movie_player');
          if (p && typeof p.seekTo === 'function') p.seekTo(0, true);
          if (p && typeof p.playVideo === 'function') p.playVideo();
          const v = document.querySelector('video');
          if (v) { v.currentTime = 0; v.play().catch(() => {}); }
        })()
      `);
    } catch (_) { }
    isNavigatingYt = false;
    startWatchPlayerPolling();
    return;
  }

  // ── Case B: sudah di YouTube → fast switch via loadVideoById
  if (curUrl.includes('youtube.com/watch') && !win.webContents.isLoading()) {
    try {
      const switched = await win.webContents.executeJavaScript(`
        (() => {
          try {
            const p = document.getElementById('movie_player');
            if (p && typeof p.loadVideoById === 'function') {
              window.__userPaused = false;
              window.__expectedId = ${JSON.stringify(song.videoId)};
              p.loadVideoById('${song.videoId}');
              p.playVideo();
              const v = document.querySelector('video');
              if (v && v.paused) v.play().catch(() => {});
              return true;
            }
          } catch (_) {}
          return false;
        })()
      `);
      if (switched) {
        if (logger) logger.info(`[YT Player] ⚡ Fast-switched via loadVideoById (${song.videoId})`);
        isNavigatingYt = false;
        startWatchPlayerPolling();
        return;
      }
    } catch (_) { }
  }

  // ── Case C: cold start / navigasi pertama
  try {
    win.webContents.loadURL(targetUrl).catch(err => {
      if (!err.message.includes('ERR_ABORTED') && !err.message.includes('-3')) {
        if (logger) logger.warn(`[YT Player] loadURL notice: ${err.message}`);
      }
    });
  } catch (_) { }

  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (!ytWindow || ytWindow.isDestroyed()) { isNavigatingYt = false; return; }
    if (currentExpectedVideoId !== song.videoId) { isNavigatingYt = false; return; }
    try {
      const ready = await win.webContents.executeJavaScript(`
        (() => {
          const v = document.querySelector('video');
          const p = document.getElementById('movie_player');
          if (v && p && typeof p.playVideo === 'function') {
            window.__userPaused = false;
            p.playVideo();
            if (v.paused) v.play().catch(() => {});
            return true;
          }
          return false;
        })()
      `);
      if (ready) break;
    } catch (_) { }
    await new Promise(r => setTimeout(r, 400));
  }

  isNavigatingYt = false;

  if (currentExpectedVideoId === song.videoId && ytWindow && !ytWindow.isDestroyed()) {
    try {
      await win.webContents.executeJavaScript(`
        (() => {
          window.__userPaused = false;
          const p = document.getElementById('movie_player');
          if (p && typeof p.playVideo === 'function') p.playVideo();
          const v = document.querySelector('video');
          if (v && v.paused) v.play().catch(() => {});
        })()
      `);
    } catch (_) { }
    startWatchPlayerPolling();
  }
}


function createWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1040,
    height: 680,
    minWidth: 760,
    minHeight: 500,
    autoHideMenuBar: true,
    title: 'Nurearn',
    show: false,
    icon: fs.existsSync(path.join(__dirname, 'assets', 'icon.png'))
      ? path.join(__dirname, 'assets', 'icon.png')
      : path.join(__dirname, 'renderer', 'images', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const fileSource = sourceId ? sourceId.split(/[\\/]/).pop() : 'inline';
    console.log(`[Renderer] ${message} (${fileSource}:${line})`);
    if (logger && typeof logger.info === 'function' && (message.includes('[Audio') || message.includes('[TriggerAudio]') || message.includes('error') || message.includes('Error'))) {
      logger.info(`[Renderer] ${message} (${fileSource}:${line})`);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('minimize', () => {
    if (global.gc) {
      try { global.gc(); } catch (_) { }
    }
    if (session && session.defaultSession) {
      try { session.defaultSession.clearCache(); } catch (_) { }
    }
  });

  // Periodic memory & cache cleanup when running long live sessions
  const memoryPurgeInterval = setInterval(() => {
    if (global.gc) {
      try { global.gc(); } catch (_) { }
    }
    if (session && session.defaultSession) {
      try { session.defaultSession.clearCache(); } catch (_) { }
    }
  }, 10 * 60 * 1000);

  mainWindow.on('closed', () => {
    clearInterval(memoryPurgeInterval);
    mainWindow = null;
    stopWatchPlayerPolling();
    ytWindow = null;
  });
}

function createLicenseWindow() {
  if (licenseWindow) return;

  licenseWindow = new BrowserWindow({
    width: 500,
    height: 600,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  licenseWindow.loadFile(path.join(__dirname, 'renderer', 'license.html'));
  licenseWindow.on('closed', () => {
    licenseWindow = null;
  });
}

ipcMain.on('license-verified', () => {
  if (licenseWindow) {
    licenseWindow.close();
    licenseWindow = null;
  }
  createWindow();
});

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

// Track ongoing gift streaks
const activeStreaks = new Map();

function syncGoalWithStat(type, newCurrent) {
  if (!goalManager) return;
  const goal = goalManager.getGoal(type);
  if (!goal) return;
  const target = Math.max(1, Number(goal.target) || 100);
  const prev = Number(goal.current) || 0;
  const curr = Math.max(0, Number(newCurrent) || 0);
  if (curr === prev) return;

  const targetAction = goal.targetAction || goal.onReached || 'increase';
  if (curr >= target && prev < target) {
    let nextTarget = target;
    if (targetAction === 'increase') {
      nextTarget = target * 2;
    }
    const updated = goalManager.updateGoal(type, { current: curr, target: nextTarget });
    send('goal:reached', { type, goal: updated });
    send('goal:update', { type, goal: updated });
    if (overlayServer) {
      overlayServer.broadcast('overlay:goal-reached', { type, goal: updated });
      overlayServer.broadcast('overlay:goal-update', { type, goal: updated });
    }
  } else {
    const updated = goalManager.updateGoal(type, { current: curr });
    send('goal:update', { type, goal: updated });
    if (overlayServer) {
      overlayServer.broadcast('overlay:goal-update', { type, goal: updated });
    }
  }
}

function updateStats(evt) {
  configManager.updateStats(stats => {
    if (evt.type === 'chat') {
      stats.totalComments = (stats.totalComments || 0) + 1;
    } else if (evt.type === 'gift') {
      const p = evt.payload || {};
      const giftId = p.giftId;
      const diamondPrice = giftManager ? giftManager.getDiamond(giftId, p.diamondCost) : (Number(p.diamondCost) || 0);
      const repeatCount = Math.max(1, Number(p.repeatCount || 1));
      const isStreak = Boolean(p.isStreak);
      const streakEnded = Boolean(p.streakEnded);

      let deltaCount = 0;
      if (isStreak) {
        const streakKey = `${p.uniqueId || 'unknown'}_${giftId}`;
        const lastCount = activeStreaks.get(streakKey) || 0;
        if (repeatCount > lastCount) {
          deltaCount = repeatCount - lastCount;
          activeStreaks.set(streakKey, repeatCount);
        } else if (repeatCount < lastCount) {
          deltaCount = repeatCount;
          activeStreaks.set(streakKey, repeatCount);
        }
        if (streakEnded) {
          activeStreaks.delete(streakKey);
        }
      } else {
        deltaCount = repeatCount;
      }

      if (deltaCount > 0) {
        const addedDiamonds = diamondPrice * deltaCount;
        stats.totalGifts = (stats.totalGifts || 0) + addedDiamonds;

        const key = p.uniqueId || 'unknown';
        if (!stats.gifters) stats.gifters = {};
        if (!stats.gifters[key]) {
          stats.gifters[key] = {
            nickname: p.nickname || key,
            uniqueId: p.uniqueId || key,
            avatar: p.avatar || null,
            diamonds: 0,
            count: 0,
            topGift: null
          };
        }
        if (p.nickname && p.nickname !== key) stats.gifters[key].nickname = p.nickname;
        if (p.uniqueId) stats.gifters[key].uniqueId = p.uniqueId;
        if (p.avatar) stats.gifters[key].avatar = p.avatar;
        stats.gifters[key].diamonds += addedDiamonds;
        stats.gifters[key].count += deltaCount;

        const currentTopVal = stats.gifters[key].topGift?.diamonds || 0;
        if (!stats.gifters[key].topGift || addedDiamonds >= currentTopVal) {
          stats.gifters[key].topGift = {
            id: giftId,
            name: p.giftName || `Gift ${giftId}`,
            image: p.giftImage || '',
            diamond: diamondPrice,
            count: deltaCount,
            diamonds: addedDiamonds
          };
        }

        if (!stats.giftStats) stats.giftStats = {};
        const gKey = String(giftId);
        if (!stats.giftStats[gKey]) {
          stats.giftStats[gKey] = {
            id: giftId,
            name: p.giftName || `Gift ${giftId}`,
            image: p.giftImage || '',
            diamond: diamondPrice,
            count: 0,
            diamonds: 0
          };
        }
        stats.giftStats[gKey].count += deltaCount;
        stats.giftStats[gKey].diamonds += addedDiamonds;
        if (p.giftImage && !stats.giftStats[gKey].image) {
          stats.giftStats[gKey].image = p.giftImage;
        }
      }
    } else if (evt.type === 'like') {
      const incomingTotal = Number(evt.payload?.totalLikeCount);
      if (incomingTotal && !isNaN(incomingTotal) && incomingTotal > (stats.totalLikes || 0)) {
        stats.totalLikes = incomingTotal;
      } else {
        const deltaLike = Math.max(1, Number(evt.payload?.likeCount) || 1);
        stats.totalLikes = (stats.totalLikes || 0) + deltaLike;
      }
    } else if (evt.type === 'follow') {
      stats.totalFollows = (stats.totalFollows || 0) + 1;
    } else if (evt.type === 'share') {
      stats.totalShares = (stats.totalShares || 0) + 1;
    } else if (evt.type === 'subscribe') {
      stats.totalSubscribers = (stats.totalSubscribers || 0) + 1;
    } else if (evt.type === 'roomUser') {
      const vCount = Number(evt.payload?.viewerCount);
      if (!isNaN(vCount) && vCount >= 0) {
        stats.totalViewers = vCount;
      }
    }
  });

  // Realtime synchronization from Dashboard stats into Goals
  if (goalManager) {
    const s = configManager.get()?.stats || {};
    if (evt.type === 'like' && typeof s.totalLikes === 'number') {
      syncGoalWithStat('likes', s.totalLikes);
    } else if (evt.type === 'gift' && typeof s.totalGifts === 'number') {
      syncGoalWithStat('coins', s.totalGifts);
    } else if (evt.type === 'follow' && typeof s.totalFollows === 'number') {
      syncGoalWithStat('followers', s.totalFollows);
    } else if (evt.type === 'share' && typeof s.totalShares === 'number') {
      syncGoalWithStat('shares', s.totalShares);
    } else if (evt.type === 'subscribe' && typeof s.totalSubscribers === 'number') {
      syncGoalWithStat('subscribers', s.totalSubscribers);
    } else if (evt.type === 'roomUser' && typeof s.totalViewers === 'number') {
      syncGoalWithStat('viewers', s.totalViewers);
    }
  }
}

async function bootstrap() {
  const userDataDir = app.getPath('userData');
  const logsDir = path.join(userDataDir, 'logs');
  const configPath = path.join(userDataDir, 'config.json');

  // Jika config.json belum ada di folder userData baru, periksa apakah ada instalasi sebelumnya
  if (!fs.existsSync(configPath)) {
    try {
      const appData = app.getPath('appData');
      const legacyCandidates = [
        path.join(appData, 'tiktok-live-toolkit', 'config.json'),
        path.join(appData, 'xumuid-studio', 'config.json')
      ];
      for (const leg of legacyCandidates) {
        if (fs.existsSync(leg)) {
          fs.mkdirSync(userDataDir, { recursive: true });
          fs.copyFileSync(leg, configPath);
          console.log(`[Config Migration] Berhasil memigrasikan data konfigurasi dari: ${leg}`);
          break;
        }
      }
    } catch (_) { }
  } else {
    // Jika configPath sudah ada tapi data interaksi & aktivitas kosong, pulihkan dari instalasi sebelumnya
    try {
      const currentCfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const hasNoInteractions = !Array.isArray(currentCfg.interactions) || currentCfg.interactions.length === 0;
      const hasNoActivities = !Array.isArray(currentCfg.activities) || currentCfg.activities.length === 0;
      if (hasNoInteractions && hasNoActivities) {
        const appData = app.getPath('appData');
        const legacyCandidates = [
          path.join(appData, 'tiktok-live-toolkit', 'config.json'),
          path.join(appData, 'xumuid-studio', 'config.json')
        ];
        for (const leg of legacyCandidates) {
          if (fs.existsSync(leg)) {
            const legCfg = JSON.parse(fs.readFileSync(leg, 'utf8'));
            let updated = false;
            if (Array.isArray(legCfg.interactions) && legCfg.interactions.length > 0) {
              currentCfg.interactions = legCfg.interactions;
              updated = true;
            }
            if (Array.isArray(legCfg.activities) && legCfg.activities.length > 0) {
              currentCfg.activities = legCfg.activities;
              updated = true;
            }
            if ((!Array.isArray(currentCfg.triggers) || currentCfg.triggers.length === 0) && Array.isArray(legCfg.triggers) && legCfg.triggers.length > 0) {
              currentCfg.triggers = legCfg.triggers;
              updated = true;
            }
            if ((!Array.isArray(currentCfg.presets) || currentCfg.presets.length === 0) && Array.isArray(legCfg.presets) && legCfg.presets.length > 0) {
              currentCfg.presets = legCfg.presets;
              updated = true;
            }
            if ((!currentCfg.tiktokUsername || currentCfg.tiktokUsername === 'xumuid') && legCfg.tiktokUsername && legCfg.tiktokUsername !== 'xumuid') {
              currentCfg.tiktokUsername = legCfg.tiktokUsername;
              updated = true;
            }
            if (updated) {
              fs.writeFileSync(configPath, JSON.stringify(currentCfg, null, 2), 'utf8');
              console.log(`[Config Migration] Berhasil memulihkan data interaksi & aktivitas dari: ${leg}`);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Config Migration] Gagal memulihkan konfigurasi:', e);
    }
  }

  logger = new Logger(logsDir);
  configManager = new ConfigManager(userDataDir, logger);
  giftManager = new GiftManager(__dirname, logger, userDataDir);
  connector = new TiktokConnector(logger);
  triggerEngine = new TriggerEngine(configManager, logger);

  goalManager = new GoalManager(configManager, triggerEngine, logger, null);
  overlayServer = new OverlayServer(logger, configManager, goalManager, triggerEngine);
  goalManager.overlayServer = overlayServer;

  // Initialize goals progress with saved dashboard stats
  try {
    const initStats = configManager.get()?.stats || {};
    if (initStats.totalLikes) goalManager.updateGoal('likes', { current: initStats.totalLikes });
    if (initStats.totalGifts) goalManager.updateGoal('coins', { current: initStats.totalGifts });
    if (initStats.totalFollows) goalManager.updateGoal('followers', { current: initStats.totalFollows });
    if (initStats.totalShares) goalManager.updateGoal('shares', { current: initStats.totalShares });
    if (initStats.totalSubscribers) goalManager.updateGoal('subscribers', { current: initStats.totalSubscribers });
    if (initStats.totalViewers) goalManager.updateGoal('viewers', { current: initStats.totalViewers });
  } catch (_) { }

  youtubeManager = new YoutubeManager(logger);
  overlayServer.setYoutubeManager(youtubeManager);

  tunnelManager = new TunnelManager(configManager?.get()?.overlayPort || 8642, logger);
  tunnelManager.on('status', status => send('tunnel:status', status));
  tunnelManager.start().catch(err => {
    if (logger) logger.warn(`[Tunnel] Auto-start failed: ${err.message}`);
  });

  ttsReader = new TtsReader(configManager, logger);
  ttsReader.on('speak', item => send('tts:speak', item));
  ttsReader.on('clear', () => send('tts:clear'));

  logger.on('log', entry => send('log:entry', entry));
  logger.on('cleared', () => send('log:cleared'));

  connector.on('status', status => send('tiktok:status', status));
  connector.on('event', evt => {
    if (evt.type === 'gift' && evt.payload) {
      const g = giftManager.getGift(evt.payload.giftId);
      const diamondPrice = giftManager.getDiamond(evt.payload.giftId, evt.payload.diamondCost);
      evt.payload.diamondCost = diamondPrice;
      if (g) {
        if (!evt.payload.giftName || evt.payload.giftName.startsWith('Gift ')) {
          evt.payload.giftName = g.name;
        }
        if (!evt.payload.giftImage && g.image) {
          evt.payload.giftImage = g.image;
        }
      }
    }

    // Process YouTube Music song request commands
    if (evt.type === 'chat' && evt.payload && youtubeManager) {
      try {
        if (youtubeManager) youtubeManager.handleChatCommand(evt.payload).catch(err => {
          logger?.error(`[YouTube] Chat command error: ${err.message}`);
        });
      } catch (err) {
        logger?.error(`[YouTube] Chat command error: ${err.message}`);
      }
    }

    if (ttsReader) {
      try {
        ttsReader.handleEvent(evt);
      } catch (err) {
        logger?.warn(`[TTS] Error handling event: ${err.message}`);
      }
    }

    send('tiktok:event', evt);
    updateStats(evt);
    scheduleStatsBroadcast();
    triggerEngine.handleEvent(evt);
    overlayServer.broadcast(`event:${evt.type}`, evt.payload, currentTikTokUsername);
  });

  triggerEngine.on('fired', data => send('trigger:fired', data));
  triggerEngine.on('sound', ({ file, volume }) => {
    const normVolume = typeof volume === 'number' ? (volume > 1 ? Math.min(1, Math.max(0, volume / 100)) : Math.max(0, volume)) : 1;
    if (logger) logger.info(`[Sound] Emitting sound playback: ${file} (volume: ${normVolume})`);
    let dataUrl = null;
    try {
      if (file && !file.startsWith('http://') && !file.startsWith('https://')) {
        let localPath = file.replace(/^file:\/\/\/?/i, '');
        try { localPath = decodeURIComponent(localPath); } catch (_) {}
        if (fs.existsSync(localPath)) {
          const stats = fs.statSync(localPath);
          if (stats.size < 25 * 1024 * 1024) { // file < 25MB dikonversi ke dataUrl agar anti-blokir
            const ext = path.extname(localPath).toLowerCase().replace('.', '') || 'mp3';
            const mime = ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
            const buf = fs.readFileSync(localPath);
            dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
          }
        }
      }
    } catch (err) {
      if (logger) logger.warn(`[Sound] Gagal encode dataUrl audio: ${err.message}`);
    }

    send('sound:play', { file, volume: normVolume, dataUrl });
    if (overlayServer) {
      overlayServer.broadcast('event:sound', { file, volume: normVolume });
      if (currentTikTokUsername) {
        overlayServer.broadcast('event:sound', { file, volume: normVolume }, currentTikTokUsername);
      }
    }
  });
  triggerEngine.on('key', data => send('trigger:key', data));
  triggerEngine.on('media', ({ file, mediaType, durationMs }) => {
    const payload = {
      url: `/api/media?path=${encodeURIComponent(file)}`,
      mediaType,
      durationMs
    };
    if (overlayServer) {
      overlayServer.broadcast('event:media', payload);
      if (currentTikTokUsername) {
        overlayServer.broadcast('event:media', payload, currentTikTokUsername);
      }
    }
    send('overlay:mediaPreview', { ...payload, file });
  });

  const onYtQueue = q => {
    send('youtube:queue', q);
    if (overlayServer) overlayServer.broadcast('youtube:queue', q);
  };
  const onYtPlay = song => {
    send('youtube:play', song);
    if (overlayServer) overlayServer.broadcast('youtube:play', song);
  };
  const onYtStop = () => {
    send('youtube:stop');
    if (overlayServer) overlayServer.broadcast('youtube:stop');
  };
  const onYtHistory = h => {
    send('youtube:history', h);
  };

  if (youtubeManager) {
    youtubeManager.on('queueUpdated', onYtQueue);
    youtubeManager.on('historyUpdated', onYtHistory);
    youtubeManager.on('playSong', (song) => {
      onYtPlay(song);
    });
    const handleStopPlayer = () => {
      onYtStop();
      currentExpectedVideoId = null;
      isNavigatingYt = false;
      stopWatchPlayerPolling();

      if (ytWindow && !ytWindow.isDestroyed()) {
        ytWindow.webContents.executeJavaScript(`
          (() => {
            window.__userPaused = true;
            window.__expectedId = null;
            try {
              const p = document.getElementById('movie_player');
              if (p && typeof p.pauseVideo === 'function') p.pauseVideo();
            } catch (_) {}
            const v = document.querySelector('video');
            if (v) { try { v.pause(); v.currentTime = 0; } catch (_) {} }
          })()
        `).catch(() => { });
      }
    };
    youtubeManager.on('stopSong', handleStopPlayer);
    youtubeManager.on('progress', p => send('youtube:progress', p));
    youtubeManager.on('notify', n => send('youtube:notify', n));
    youtubeManager.on('ended', () => {
      send('youtube:videoEnded');
      if (youtubeManager) {
        if (youtubeManager.queue && youtubeManager.queue.length > 0) {
          youtubeManager.playNext();
        } else {
          youtubeManager.stopCurrent();
        }
      }
    });
  }

  goalManager.on('goal:reached', data => send('goal:reached', data));

  try {
    const overlayPort = configManager.get()?.overlayPort || 8642;
    await overlayServer.start(overlayPort);
    if (youtubeManager) youtubeManager.setOverlayPort(overlayServer.port || overlayPort);
  } catch (err) {
    logger.error(`Could not start overlay server: ${err.message}`);
  }

  try {
    const sbItems = configManager.getSoundboard();
    if (sbItems && sbItems.length > 0) {
      registerSoundboardHotkeys(sbItems, true);
    }
  } catch (_) { }
}

/* ============================================================
   IPC HANDLERS
   ============================================================ */

// ── Auto-Update IPC Handlers ────────────────────────────────────────────────
// Buka halaman GitHub Release di browser default pengguna
ipcMain.handle('update:openRelease', (e, url) => {
  try {
    const target = url || 'https://github.com/nurearn/nurearn/releases/latest';
    shell.openExternal(target);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Kembalikan versi lokal app (renderer bisa pakai ini untuk display)
ipcMain.handle('update:getVersion', () => APP_VERSION);
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('config:get', () => configManager.get());

ipcMain.handle('config:update', (e, partial) => configManager.update(partial));
ipcMain.handle('config:addTrigger', (e, trigger) => configManager.addTrigger(trigger));
ipcMain.handle('config:updateTrigger', (e, { id, data }) => configManager.updateTrigger(id, data));
ipcMain.handle('config:removeTrigger', (e, id) => { configManager.removeTrigger(id); return true; });
ipcMain.handle('config:setTriggers', (e, triggers) => { configManager.setTriggers(triggers); return true; });

ipcMain.handle('config:addInteraction', (e, interaction) => configManager.addInteraction(interaction));
ipcMain.handle('config:updateInteraction', (e, { id, data }) => configManager.updateInteraction(id, data));
ipcMain.handle('config:removeInteraction', (e, id) => { configManager.removeInteraction(id); return true; });
ipcMain.handle('config:resetInteractions', () => configManager.resetInteractions?.() || true);

ipcMain.handle('config:addActivity', (e, activity) => {
  const cfg = configManager.get() || {};
  const current = cfg.activities || [];
  const isDup = current.some(a =>
    a && a.name === activity.name && a.event === activity.event &&
    JSON.stringify(a.interactionIds || []) === JSON.stringify(activity.interactionIds || [])
  );
  if (isDup) {
    if (logger) logger.warn(`[Activity] Duplicate addActivity request ignored for "${activity.name}"`);
    return current;
  }
  return configManager.addActivity(activity);
});
ipcMain.handle('config:updateActivity', (e, { id, data }) => configManager.updateActivity(id, data));
ipcMain.handle('config:removeActivity', (e, id) => { configManager.removeActivity(id); return true; });
ipcMain.handle('config:resetActivities', () => configManager.resetActivities?.() || true);
ipcMain.handle('config:resetAllTriggers', () => configManager.resetAllTriggers?.() || true);

ipcMain.handle('config:resetStats', () => {
  activeStreaks.clear();
  configManager.resetStats();
  const freshStats = configManager.get()?.stats;
  send('stats:update', freshStats);
  if (overlayServer) overlayServer.broadcast('event:stats', freshStats);

  // Sync goals reset
  if (goalManager) {
    ['likes', 'followers', 'shares', 'subscribers', 'coins', 'viewers'].forEach(t => {
      goalManager.updateGoal(t, { current: 0 });
    });
    const allGoals = goalManager.getAllGoals();
    send('goals:all', allGoals);
    if (overlayServer) overlayServer.broadcast('overlay:goals-all', allGoals);
  }
  return freshStats;
});

ipcMain.handle('config:resetPureDefault', () => {
  if (configManager.resetPureDefault) {
    return configManager.resetPureDefault();
  }
  return true;
});

ipcMain.handle('gift:getAll', () => giftManager ? giftManager.getAllGifts() : []);
ipcMain.handle('gift:add', (e, giftData) => {
  if (!giftManager) throw new Error('GiftManager belum siap.');
  return giftManager.addGift(giftData);
});
ipcMain.handle('gift:update', (e, { id, giftData }) => {
  if (!giftManager) throw new Error('GiftManager belum siap.');
  return giftManager.updateGift(id, giftData);
});
ipcMain.handle('gift:delete', (e, id) => {
  if (!giftManager) throw new Error('GiftManager belum siap.');
  return giftManager.deleteGift(id);
});

ipcMain.handle('tiktok:connect', async (e, username) => {
  // ── Tugas 1: Guard dobel-connect + bersihkan listener lama sebelum reconnect ──
  if (_isConnecting) {
    if (logger) logger.warn('[TikTok] connect() diabaikan — sudah dalam proses connecting');
    return { ok: false, error: 'Sedang dalam proses connect, tunggu sebentar.' };
  }
  _isConnecting = true;
  try {
    // Kalau connector masih punya koneksi aktif, bersihkan dulu
    // removeAllListeners() mencegah listener lama menumpuk di memory
    if (connector && typeof connector.removeAllListeners === 'function') {
      // Hapus listener 'event' dan 'status' dari connector LAMA sebelum reconnect
      // agar tidak ada duplicate handler yang terus tumbuh setiap reconnect
      connector.removeAllListeners('event');
      connector.removeAllListeners('status');
    }
    if (connector && typeof connector.disconnect === 'function') {
      try { await connector.disconnect(); } catch (_) { }
    }

    // Re-attach listener setelah cleanup (sebelum connect() dipanggil)
    connector.on('status', status => send('tiktok:status', status));
    connector.on('event', evt => {
      if (evt.type === 'gift' && evt.payload) {
        const g = giftManager.getGift(evt.payload.giftId);
        const diamondPrice = giftManager.getDiamond(evt.payload.giftId, evt.payload.diamondCost);
        evt.payload.diamondCost = diamondPrice;
        if (g) {
          if (!evt.payload.giftName || evt.payload.giftName.startsWith('Gift ')) evt.payload.giftName = g.name;
          if (!evt.payload.giftImage && g.image) evt.payload.giftImage = g.image;
        } else {
          try {
            const newGift = {
              id: evt.payload.giftId,
              name: evt.payload.giftName || `Gift ${evt.payload.giftId}`,
              price: diamondPrice,
              image: `images/gifts/${evt.payload.giftId}.png`
            };
            giftManager.addGift(newGift);
            evt.payload.giftImage = newGift.image;
          } catch (err) {
            logger?.error(`[Gift] Gagal auto-add gift ${evt.payload.giftId}: ${err.message}`);
          }
        }
      }
      if (evt.type === 'chat' && evt.payload && youtubeManager) {
        if (youtubeManager) {
          try {
            youtubeManager.handleChatCommand(evt.payload).catch(err => logger?.error(`[YouTube] Chat command error: ${err.message}`));
          } catch (err) {
            logger?.error(`[YouTube] Fatal chat handler error: ${err.message}`);
          }
        }
      }
      if (ttsReader) { try { ttsReader.handleEvent(evt); } catch (_) { } }
      send('tiktok:event', evt);
      updateStats(evt);
      scheduleStatsBroadcast();
      triggerEngine.handleEvent(evt);
      overlayServer.broadcast(`event:${evt.type}`, evt.payload, currentTikTokUsername);
    });

    const state = await connector.connect(username);
    currentTikTokUsername = String(username || '').toLowerCase().trim().replace(/^@/, '');
    if (overlayServer && typeof overlayServer.setCurrentUsername === 'function') {
      overlayServer.setCurrentUsername(currentTikTokUsername);
    }

    // Extract broadcaster real avatar & info from connector roomInfo
    currentBroadcasterAvatar = null;
    currentBroadcasterNickname = currentTikTokUsername;
    try {
      if (connector && connector.connector && connector.connector.roomInfo) {
        const owner = connector.connector.roomInfo.owner;
        if (owner) {
          currentBroadcasterNickname = owner.nickname || currentTikTokUsername;
          currentBroadcasterAvatar = owner.avatar_thumb?.url_list?.[0] || owner.avatar_large?.url_list?.[0] || owner.avatar_medium?.url_list?.[0] || null;
        }
      }
    } catch (_) { }

    if (nurearnLiveHeartbeatTimer) {
      clearInterval(nurearnLiveHeartbeatTimer);
      nurearnLiveHeartbeatTimer = null;
    }

    const pushNurearnHeartbeat = () => {
      if (!overlayServer || !currentTikTokUsername) return;
      if (!currentBroadcasterAvatar && connector && connector.connector && connector.connector.roomInfo) {
        const owner = connector.connector.roomInfo.owner;
        if (owner) {
          currentBroadcasterNickname = owner.nickname || currentTikTokUsername;
          currentBroadcasterAvatar = owner.avatar_thumb?.url_list?.[0] || owner.avatar_large?.url_list?.[0] || owner.avatar_medium?.url_list?.[0] || null;
        }
      }
      const stats = configManager ? configManager.get()?.stats : null;
      const streamerData = {
        username: currentTikTokUsername,
        nickname: currentBroadcasterNickname || currentTikTokUsername,
        avatar: currentBroadcasterAvatar,
        likes: stats?.totalLikeCount || stats?.likes || 0,
        viewers: stats?.viewerCount || 0,
        diamonds: stats?.totalGifts || stats?.diamonds || 0,
        version: APP_VERSION
      };
      overlayServer.registerLiveStreamer(streamerData);
      send('nurearn:liveUpdate', overlayServer.getLiveStreamers());

      // Sync presence to user's domain (overlay.nurearn.site)
      try {
        const https = require('https');
        const postData = JSON.stringify(streamerData);
        const req = https.request('https://overlay.nurearn.site/api/nurearn/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 3500
        }, () => {});
        req.on('error', () => {});
        req.write(postData);
        req.end();
      } catch (_) { }
    };

    pushNurearnHeartbeat();
    nurearnLiveHeartbeatTimer = setInterval(pushNurearnHeartbeat, 8000);

    return { ok: true, roomId: state.roomId };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    _isConnecting = false;
  }
});

ipcMain.handle('tiktok:disconnect', async () => {
  if (nurearnLiveHeartbeatTimer) {
    clearInterval(nurearnLiveHeartbeatTimer);
    nurearnLiveHeartbeatTimer = null;
  }
  if (overlayServer && currentTikTokUsername) {
    overlayServer.removeLiveStreamer(currentTikTokUsername);
    send('nurearn:liveUpdate', overlayServer.getLiveStreamers());

    // Notify user's domain
    try {
      const https = require('https');
      const postData = JSON.stringify({ username: currentTikTokUsername });
      const req = https.request('https://overlay.nurearn.site/api/nurearn/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 3000
      }, () => {});
      req.on('error', () => {});
      req.write(postData);
      req.end();
    } catch (_) { }
  }
  currentBroadcasterAvatar = null;
  currentBroadcasterNickname = '';

  // ── Tugas 1: Bersihkan listener connector saat disconnect ──
  try {
    await connector.disconnect();
  } catch (_) { }
  currentTikTokUsername = '';
  if (overlayServer && typeof overlayServer.setCurrentUsername === 'function') {
    overlayServer.setCurrentUsername('');
  }
  // Bersihkan ulang listener agar tidak menumpuk
  if (connector && typeof connector.removeAllListeners === 'function') {
    connector.removeAllListeners('event');
    connector.removeAllListeners('status');
  }
  return { ok: true };
});

ipcMain.handle('tiktok:status', () => ({
  state: connector.state,
  username: connector.username || currentTikTokUsername,
  nickname: currentBroadcasterNickname || connector.username || currentTikTokUsername,
  avatar: currentBroadcasterAvatar
}));

ipcMain.handle('nurearn:getLive', () => {
  const list = overlayServer ? overlayServer.getLiveStreamers() : [];
  return { ok: true, success: true, data: list, streamers: list };
});

ipcMain.handle('nurearn:getLiveStreamers', () => {
  const list = overlayServer ? overlayServer.getLiveStreamers() : [];
  return { ok: true, success: true, data: list, streamers: list };
});

ipcMain.handle('log:tail', (e, lines) => logger.tail(lines || 200));
ipcMain.handle('log:clear', () => logger.clearLogs());

ipcMain.handle('overlay:getUrl', (e, type, requestedUser) => {
  const port = overlayServer?.port || configManager?.get()?.overlayPort || 8642;
  const user = (requestedUser || currentTikTokUsername || '').toLowerCase().trim().replace(/^@/, '');
  const baseHost = (tunnelManager && tunnelManager.customDomain)
    ? tunnelManager.customDomain
    : ((tunnelManager && tunnelManager.active && tunnelManager.url)
      ? tunnelManager.url.replace(/\/+$/, '')
      : `http://localhost:${port}`);
  const base = user ? `${baseHost}/overlay/@${user}` : `${baseHost}/overlay`;
  return type ? `${base}/${type}` : base;
});

ipcMain.handle('overlay:openInBrowser', (e, url) => {
  try {
    const port = overlayServer?.port || configManager?.get()?.overlayPort || 8642;
    const baseHost = (tunnelManager && tunnelManager.customDomain)
      ? tunnelManager.customDomain
      : ((tunnelManager && tunnelManager.active && tunnelManager.url)
        ? tunnelManager.url.replace(/\/+$/, '')
        : `http://localhost:${port}`);
    let target = String(url || '').trim();
    if (!target) {
      target = `${baseHost}/overlay`;
    } else if (target.startsWith('/')) {
      target = `${baseHost}${target}`;
    } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `${baseHost}/overlay/${target}`;
    }
    shell.openExternal(target);
    return true;
  } catch (err) {
    if (logger) logger.warn(`[Overlay] Open in browser failed: ${err.message}`);
    return false;
  }
});

ipcMain.handle('overlay:getLocalIps', () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
});

ipcMain.handle('overlay:getCustomCss', (e, type) => configManager.getCustomCss?.(type) || '');
ipcMain.handle('overlay:setCustomCss', (e, { type, css }) => configManager.setCustomCss?.(type, css));

ipcMain.handle('overlay:getTopLikeSettings', () => configManager.getTopLikeSettings?.());
ipcMain.handle('overlay:setTopLikeSettings', (e, settings) => {
  const updated = configManager.setTopLikeSettings?.(settings);
  if (overlayServer) overlayServer.broadcast('overlay:taptap-settings', updated);
  return updated;
});

ipcMain.handle('overlay:getTopGiftSettings', () => configManager.getTopGiftSettings?.());
ipcMain.handle('overlay:setTopGiftSettings', (e, settings) => {
  const updated = configManager.setTopGiftSettings?.(settings);
  if (overlayServer) overlayServer.broadcast('overlay:topgift-settings', updated);
  return updated;
});

ipcMain.handle('tts:getSettings', () => ttsReader ? ttsReader.getSettings() : {});
ipcMain.handle('tts:updateSettings', (e, partial) => ttsReader ? ttsReader.updateSettings(partial) : {});
ipcMain.handle('tts:testSpeak', (e, { text, voice, rate, pitch, volume }) => {
  if (ttsReader) {
    ttsReader.enqueue(text || 'Halo! Ini adalah tes suara pembaca komentar TikTok LIVE.', {
      category: 'test'
    });
    return { ok: true };
  }
  return { ok: false };
});
ipcMain.handle('tts:finishCurrent', () => {
  if (ttsReader) ttsReader.finishCurrent();
  return true;
});
ipcMain.handle('tts:clearQueue', () => {
  if (ttsReader) ttsReader.clearQueue();
  return true;
});

ipcMain.handle('tts:getVoiceCatalog', () => {
  return ttsEngine.getVoiceCatalog();
});

ipcMain.handle('tts:getAudio', async (e, { text, voice = 'g-id', rate = 1.0, pitch = 1.0, engine = 'google' }) => {
  try {
    const cleanText = (text || '').slice(0, 500).trim();
    if (!cleanText) return { ok: false, error: 'Teks kosong' };
    const dataUrl = await ttsEngine.synthesizeDataUrl(cleanText, voice, rate, pitch, engine || 'google');
    return { ok: true, dataUrl };
  } catch (err) {
    if (logger) logger.warn(`[TTS] Gagal mensintesis audio TTS: ${err.message}`);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('system:installIndoTts', async () => {
  try {
    const scriptPath = path.join(__dirname, 'scripts', 'install_tts_indonesia.bat');
    if (!fs.existsSync(scriptPath)) {
      return { ok: false, error: 'Script installer tidak ditemukan: ' + scriptPath };
    }
    const { exec } = require('child_process');
    const cmd = `powershell -Command "Start-Process cmd -ArgumentList '/c \\"${scriptPath}\\"' -Verb RunAs"`;
    exec(cmd);
    return { ok: true, message: 'Installer Windows TTS diluncurkan dengan hak administrator.' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('preset:getAll', () => configManager.getPresets());
ipcMain.handle('preset:save', (e, { name, extra }) => configManager.savePreset(name, extra));
ipcMain.handle('preset:delete', (e, id) => configManager.deletePreset(id));
ipcMain.handle('preset:apply', (e, id) => configManager.applyPreset(id));
ipcMain.handle('preset:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Impor Konfigurasi v1.2.0 atau File Preset (.json)',
    filters: [{ name: 'JSON Config / Preset', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(raw);

    // Jika file berupa full config (v1.2.0 atau backup), terapkan langsung
    if (parsed.interactions || parsed.activities || parsed.triggers || parsed.soundboard || parsed.tiktokUsername || parsed.keyTrigger) {
      const current = configManager.get() || {};
      const updated = {
        ...current,
        ...parsed,
        interactions: Array.isArray(parsed.interactions) && parsed.interactions.length > 0 ? parsed.interactions : (current.interactions || []),
        activities: Array.isArray(parsed.activities) && parsed.activities.length > 0 ? parsed.activities : (current.activities || []),
        triggers: Array.isArray(parsed.triggers) && parsed.triggers.length > 0 ? parsed.triggers : (current.triggers || []),
        soundboard: Array.isArray(parsed.soundboard) && parsed.soundboard.length > 0 ? parsed.soundboard : (current.soundboard || []),
        presets: Array.isArray(parsed.presets) ? parsed.presets : (current.presets || []),
        stats: parsed.stats ? { ...current.stats, ...parsed.stats } : current.stats
      };
      configManager.update(updated);
      send('config:updated', updated);
      send('stats:update', updated.stats);
      return { ok: true, isFullConfig: true, imported: [updated] };
    }

    const imported = configManager.importPreset(parsed);
    return { ok: true, imported };
  } catch (err) {
    logger.error(`Import preset/config gagal: ${err.message}`);
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('preset:export', async (e, { defaultName, data }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export File Preset',
    defaultPath: defaultName || 'preset-tiktok-toolkit.json',
    filters: [{ name: 'JSON Preset', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, filePath: result.filePath };
  } catch (err) {
    logger.error(`Export preset gagal: ${err.message}`);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('dialog:pickSoundFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Pilih file suara',
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:pickMediaFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Pilih gambar atau video overlay',
    filters: [
      { name: 'Media (Video / Gambar)', extensions: ['mp4', 'webm', 'mov', 'png', 'jpg', 'jpeg', 'gif', 'webp'] },
      { name: 'Video', extensions: ['mp4', 'webm', 'mov'] },
      { name: 'Gambar & GIF', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:pickFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Pilih folder',
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('folder:listMedia', async (e, arg1, arg2) => {
  try {
    let folderPath = '';
    let type = 'sound';
    if (typeof arg1 === 'string') {
      folderPath = arg1;
      type = arg2 || 'sound';
    } else if (arg1 && typeof arg1 === 'object') {
      folderPath = arg1.folderPath || '';
      type = arg1.type || 'sound';
    }
    if (!folderPath || !fs.existsSync(folderPath)) return [];
    const files = fs.readdirSync(folderPath);
    const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const mediaExts = ['.mp4', '.webm', '.mov', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const exts = type === 'sound' ? audioExts : mediaExts;
    return files
      .filter(f => exts.includes(path.extname(f).toLowerCase()))
      .map(f => {
        const fullPath = path.join(folderPath, f);
        let size = 0;
        try { size = fs.statSync(fullPath).size; } catch (_) { }
        return {
          name: f,
          path: fullPath,
          size,
          ext: path.extname(f).toLowerCase()
        };
      });
  } catch (_) {
    return [];
  }
});

ipcMain.handle('folder:openExplorer', async (e, folderPath) => {
  try {
    if (folderPath && fs.existsSync(folderPath)) {
      await shell.openPath(folderPath);
      return true;
    }
  } catch (err) {
    if (logger) logger.warn(`[Folder] Gagal membuka explorer: ${err.message}`);
  }
  return false;
});

ipcMain.handle('folder:addFile', async (e, { targetFolder, type }) => {
  const exts = type === 'sound'
    ? [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }]
    : [{ name: 'Media', extensions: ['mp4', 'webm', 'png', 'jpg', 'gif'] }];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Pilih file untuk disalin ke folder',
    filters: exts,
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    const src = result.filePaths[0];
    const dest = path.join(targetFolder, path.basename(src));
    fs.copyFileSync(src, dest);
    return path.basename(dest);
  } catch (err) {
    logger.error(`Gagal menyalin file: ${err.message}`);
    return null;
  }
});

ipcMain.handle('trigger:test', async (e, id) => {
  try {
    await triggerEngine.testTrigger(id);
    return { ok: true };
  } catch (err) {
    logger.error(`Test trigger gagal: ${err.message}`);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('trigger:testInteraction', async (e, data) => {
  try {
    await triggerEngine.testInteraction(data);
    return { ok: true };
  } catch (err) {
    logger.error(`Test interaksi gagal: ${err.message}`);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('trigger:testActivity', async (e, id) => {
  try {
    await triggerEngine.testActivity(id);
    return { ok: true };
  } catch (err) {
    logger.error(`Test aktivitas gagal: ${err.message}`);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('trigger:testActions', async (e, { actions, event, simultaneous, repeat }) => {
  try {
    await triggerEngine.testActions(actions, event, simultaneous, repeat);
    return { ok: true };
  } catch (err) {
    logger.error(`Test aksi gagal: ${err.message}`);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('soundboard:get', () => configManager.getSoundboard() || []);
ipcMain.handle('soundboard:add', (e, item) => {
  // Guard: tolak jika item kosong
  if (!item || !item.name || !item.key) {
    if (logger) logger.warn('[Soundboard] add ditolak: item tidak lengkap');
    return configManager.getSoundboard() || [];
  }

  const current = configManager.getSoundboard() || [];

  // Dedup guard: tolak jika sudah ada item dengan kombinasi name+key+file+mediaFile yang sama
  const isDuplicate = current.some(existing =>
    existing &&
    existing.name === item.name &&
    existing.key === item.key &&
    (existing.file || '') === (item.file || '') &&
    (existing.mediaFile || '') === (item.mediaFile || '')
  );

  if (isDuplicate) {
    if (logger) logger.warn(`[Soundboard] Duplicate add ignored: "${item.name}" (${item.key})`);
    return current; // kembalikan list saat ini tanpa menambah duplikat
  }

  configManager.addSoundboardItem(item);
  const all = configManager.getSoundboard() || [];
  registerSoundboardHotkeys(all, true);
  return all;
});
ipcMain.handle('soundboard:update', (e, { id, data }) => {
  configManager.updateSoundboardItem(id, data);
  const all = configManager.getSoundboard() || [];
  registerSoundboardHotkeys(all, true);
  return all;
});
ipcMain.handle('soundboard:remove', (e, id) => {
  configManager.removeSoundboardItem(id);
  const all = configManager.getSoundboard() || [];
  registerSoundboardHotkeys(all, true);
  return all;
});
ipcMain.handle('soundboard:set', (e, items) => {
  configManager.setSoundboard(items);
  registerSoundboardHotkeys(items, true);
  return true;
});
ipcMain.handle('soundboard:registerGlobalHotkeys', (e, { items, enabled }) => {
  registerSoundboardHotkeys(items, enabled);
  return true;
});

ipcMain.handle('soundboard:triggerMedia', (e, itemId) => {
  const items = configManager.getSoundboard() || [];
  const item = items.find(x => x.id === itemId);
  if (item && item.mediaFile && overlayServer) {
    overlayServer.broadcast('event:soundboard-media', {
      id: item.id,
      name: item.name,
      url: `/api/media?path=${encodeURIComponent(item.mediaFile)}`,
      mediaType: item.mediaType || 'video',
      durationMs: (item.mediaDuration ? Number(item.mediaDuration) : 5) * 1000
    });
    return { ok: true };
  }
  return { ok: false };
});

ipcMain.handle('goal:getAll', () => goalManager ? goalManager.getAllGoals() : {});
ipcMain.handle('goal:get', (e, type) => goalManager ? goalManager.getGoal(type) : null);
ipcMain.handle('goal:update', (e, { type, updates }) => goalManager ? goalManager.updateGoal(type, updates) : null);
ipcMain.handle('goal:resetProgress', (e, type) => goalManager ? goalManager.resetProgress(type) : null);
ipcMain.handle('goal:resetDefault', (e, type) => goalManager ? goalManager.resetToDefault(type) : null);
ipcMain.handle('goal:addProgress', (e, { type, amount }) => goalManager ? goalManager.addProgress(type, amount) : null);
ipcMain.handle('goal:getUrl', (e, type, layout) => {
  const port = overlayServer?.port || configManager?.get()?.overlayPort || 8642;
  return `http://localhost:${port}/overlay/goal?type=${type || 'coin'}&layout=${layout || 'horizontal'}`;
});

ipcMain.handle('youtube:queue', () => youtubeManager ? youtubeManager.queue : []);
ipcMain.handle('youtube:history', () => youtubeManager ? youtubeManager.history : []);
ipcMain.handle('youtube:replaySong', (e, indexOrSong) => {
  if (youtubeManager && typeof youtubeManager.replaySong === 'function') {
    return { ok: youtubeManager.replaySong(indexOrSong) };
  }
  return { ok: false };
});
ipcMain.handle('youtube:settings', () => youtubeManager ? youtubeManager.settings : {});
ipcMain.handle('youtube:updateSettings', (e, partial) => youtubeManager ? youtubeManager.updateSettings(partial) : null);
ipcMain.handle('youtube:skip', () => {
  if (youtubeManager) {
    if (typeof youtubeManager.skipSong === 'function') youtubeManager.skipSong();
    else if (typeof youtubeManager.skip === 'function') youtubeManager.skip();
  }
  return { ok: true };
});
ipcMain.handle('youtube:stop', () => {
  if (youtubeManager) {
    if (typeof youtubeManager.stopCurrent === 'function') youtubeManager.stopCurrent();
    else if (typeof youtubeManager.stop === 'function') youtubeManager.stop();
  }
  return { ok: true };
});
ipcMain.handle('youtube:clear', () => {
  if (youtubeManager && typeof youtubeManager.clearQueue === 'function') youtubeManager.clearQueue();
  return { ok: true };
});
ipcMain.handle('youtube:remove', (e, id) => {
  if (youtubeManager && typeof youtubeManager.removeSong === 'function') youtubeManager.removeSong(id);
  return { ok: true };
});
ipcMain.handle('youtube:playInView', (e, videoId, query) => {
  if (videoId) {
    playSongInWatchWindow({ videoId, title: query || 'Song' });
  } else if (youtubeManager && typeof youtubeManager.playInView === 'function') {
    youtubeManager.playInView(videoId, query);
  }
  return { ok: true };
});
ipcMain.handle('youtube:viewCommand', (e, cmd, arg) => {
  if (cmd === 'pause') send('youtube:state', { isPlaying: false });
  else if (cmd === 'resume') send('youtube:state', { isPlaying: true });
  if (overlayServer) {
    try { overlayServer.broadcast('youtube:command', { cmd, arg }); } catch (_) { }
  }
  return { ok: true };
});
ipcMain.handle('youtube:togglePlayerWindow', async () => {
  const port = overlayServer?.port || configManager?.get()?.overlayPort || 8642;
  const url = `http://localhost:${port}/player/youtube`;
  await shell.openExternal(url);
  return true;
});
ipcMain.handle('youtube:openBravePlayer', async () => {
  const port = overlayServer?.port || configManager?.get()?.overlayPort || 8642;
  const url = `http://localhost:${port}/player/youtube`;

  const fs = require('fs');
  const { execFile } = require('child_process');

  const possibleBravePaths = [
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe')
  ];

  let foundBrave = null;
  for (const p of possibleBravePaths) {
    if (fs.existsSync(p)) {
      foundBrave = p;
      break;
    }
  }

  if (foundBrave) {
    execFile(foundBrave, [url]);
    return { ok: true, isBrave: true, url };
  } else {
    shell.openExternal(url);
    return { ok: true, isBrave: false, url };
  }
});
ipcMain.handle('youtube:requestSong', async (e, query, user = 'Host') => {
  if (youtubeManager && typeof youtubeManager.handleChatCommand === 'function') {
    return await youtubeManager.handleChatCommand({ comment: `!play ${query}`, uniqueId: 'host_id', nickname: user });
  }
  return false;
});
ipcMain.handle('youtube:videoEnded', () => {
  if (youtubeManager && typeof youtubeManager.playNext === 'function') {
    youtubeManager.playNext();
  }
  return { ok: true };
});
ipcMain.on('youtube:videoEnded', () => {
  if (youtubeManager && typeof youtubeManager.playNext === 'function') {
    youtubeManager.playNext();
  }
});

ipcMain.handle('tunnel:start', async () => {
  const port = overlayServer?.port || configManager?.get()?.overlayPort || 8642;
  if (tunnelManager) {
    tunnelManager.setPort(port);
    const res = await tunnelManager.start();
    send('tunnel:status', tunnelManager.getStatus());
    return res;
  }
  return { ok: false, error: 'TunnelManager tidak diinisialisasi' };
});
ipcMain.handle('tunnel:stop', async () => {
  if (tunnelManager) {
    const res = await tunnelManager.stop();
    send('tunnel:status', tunnelManager.getStatus());
    return res;
  }
  return { ok: true, active: false };
});
ipcMain.handle('tunnel:status', () => {
  if (tunnelManager) {
    return tunnelManager.getStatus();
  }
  const port = overlayServer?.port || 8642;
  return { active: false, url: `http://localhost:${port}` };
});

ipcMain.handle('battle:saveConfig', (e, config) => configManager.saveBattleConfig?.(config) || true);
ipcMain.handle('battle:reset', () => configManager.resetBattleScores?.() || true);
ipcMain.handle('battle:testGift', (e, { team, diamonds, user }) => {
  if (triggerEngine && triggerEngine.handleBattleGift) {
    triggerEngine.handleBattleGift(team, diamonds, user);
  }
  return { ok: true };
});

/* ============================================================
   APP LIFECYCLE
   ============================================================ */

app.on('before-quit', () => {
  app.isQuitting = true;
  stopWatchPlayerPolling();
  if (tunnelManager && tunnelManager.active) {
    try { tunnelManager.stop().catch(() => { }); } catch (_) { }
  }
  if (ytWindow && !ytWindow.isDestroyed()) {
    ytWindow.destroy();
    ytWindow = null;
  }
});

app.whenReady().then(async () => {
  await bootstrap();

  licenseManager.setLogoutCallback(() => {
    if (mainWindow) {
      mainWindow.close();
      mainWindow = null;
    }
    createLicenseWindow();
  });

  let hasValidLicense = false;
  try {
    if (typeof licenseManager.init === 'function') {
      hasValidLicense = await licenseManager.init();
    } else if (typeof licenseManager.checkSavedLicense === 'function') {
      hasValidLicense = await licenseManager.checkSavedLicense();
    }
  } catch (err) {
    console.warn('License verification error:', err);
    hasValidLicense = false;
  }

  if (hasValidLicense) {
    createWindow();

    // ── Auto-Update Notifier: mulai setelah window siap ──────────────────
    const updateChecker = new UpdateChecker(APP_VERSION, console);
    updateChecker.on('update:available', (info) => {
      // Kirim ke renderer — tampil sebagai banner, tidak modal/interrupt
      send('update:available', info);
    });
    updateChecker.start();
    // Simpan referensi agar bisa stop saat app quit
    app.__updateChecker = updateChecker;
    // ─────────────────────────────────────────────────────────────────────
  } else {
    createLicenseWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (configManager) configManager.flushSave();
  if (connector) await connector.disconnect();
  if (overlayServer) await overlayServer.stop();
  // Stop update checker interval saat app quit
  if (app.__updateChecker) app.__updateChecker.stop();
  if (uiohook && uiohookStarted) {
    try { uiohook.stop(); } catch (_) { }
  }
  if (process.platform !== 'darwin') app.quit();
});