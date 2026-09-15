// renderer/js/assetFolders.js — Local Asset Folder Manager & Picker Controller
// Handles directory picking, real-time file scanning, quick preview with audio player,
// Windows Explorer launcher, and modal pickers for Soundboard & Interaction triggers.

(function () {
  let audioFiles = [];
  let mediaFiles = [];
  let audioFolderPath = '';
  let mediaFolderPath = '';
  let previewAudio = null;
  let activePlayingPath = null;

  // Active modal callbacks
  let onSelectAudioCb = null;
  let onSelectMediaCb = null;

  const els = {
    // Audio Folder Panel
    folderAudioPath: document.getElementById('folderAudioPath'),
    btnPickAudioFolder: document.getElementById('btnPickAudioFolder'),
    btnScanAudioFolder: document.getElementById('btnScanAudioFolder'),
    btnAddFileToAudioFolder: document.getElementById('btnAddFileToAudioFolder'),
    btnOpenAudioFolderExplorer: document.getElementById('btnOpenAudioFolderExplorer'),
    audioFolderCountBadge: document.getElementById('audioFolderCountBadge'),
    audioQuickSearch: document.getElementById('audioQuickSearch'),
    audioQuickList: document.getElementById('audioQuickList'),

    // Media Folder Panel
    folderMediaPath: document.getElementById('folderMediaPath'),
    btnPickMediaFolder: document.getElementById('btnPickMediaFolder'),
    btnScanMediaFolder: document.getElementById('btnScanMediaFolder'),
    btnAddFileToMediaFolder: document.getElementById('btnAddFileToMediaFolder'),
    btnOpenMediaFolderExplorer: document.getElementById('btnOpenMediaFolderExplorer'),
    mediaFolderCountBadge: document.getElementById('mediaFolderCountBadge'),
    mediaQuickSearch: document.getElementById('mediaQuickSearch'),
    mediaQuickList: document.getElementById('mediaQuickList'),

    // Audio Picker Modal
    modalAssetAudioPicker: document.getElementById('modalAssetAudioPicker'),
    btnCloseAssetAudioPicker: document.getElementById('btnCloseAssetAudioPicker'),
    btnCancelAssetAudioPicker: document.getElementById('btnCancelAssetAudioPicker'),
    assetAudioSubtitle: document.getElementById('assetAudioPickerSubtitle'),
    assetAudioSearch: document.getElementById('assetAudioSearch'),
    btnAssetAudioAddFile: document.getElementById('btnAssetAudioAddFile'),
    btnAssetAudioBrowseManual: document.getElementById('btnAssetAudioBrowseManual'),
    assetAudioEmptyState: document.getElementById('assetAudioEmptyState'),
    assetAudioList: document.getElementById('assetAudioList'),
    assetAudioPickerCount: document.getElementById('assetAudioPickerCount'),

    // Media Picker Modal
    modalAssetMediaPicker: document.getElementById('modalAssetMediaPicker'),
    btnCloseAssetMediaPicker: document.getElementById('btnCloseAssetMediaPicker'),
    btnCancelAssetMediaPicker: document.getElementById('btnCancelAssetMediaPicker'),
    assetMediaSubtitle: document.getElementById('assetMediaPickerSubtitle'),
    assetMediaSearch: document.getElementById('assetMediaSearch'),
    btnAssetMediaAddFile: document.getElementById('btnAssetMediaAddFile'),
    btnAssetMediaBrowseManual: document.getElementById('btnAssetMediaBrowseManual'),
    assetMediaEmptyState: document.getElementById('assetMediaEmptyState'),
    assetMediaList: document.getElementById('assetMediaList'),
    assetMediaPickerCount: document.getElementById('assetMediaPickerCount')
  };

  let overlayPort = 8642;

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
    audio.onerror = (e) => {
      console.warn('[AssetFolders] file:// audio error, trying HTTP media fallback...');
      const fallbackUrl = `http://localhost:${overlayPort}/api/media?path=${encodeURIComponent(filePath)}`;
      const fbAudio = new Audio(fallbackUrl);
      previewAudio = fbAudio;
      fbAudio.onended = cleanup;
      fbAudio.onerror = cleanup;
      fbAudio.play().catch(cleanup);
    };

    audio.play().catch(err => {
      console.warn('[AssetFolders] audio.play() error, trying HTTP fallback:', err);
      const fallbackUrl = `http://localhost:${overlayPort}/api/media?path=${encodeURIComponent(filePath)}`;
      const fbAudio = new Audio(fallbackUrl);
      previewAudio = fbAudio;
      fbAudio.onended = cleanup;
      fbAudio.onerror = cleanup;
      fbAudio.play().catch(cleanup);
    });
  }

  // 2. Scan & Populate Audio Folder
  async function scanAudioFolder() {
    if (!audioFolderPath) {
      if (els.folderAudioPath && els.folderAudioPath.value) {
        audioFolderPath = els.folderAudioPath.value.trim();
      }
    }
    if (!audioFolderPath && window.api && window.api.getConfig) {
      try {
        const cfg = await window.api.getConfig();
        if (cfg?.assetFolders?.audio) {
          audioFolderPath = cfg.assetFolders.audio;
          if (els.folderAudioPath) els.folderAudioPath.value = audioFolderPath;
        }
      } catch (_) {}
    }

    if (!audioFolderPath || !window.api || !window.api.listFolderMedia) {
      audioFiles = [];
      renderAudioQuickList();
      return;
    }

    if (els.btnScanAudioFolder) {
      els.btnScanAudioFolder.textContent = '🔄 Scanning...';
      els.btnScanAudioFolder.disabled = true;
    }

    try {
      const list = await window.api.listFolderMedia(audioFolderPath, 'sound');
      audioFiles = Array.isArray(list) ? list.map(item => {
        if (typeof item === 'string') {
          return { name: item, path: audioFolderPath + '\\' + item };
        }
        return item;
      }) : [];

      if (els.audioFolderCountBadge) {
        els.audioFolderCountBadge.textContent = `${audioFiles.length} audio`;
      }
      renderAudioQuickList();
      renderModalAudioList();
      if (els.btnScanAudioFolder) {
        els.btnScanAudioFolder.textContent = `✓ ${audioFiles.length} Audio`;
        setTimeout(() => {
          if (els.btnScanAudioFolder) {
            els.btnScanAudioFolder.textContent = ' Refresh / Scan';
            els.btnScanAudioFolder.disabled = false;
          }
        }, 1500);
      }
    } catch (err) {
      console.warn('[AssetFolders] Gagal scan folder audio:', err);
      if (els.btnScanAudioFolder) {
        els.btnScanAudioFolder.textContent = ' Refresh / Scan';
        els.btnScanAudioFolder.disabled = false;
      }
    }
  }

  function renderAudioQuickList() {
    if (!els.audioQuickList) return;
    const q = (els.audioQuickSearch?.value || '').toLowerCase().trim();
    const filtered = audioFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    if (!audioFolderPath) {
      els.audioQuickList.innerHTML = '<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">Pilih folder audio di atas untuk melihat daftar file.</span>';
      return;
    }

    if (filtered.length === 0) {
      els.audioQuickList.innerHTML = `<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">${q ? 'Tidak ada file audio cocok dengan pencarian.' : 'Folder kosong atau belum ada file audio.'}</span>`;
      return;
    }

    els.audioQuickList.innerHTML = filtered.map(f => {
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

    // Wire preview buttons
    els.audioQuickList.querySelectorAll('.btn-preview-audio').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-path');
        playAudioPreview(p, (playing) => {
          btn.classList.toggle('is-playing', playing);
          btn.innerHTML = playing ? '⏹ Stop' : '▶ Putar';
        });
      });
    });
  }

  // 3. Scan & Populate Media Folder
  async function scanMediaFolder() {
    if (!mediaFolderPath) {
      if (els.folderMediaPath && els.folderMediaPath.value) {
        mediaFolderPath = els.folderMediaPath.value.trim();
      }
    }
    if (!mediaFolderPath && window.api && window.api.getConfig) {
      try {
        const cfg = await window.api.getConfig();
        if (cfg?.assetFolders?.media) {
          mediaFolderPath = cfg.assetFolders.media;
          if (els.folderMediaPath) els.folderMediaPath.value = mediaFolderPath;
        }
      } catch (_) {}
    }

    if (!mediaFolderPath || !window.api || !window.api.listFolderMedia) {
      mediaFiles = [];
      renderMediaQuickList();
      return;
    }

    if (els.btnScanMediaFolder) {
      els.btnScanMediaFolder.textContent = '🔄 Scanning...';
      els.btnScanMediaFolder.disabled = true;
    }

    try {
      const list = await window.api.listFolderMedia(mediaFolderPath, 'media');
      mediaFiles = Array.isArray(list) ? list.map(item => {
        if (typeof item === 'string') {
          return { name: item, path: mediaFolderPath + '\\' + item };
        }
        return item;
      }) : [];

      if (els.mediaFolderCountBadge) {
        els.mediaFolderCountBadge.textContent = `${mediaFiles.length} media`;
      }
      renderMediaQuickList();
      renderModalMediaList();
      if (els.btnScanMediaFolder) {
        els.btnScanMediaFolder.textContent = `✓ ${mediaFiles.length} Media`;
        setTimeout(() => {
          if (els.btnScanMediaFolder) {
            els.btnScanMediaFolder.textContent = ' Refresh / Scan';
            els.btnScanMediaFolder.disabled = false;
          }
        }, 1500);
      }
    } catch (err) {
      console.warn('[AssetFolders] Gagal scan folder media:', err);
      if (els.btnScanMediaFolder) {
        els.btnScanMediaFolder.textContent = ' Refresh / Scan';
        els.btnScanMediaFolder.disabled = false;
      }
    }
  }

  function renderMediaQuickList() {
    if (!els.mediaQuickList) return;
    const q = (els.mediaQuickSearch?.value || '').toLowerCase().trim();
    const filtered = mediaFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    if (!mediaFolderPath) {
      els.mediaQuickList.innerHTML = '<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">Pilih folder media di atas untuk melihat daftar file.</span>';
      return;
    }

    if (filtered.length === 0) {
      els.mediaQuickList.innerHTML = `<span class="muted" style="font-size:11px;padding:8px 4px;display:block;">${q ? 'Tidak ada media cocok dengan pencarian.' : 'Folder kosong atau belum ada file media.'}</span>`;
      return;
    }

    els.mediaQuickList.innerHTML = filtered.map(f => {
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

  // 4. Modal Audio Picker Implementation
  function openAudioPicker(onSelect) {
    onSelectAudioCb = onSelect;
    if (els.modalAssetAudioPicker) {
      if (els.assetAudioSubtitle) {
        els.assetAudioSubtitle.textContent = audioFolderPath ? `Folder: ${audioFolderPath}` : 'Folder: Belum dikonfigurasi';
      }
      renderModalAudioList();
      els.modalAssetAudioPicker.style.display = 'flex';
      if (els.assetAudioSearch) {
        els.assetAudioSearch.value = '';
        els.assetAudioSearch.focus();
      }
    }
  }

  function closeAudioPicker() {
    if (previewAudio) {
      try { previewAudio.pause(); } catch (_) {}
      previewAudio = null;
      activePlayingPath = null;
    }
    if (els.modalAssetAudioPicker) {
      els.modalAssetAudioPicker.style.display = 'none';
    }
    onSelectAudioCb = null;
  }

  function renderModalAudioList() {
    if (!els.assetAudioList) return;
    const q = (els.assetAudioSearch?.value || '').toLowerCase().trim();
    const filtered = audioFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    if (els.assetAudioPickerCount) {
      els.assetAudioPickerCount.textContent = `${filtered.length} file ditemukan`;
    }

    if (filtered.length === 0) {
      if (els.assetAudioEmptyState) els.assetAudioEmptyState.style.display = 'block';
      els.assetAudioList.innerHTML = '';
      return;
    }

    if (els.assetAudioEmptyState) els.assetAudioEmptyState.style.display = 'none';

    els.assetAudioList.innerHTML = filtered.map(f => {
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

    // Click row or Pilih button
    els.assetAudioList.querySelectorAll('.btn-modal-choose').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.getAttribute('data-path');
        if (onSelectAudioCb) onSelectAudioCb(p);
        closeAudioPicker();
      });
    });

    els.assetAudioList.querySelectorAll('.asset-modal-info').forEach(el => {
      el.addEventListener('click', () => {
        const p = el.getAttribute('data-path');
        if (onSelectAudioCb) onSelectAudioCb(p);
        closeAudioPicker();
      });
    });

    els.assetAudioList.querySelectorAll('.btn-modal-preview').forEach(btn => {
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

  // 5. Modal Media Picker Implementation
  function openMediaPicker(onSelect) {
    onSelectMediaCb = onSelect;
    if (els.modalAssetMediaPicker) {
      if (els.assetMediaSubtitle) {
        els.assetMediaSubtitle.textContent = mediaFolderPath ? `Folder: ${mediaFolderPath}` : 'Folder: Belum dikonfigurasi';
      }
      renderModalMediaList();
      els.modalAssetMediaPicker.style.display = 'flex';
      if (els.assetMediaSearch) {
        els.assetMediaSearch.value = '';
        els.assetMediaSearch.focus();
      }
    }
  }

  function closeMediaPicker() {
    if (els.modalAssetMediaPicker) {
      els.modalAssetMediaPicker.style.display = 'none';
    }
    onSelectMediaCb = null;
  }

  function renderModalMediaList() {
    if (!els.assetMediaList) return;
    const q = (els.assetMediaSearch?.value || '').toLowerCase().trim();
    const filtered = mediaFiles.filter(f => !q || f.name.toLowerCase().includes(q));

    if (els.assetMediaPickerCount) {
      els.assetMediaPickerCount.textContent = `${filtered.length} file ditemukan`;
    }

    if (filtered.length === 0) {
      if (els.assetMediaEmptyState) els.assetMediaEmptyState.style.display = 'block';
      els.assetMediaList.innerHTML = '';
      return;
    }

    if (els.assetMediaEmptyState) els.assetMediaEmptyState.style.display = 'none';

    els.assetMediaList.innerHTML = filtered.map(f => {
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

    els.assetMediaList.querySelectorAll('.asset-modal-media-card').forEach(card => {
      card.addEventListener('click', () => {
        const p = card.getAttribute('data-path');
        if (onSelectMediaCb) onSelectMediaCb(p);
        closeMediaPicker();
      });
    });
  }

  // Helper escape
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 6. Save Folder Paths to Config
  function saveFolderPaths() {
    if (window.api && window.api.updateConfig) {
      window.api.updateConfig({
        assetFolders: {
          audio: audioFolderPath,
          media: mediaFolderPath
        }
      }).catch(console.warn);
    }
  }

  // 7. Initialize & Bind DOM
  async function init() {
    // Load saved folder paths from Config
    if (window.api && window.api.getConfig) {
      try {
        const cfg = await window.api.getConfig();
        if (cfg?.overlayPort) overlayPort = cfg.overlayPort;
        const af = cfg?.assetFolders || {};
        if (af.audio) {
          audioFolderPath = af.audio;
          if (els.folderAudioPath) els.folderAudioPath.value = audioFolderPath;
          scanAudioFolder();
        } else if (els.folderAudioPath && els.folderAudioPath.value) {
          audioFolderPath = els.folderAudioPath.value.trim();
          scanAudioFolder();
        }
        if (af.media) {
          mediaFolderPath = af.media;
          if (els.folderMediaPath) els.folderMediaPath.value = mediaFolderPath;
          scanMediaFolder();
        } else if (els.folderMediaPath && els.folderMediaPath.value) {
          mediaFolderPath = els.folderMediaPath.value.trim();
          scanMediaFolder();
        }
      } catch (err) {
        console.warn('[AssetFolders] Failed to load config:', err);
      }
    }

    // Audio Folder Controls
    if (els.btnPickAudioFolder) {
      els.btnPickAudioFolder.addEventListener('click', async () => {
        if (!window.api || !window.api.pickFolder) return;
        const selected = await window.api.pickFolder();
        if (selected) {
          audioFolderPath = selected;
          if (els.folderAudioPath) els.folderAudioPath.value = selected;
          saveFolderPaths();
          scanAudioFolder();
        }
      });
    }

    if (els.btnScanAudioFolder) {
      els.btnScanAudioFolder.addEventListener('click', () => scanAudioFolder());
    }

    if (els.btnAddFileToAudioFolder) {
      els.btnAddFileToAudioFolder.addEventListener('click', async () => {
        if (!audioFolderPath) {
          alert('Silakan pilih folder audio terlebih dahulu.');
          return;
        }
        if (window.api && window.api.addFolderFile) {
          const added = await window.api.addFolderFile(audioFolderPath, 'sound');
          if (added) scanAudioFolder();
        }
      });
    }

    if (els.btnOpenAudioFolderExplorer) {
      els.btnOpenAudioFolderExplorer.addEventListener('click', () => {
        if (!audioFolderPath) {
          alert('Folder audio belum ditentukan.');
          return;
        }
        if (window.api && window.api.openFolderInExplorer) {
          window.api.openFolderInExplorer(audioFolderPath);
        }
      });
    }

    if (els.audioQuickSearch) {
      els.audioQuickSearch.addEventListener('input', renderAudioQuickList);
    }

    // Media Folder Controls
    if (els.btnPickMediaFolder) {
      els.btnPickMediaFolder.addEventListener('click', async () => {
        if (!window.api || !window.api.pickFolder) return;
        const selected = await window.api.pickFolder();
        if (selected) {
          mediaFolderPath = selected;
          if (els.folderMediaPath) els.folderMediaPath.value = selected;
          saveFolderPaths();
          scanMediaFolder();
        }
      });
    }

    if (els.btnScanMediaFolder) {
      els.btnScanMediaFolder.addEventListener('click', () => scanMediaFolder());
    }

    if (els.btnAddFileToMediaFolder) {
      els.btnAddFileToMediaFolder.addEventListener('click', async () => {
        if (!mediaFolderPath) {
          alert('Silakan pilih folder media terlebih dahulu.');
          return;
        }
        if (window.api && window.api.addFolderFile) {
          const added = await window.api.addFolderFile(mediaFolderPath, 'media');
          if (added) scanMediaFolder();
        }
      });
    }

    if (els.btnOpenMediaFolderExplorer) {
      els.btnOpenMediaFolderExplorer.addEventListener('click', () => {
        if (!mediaFolderPath) {
          alert('Folder media belum ditentukan.');
          return;
        }
        if (window.api && window.api.openFolderInExplorer) {
          window.api.openFolderInExplorer(mediaFolderPath);
        }
      });
    }

    if (els.mediaQuickSearch) {
      els.mediaQuickSearch.addEventListener('input', renderMediaQuickList);
    }

    // Audio Modal Controls
    if (els.btnCloseAssetAudioPicker) els.btnCloseAssetAudioPicker.addEventListener('click', closeAudioPicker);
    if (els.btnCancelAssetAudioPicker) els.btnCancelAssetAudioPicker.addEventListener('click', closeAudioPicker);
    if (els.assetAudioSearch) els.assetAudioSearch.addEventListener('input', renderModalAudioList);
    if (els.btnAssetAudioAddFile) {
      els.btnAssetAudioAddFile.addEventListener('click', async () => {
        if (audioFolderPath && window.api && window.api.addFolderFile) {
          const added = await window.api.addFolderFile(audioFolderPath, 'sound');
          if (added) scanAudioFolder();
        } else {
          alert('Silakan tentukan folder audio di tab Pengaturan terlebih dahulu.');
        }
      });
    }
    if (els.btnAssetAudioBrowseManual) {
      els.btnAssetAudioBrowseManual.addEventListener('click', async () => {
        if (window.api && window.api.pickSoundFile) {
          const filePath = await window.api.pickSoundFile();
          if (filePath && onSelectAudioCb) {
            onSelectAudioCb(filePath);
            closeAudioPicker();
          }
        }
      });
    }

    // Media Modal Controls
    if (els.btnCloseAssetMediaPicker) els.btnCloseAssetMediaPicker.addEventListener('click', closeMediaPicker);
    if (els.btnCancelAssetMediaPicker) els.btnCancelAssetMediaPicker.addEventListener('click', closeMediaPicker);
    if (els.assetMediaSearch) els.assetMediaSearch.addEventListener('input', renderModalMediaList);
    if (els.btnAssetMediaAddFile) {
      els.btnAssetMediaAddFile.addEventListener('click', async () => {
        if (mediaFolderPath && window.api && window.api.addFolderFile) {
          const added = await window.api.addFolderFile(mediaFolderPath, 'media');
          if (added) scanMediaFolder();
        } else {
          alert('Silakan tentukan folder media di tab Pengaturan terlebih dahulu.');
        }
      });
    }
    if (els.btnAssetMediaBrowseManual) {
      els.btnAssetMediaBrowseManual.addEventListener('click', async () => {
        if (window.api && window.api.pickMediaFile) {
          const filePath = await window.api.pickMediaFile();
          if (filePath && onSelectMediaCb) {
            onSelectMediaCb(filePath);
            closeMediaPicker();
          }
        }
      });
    }
  }

  // Export to Global window for Soundboard & Interaction integration
  window.assetFolders = {
    openAudioPicker,
    openMediaPicker,
    scanAudio: scanAudioFolder,
    scanMedia: scanMediaFolder,
    getAudioFolder: () => audioFolderPath,
    getMediaFolder: () => mediaFolderPath
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
