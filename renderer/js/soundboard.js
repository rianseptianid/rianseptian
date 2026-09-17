// soundboard.js - Modern, lightweight & complete Soundboard module with Video/Image Overlay
(function () {
  let soundboardItems = [];
  let soundboardSearchQuery = '';
  let isRecordingKey = false;
  let activeAudios = new Map(); // id -> HTMLAudioElement
  let overlayPort = 8642;
  let activeTunnelUrl = 'https://overlay.nurearn.site';

  // Fetch actual port
  if (window.api && window.api.getConfig) {
    window.api.getConfig().then(cfg => {
      if (cfg && cfg.overlayPort) {
        overlayPort = cfg.overlayPort;
        updateUniversalOverlayLink();
      }
    }).catch(() => {});
  }

  if (window.api && window.api.getTunnelStatus) {
    window.api.getTunnelStatus().then(status => {
      if (status && status.active && status.url) activeTunnelUrl = String(status.url).replace(/\/+$/, '');
      else activeTunnelUrl = 'https://overlay.nurearn.site';
      updateUniversalOverlayLink();
      renderGrid();
    }).catch(() => {});
  }
  if (window.api && window.api.onTunnelStatus) {
    window.api.onTunnelStatus(status => {
      if (status && status.active && status.url) activeTunnelUrl = String(status.url).replace(/\/+$/, '');
      else activeTunnelUrl = 'https://overlay.nurearn.site';
      updateUniversalOverlayLink();
      renderGrid();
    });
  }

  const usernameInput = document.getElementById('usernameInput');
  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      updateUniversalOverlayLink();
      renderGrid();
    });
    usernameInput.addEventListener('change', () => {
      updateUniversalOverlayLink();
      renderGrid();
    });
  }

  function getOverlayBaseUrl() {
    const rawUser = usernameInput ? usernameInput.value : '';
    const cleanUser = rawUser ? String(rawUser).toLowerCase().trim().replace(/^@/, '') : '';
    const host = activeTunnelUrl || 'https://overlay.nurearn.site';
    return cleanUser ? `${host}/overlay/@${cleanUser}/soundboard` : `${host}/overlay/soundboard`;
  }

  window.updateSoundboardOverlayLinks = function() {
    updateUniversalOverlayLink();
    renderGrid();
  };

  function updateUniversalOverlayLink() {
    const input = document.getElementById('overlayUrl_soundboard');
    if (input) {
      input.value = getOverlayBaseUrl();
    }
  }

  // Load items from API
  async function loadItems() {
    try {
      if (window.api && window.api.getSoundboard) {
        const items = await window.api.getSoundboard();
        if (Array.isArray(items)) {
          soundboardItems = items;
        }
      }
    } catch (err) {
      console.error('Failed to load soundboard items:', err);
    }
    renderGrid();
  }

  // Play sound and trigger overlay
  function playSoundboardItem(item) {
    if (!item) return;

    // 1. Play Audio
    if (item.file) {
      const audioUrl = item.file.startsWith('http://') || item.file.startsWith('https://')
        ? item.file
        : `http://localhost:${overlayPort}/api/media?path=${encodeURIComponent(item.file)}`;

      try {
        const audio = new Audio(audioUrl);
        audio.volume = typeof item.volume === 'number' ? Math.max(0, Math.min(1, item.volume / 100)) : 1;

        if (!item.allowDuplicate) {
          const prev = activeAudios.get(item.id);
          if (prev) {
            try { prev.pause(); prev.currentTime = 0; } catch (e) {}
          }
          activeAudios.set(item.id, audio);
        }

        audio.play().catch(err => {
          console.warn('Audio play failed:', err);
        });

        audio.onended = () => {
          if (!item.allowDuplicate && activeAudios.get(item.id) === audio) {
            activeAudios.delete(item.id);
          }
          updateCardPlayingState(item.id, false);
          try {
            audio.src = '';
            audio.load();
          } catch (_) {}
        };

        updateCardPlayingState(item.id, true);
      } catch (err) {
        console.error('Error playing soundboard audio:', err);
      }
    } else {
      // Overlay-only item
      updateCardPlayingState(item.id, true);
      const durationMs = (item.mediaDuration ? Number(item.mediaDuration) : 5) * 1000;
      setTimeout(() => updateCardPlayingState(item.id, false), durationMs);
    }

    // 2. Trigger Overlay Media (Video / Image)
    if (item.mediaFile && window.api && window.api.triggerSoundboardMedia) {
      window.api.triggerSoundboardMedia(item.id);
    }
  }

  function stopAllSounds() {
    activeAudios.forEach(audio => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
    });
    activeAudios.clear();
    document.querySelectorAll('.soundboard-card').forEach(el => el.classList.remove('is-playing'));
  }

  function updateCardPlayingState(id, isPlaying) {
    const card = document.querySelector(`.soundboard-card[data-id="${id}"]`);
    if (card) {
      if (isPlaying) {
        card.classList.add('is-playing');
        setTimeout(() => card.classList.remove('is-playing'), 800);
      } else {
        card.classList.remove('is-playing');
      }
    }
  }

  // Render Grid
  function renderGrid() {
    const grid = document.getElementById('soundboardGrid');
    const badge = document.getElementById('soundboardCountBadge');
    if (!grid) return;

    let filtered = soundboardItems;
    if (soundboardSearchQuery.trim()) {
      const q = soundboardSearchQuery.toLowerCase().trim();
      filtered = soundboardItems.filter(item => {
        return (item.name && item.name.toLowerCase().includes(q)) ||
               (item.key && item.key.toLowerCase().includes(q)) ||
               (item.file && item.file.toLowerCase().includes(q)) ||
               (item.mediaFile && item.mediaFile.toLowerCase().includes(q));
      });
    }

    if (badge) {
      badge.textContent = `${soundboardItems.length} suara`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--muted, #9ca3af);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">Belum Ada Tombol Suara</div>
          <div style="font-size: 12px;">Klik "Tambah Tombol Suara" untuk membuat hotkey suara & overlay pertama Anda.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const perItemOverlayUrl = `${getOverlayBaseUrl()}?id=${item.id}`;
      const fileName = item.file ? item.file.split(/[\\/]/).pop() : 'Tanpa audio (Hanya overlay)';
      const mediaName = item.mediaFile ? item.mediaFile.split(/[\\/]/).pop() : '';
      const isVideo = item.mediaType === 'video' || (item.mediaType !== 'image' && /\.(mp4|webm|mkv|mov)$/i.test(item.mediaFile || ''));
      const hasMedia = Boolean(item.mediaFile);

      return `
        <div class="panel soundboard-card" data-id="${item.id}" style="display: flex; flex-direction: column; justify-content: space-between; border-radius: 12px; padding: 14px; border: 1px solid var(--border); background: var(--bg-card); position: relative; transition: all 0.2s ease;">
          <!-- Top Row: Name & Hotkey -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
              <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary); word-break: break-word; flex: 1;">
                ${escapeHtml(item.name || 'Suara')}
              </h4>
              <span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3); font-family: monospace; font-size: 11px; padding: 2px 7px; border-radius: 6px; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></svg>
                ${escapeHtml(item.key || '-')}
              </span>
            </div>

            <!-- Audio File Info -->
            <div style="font-size: 11px; color: var(--muted, #9ca3af); margin-bottom: 6px; display: flex; align-items: center; gap: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.file || '')}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <span style="overflow: hidden; text-overflow: ellipsis;">${escapeHtml(fileName)}</span>
            </div>

            <!-- Media Overlay Badge / Info & Link Box -->
            ${hasMedia ? `
              <div style="font-size: 11px; color: #f59e0b; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 6px; padding: 3px 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;" title="${escapeHtml(item.mediaFile || '')}">
                ${isVideo ? `
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="5" rx="2"/><polyline points="8 5 8 20"/><polyline points="16 5 16 20"/></svg>
                  <span>Video Overlay</span>
                ` : `
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  <span>Gambar Overlay</span>
                `}
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">${escapeHtml(mediaName)}</span>
                <span style="font-size: 9.5px; opacity: 0.8;">(${item.mediaDuration || 5}s)</span>
              </div>

              <!-- Dedicated Overlay Link Box for this Card -->
              <div style="margin-top: 6px; margin-bottom: 12px; padding: 8px; background: rgba(245, 158, 11, 0.08); border: 1px dashed rgba(245, 158, 11, 0.35); border-radius: 6px;">
                <div style="font-size: 10.5px; color: #fbbf24; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-weight: 600;">
                  <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Link Overlay Khusus Tombol Ini:
                  </span>
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                  <input type="text" readonly value="${perItemOverlayUrl}" class="sb-item-overlay-url" style="flex: 1; font-size: 10px; padding: 4px 6px; background: rgba(0,0,0,0.4); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 4px; color: #fef08a; font-family: monospace;" />
                  <button type="button" class="btn btn-ghost btn-sm btn-copy-sb-url" data-url="${perItemOverlayUrl}" style="padding: 3px 8px; font-size: 10px; height: 24px; color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);" title="Salin link overlay OBS untuk tombol ini saja">
                    Copy Link
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm btn-open-sb-url" data-url="${perItemOverlayUrl}" style="padding: 3px 8px; font-size: 10px; height: 24px;" title="Buka di browser">
                    Buka
                  </button>
                </div>
                <div style="font-size: 9.5px; color: var(--muted, #9ca3af); margin-top: 4px; line-height: 1.3;">
                  Pasang link ini di TikTok LIVE Studio / OBS agar animasi video/gambar tombol ini muncul di posisi layar yang Anda inginkan.
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Bottom Action Buttons -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
            <button type="button" class="btn btn-primary btn-sm btn-play-sb" data-id="${item.id}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; height: 30px; font-size: 12px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Putar
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-edit-sb" data-id="${item.id}" style="padding: 4px 8px; height: 30px; display: inline-flex; align-items: center; justify-content: center;" title="Edit Suara & Overlay">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-delete-sb" data-id="${item.id}" style="padding: 4px 8px; height: 30px; color: #ef4444; display: inline-flex; align-items: center; justify-content: center;" title="Hapus Tombol">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
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

  // Modal open/close
  function openModal(editItem = null) {
    const modal = document.getElementById('soundboardModal');
    const title = document.getElementById('soundboardModalTitle');
    const editId = document.getElementById('sb_editing_id');
    const nameInput = document.getElementById('sb_name');
    const keyInput = document.getElementById('sb_key');
    const fileInput = document.getElementById('sb_file');
    const mediaFileInput = document.getElementById('sb_media_file');
    const mediaTypeInput = document.getElementById('sb_media_type');
    const mediaDurationInput = document.getElementById('sb_media_duration');
    const allowDup = document.getElementById('sb_allow_duplicate');
    const volInput = document.getElementById('sb_volume');
    const volVal = document.getElementById('sb_volume_val');

    if (!modal) return;

    if (editItem) {
      if (title) title.textContent = 'Edit Tombol Suara & Overlay';
      if (editId) editId.value = editItem.id;
      if (nameInput) nameInput.value = editItem.name || '';
      if (keyInput) keyInput.value = editItem.key || '';
      if (fileInput) fileInput.value = editItem.file || '';
      if (mediaFileInput) mediaFileInput.value = editItem.mediaFile || '';
      if (mediaTypeInput) mediaTypeInput.value = editItem.mediaType || 'auto';
      if (mediaDurationInput) mediaDurationInput.value = editItem.mediaDuration || 5;
      if (allowDup) allowDup.checked = editItem.allowDuplicate !== false;
      const vol = typeof editItem.volume === 'number' ? editItem.volume : 100;
      if (volInput) volInput.value = vol;
      if (volVal) volVal.textContent = `${vol}%`;
    } else {
      if (title) title.textContent = 'Tambah Tombol Suara Baru';
      if (editId) editId.value = '';
      if (nameInput) nameInput.value = '';
      if (keyInput) keyInput.value = '';
      if (fileInput) fileInput.value = '';
      if (mediaFileInput) mediaFileInput.value = '';
      if (mediaTypeInput) mediaTypeInput.value = 'auto';
      if (mediaDurationInput) mediaDurationInput.value = '5';
      if (allowDup) allowDup.checked = true;
      if (volInput) volInput.value = '100';
      if (volVal) volVal.textContent = '100%';
    }

    updateModalOverlayUrlPreview();
    modal.style.display = 'flex';
  }

  function updateModalOverlayUrlPreview() {
    const box = document.getElementById('sb_media_overlay_link_box');
    const input = document.getElementById('sb_preview_overlay_url');
    const mediaFileInput = document.getElementById('sb_media_file');
    const editId = document.getElementById('sb_editing_id')?.value;
    if (!box || !input) return;

    if (mediaFileInput && mediaFileInput.value.trim()) {
      const id = editId || 'otomatis_dibuat';
      input.value = `${getOverlayBaseUrl()}?id=${encodeURIComponent(id)}`;
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  }

  function closeModal() {
    const modal = document.getElementById('soundboardModal');
    if (modal) modal.style.display = 'none';
    isRecordingKey = false;
    const recText = document.getElementById('record_sb_key_text');
    if (recText) recText.textContent = 'Rekam Tombol';
  }

  // Setup DOM listeners
  function init() {
    // 1. Add Button
    const btnAdd = document.getElementById('btnOpenAddSoundboardModal');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => openModal(null));
    }

    // 2. Stop All Sounds
    const btnStop = document.getElementById('btnStopAllSounds');
    if (btnStop) {
      btnStop.addEventListener('click', stopAllSounds);
    }

    // 3. Close Modal
    const btnClose = document.getElementById('btnCloseSoundboardModal');
    const btnCancel = document.getElementById('sb_cancelBtn');
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    // 4. File Pickers with Asset Folders Modal Integration
    const btnPickFile = document.getElementById('btn_pick_sb_file');
    if (btnPickFile) {
      btnPickFile.addEventListener('click', () => {
        if (window.assetFolders && typeof window.assetFolders.openAudioPicker === 'function') {
          window.assetFolders.openAudioPicker((filePath) => {
            if (filePath) {
              const input = document.getElementById('sb_file');
              if (input) input.value = filePath;
            }
          });
        } else if (window.api && window.api.pickSoundFile) {
          window.api.pickSoundFile().then(filePath => {
            if (filePath) {
              const input = document.getElementById('sb_file');
              if (input) input.value = filePath;
            }
          });
        }
      });
    }

    const btnClearFile = document.getElementById('btn_clear_sb_file');
    if (btnClearFile) {
      btnClearFile.addEventListener('click', () => {
        const input = document.getElementById('sb_file');
        if (input) input.value = '';
      });
    }

    const btnPickMedia = document.getElementById('btn_pick_sb_media_file');
    if (btnPickMedia) {
      btnPickMedia.addEventListener('click', () => {
        const handleMediaSelection = (filePath) => {
          if (!filePath) return;
          const input = document.getElementById('sb_media_file');
          if (input) input.value = filePath;
          // auto detect type
          const selType = document.getElementById('sb_media_type');
          if (selType) {
            if (/\.(mp4|webm|mkv|mov)$/i.test(filePath)) {
              selType.value = 'video';
            } else if (/\.(gif|png|jpg|jpeg|webp)$/i.test(filePath)) {
              selType.value = 'image';
            }
          }
          updateModalOverlayUrlPreview();
        };

        if (window.assetFolders && typeof window.assetFolders.openMediaPicker === 'function') {
          window.assetFolders.openMediaPicker(handleMediaSelection);
        } else if (window.api && window.api.pickMediaFile) {
          window.api.pickMediaFile().then(handleMediaSelection);
        }
      });
    }

    const btnClearMedia = document.getElementById('btn_clear_sb_media_file');
    if (btnClearMedia) {
      btnClearMedia.addEventListener('click', () => {
        const input = document.getElementById('sb_media_file');
        if (input) input.value = '';
        updateModalOverlayUrlPreview();
      });
    }

    const sbMediaFileInput = document.getElementById('sb_media_file');
    if (sbMediaFileInput) {
      sbMediaFileInput.addEventListener('input', updateModalOverlayUrlPreview);
      sbMediaFileInput.addEventListener('change', updateModalOverlayUrlPreview);
    }

    const btnCopyModalUrl = document.getElementById('btn_copy_modal_sb_url');
    if (btnCopyModalUrl) {
      btnCopyModalUrl.addEventListener('click', () => {
        const input = document.getElementById('sb_preview_overlay_url');
        if (input && input.value) {
          navigator.clipboard.writeText(input.value).then(() => {
            const orig = btnCopyModalUrl.textContent;
            btnCopyModalUrl.textContent = 'Tersalin!';
            btnCopyModalUrl.style.color = '#22c55e';
            setTimeout(() => {
              btnCopyModalUrl.textContent = orig;
              btnCopyModalUrl.style.color = '#fbbf24';
            }, 1500);
          }).catch(() => {});
        }
      });
    }

    // 5. Volume Slider
    const volInput = document.getElementById('sb_volume');
    const volVal = document.getElementById('sb_volume_val');
    if (volInput && volVal) {
      volInput.addEventListener('input', () => {
        volVal.textContent = `${volInput.value}%`;
      });
    }

    // 6. Record Key
    const btnRecord = document.getElementById('btn_record_sb_key');
    const recText = document.getElementById('record_sb_key_text');
    const keyInput = document.getElementById('sb_key');

    if (btnRecord) {
      btnRecord.addEventListener('click', () => {
        isRecordingKey = !isRecordingKey;
        if (recText) recText.textContent = isRecordingKey ? 'Tekan Tombol Apapun...' : 'Rekam Tombol';
        if (isRecordingKey && keyInput) keyInput.focus();
      });
    }

    const btnClearKey = document.getElementById('btn_clear_sb_key');
    if (btnClearKey && keyInput) {
      btnClearKey.addEventListener('click', () => {
        keyInput.value = '';
      });
    }

    // Quick chips
    document.querySelectorAll('.btn-chip[data-sb-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (keyInput) keyInput.value = btn.getAttribute('data-sb-key');
      });
    });

    window.addEventListener('keydown', (e) => {
      if (!isRecordingKey) return;
      e.preventDefault();
      e.stopPropagation();

      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      if (keyInput) keyInput.value = keyName;

      isRecordingKey = false;
      if (recText) recText.textContent = 'Rekam Tombol';
    }, true);

    // 7. Test Play in Modal
    const btnTestPlay = document.getElementById('sb_testPlayBtn');
    if (btnTestPlay) {
      btnTestPlay.addEventListener('click', () => {
        const fileInput = document.getElementById('sb_file');
        const mediaFileInput = document.getElementById('sb_media_file');
        const mediaTypeInput = document.getElementById('sb_media_type');
        const mediaDurationInput = document.getElementById('sb_media_duration');
        const volInput = document.getElementById('sb_volume');

        const tempItem = {
          id: 'test-preview',
          file: fileInput ? fileInput.value : '',
          mediaFile: mediaFileInput ? mediaFileInput.value : '',
          mediaType: mediaTypeInput ? mediaTypeInput.value : 'auto',
          mediaDuration: mediaDurationInput ? Number(mediaDurationInput.value) : 5,
          volume: volInput ? Number(volInput.value) : 100,
          allowDuplicate: true
        };

        playSoundboardItem(tempItem);
      });
    }

    // 8. Form Submit
    const form = document.getElementById('soundboardForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const editId = document.getElementById('sb_editing_id')?.value;
        const name = document.getElementById('sb_name')?.value?.trim();
        const key = document.getElementById('sb_key')?.value?.trim();
        const file = document.getElementById('sb_file')?.value?.trim();
        const mediaFile = document.getElementById('sb_media_file')?.value?.trim() || '';
        const mediaType = document.getElementById('sb_media_type')?.value || 'auto';
        const mediaDuration = Number(document.getElementById('sb_media_duration')?.value || 5);
        const allowDuplicate = document.getElementById('sb_allow_duplicate')?.checked !== false;
        const volume = Number(document.getElementById('sb_volume')?.value || 100);

        if (!name || !key) {
          alert('Mohon isi Nama dan Hotkey!');
          return;
        }

        if (!file && !mediaFile) {
          alert('Mohon tentukan minimal salah satu: File Suara atau Media Overlay!');
          return;
        }

        const payload = {
          name,
          key,
          file,
          mediaFile,
          mediaType,
          mediaDuration,
          allowDuplicate,
          volume
        };

        try {
          if (editId) {
            await window.api.updateSoundboardItem(editId, payload);
          } else {
            payload.id = 'sb_' + Date.now();
            await window.api.addSoundboardItem(payload);
          }
          closeModal();
          await loadItems();
        } catch (err) {
          console.error('Error saving soundboard item:', err);
          alert('Gagal menyimpan tombol suara: ' + err.message);
        }
      });
    }

    // 9. Search Bar
    const searchInput = document.getElementById('soundboardSearchInput');
    const searchClear = document.getElementById('soundboardSearchClearBtn');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        soundboardSearchQuery = searchInput.value;
        renderGrid();
      });
    }
    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        soundboardSearchQuery = '';
        renderGrid();
      });
    }

    // 10. Copy Universal Soundboard Overlay URL
    const btnCopyAll = document.getElementById('btnCopyAllSoundboardOverlay');
    if (btnCopyAll) {
      btnCopyAll.addEventListener('click', () => {
        const url = getOverlayBaseUrl();
        navigator.clipboard.writeText(url).then(() => {
          const orig = btnCopyAll.innerHTML;
          btnCopyAll.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Link Overlay Tersalin!</span>`;
          btnCopyAll.style.color = '#22c55e';
          setTimeout(() => {
            btnCopyAll.innerHTML = orig;
            btnCopyAll.style.color = '';
          }, 2000);
        }).catch(() => {});
      });
    }

    // 11. Event Delegation for Grid Buttons
    const grid = document.getElementById('soundboardGrid');
    if (grid) {
      grid.addEventListener('click', async (e) => {
        // Copy item URL
        const copyBtn = e.target.closest('.btn-copy-sb-url');
        if (copyBtn) {
          const url = copyBtn.getAttribute('data-url');
          if (url) {
            navigator.clipboard.writeText(url).then(() => {
              const orig = copyBtn.textContent;
              copyBtn.textContent = 'Tersalin!';
              copyBtn.style.color = '#22c55e';
              setTimeout(() => {
                copyBtn.textContent = orig;
                copyBtn.style.color = '';
              }, 1500);
            }).catch(() => {});
          }
          return;
        }

        // Open item URL in browser
        const openBtn = e.target.closest('.btn-open-sb-url');
        if (openBtn) {
          const url = openBtn.getAttribute('data-url');
          if (url && window.api && window.api.openOverlayInBrowser) {
            window.api.openOverlayInBrowser(url);
          }
          return;
        }

        // Play Sound
        const playBtn = e.target.closest('.btn-play-sb');
        if (playBtn) {
          const id = playBtn.getAttribute('data-id');
          const item = soundboardItems.find(x => x.id === id);
          if (item) playSoundboardItem(item);
          return;
        }

        // Edit
        const editBtn = e.target.closest('.btn-edit-sb');
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          const item = soundboardItems.find(x => x.id === id);
          if (item) openModal(item);
          return;
        }

        // Delete
        const delBtn = e.target.closest('.btn-delete-sb');
        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          const item = soundboardItems.find(x => x.id === id);
          if (item && confirm(`Hapus tombol "${item.name}"?`)) {
            try {
              await window.api.removeSoundboardItem(id);
              await loadItems();
            } catch (err) {
              console.error('Failed to remove soundboard item:', err);
            }
          }
          return;
        }
      });
    }

    // 12. IPC Hotkey Trigger from Main Process
    if (window.api && window.api.onSoundboardTrigger) {
      window.api.onSoundboardTrigger(({ id, item }) => {
        const found = item || soundboardItems.find(x => x.id === id);
        if (found) {
          playSoundboardItem(found);
        }
      });
    }

    // Expose functions globally
    window.openSoundboardModal = openModal;
    window.renderSoundboardList = renderGrid;
    window.loadSoundboard = loadItems;

    // Initial load
    loadItems();
    updateUniversalOverlayLink();
  }

  // Hook into DOMContentLoaded or execute immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
