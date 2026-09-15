// youtube.js — YouTube Music UI controller for Nurearn Studio
// Manages Now Playing display, real-time seek bar, volume control, queue, history, and video window toggle.

(function () {
  let overlayPort = 8642;
  let currentSong = null;
  let queue = [];
  let history = [];
  let isPlaying = false;
  let repeatMode = false;
  let isSeeking = false;
  let lastDuration = 0;

  // ── 1. Settings & Overlay URL ─────────────────────────────
  if (window.api && window.api.getConfig) {
    window.api.getConfig().then(cfg => {
      if (cfg && cfg.overlayPort) {
        overlayPort = cfg.overlayPort;
        updateOverlayUrl();
      }
    }).catch(() => {});
  }

  function getOverlayUrl() {
    return `http://localhost:${overlayPort}/overlay/youtube`;
  }

  function updateOverlayUrl() {
    const input = document.getElementById('ytOverlayUrl');
    if (input) input.value = getOverlayUrl();
  }

  async function loadSettings() {
    try {
      if (window.api && window.api.getYoutubeSettings) {
        const s = await window.api.getYoutubeSettings();
        if (s) {
          const reqEl   = document.getElementById('yt_req_enabled');
          const skipEl  = document.getElementById('yt_skip_enabled');
          const roleEl  = document.getElementById('yt_req_role');
          const maxQEl  = document.getElementById('yt_max_queue');
          const maxUEl  = document.getElementById('yt_max_per_user');
          if (reqEl)  reqEl.checked  = s.reqEnabled  !== false;
          if (skipEl) skipEl.checked = s.skipEnabled !== false;
          if (roleEl && s.reqRole) roleEl.value = s.reqRole;
          if (maxQEl && s.maxQueue)   maxQEl.value = s.maxQueue;
          if (maxUEl && s.maxPerUser) maxUEl.value = s.maxPerUser;
        }
      }
    } catch (err) {
      console.warn('[YouTube UI] Failed to load settings:', err);
    }
  }

  function saveSettings() {
    if (!window.api || !window.api.updateYoutubeSettings) return;
    const reqEl  = document.getElementById('yt_req_enabled');
    const skipEl = document.getElementById('yt_skip_enabled');
    const roleEl = document.getElementById('yt_req_role');
    const maxQEl = document.getElementById('yt_max_queue');
    const maxUEl = document.getElementById('yt_max_per_user');
    window.api.updateYoutubeSettings({
      reqEnabled:  reqEl  ? reqEl.checked  : true,
      skipEnabled: skipEl ? skipEl.checked : true,
      reqRole:     roleEl ? roleEl.value   : 'all',
      maxQueue:    maxQEl ? Number(maxQEl.value)  || 10 : 10,
      maxPerUser:  maxUEl ? Number(maxUEl.value)  || 2  : 2
    }).catch(console.warn);
  }

  // ── 2. Now Playing UI ─────────────────────────────────────
  function updateNowPlaying(song) {
    currentSong = song;
    const titleEl     = document.getElementById('ytNowPlaying');
    const channelEl   = document.getElementById('ytNowChannel');
    const reqEl       = document.getElementById('ytNowRequester');
    const thumbImg    = document.getElementById('ytThumbImg');
    const placeholder = document.getElementById('ytThumbPlaceholder');
    const eqBars      = document.getElementById('ytEqBars');
    const statusDot   = document.getElementById('ytOverlayStatusDot');

    if (statusDot) statusDot.className = song ? 'status-dot connected' : 'status-dot disconnected';
    if (eqBars) eqBars.style.display = song ? 'flex' : 'none';

    if (!song) {
      if (titleEl)     titleEl.textContent   = 'Tidak ada lagu';
      if (channelEl)   channelEl.textContent = '';
      if (reqEl)       reqEl.textContent     = '';
      if (thumbImg)    thumbImg.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
      setPlayPauseState(false);
      resetSeek();
      return;
    }

    if (titleEl)    titleEl.textContent   = song.title   || 'Unknown Title';
    if (channelEl)  channelEl.textContent = song.channel || 'YouTube Music';
    if (reqEl)      reqEl.textContent     = song.requester ? `Req: @${song.requester}` : 'Req: -';

    if (song.thumbnail && thumbImg) {
      thumbImg.src = song.thumbnail;
      thumbImg.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    } else {
      if (thumbImg)    thumbImg.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
    }

    setPlayPauseState(true);
  }

  function setPlayPauseState(playing) {
    isPlaying = playing;
    const btn = document.getElementById('btnYtPlayPause');
    const eqBars = document.getElementById('ytEqBars');
    if (eqBars && currentSong) eqBars.style.display = playing ? 'flex' : 'none';
    if (!btn) return;
    if (playing) {
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
      </svg><span id="ytPlayPauseText">Pause</span>`;
    } else {
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="6 4 20 12 6 20"/>
      </svg><span id="ytPlayPauseText">Play</span>`;
    }
  }

  function resetSeek() {
    const seek = document.getElementById('ytSeekBar');
    const now  = document.getElementById('ytTimeNow');
    const dur  = document.getElementById('ytTimeDur');
    if (seek) seek.value = 0;
    if (now)  now.textContent = '0:00';
    if (dur)  dur.textContent = '0:00';
    lastDuration = 0;
  }

  function fmtTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── 3. Test Request / Direct Play Handler ─────────────────
  async function handleTestRequest() {
    const input = document.getElementById('ytTestQuery');
    const statusEl = document.getElementById('ytTestStatus');
    const btn = document.getElementById('btnYtTestPlay');
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;

    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = 'var(--gold, #ffd700)';
      statusEl.textContent = `🔍 Mencari "${q}" di YouTube...`;
    }
    if (btn) btn.disabled = true;

    try {
      if (window.api && window.api.requestYoutubeSong) {
        const ok = await window.api.requestYoutubeSong(q, 'Host');
        if (ok) {
          if (statusEl) {
            statusEl.style.color = '#22c55e';
            statusEl.textContent = `✓ Berhasil ditambahkan ke antrian!`;
            setTimeout(() => { statusEl.style.display = 'none'; }, 3500);
          }
          input.value = '';
        } else {
          if (statusEl) {
            statusEl.style.color = '#ef4444';
            statusEl.textContent = `⚠ Lagu tidak ditemukan atau antrian penuh.`;
          }
        }
      }
    } catch (err) {
      if (statusEl) {
        statusEl.style.color = '#ef4444';
        statusEl.textContent = `Gagal: ${err.message}`;
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ── 4. Queue Table ────────────────────────────────────────
  function renderQueue(qList) {
    queue = Array.isArray(qList) ? qList : [];
    const tbody = document.getElementById('ytQueueTableBody');
    if (!tbody) return;

    const unplayed = queue.filter(x => x.status !== 'playing');
    if (unplayed.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--muted,#888);">
        Belum ada lagu di antrian. Ketik judul lagu di form di atas atau kirim <strong>!play judul lagu</strong> di live chat TikTok.</td></tr>`;
      return;
    }

    tbody.innerHTML = unplayed.map((song, idx) => {
      const title     = escapeHtml(song.title     || 'Unknown');
      const channel   = escapeHtml(song.channel   || '-');
      const requester = escapeHtml(song.requester || song.nickname || '-');
      const duration  = escapeHtml(song.duration  || '-');
      return `<tr>
        <td style="font-weight:700;color:var(--gold,#ffd700);">${idx + 1}</td>
        <td><span class="badge" style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">@${requester}</span></td>
        <td style="font-weight:600;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${title}</td>
        <td style="color:var(--muted,#888);font-size:12px;">${channel}</td>
        <td style="font-family:monospace;font-size:12px;">${duration}</td>
        <td><button type="button" class="btn btn-ghost btn-sm btn-del-yt-song" data-index="${idx}"
          style="color:#ef4444;padding:2px 6px;" title="Hapus dari antrian">&#x2715;</button></td>
      </tr>`;
    }).join('');
  }

  // ── 5. History Table ──────────────────────────────────────
  function renderHistory(histList) {
    history = Array.isArray(histList) ? histList : [];
    const tbody = document.getElementById('ytHistoryTableBody');
    if (!tbody) return;

    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center muted">Belum ada riwayat</td></tr>`;
      return;
    }

    tbody.innerHTML = history.map((song, idx) => {
      const title     = escapeHtml(song.title     || 'Unknown');
      const requester = escapeHtml(song.requester || song.nickname || '-');
      const status    = escapeHtml(song.status    || 'played');
      const statusColor = status === 'skipped' ? '#f59e0b' : status === 'stopped' ? '#ef4444' : '#1DB954';
      return `<tr>
        <td style="font-weight:600;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${title}">${title}</td>
        <td><span class="badge" style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">@${requester}</span></td>
        <td><span style="color:${statusColor};font-size:12px;font-weight:600;text-transform:capitalize;">${status}</span></td>
        <td>
          <button type="button" class="btn btn-primary btn-sm btn-replay-yt-song" data-index="${idx}"
            style="padding: 3px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; font-weight: 600;"
            title="Putar lagu ini lagi">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
            Play Lagi
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── 6. UI Initialization ──────────────────────────────────
  function init() {
    updateOverlayUrl();
    loadSettings();

    // Initial queue & history fetch
    if (window.api && window.api.getYoutubeQueue) {
      window.api.getYoutubeQueue().then(renderQueue).catch(() => {});
    }
    if (window.api && window.api.getYoutubeHistory) {
      window.api.getYoutubeHistory().then(renderHistory).catch(() => {});
    }

    // ── Tab switch: Settings / Queue ─────────────────────────
    const btnSettings = document.getElementById('btnYtSettings');
    const btnQueue    = document.getElementById('btnYtQueue');
    const secSettings = document.getElementById('ytSettingsSection');
    const secQueue    = document.getElementById('ytQueueSection');

    if (btnSettings && secSettings) {
      btnSettings.onclick = () => {
        btnSettings.className = 'btn btn-primary';
        if (btnQueue) btnQueue.className = 'btn btn-ghost';
        secSettings.style.display = 'block';
        if (secQueue) secQueue.style.display = 'none';
      };
    }
    if (btnQueue && secQueue) {
      btnQueue.onclick = () => {
        btnQueue.className = 'btn btn-primary';
        if (btnSettings) btnSettings.className = 'btn btn-ghost';
        if (secSettings) secSettings.style.display = 'none';
        secQueue.style.display = 'block';
      };
    }

    // ── Test Request Button & Input ──────────────────────────
    const btnTestPlay = document.getElementById('btnYtTestPlay');
    const inputTestQuery = document.getElementById('ytTestQuery');
    if (btnTestPlay) {
      btnTestPlay.onclick = handleTestRequest;
    }
    if (inputTestQuery) {
      inputTestQuery.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleTestRequest();
        }
      };
    }

    // ── Open in Brave / Browser Button ───────────────────────
    const btnOpenBrave = document.getElementById('btnYtOpenBrave');
    if (btnOpenBrave) {
      btnOpenBrave.onclick = async () => {
        if (window.api && window.api.openBravePlayer) {
          const res = await window.api.openBravePlayer();
          if (res && res.isBrave) {
            if (typeof window.showToast === 'function') {
              window.showToast('Membuka Web Player di Brave Browser 🦁', 'info');
            }
          } else {
            if (typeof window.showToast === 'function') {
              window.showToast('Brave tidak ditemukan, dibuka di browser default', 'info');
            }
          }
        }
      };
    }

    // ── Toggle Player Window Button ──────────────────────────
    const btnTogglePlayer = document.getElementById('btnYtTogglePlayer');
    const toggleText = document.getElementById('ytTogglePlayerText');
    if (btnTogglePlayer) {
      btnTogglePlayer.onclick = async () => {
        if (window.api && window.api.toggleYoutubePlayerWindow) {
          const visible = await window.api.toggleYoutubePlayerWindow();
          if (toggleText) {
            toggleText.textContent = visible ? 'Tutup Browser Player' : 'Buka Browser Player';
          }
        }
      };
    }

    // ── Play/Pause Button ────────────────────────────────────
    const btnPlayPause = document.getElementById('btnYtPlayPause');
    if (btnPlayPause) {
      btnPlayPause.onclick = () => {
        if (window.api && window.api.youtubeViewCommand) {
          window.api.youtubeViewCommand(isPlaying ? 'pause' : 'resume');
          setPlayPauseState(!isPlaying);
        }
      };
    }

    // ── Skip Button ──────────────────────────────────────────
    const btnSkip = document.getElementById('btnYtSkip');
    if (btnSkip) {
      btnSkip.onclick = () => {
        if (window.api && window.api.skipYoutubeSong) {
          window.api.skipYoutubeSong();
        }
      };
    }

    // ── Stop Button ──────────────────────────────────────────
    const btnStop = document.getElementById('btnYtStop');
    if (btnStop) {
      btnStop.onclick = () => {
        if (window.api && window.api.stopYoutubeSong) {
          window.api.stopYoutubeSong();
        }
        updateNowPlaying(null);
      };
    }

    // ── Repeat Button ────────────────────────────────────────
    const btnRepeat = document.getElementById('btnYtRepeat');
    if (btnRepeat) {
      btnRepeat.onclick = () => {
        repeatMode = !repeatMode;
        btnRepeat.style.color = repeatMode ? '#1DB954' : '';
        btnRepeat.title = repeatMode ? 'Repeat: ON' : 'Repeat: OFF';
      };
    }

    // ── Volume Slider ────────────────────────────────────────
    const volSlider = document.getElementById('ytVolumeSlider');
    const volValue  = document.getElementById('ytVolumeValue');
    if (volSlider) {
      volSlider.oninput = () => {
        const vol = Number(volSlider.value);
        if (volValue) volValue.textContent = vol + '%';
        if (window.api && window.api.youtubeViewCommand) {
          window.api.youtubeViewCommand('volume', vol);
        }
      };
    }

    // ── Seek Bar ─────────────────────────────────────────────
    const seekBar = document.getElementById('ytSeekBar');
    if (seekBar) {
      seekBar.oninput = () => {
        isSeeking = true;
      };
      seekBar.onchange = () => {
        isSeeking = false;
        if (lastDuration > 0 && window.api && window.api.youtubeViewCommand) {
          const seekSec = Math.round((Number(seekBar.value) / 100) * lastDuration);
          window.api.youtubeViewCommand('seek', seekSec);
        }
      };
    }

    // ── Clear Queue Button (guarded against duplicate popups) ──
    const btnClearQueue = document.getElementById('btnYtClearQueue');
    let isClearingQueue = false;
    if (btnClearQueue) {
      btnClearQueue.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isClearingQueue) return;
        isClearingQueue = true;
        try {
          let confirmed = false;
          if (typeof window.showConfirm === 'function') {
            confirmed = await window.showConfirm('Kosongkan semua antrian lagu YouTube?', 'Konfirmasi Antrian', '🗑️');
          } else {
            confirmed = window.confirm('Kosongkan semua antrian lagu YouTube?');
          }
          if (confirmed && window.api && window.api.clearYoutubeQueue) {
            await window.api.clearYoutubeQueue();
          }
        } finally {
          setTimeout(() => { isClearingQueue = false; }, 300);
        }
      };
    }

    // ── Open Overlay Button ──────────────────────────────────
    const btnOpenOverlay = document.getElementById('btnYtOpenOverlay');
    if (btnOpenOverlay) {
      btnOpenOverlay.onclick = () => {
        const url = getOverlayUrl();
        if (window.api && window.api.openOverlayInBrowser) {
          window.api.openOverlayInBrowser(url);
        }
      };
    }

    // ── Settings Save Listeners ──────────────────────────────
    ['yt_req_enabled','yt_skip_enabled','yt_req_role','yt_max_queue','yt_max_per_user'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.onchange = saveSettings;
        el.oninput  = saveSettings;
      }
    });

    // ── Delete Song from Queue ───────────────────────────────
    const queueTbody = document.getElementById('ytQueueTableBody');
    if (queueTbody) {
      queueTbody.onclick = (e) => {
        const delBtn = e.target.closest('.btn-del-yt-song');
        if (delBtn) {
          const idx = Number(delBtn.getAttribute('data-index'));
          if (window.api && window.api.removeYoutubeSong) {
            window.api.removeYoutubeSong(idx);
          }
        }
      };
    }

    // ── Replay Song from History ──────────────────────────────
    const histTbody = document.getElementById('ytHistoryTableBody');
    if (histTbody) {
      histTbody.onclick = async (e) => {
        const replayBtn = e.target.closest('.btn-replay-yt-song');
        if (replayBtn) {
          const idx = Number(replayBtn.getAttribute('data-index'));
          replayBtn.disabled = true;
          const origHtml = replayBtn.innerHTML;
          replayBtn.innerHTML = `Memutar...`;
          try {
            if (window.api && window.api.replayYoutubeSong) {
              await window.api.replayYoutubeSong(idx);
            }
          } finally {
            setTimeout(() => {
              replayBtn.disabled = false;
              replayBtn.innerHTML = origHtml;
            }, 800);
          }
        }
      };
    }

    // ── 7. IPC Listeners from Main Process ───────────────────
    if (window.api) {
      if (window.api.onYoutubePlay) {
        window.api.onYoutubePlay(song => {
          updateNowPlaying(song);
          resetSeek();
        });
      }

      if (window.api.onYoutubeQueue) {
        window.api.onYoutubeQueue(q => {
          renderQueue(q);
        });
      }

      if (window.api.onYoutubeHistory) {
        window.api.onYoutubeHistory(h => {
          renderHistory(h);
        });
      }

      if (window.api.onYoutubeStop) {
        window.api.onYoutubeStop(() => {
          updateNowPlaying(null);
          resetSeek();
        });
      }

      if (window.api.onYoutubeProgress) {
        window.api.onYoutubeProgress(p => {
          if (!p) return;
          const curr = p.current || 0;
          const total = p.total || 0;
          lastDuration = total;

          const now = document.getElementById('ytTimeNow');
          const durEl = document.getElementById('ytTimeDur');
          const seek = document.getElementById('ytSeekBar');

          if (now) now.textContent = fmtTime(curr);
          if (durEl && total > 0) durEl.textContent = fmtTime(total);
          if (seek && total > 0 && !isSeeking) {
            seek.value = Math.min(100, (curr / total) * 100);
          }
        });
      }

      if (window.api.onYoutubeState) {
        window.api.onYoutubeState(s => {
          if (s && typeof s.isPlaying === 'boolean') {
            setPlayPauseState(s.isPlaying);
          }
        });
      }

      if (window.api.onYoutubePlayerVisibility) {
        window.api.onYoutubePlayerVisibility(visible => {
          if (toggleText) {
            toggleText.textContent = visible ? 'Tutup Browser Player' : 'Buka Browser Player';
          }
        });
      }
    }
  }

  // ── 8. Bootstrap with singleton check ───────────────────────
  if (window.__ytInitialized) return;
  window.__ytInitialized = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
