/**
 * interactionsController.js
 * Controller lengkap untuk Action Library / Daftar Interaksi:
 * - Menangani tombol Tambah Interaksi & Modal Interaksi (#interactionModal, #interactionForm)
 * - Menangani konfigurasi: Keyboard, Sound, Gambar/Video
 * - Menangani opsi: "Jalankan Suara & Gambar/Video bersamaan saat Keystroke aktif (tanpa menunggu delay)" (#int_simultaneous)
 * - Menangani tombol Test Run Aksi (#int_testRun)
 * - Menangani Daftar Interaksi (#interactionList), Search, Edit, Delete, dan Reset (#btnResetInteractionsOnly)
 */

(function () {
  'use strict';

  let cachedInteractions = [];

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getBaseFileName(pathStr) {
    if (!pathStr) return '';
    const clean = String(pathStr).replace(/\\/g, '/');
    const parts = clean.split('/');
    return parts[parts.length - 1] || pathStr;
  }

  function convertToMs(val, unit) {
    const num = parseFloat(val) || 0;
    if (unit === 's') return Math.round(num * 1000);
    if (unit === 'm') return Math.round(num * 60000);
    return Math.round(num); // ms default
  }

  // ═════════════════════════════════════════════════════════════════
  // 1. DATA FETCHING & RENDERING
  // ═════════════════════════════════════════════════════════════════

  async function loadInteractions() {
    try {
      if (window.api && window.api.getConfig) {
        const cfg = await window.api.getConfig();
        cachedInteractions = (cfg && Array.isArray(cfg.interactions)) ? cfg.interactions : [];
      }
    } catch (e) {
      console.warn('[Interactions] Gagal memuat interaksi:', e);
    }
    renderInteractionList();
  }

  function renderInteractionList() {
    const listEl = $('interactionList');
    const badgeEl = $('interactionCountBadge');
    if (!listEl) return;

    const searchTerm = ($('interactionSearchInput')?.value || '').toLowerCase().trim();
    let items = cachedInteractions || [];

    if (badgeEl) {
      badgeEl.textContent = `${items.length} interaksi`;
    }

    if (searchTerm) {
      items = items.filter(item => {
        const name = (item.name || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        const actionsStr = JSON.stringify(item.actions || '').toLowerCase();
        return name.includes(searchTerm) || id.includes(searchTerm) || actionsStr.includes(searchTerm);
      });
    }

    listEl.innerHTML = '';

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 32px 20px; text-align: center; color: var(--text-secondary); background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px; margin: 8px 0;">
          <div style="font-size: 28px; margin-bottom: 8px;">⚡</div>
          <div style="font-weight: 600; color: #f1f5f9; font-size: 14px; margin-bottom: 4px;">
            ${searchTerm ? 'Tidak ada interaksi yang cocok' : 'Belum ada aksi interaksi'}
          </div>
          <div style="font-size: 12px; max-width: 420px; margin: 0 auto; line-height: 1.5;">
            ${searchTerm ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Buat aksi interaksi baru untuk menghubungkan tombol keyboard, efek suara, dan gambar/video popup.'}
          </div>
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'interaction-card';
      card.dataset.id = item.id;
      card.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        margin-bottom: 10px;
        background: #131422;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        transition: all 0.2s ease;
        gap: 14px;
      `;

      // Build Action Badges
      const actionBadges = [];
      const isSimultaneous = item.simultaneous !== false;

      (item.actions || []).forEach(act => {
        if (act.type === 'key' && act.spec) {
          const delayTxt = act.delayMs ? ` (${act.delayMs}ms)` : '';
          actionBadges.push(`
            <span style="display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(255,215,0,0.12); color:#FFD700; border:1px solid rgba(255,215,0,0.25);">
              <span>⌨️</span> <strong>${escapeHtml(act.spec)}</strong>${delayTxt}
            </span>
          `);
        } else if (act.type === 'sound' && act.file) {
          const baseName = getBaseFileName(act.file);
          actionBadges.push(`
            <span style="display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(96,165,250,0.12); color:#60a5fa; border:1px solid rgba(96,165,250,0.25);" title="${escapeHtml(act.file)}">
              <span>🔊</span> <span>${escapeHtml(baseName)}</span>
            </span>
          `);
        } else if (act.type === 'media' && act.file) {
          const baseName = getBaseFileName(act.file);
          const durTxt = act.durationMs ? ` (${(act.durationMs / 1000).toFixed(1)}s)` : '';
          actionBadges.push(`
            <span style="display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(232,121,249,0.12); color:#e879f9; border:1px solid rgba(232,121,249,0.25);" title="${escapeHtml(act.file)}">
              <span>🖼️</span> <span>${escapeHtml(baseName)}</span>${durTxt}
            </span>
          `);
        }
      });

      // Simultaneous Indicator Badge
      const syncBadge = isSimultaneous
        ? `<span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3);" title="Suara & Gambar berjalan serentak bersamaan saat Keystroke aktif">⚡ BERSAMAAN</span>`
        : `<span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; background:rgba(148,163,184,0.15); color:#94a3b8; border:1px solid rgba(148,163,184,0.3);" title="Aksi dijalankan berurutan (menunggu jeda keystroke)">⏳ BERURUTAN</span>`;

      card.innerHTML = `
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #FFFFFF;">${escapeHtml(item.name || 'Interaksi')}</h4>
            ${syncBadge}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${actionBadges.length > 0 ? actionBadges.join('') : '<span class="muted" style="font-size:11px;">Belum ada aksi</span>'}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <button type="button" class="btn btn-ghost btn-sm btn-test-interaction" data-id="${escapeHtml(item.id)}" title="Uji eksekusi aksi sekarang (Keystroke, Suara, Gambar)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#fbbf24" />
            </svg>
            <span>Test</span>
          </button>
          <button type="button" class="btn btn-ghost btn-sm btn-edit-interaction" data-id="${escapeHtml(item.id)}" title="Edit Interaksi">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Edit</span>
          </button>
          <button type="button" class="btn btn-ghost btn-sm btn-delete-interaction" data-id="${escapeHtml(item.id)}" style="color: var(--color-error);" title="Hapus Interaksi">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      listEl.appendChild(card);
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // 2. MODAL FORM BUILDER & POPULATION
  // ═════════════════════════════════════════════════════════════════

  function openInteractionModal(editItem = null) {
    const modal = $('interactionModal');
    if (!modal) return;

    const titleEl = $('interactionFormTitle');
    const editIdEl = $('int_editing_id');
    const nameEl = $('int_name');

    // Keystroke inputs
    const keyEnabled = $('int_key_enabled');
    const keySpec = $('int_key_spec');
    const keyDelay = $('int_key_delay');
    const keyDelayUnit = $('int_key_delay_unit');
    const keyHold = $('int_key_hold');
    const keyHoldUnit = $('int_key_hold_unit');

    // Sound inputs
    const soundEnabled = $('int_sound_enabled');
    const soundFile = $('int_sound_file');

    // Media inputs
    const mediaEnabled = $('int_media_enabled');
    const mediaFile = $('int_media_file');
    const mediaDuration = $('int_media_duration');
    const mediaDurationUnit = $('int_media_duration_unit');

    // Simultaneous checkbox: "Jalankan Suara & Gambar/Video bersamaan saat Keystroke aktif"
    const simultaneousChk = $('int_simultaneous');

    const testRes = $('int_testResult');
    if (testRes) testRes.textContent = '';

    if (editItem) {
      if (titleEl) titleEl.textContent = 'Edit Interaksi';
      if (editIdEl) editIdEl.value = editItem.id || '';
      if (nameEl) nameEl.value = editItem.name || '';

      // Simultaneous setting (default true jika belum diset)
      if (simultaneousChk) {
        simultaneousChk.checked = (editItem.simultaneous !== false);
      }

      // Populate Keyboard
      const keyAction = (editItem.actions || []).find(a => a.type === 'key');
      if (keyAction) {
        if (keyEnabled) keyEnabled.checked = true;
        if (keySpec) keySpec.value = keyAction.spec || '';
        if (keyDelay) keyDelay.value = (keyAction.delayMs != null) ? keyAction.delayMs : 50;
        if (keyDelayUnit) keyDelayUnit.value = 'ms';
        if (keyHold) keyHold.value = (keyAction.holdMs != null) ? keyAction.holdMs : 0;
        if (keyHoldUnit) keyHoldUnit.value = 'ms';
      } else {
        if (keyEnabled) keyEnabled.checked = false;
        if (keySpec) keySpec.value = '';
        if (keyDelay) keyDelay.value = '50';
        if (keyHold) keyHold.value = '0';
      }

      // Populate Sound
      const soundAction = (editItem.actions || []).find(a => a.type === 'sound');
      if (soundAction) {
        if (soundEnabled) soundEnabled.checked = true;
        if (soundFile) soundFile.value = soundAction.file || '';
      } else {
        if (soundEnabled) soundEnabled.checked = false;
        if (soundFile) soundFile.value = '';
      }

      // Populate Media
      const mediaAction = (editItem.actions || []).find(a => a.type === 'media');
      if (mediaAction) {
        if (mediaEnabled) mediaEnabled.checked = true;
        if (mediaFile) mediaFile.value = mediaAction.file || '';
        const durSeconds = mediaAction.durationMs ? (mediaAction.durationMs / 1000) : 5;
        if (mediaDuration) mediaDuration.value = durSeconds;
        if (mediaDurationUnit) mediaDurationUnit.value = 's';
      } else {
        if (mediaEnabled) mediaEnabled.checked = false;
        if (mediaFile) mediaFile.value = '';
        if (mediaDuration) mediaDuration.value = '5';
        if (mediaDurationUnit) mediaDurationUnit.value = 's';
      }
    } else {
      // New Interaction mode
      if (titleEl) titleEl.textContent = 'Tambah Interaksi Baru';
      if (editIdEl) editIdEl.value = '';
      if (nameEl) nameEl.value = '';

      // Default: Simultaneous aktif agar suara dan gambar berjalan serentak saat keystroke aktif
      if (simultaneousChk) simultaneousChk.checked = true;

      if (keyEnabled) keyEnabled.checked = false;
      if (keySpec) keySpec.value = '';
      if (keyDelay) keyDelay.value = '50';
      if (keyDelayUnit) keyDelayUnit.value = 'ms';
      if (keyHold) keyHold.value = '0';
      if (keyHoldUnit) keyHoldUnit.value = 'ms';

      if (soundEnabled) soundEnabled.checked = false;
      if (soundFile) soundFile.value = '';

      if (mediaEnabled) mediaEnabled.checked = false;
      if (mediaFile) mediaFile.value = '';
      if (mediaDuration) mediaDuration.value = '5';
      if (mediaDurationUnit) mediaDurationUnit.value = 's';
    }

    modal.style.display = 'flex';
  }

  function closeInteractionModal() {
    const modal = $('interactionModal');
    if (modal) modal.style.display = 'none';
  }

  function gatherFormActions() {
    const actions = [];

    // 1. Keyboard Keystroke
    const keyEnabled = $('int_key_enabled')?.checked;
    const spec = $('int_key_spec')?.value?.trim();
    if (keyEnabled && spec) {
      const delayVal = $('int_key_delay')?.value || '50';
      const delayUnit = $('int_key_delay_unit')?.value || 'ms';
      const holdVal = $('int_key_hold')?.value || '0';
      const holdUnit = $('int_key_hold_unit')?.value || 'ms';

      actions.push({
        type: 'key',
        spec: spec,
        delayMs: convertToMs(delayVal, delayUnit),
        holdMs: convertToMs(holdVal, holdUnit)
      });
    }

    // 2. Sound Effect
    const soundEnabled = $('int_sound_enabled')?.checked;
    const soundPath = $('int_sound_file')?.value?.trim();
    if (soundEnabled && soundPath) {
      actions.push({
        type: 'sound',
        file: soundPath,
        volume: 100
      });
    }

    // 3. Media Gambar / Video
    const mediaEnabled = $('int_media_enabled')?.checked;
    const mediaPath = $('int_media_file')?.value?.trim();
    if (mediaEnabled && mediaPath) {
      const durVal = $('int_media_duration')?.value || '5';
      const durUnit = $('int_media_duration_unit')?.value || 's';
      const ext = mediaPath.split('.').pop().toLowerCase();
      const isVid = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext);

      actions.push({
        type: 'media',
        file: mediaPath,
        mediaType: isVid ? 'video' : 'image',
        durationMs: convertToMs(durVal, durUnit) || 5000
      });
    }

    return actions;
  }

  // ═════════════════════════════════════════════════════════════════
  // 3. SUBMIT & TEST EXECUTION
  // ═════════════════════════════════════════════════════════════════

  async function handleInteractionSubmit(e) {
    if (e) e.preventDefault();

    const name = $('int_name')?.value?.trim();
    if (!name) {
      alert('Mohon masukkan Nama Interaksi.');
      $('int_name')?.focus();
      return;
    }

    const actions = gatherFormActions();
    if (actions.length === 0) {
      alert('Pilih dan isi setidaknya satu aksi konfigurasi (Keyboard, Sound, atau Gambar/Video).');
      return;
    }

    const editId = $('int_editing_id')?.value?.trim();
    const simultaneous = $('int_simultaneous') ? $('int_simultaneous').checked : true;

    const interactionData = {
      name,
      simultaneous,
      actions
    };

    try {
      if (editId) {
        if (window.api && window.api.updateInteraction) {
          await window.api.updateInteraction(editId, interactionData);
        }
      } else {
        if (window.api && window.api.addInteraction) {
          await window.api.addInteraction(interactionData);
        }
      }

      closeInteractionModal();
      await loadInteractions();

      if (window.showGlassToast) {
        window.showGlassToast(`Interaksi "${name}" berhasil disimpan!`);
      }

      // Notify Activity modal to update checklists
      window.dispatchEvent(new CustomEvent('nurearn:interactionsUpdated'));
    } catch (err) {
      console.error('[Interactions] Gagal menyimpan interaksi:', err);
      alert('Gagal menyimpan interaksi: ' + err.message);
    }
  }

  async function handleTestRunAction(e) {
    if (e) e.preventDefault();
    const testResultEl = $('int_testResult');
    const actions = gatherFormActions();

    if (actions.length === 0) {
      if (testResultEl) {
        testResultEl.style.color = '#ef4444';
        testResultEl.textContent = 'Pilih & isi setidaknya satu aksi (Keyboard, Sound, atau Gambar) untuk ditest.';
      }
      return;
    }

    const simultaneous = $('int_simultaneous') ? $('int_simultaneous').checked : true;
    const name = $('int_name')?.value?.trim() || 'Uji Coba Interaksi';

    if (testResultEl) {
      testResultEl.style.color = '#fbbf24';
      testResultEl.textContent = `Menjalankan ${actions.length} aksi (${simultaneous ? 'Bersamaan' : 'Berurutan'})...`;
    }

    try {
      if (window.api && window.api.testInteraction) {
        await window.api.testInteraction({
          id: 'test_preview_' + Date.now(),
          name,
          actions,
          simultaneous
        });
      }

      if (testResultEl) {
        testResultEl.style.color = '#10b981';
        testResultEl.textContent = `✅ Aksi berhasil dijalankan! ${simultaneous ? '(Suara, Gambar & Keystroke serentak)' : ''}`;
      }
      if (window.showGlassToast) {
        window.showGlassToast(`Uji coba aksi interaksi berhasil dijalankan!`);
      }
    } catch (err) {
      console.error('[Interactions] Test run gagal:', err);
      if (testResultEl) {
        testResultEl.style.color = '#ef4444';
        testResultEl.textContent = '❌ Test gagal: ' + err.message;
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // 4. INITIALIZATION & EVENT LISTENERS
  // ═════════════════════════════════════════════════════════════════

  function initInteractions() {
    // Open Add Modal button
    const btnOpenAdd = $('btnOpenAddInteractionModal');
    if (btnOpenAdd) {
      btnOpenAdd.addEventListener('click', (e) => {
        e.preventDefault();
        openInteractionModal(null);
      });
    }

    // Close buttons
    const btnClose = $('btnCloseInteractionModal');
    const btnCancel = $('int_cancelEditBtn');
    const modal = $('interactionModal');

    if (btnClose) btnClose.addEventListener('click', closeInteractionModal);
    if (btnCancel) btnCancel.addEventListener('click', closeInteractionModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeInteractionModal();
      });
    }

    // Form submit & test run
    const form = $('interactionForm');
    if (form) form.addEventListener('submit', handleInteractionSubmit);

    const btnTestRun = $('int_testRun');
    if (btnTestRun) btnTestRun.addEventListener('click', handleTestRunAction);

    // Pick sound file button
    const btnSoundPick = $('int_sound_pick');
    if (btnSoundPick) {
      btnSoundPick.addEventListener('click', async () => {
        try {
          if (window.api && window.api.pickSoundFile) {
            const filePath = await window.api.pickSoundFile();
            if (filePath) {
              const fileInput = $('int_sound_file');
              const chk = $('int_sound_enabled');
              if (fileInput) fileInput.value = filePath;
              if (chk) chk.checked = true;
            }
          }
        } catch (e) {
          console.warn('[Interactions] Gagal memilih sound file:', e);
        }
      });
    }

    // Pick media file button
    const btnMediaPick = $('int_media_pick');
    if (btnMediaPick) {
      btnMediaPick.addEventListener('click', async () => {
        try {
          if (window.api && window.api.pickMediaFile) {
            const filePath = await window.api.pickMediaFile();
            if (filePath) {
              const fileInput = $('int_media_file');
              const chk = $('int_media_enabled');
              if (fileInput) fileInput.value = filePath;
              if (chk) chk.checked = true;
            }
          }
        } catch (e) {
          console.warn('[Interactions] Gagal memilih media file:', e);
        }
      });
    }

    // Keystroke inputs auto-check
    const keySpec = $('int_key_spec');
    if (keySpec) {
      keySpec.addEventListener('input', () => {
        const chk = $('int_key_enabled');
        if (chk && keySpec.value.trim()) chk.checked = true;
      });
    }

    const btnClearKey = $('btn_clear_key');
    if (btnClearKey) {
      btnClearKey.addEventListener('click', () => {
        if (keySpec) keySpec.value = '';
        const chk = $('int_key_enabled');
        if (chk) chk.checked = false;
      });
    }

    // Search input & clear button
    const searchInput = $('interactionSearchInput');
    const searchClear = $('interactionSearchClearBtn');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const val = searchInput.value.trim();
        if (searchClear) searchClear.style.display = val ? 'flex' : 'none';
        renderInteractionList();
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchClear.style.display = 'none';
        renderInteractionList();
      });
    }

    // Reset Interactions Only
    const btnReset = $('btnResetInteractionsOnly');
    if (btnReset) {
      btnReset.addEventListener('click', async (e) => {
        e.preventDefault();
        const conf = confirm('Apakah Anda yakin ingin mereset seluruh daftar interaksi? Tindakan ini tidak dapat dibatalkan.');
        if (!conf) return;

        try {
          if (window.api && window.api.resetInteractions) {
            await window.api.resetInteractions();
            await loadInteractions();
            if (window.showGlassToast) {
              window.showGlassToast('Daftar interaksi berhasil direset.');
            }
            window.dispatchEvent(new CustomEvent('nurearn:interactionsUpdated'));
          }
        } catch (err) {
          console.error('[Interactions] Reset gagal:', err);
          alert('Gagal mereset interaksi: ' + err.message);
        }
      });
    }

    // Card delegation (Test, Edit, Delete)
    const listEl = $('interactionList');
    if (listEl) {
      listEl.addEventListener('click', async (e) => {
        // Test Run
        const btnTest = e.target.closest('.btn-test-interaction');
        if (btnTest) {
          const id = btnTest.dataset.id;
          const item = cachedInteractions.find(i => String(i.id) === String(id));
          if (item && window.api && window.api.testInteraction) {
            try {
              await window.api.testInteraction(item);
              if (window.showGlassToast) {
                window.showGlassToast(`Uji coba aksi "${item.name}" berhasil dijalankan!`);
              }
            } catch (err) {
              alert('Test aksi gagal: ' + err.message);
            }
          }
          return;
        }

        // Edit
        const btnEdit = e.target.closest('.btn-edit-interaction');
        if (btnEdit) {
          const id = btnEdit.dataset.id;
          const item = cachedInteractions.find(i => String(i.id) === String(id));
          if (item) openInteractionModal(item);
          return;
        }

        // Delete
        const btnDel = e.target.closest('.btn-delete-interaction');
        if (btnDel) {
          const id = btnDel.dataset.id;
          const item = cachedInteractions.find(i => String(i.id) === String(id));
          const conf = confirm(`Hapus interaksi "${item ? item.name : id}"?`);
          if (conf && window.api && window.api.removeInteraction) {
            try {
              await window.api.removeInteraction(id);
              await loadInteractions();
              if (window.showGlassToast) {
                window.showGlassToast('Interaksi berhasil dihapus.');
              }
              window.dispatchEvent(new CustomEvent('nurearn:interactionsUpdated'));
            } catch (err) {
              alert('Gagal menghapus interaksi: ' + err.message);
            }
          }
          return;
        }
      });
    }

    // Expose global methods
    window.loadInteractions = loadInteractions;
    window.openInteractionModal = openInteractionModal;
    window.closeInteractionModal = closeInteractionModal;

    // Load initial data
    loadInteractions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractions);
  } else {
    initInteractions();
  }
})();
