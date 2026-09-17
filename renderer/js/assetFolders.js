// renderer/js/assetFolders.js — Local Asset Folder Manager & Picker Controller
// Handles directory picking, real-time file scanning, quick preview with audio player,
// Windows Explorer launcher, and modal pickers for Soundboard, Interaction triggers, and Gifts.

(function () {
  let audioFiles = [];
  let mediaFiles = [];
  let giftFiles = [];
  let audioFolderPath = '';
  let mediaFolderPath = '';
  let giftFolderPath = '';
  let previewAudio = null;
  let activePlayingPath = null;

  // Active modal callbacks
  let onSelectAudioCb = null;
  let onSelectMediaCb = null;
  let onSelectGiftCb = null;

  let overlayPort = 8642;

  function $(id) {
    return document.getElementById(id);
  }

  // Safe rebind helper that replaces element with clone to eliminate all duplicate listeners
  function rebind(el, event, handler) {
    if (!el) return null;
    const clone = el.cloneNode(true);
    if (el.parentNode) {
      el.parentNode.replaceChild(clone, el);
    }
    clone.addEventListener(event, handler);
    return clone;
  }

  function toAudioUrl(filePath) {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
      return filePath;
    }
    const clean = filePath.replace(/\\/g, '/');
    return 'file:///' + clean.replace(/^\/+/, '');
  }

  // 1. Audio Preview Player
  function playAudioPreview(filePath, onToggleBtn) {
    if (!filePath) return;

    if (previewAudio && activePlayingPath === filePath) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
      previewAudio = null;
      activePlayingPath = null;
      if (onToggleBtn) onToggleBtn(false);
      return;
    }

    if (previewAudio) {
      try { previewAudio.pause(); previewAudio.currentTime = 0; } catch (_) {}
      previewAudio = null;
      activePlayingPath = null;
      document.querySelectorAll('.btn-preview-audio.is-playing').forEach(b => {
        b.classList.remove('is-playing');
        b.innerHTML = '▶ Putar';
      });
    }

    const primaryUrl = toAudioUrl(filePath);
    const audio = new Audio(primaryUrl);
    previewAudio = audio;
    activePlayingPath = filePath;

    if (onToggleBtn) onToggleBtn(true);

    const cleanup = () => {
      previewAudio = null;
      activePlayingPath = null;
      if (onToggleBtn) onToggleBtn(false);
      document.querySelectorAll('.btn-preview-audio.is-playing').forEach(b => {
        b.classList.remove('is-playing');
        b.innerHTML = '▶ Putar';
      });
    };

    audio.onended = cleanup;
    audio.onerror = () => {
      const fallbackUrl = `http://localhost:${overlayPort}/api/media?path=${encodeURIComponent(filePath)}`;
      const fbAudio = new Audio(fallbackUrl);
      previewAudio = fbAudio;
      fbAudio.onended = cleanup;
      fbAudio.onerror = cleanup;
      fbAudio.play().catch(cleanup);
    };

    audio.play().catch(() => {
      const fallbackUrl = `http://localhost:${overlayPort}/api/media?path=${encodeURIComponent(filePath)}`;
      const fbAudio = new Audio(fallbackUrl);
      previewAudio = fbAudio;
      fbAudio.onended = cleanup;
      fbAudio.onerror = cleanup;
      fbAudio.play().catch(cleanup);
    });
  }

  // 2. Scan Audio Folder
  async function scanAudioFolder() {
    if (!audioFolderPath) {
      const input = $('folderAudioPath');
      if (input && input.value) audioFolderPath = input.value.trim();
    }
    if (!audioFolderPath) {
      audioFolderPath = localStorage.getItem('asset_audio_folder') || '';
    }
    if (!audioFolderPath && window.api && window.api.getConfig) {
      try {
        const cfg = await window.api.getConfig();
        if (cfg?.assetFolders?.audio) {
          audioFolderPath = cfg.assetFolders.audio;
        }
      } catch (_) {}
    }

    const input = $('folderAudioPath');
    if (input && audioFolderPath) input.value = audioFolderPath;

    if (!audioFolderPath || !window.api || !window.api.listFolderMedia) {
      audioFiles = [];
      renderAudioQuickList();
      return;
    }

    const btnScan = $('btnScanAudioFolder');
    if (btnScan) {
      btnScan.textContent = '🔄 Scanning...';
      btnScan.disabled = true;
    }

    try {
      const list = await window.api.listFolderMedia(audioFolderPath, 'sound');
      audioFiles = Array.isArray(list) ? list.map(item => {
        if (typeof item === 'string') {
          return { name: item, path: audioFolderPath + '\\' + item };
        }
        return item;
      }) : [];

      const badge = $('audioFolderCountBadge');
      if (badge) badge.textContent = `${audioFiles.length} audio`;

      renderAudioQuickList();
      renderModalAudioList();

      if (btnScan) {
        btnScan.textContent = `✓ ${audioFiles.length} Audio`;
        setTimeout(() => {
          if (btnScan) {
            btnScan.textContent = ' Refresh / Scan';
            btnScan.disabled = false;
          }
        }, 1500);
      }
    } catch (err) {
      console.warn('[AssetFolders] Gagal scan folder audio:', err);
      if (btnScan) {
        btnScan.textContent = ' Refresh / Scan';
        btnScan.disabled = false;
      }
    }
  }

  function renderAudioQuickList() {
    const listEl = $('audioQuickList');
    if (!listEl) return;
    const q = ($('audioQuickSearch')?.value || '').toLowerCase().trim();
    const filtered = audioFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    if (!audioFolderPath) {
      listEl.innerHTML = '<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">Pilih folder audio di atas untuk melihat daftar file.</span>';
      return;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">${q ? 'Tidak ada file audio cocok dengan pencarian.' : 'Folder kosong atau belum ada file audio.'}</span>`;
      return;
    }

    listEl.innerHTML = filtered.map(f => {
      const isPlaying = activePlayingPath === f.path;
      return `
        <div class="asset-quick-item" style="display:flex; justify-content:space-between; align-items:center; padding:5px 8px; border-radius:4px; margin-bottom:4px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
            <span style="font-size:12px;">🎵</span>
            <span style="font-size:11.5px; font-weight:500; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeHtml(f.path)}">${escapeHtml(f.name)}</span>
          </div>
          <button type="button" class="btn btn-ghost btn-sm btn-preview-audio ${isPlaying ? 'is-playing' : ''}" data-path="${escapeHtml(f.path)}" style="padding:2px 8px; font-size:11px; height:auto;">
            ${isPlaying ? '⏹ Stop' : '▶ Putar'}
          </button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.btn-preview-audio').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-path');
        playAudioPreview(p, (playing) => {
          btn.classList.toggle('is-playing', playing);
          btn.innerHTML = playing ? '⏹ Stop' : '▶ Putar';
        });
      });
    });
  }

  // 3. Scan Media Folder
  async function scanMediaFolder() {
    if (!mediaFolderPath) {
      const input = $('folderMediaPath');
      if (input && input.value) mediaFolderPath = input.value.trim();
    }
    if (!mediaFolderPath) {
      mediaFolderPath = localStorage.getItem('asset_media_folder') || '';
    }
    if (!mediaFolderPath && window.api && window.api.getConfig) {
      try {
        const cfg = await window.api.getConfig();
        if (cfg?.assetFolders?.media) {
          mediaFolderPath = cfg.assetFolders.media;
        }
      } catch (_) {}
    }

    const input = $('folderMediaPath');
    if (input && mediaFolderPath) input.value = mediaFolderPath;

    if (!mediaFolderPath || !window.api || !window.api.listFolderMedia) {
      mediaFiles = [];
      renderMediaQuickList();
      return;
    }

    const btnScan = $('btnScanMediaFolder');
    if (btnScan) {
      btnScan.textContent = '🔄 Scanning...';
      btnScan.disabled = true;
    }

    try {
      const list = await window.api.listFolderMedia(mediaFolderPath, 'media');
      mediaFiles = Array.isArray(list) ? list.map(item => {
        if (typeof item === 'string') {
          return { name: item, path: mediaFolderPath + '\\' + item };
        }
        return item;
      }) : [];

      const badge = $('mediaFolderCountBadge');
      if (badge) badge.textContent = `${mediaFiles.length} media`;

      renderMediaQuickList();
      renderModalMediaList();

      if (btnScan) {
        btnScan.textContent = `✓ ${mediaFiles.length} Media`;
        setTimeout(() => {
          if (btnScan) {
            btnScan.textContent = ' Refresh / Scan';
            btnScan.disabled = false;
          }
        }, 1500);
      }
    } catch (err) {
      console.warn('[AssetFolders] Gagal scan folder media:', err);
      if (btnScan) {
        btnScan.textContent = ' Refresh / Scan';
        btnScan.disabled = false;
      }
    }
  }

  function renderMediaQuickList() {
    const listEl = $('mediaQuickList');
    if (!listEl) return;
    const q = ($('mediaQuickSearch')?.value || '').toLowerCase().trim();
    const filtered = mediaFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    if (!mediaFolderPath) {
      listEl.innerHTML = '<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">Pilih folder media di atas untuk melihat daftar file.</span>';
      return;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">${q ? 'Tidak ada media cocok dengan pencarian.' : 'Folder kosong atau belum ada file media.'}</span>`;
      return;
    }

    listEl.innerHTML = filtered.map(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
      const icon = isVideo ? '🎬' : '🖼️';
      return `
        <div class="asset-quick-item" style="display:flex; justify-content:space-between; align-items:center; padding:5px 8px; border-radius:4px; margin-bottom:4px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
            <span style="font-size:12px;">${icon}</span>
            <span style="font-size:11.5px; font-weight:500; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeHtml(f.path)}">${escapeHtml(f.name)}</span>
          </div>
          <span style="font-size:10.5px; color:var(--text-muted); font-family:monospace; text-transform:uppercase;">${ext}</span>
        </div>
      `;
    }).join('');
  }

  // 4. Scan Gift Folder
  async function scanGiftFolder() {
    if (!giftFolderPath) {
      const input = $('folderGiftPath');
      if (input && input.value) giftFolderPath = input.value.trim();
    }
    if (!giftFolderPath) {
      giftFolderPath = localStorage.getItem('asset_gift_folder') || '';
    }
    if (!giftFolderPath && window.api && window.api.getConfig) {
      try {
        const cfg = await window.api.getConfig();
        if (cfg?.assetFolders?.gift) {
          giftFolderPath = cfg.assetFolders.gift;
        }
      } catch (_) {}
    }
    
    // Fallback to included assets folder if none configured
    if (!giftFolderPath) {
      // In production/dev this path varies, but usually it's in the app root
      // Since this is evaluated by the main process later when listing, we can just pass the string.
      // We will let the main process resolve it if we pass a special token or just rely on the user to configure it.
      // Wait, let's just use an absolute fallback by calling an IPC or just let it be.
      // Let me just send a request to main.js if it's empty, or I can just use a relative string that main.js handles.
      // But wait! If `giftFolderPath` is set to "assets/gifts/images", does `main.js` `listFolderMedia` resolve it?
      // `main.js` `listFolderMedia` just reads the path.
      giftFolderPath = "assets\\gifts\\images";
    }

    const input = $('folderGiftPath');
    if (input && giftFolderPath) input.value = giftFolderPath;

    if (!giftFolderPath || !window.api || !window.api.listFolderMedia) {
      giftFiles = [];
      renderGiftQuickList();
      return;
    }

    const btnScan = $('btnScanGiftFolder');
    if (btnScan) {
      btnScan.textContent = '🔄 Scanning...';
      btnScan.disabled = true;
    }

    try {
      const list = await window.api.listFolderMedia(giftFolderPath, 'gift');
      giftFiles = Array.isArray(list) ? list.map(item => {
        if (typeof item === 'string') {
          return { name: item, path: giftFolderPath + '\\' + item };
        }
        return item;
      }) : [];

      const badge = $('giftFolderCountBadge');
      if (badge) badge.textContent = `${giftFiles.length} gift`;

      renderGiftQuickList();
      renderModalGiftList();

      if (btnScan) {
        btnScan.textContent = `✓ ${giftFiles.length} Gift`;
        setTimeout(() => {
          if (btnScan) {
            btnScan.textContent = ' Refresh / Scan';
            btnScan.disabled = false;
          }
        }, 1500);
      }
    } catch (err) {
      console.warn('[AssetFolders] Gagal scan folder gift:', err);
      if (btnScan) {
        btnScan.textContent = ' Refresh / Scan';
        btnScan.disabled = false;
      }
    }
  }

  function renderGiftQuickList() {
    const listEl = $('giftQuickList');
    if (!listEl) return;
    const q = ($('giftQuickSearch')?.value || '').toLowerCase().trim();
    const filtered = giftFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    if (!giftFolderPath) {
      listEl.innerHTML = '<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">Pilih folder gift di atas untuk melihat daftar file.</span>';
      return;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">${q ? 'Tidak ada gambar gift cocok dengan pencarian.' : 'Folder kosong atau belum ada file gambar gift.'}</span>`;
      return;
    }

    listEl.innerHTML = filtered.map(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const mediaUrl = `http://localhost:${overlayPort}/api/media?path=${encodeURIComponent(f.path)}`;
      return `
        <div class="asset-quick-item" style="display:flex; justify-content:space-between; align-items:center; padding:5px 8px; border-radius:4px; margin-bottom:4px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
            <img src="${mediaUrl}" style="width:20px; height:20px; object-fit:contain; border-radius:3px;" />
            <span style="font-size:11.5px; font-weight:500; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeHtml(f.path)}">${escapeHtml(f.name)}</span>
          </div>
          <span style="font-size:10.5px; color:var(--text-muted); font-family:monospace; text-transform:uppercase;">${ext}</span>
        </div>
      `;
    }).join('');
  }

  // 5. Modal Audio Picker
  function openAudioPicker(onSelect) {
    onSelectAudioCb = onSelect;
    const modal = $('modalAssetAudioPicker');
    if (modal) {
      const sub = $('assetAudioPickerSubtitle');
      if (sub) {
        sub.textContent = audioFolderPath ? `Folder: ${audioFolderPath}` : 'Folder: Belum dikonfigurasi';
      }
      scanAudioFolder().then(() => renderModalAudioList());
      modal.style.display = 'flex';
      const search = $('assetAudioSearch');
      if (search) {
        search.value = '';
        search.focus();
      }
    }
  }

  function closeAudioPicker() {
    if (previewAudio) {
      try { previewAudio.pause(); } catch (_) {}
      previewAudio = null;
      activePlayingPath = null;
    }
    const modal = $('modalAssetAudioPicker');
    if (modal) modal.style.display = 'none';
    onSelectAudioCb = null;
  }

  function renderModalAudioList() {
    const listEl = $('assetAudioList');
    if (!listEl) return;
    const q = ($('assetAudioSearch')?.value || '').toLowerCase().trim();
    const filtered = audioFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    const countEl = $('assetAudioPickerCount');
    if (countEl) countEl.textContent = `${filtered.length} file ditemukan`;

    const empty = $('assetAudioEmptyState');
    if (filtered.length === 0) {
      if (empty) empty.style.display = 'block';
      listEl.innerHTML = '';
      return;
    }

    if (empty) empty.style.display = 'none';

    listEl.innerHTML = filtered.map(f => {
      const isPlaying = activePlayingPath === f.path;
      return `
        <div class="asset-modal-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; margin-bottom:6px; border-radius:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); cursor:pointer;">
          <div class="asset-modal-info" style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;" data-path="${escapeHtml(f.path)}">
            <span style="font-size:16px;">🔊</span>
            <div style="overflow:hidden;">
              <div style="font-size:12.5px; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${escapeHtml(f.name)}</div>
              <div style="font-size:10.5px; color:var(--text-muted); font-family:monospace; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${escapeHtml(f.path)}</div>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button type="button" class="btn btn-ghost btn-sm btn-modal-preview ${isPlaying ? 'is-playing' : ''}" data-path="${escapeHtml(f.path)}" style="padding:4px 10px; font-size:11px;">
              ${isPlaying ? '⏹ Stop' : '▶ Putar'}
            </button>
            <button type="button" class="btn btn-primary btn-sm btn-modal-choose" data-path="${escapeHtml(f.path)}" style="padding:4px 12px; font-size:11px;">
              Pilih
            </button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.btn-modal-choose').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.getAttribute('data-path');
        if (onSelectAudioCb) onSelectAudioCb(p);
        closeAudioPicker();
      });
    });

    listEl.querySelectorAll('.asset-modal-info').forEach(el => {
      el.addEventListener('click', () => {
        const p = el.getAttribute('data-path');
        if (onSelectAudioCb) onSelectAudioCb(p);
        closeAudioPicker();
      });
    });

    listEl.querySelectorAll('.btn-modal-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.getAttribute('data-path');
        playAudioPreview(p, (playing) => {
          btn.classList.toggle('is-playing', playing);
          btn.innerHTML = playing ? '⏹ Stop' : '▶ Putar';
        });
      });
    });
  }

  // 6. Modal Media Picker
  function openMediaPicker(onSelect) {
    onSelectMediaCb = onSelect;
    const modal = $('modalAssetMediaPicker');
    if (modal) {
      const sub = $('assetMediaPickerSubtitle');
      if (sub) {
        sub.textContent = mediaFolderPath ? `Folder: ${mediaFolderPath}` : 'Folder: Belum dikonfigurasi';
      }
      scanMediaFolder().then(() => renderModalMediaList());
      modal.style.display = 'flex';
      const search = $('assetMediaSearch');
      if (search) {
        search.value = '';
        search.focus();
      }
    }
  }

  function closeMediaPicker() {
    const modal = $('modalAssetMediaPicker');
    if (modal) modal.style.display = 'none';
    onSelectMediaCb = null;
  }

  function renderModalMediaList() {
    const listEl = $('assetMediaList');
    if (!listEl) return;
    const q = ($('assetMediaSearch')?.value || '').toLowerCase().trim();
    const filtered = mediaFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    const countEl = $('assetMediaPickerCount');
    if (countEl) countEl.textContent = `${filtered.length} file ditemukan`;

    const empty = $('assetMediaEmptyState');
    if (filtered.length === 0) {
      if (empty) empty.style.display = 'block';
      listEl.innerHTML = '';
      return;
    }

    if (empty) empty.style.display = 'none';

    listEl.innerHTML = filtered.map(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
      const mediaUrl = `http://localhost:${overlayPort}/api/media?path=${encodeURIComponent(f.path)}`;
      return `
        <div class="asset-modal-media-card" data-path="${escapeHtml(f.path)}" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px; cursor:pointer; display:flex; flex-direction:column; gap:6px;">
          <div style="width:100%; height:80px; border-radius:4px; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center;">
            ${isVideo
              ? `<video src="${mediaUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" muted></video>`
              : `<img src="${mediaUrl}" alt="${escapeHtml(f.name)}" style="max-width:100%; max-height:100%; object-fit:contain;" loading="lazy" />`
            }
          </div>
          <div style="font-size:11px; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
          <button type="button" class="btn btn-primary btn-sm btn-select-media" data-path="${escapeHtml(f.path)}" style="width:100%; padding:2px 0; font-size:10.5px;">
            Pilih Media
          </button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.asset-modal-media-card').forEach(card => {
      card.addEventListener('click', () => {
        const p = card.getAttribute('data-path');
        if (onSelectMediaCb) onSelectMediaCb(p);
        closeMediaPicker();
      });
    });
  }

  // 7. Modal Gift Picker
  function openGiftPicker(onSelect) {
    onSelectGiftCb = onSelect;
    const modal = $('modalAssetGiftPicker');
    if (modal) {
      const sub = $('assetGiftPickerSubtitle');
      if (sub) {
        sub.textContent = giftFolderPath ? `Folder: ${giftFolderPath}` : 'Folder: Belum dikonfigurasi';
      }
      scanGiftFolder().then(() => renderModalGiftList());
      modal.style.display = 'flex';
      const search = $('assetGiftSearch');
      if (search) {
        search.value = '';
        search.focus();
      }
    }
  }

  function closeGiftPicker() {
    const modal = $('modalAssetGiftPicker');
    if (modal) modal.style.display = 'none';
    onSelectGiftCb = null;
  }

  function renderModalGiftList() {
    const listEl = $('assetGiftList');
    if (!listEl) return;
    const q = ($('assetGiftSearch')?.value || '').toLowerCase().trim();
    const filtered = giftFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    const countEl = $('assetGiftPickerCount');
    if (countEl) countEl.textContent = `${filtered.length} file ditemukan`;

    const empty = $('assetGiftEmptyState');
    if (filtered.length === 0) {
      if (empty) empty.style.display = 'block';
      listEl.innerHTML = '';
      return;
    }

    if (empty) empty.style.display = 'none';

    listEl.innerHTML = filtered.map(f => {
      const mediaUrl = `http://localhost:${overlayPort}/api/media?path=${encodeURIComponent(f.path)}`;
      return `
        <div class="asset-modal-media-card" data-path="${escapeHtml(f.path)}" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px; cursor:pointer; display:flex; flex-direction:column; gap:6px;">
          <div style="width:100%; height:80px; border-radius:4px; overflow:hidden; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
            <img src="${mediaUrl}" alt="${escapeHtml(f.name)}" style="max-width:100%; max-height:100%; object-fit:contain;" loading="lazy" />
          </div>
          <div style="font-size:11px; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
          <button type="button" class="btn btn-primary btn-sm btn-select-gift" data-path="${escapeHtml(f.path)}" style="width:100%; padding:2px 0; font-size:10.5px;">
            Pilih Gift
          </button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.asset-modal-media-card').forEach(card => {
      card.addEventListener('click', () => {
        const p = card.getAttribute('data-path');
        if (onSelectGiftCb) onSelectGiftCb(p);
        closeGiftPicker();
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 8. Save Folder Paths to Config & LocalStorage
  function saveFolderPaths() {
    try {
      localStorage.setItem('asset_audio_folder', audioFolderPath || '');
      localStorage.setItem('asset_media_folder', mediaFolderPath || '');
      localStorage.setItem('asset_gift_folder', giftFolderPath || '');
    } catch (_) {}

    if (window.api && window.api.updateConfig) {
      window.api.updateConfig({
        assetFolders: {
          audio: audioFolderPath,
          media: mediaFolderPath,
          gift: giftFolderPath
        }
      }).catch(console.warn);
    }
  }

  // 9. Initialize & Bind DOM
  async function init() {
    // Load saved folder paths from Config or LocalStorage
    if (window.api && window.api.getConfig) {
      try {
        const cfg = await window.api.getConfig();
        if (cfg?.overlayPort) overlayPort = cfg.overlayPort;
        const af = cfg?.assetFolders || {};
        audioFolderPath = af.audio || localStorage.getItem('asset_audio_folder') || $('folderAudioPath')?.value?.trim() || '';
        mediaFolderPath = af.media || localStorage.getItem('asset_media_folder') || $('folderMediaPath')?.value?.trim() || '';
        giftFolderPath = af.gift || localStorage.getItem('asset_gift_folder') || $('folderGiftPath')?.value?.trim() || '';
      } catch (err) {
        audioFolderPath = localStorage.getItem('asset_audio_folder') || $('folderAudioPath')?.value?.trim() || '';
        mediaFolderPath = localStorage.getItem('asset_media_folder') || $('folderMediaPath')?.value?.trim() || '';
        giftFolderPath = localStorage.getItem('asset_gift_folder') || $('folderGiftPath')?.value?.trim() || '';
      }
    } else {
      audioFolderPath = localStorage.getItem('asset_audio_folder') || $('folderAudioPath')?.value?.trim() || '';
      mediaFolderPath = localStorage.getItem('asset_media_folder') || $('folderMediaPath')?.value?.trim() || '';
      giftFolderPath = localStorage.getItem('asset_gift_folder') || $('folderGiftPath')?.value?.trim() || '';
    }

    if ($('folderAudioPath') && audioFolderPath) $('folderAudioPath').value = audioFolderPath;
    if ($('folderMediaPath') && mediaFolderPath) $('folderMediaPath').value = mediaFolderPath;
    if ($('folderGiftPath') && giftFolderPath) $('folderGiftPath').value = giftFolderPath;

    if (audioFolderPath) scanAudioFolder();
    if (mediaFolderPath) scanMediaFolder();
    if (giftFolderPath) scanGiftFolder();

    // Rebind Audio Folder Controls (purging any duplicate listeners)
    rebind($('btnPickAudioFolder'), 'click', async () => {
      if (!window.api || !window.api.pickFolder) return;
      const selected = await window.api.pickFolder();
      if (selected) {
        audioFolderPath = selected;
        if ($('folderAudioPath')) $('folderAudioPath').value = selected;
        saveFolderPaths();
        scanAudioFolder();
      }
    });

    rebind($('btnScanAudioFolder'), 'click', () => scanAudioFolder());

    rebind($('btnAddFileToAudioFolder'), 'click', async () => {
      if (!audioFolderPath) {
        alert('Silakan pilih folder audio terlebih dahulu.');
        return;
      }
      if (window.api && window.api.addFolderFile) {
        const added = await window.api.addFolderFile(audioFolderPath, 'sound');
        if (added) scanAudioFolder();
      }
    });

    rebind($('btnOpenAudioFolderExplorer'), 'click', () => {
      if (!audioFolderPath) {
        alert('Folder audio belum ditentukan.');
        return;
      }
      if (window.api && window.api.openFolderInExplorer) {
        window.api.openFolderInExplorer(audioFolderPath);
      }
    });

    if ($('audioQuickSearch')) {
      $('audioQuickSearch').addEventListener('input', renderAudioQuickList);
    }

    // Rebind Media Folder Controls
    rebind($('btnPickMediaFolder'), 'click', async () => {
      if (!window.api || !window.api.pickFolder) return;
      const selected = await window.api.pickFolder();
      if (selected) {
        mediaFolderPath = selected;
        if ($('folderMediaPath')) $('folderMediaPath').value = selected;
        saveFolderPaths();
        scanMediaFolder();
      }
    });

    rebind($('btnScanMediaFolder'), 'click', () => scanMediaFolder());

    rebind($('btnAddFileToMediaFolder'), 'click', async () => {
      if (!mediaFolderPath) {
        alert('Silakan pilih folder media terlebih dahulu.');
        return;
      }
      if (window.api && window.api.addFolderFile) {
        const added = await window.api.addFolderFile(mediaFolderPath, 'media');
        if (added) scanMediaFolder();
      }
    });

    rebind($('btnOpenMediaFolderExplorer'), 'click', () => {
      if (!mediaFolderPath) {
        alert('Folder media belum ditentukan.');
        return;
      }
      if (window.api && window.api.openFolderInExplorer) {
        window.api.openFolderInExplorer(mediaFolderPath);
      }
    });

    if ($('mediaQuickSearch')) {
      $('mediaQuickSearch').addEventListener('input', renderMediaQuickList);
    }

    // Rebind Gift Folder Controls
    rebind($('btnPickGiftFolder'), 'click', async () => {
      if (!window.api || !window.api.pickFolder) return;
      const selected = await window.api.pickFolder();
      if (selected) {
        giftFolderPath = selected;
        if ($('folderGiftPath')) $('folderGiftPath').value = selected;
        saveFolderPaths();
        scanGiftFolder();
      }
    });

    rebind($('btnScanGiftFolder'), 'click', () => scanGiftFolder());

    rebind($('btnAddFileToGiftFolder'), 'click', async () => {
      if (!giftFolderPath) {
        alert('Silakan pilih folder gift terlebih dahulu.');
        return;
      }
      if (window.api && window.api.addFolderFile) {
        const added = await window.api.addFolderFile(giftFolderPath, 'gift');
        if (added) scanGiftFolder();
      }
    });

    rebind($('btnOpenGiftFolderExplorer'), 'click', () => {
      if (!giftFolderPath) {
        alert('Folder gift belum ditentukan.');
        return;
      }
      if (window.api && window.api.openFolderInExplorer) {
        window.api.openFolderInExplorer(giftFolderPath);
      }
    });

    if ($('giftQuickSearch')) {
      $('giftQuickSearch').addEventListener('input', renderGiftQuickList);
    }

    // Audio Modal Controls (Single bound via rebind to eliminate double dialog)
    rebind($('btnCloseAssetAudioPicker'), 'click', closeAudioPicker);
    rebind($('btnCancelAssetAudioPicker'), 'click', closeAudioPicker);
    if ($('assetAudioSearch')) $('assetAudioSearch').addEventListener('input', renderModalAudioList);
    rebind($('btnAssetAudioAddFile'), 'click', async () => {
      if (audioFolderPath && window.api && window.api.addFolderFile) {
        const added = await window.api.addFolderFile(audioFolderPath, 'sound');
        if (added) scanAudioFolder();
      } else {
        alert('Silakan tentukan folder audio di tab Pengaturan terlebih dahulu.');
      }
    });
    rebind($('btnAssetAudioBrowseManual'), 'click', async () => {
      if (window.api && window.api.pickSoundFile) {
        const filePath = await window.api.pickSoundFile();
        if (filePath && onSelectAudioCb) {
          onSelectAudioCb(filePath);
          closeAudioPicker();
        }
      }
    });

    // Media Modal Controls (Single bound via rebind)
    rebind($('btnCloseAssetMediaPicker'), 'click', closeMediaPicker);
    rebind($('btnCancelAssetMediaPicker'), 'click', closeMediaPicker);
    if ($('assetMediaSearch')) $('assetMediaSearch').addEventListener('input', renderModalMediaList);
    rebind($('btnAssetMediaAddFile'), 'click', async () => {
      if (mediaFolderPath && window.api && window.api.addFolderFile) {
        const added = await window.api.addFolderFile(mediaFolderPath, 'media');
        if (added) scanMediaFolder();
      } else {
        alert('Silakan tentukan folder media di tab Pengaturan terlebih dahulu.');
      }
    });
    rebind($('btnAssetMediaBrowseManual'), 'click', async () => {
      if (window.api && window.api.pickMediaFile) {
        const filePath = await window.api.pickMediaFile();
        if (filePath && onSelectMediaCb) {
          onSelectMediaCb(filePath);
          closeMediaPicker();
        }
      }
    });

    // Gift Modal Controls (Single bound via rebind)
    rebind($('btnCloseAssetGiftPicker'), 'click', closeGiftPicker);
    rebind($('btnCancelAssetGiftPicker'), 'click', closeGiftPicker);
    if ($('assetGiftSearch')) $('assetGiftSearch').addEventListener('input', renderModalGiftList);
    rebind($('btnAssetGiftAddFile'), 'click', async () => {
      if (giftFolderPath && window.api && window.api.addFolderFile) {
        const added = await window.api.addFolderFile(giftFolderPath, 'gift');
        if (added) scanGiftFolder();
      } else {
        alert('Silakan tentukan folder gift di tab Pengaturan terlebih dahulu.');
      }
    });
    rebind($('btnAssetGiftBrowseManual'), 'click', async () => {
      if (window.api && window.api.pickMediaFile) {
        const filePath = await window.api.pickMediaFile();
        if (filePath && onSelectGiftCb) {
          onSelectGiftCb(filePath);
          closeGiftPicker();
        }
      }
    });

    // Rebind Interaksi Modal Pickers to guarantee opening configured folders
    rebind($('int_sound_pick'), 'click', () => {
      openAudioPicker((filePath) => {
        if (!filePath) return;
        const f = $('int_sound_file');
        const c = $('int_sound_enabled');
        if (f) f.value = filePath;
        if (c) c.checked = true;
      });
    });

    rebind($('int_media_pick'), 'click', () => {
      openMediaPicker((filePath) => {
        if (!filePath) return;
        const f = $('int_media_file');
        const c = $('int_media_enabled');
        if (f) f.value = filePath;
        if (c) c.checked = true;
      });
    });

    // Rebind Gift Form Pickers
    rebind($('btnPickGiftImageAdd'), 'click', () => {
      openGiftPicker((filePath) => {
        if (!filePath) return;
        const input = $('newGiftImage');
        if (input) input.value = filePath;
      });
    });

    rebind($('btnPickGiftImage'), 'click', () => {
      openGiftPicker((filePath) => {
        if (!filePath) return;
        const input = $('giftFormImage');
        if (input) {
          input.value = filePath;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
  }

  // Export to Global window for Soundboard & Interaction & Gift integration
  window.assetFolders = {
    openAudioPicker,
    openMediaPicker,
    openGiftPicker,
    scanAudio: scanAudioFolder,
    scanMedia: scanMediaFolder,
    scanGift: scanGiftFolder,
    getAudioFolder: () => audioFolderPath,
    getMediaFolder: () => mediaFolderPath,
    getGiftFolder: () => giftFolderPath
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Backup init to ensure bindings remain clean after app.js loads
  setTimeout(init, 500);
})();
