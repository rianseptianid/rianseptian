/**
 * navAndActivities.js
 * Controller lengkap & mandiri untuk:
 * 1. Navigasi Sidebar Sembunyikan & Tampilkan (#toggleNavBtn, #showNavBtn, Ctrl+B)
 * 2. Daftar Aktivitas (#activityList), Search, Filter, & Badge Hitungan (#activityCountBadge)
 * 3. Card Aktivitas: Toggle Enable, Test Trigger (⚡), Edit (✏️), Hapus (🗑️)
 * 4. Modal Tambah / Edit Aktivitas (#activityModal, #activityForm)
 * 5. Tombol Test Run Aktivitas (#act_testRun) di dalam modal
 * 6. Reset Aktivitas (#btnResetActivitiesOnly) & Reset Interaksi + Aktivitas (#btnResetAllInteractionsActivities)
 * 7. Sinkronisasi real-time dengan Action Library (Daftar Interaksi)
 */

(function () {
  'use strict';

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

  // Dialog konfirmasi modern (fallback ke window.confirm jika modal tidak tersedia)
  function showConfirmDialog({ title = 'Konfirmasi Tindakan', message = 'Lanjutkan tindakan ini?', icon = 'warn', okText = 'Ya, Lanjutkan', cancelText = 'Batal' }) {
    return new Promise((resolve) => {
      const modal = $('customConfirmModal');
      const titleEl = $('customConfirmTitle');
      const msgEl = $('customConfirmMessage');
      const iconEl = $('customConfirmIcon');
      const okBtn = $('customConfirmOkBtn');
      const cancelBtn = $('customConfirmCancelBtn');

      if (!modal) {
        resolve(window.confirm(message));
        return;
      }

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (iconEl) {
        if (icon === 'refresh' || icon === '🔄') {
          iconEl.innerHTML = `<svg class="custom-dialog-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
        } else if (icon === 'danger' || icon === '🗑️') {
          iconEl.innerHTML = `<svg class="custom-dialog-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        } else {
          iconEl.innerHTML = `<svg class="custom-dialog-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        }
      }
      if (okBtn) okBtn.textContent = okText;
      if (cancelBtn) cancelBtn.textContent = cancelText;

      const cleanup = () => {
        modal.style.display = 'none';
        okBtn?.removeEventListener('click', onOk);
        cancelBtn?.removeEventListener('click', onCancel);
      };

      const onOk = () => {
        cleanup();
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      okBtn?.addEventListener('click', onOk);
      cancelBtn?.addEventListener('click', onCancel);
      modal.style.display = 'flex';
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // 1. NAV TOGGLE CONTROLLER
  // ═════════════════════════════════════════════════════════════════

  function initNavToggle() {
    const appEl = $('app');
    const toggleNavBtn = $('toggleNavBtn');
    const showNavBtn = $('showNavBtn');

    if (!appEl) return;

    function setNavCollapsed(collapsed) {
      if (collapsed) {
        appEl.classList.add('nav-collapsed');
        try {
          localStorage.setItem('nav_collapsed', 'collapsed');
          localStorage.setItem('nav-collapsed', 'collapsed');
        } catch (e) { }
      } else {
        appEl.classList.remove('nav-collapsed');
        try {
          localStorage.setItem('nav_collapsed', 'expanded');
          localStorage.setItem('nav-collapsed', 'expanded');
        } catch (e) { }
      }
    }

    function toggleNav() {
      const isCollapsed = appEl.classList.contains('nav-collapsed');
      setNavCollapsed(!isCollapsed);
    }

    // Restore saved state
    try {
      const savedState = localStorage.getItem('nav_collapsed') || localStorage.getItem('nav-collapsed');
      if (savedState === 'collapsed') {
        setNavCollapsed(true);
      }
    } catch (e) { }

    if (toggleNavBtn) {
      toggleNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setNavCollapsed(true);
      });
    }

    if (showNavBtn) {
      showNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setNavCollapsed(false);
      });
    }

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'b') {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        toggleNav();
      }
    });

    window.toggleNavigation = toggleNav;
    window.setNavCollapsed = setNavCollapsed;
  }

  // ═════════════════════════════════════════════════════════════════
  // 2. ACTIVITIES DATA & RENDERING
  // ═════════════════════════════════════════════════════════════════

  let cachedActivities = [];
  let cachedInteractions = [];

  async function loadData() {
    try {
      if (window.api && window.api.getConfig) {
        const cfg = await window.api.getConfig();
        if (cfg) {
          cachedActivities = Array.isArray(cfg.activities) ? cfg.activities : [];
          cachedInteractions = Array.isArray(cfg.interactions) ? cfg.interactions : [];
        }
      }
    } catch (err) {
      console.warn('[Aktivitas] Gagal memuat data konfigurasi:', err);
    }
    renderActivityList();
  }

  function getEventLabelAndIcon(event) {
    switch (event) {
      case 'gift':
        return { icon: '🎁', label: 'GIFT' };
      case 'chat':
        return { icon: '💬', label: 'CHAT' };
      case 'like':
        return { icon: '❤️', label: 'LIKE' };
      case 'follow':
        return { icon: '👤', label: 'FOLLOW' };
      case 'share':
        return { icon: '🔁', label: 'SHARE' };
      case 'subscribe':
        return { icon: '⭐', label: 'SUBSCRIBE' };
      case 'join':
        return { icon: '🚪', label: 'JOIN' };
      default:
        return { icon: '⚡', label: (event || 'EVENT').toUpperCase() };
    }
  }

  function renderActivityList() {
    const listEl = $('activityList');
    const badgeEl = $('activityCountBadge');
    if (!listEl) return;

    const searchTerm = ($('activitySearchInput')?.value || '').toLowerCase().trim();
    let items = cachedActivities || [];

    if (badgeEl) {
      badgeEl.textContent = `${items.length} aktivitas`;
    }

    if (searchTerm) {
      items = items.filter(item => {
        const name = (item.name || '').toLowerCase();
        const ev = (item.event || '').toLowerCase();
        const giftName = (item.giftName || '').toLowerCase();
        const giftId = String(item.match?.giftId || '').toLowerCase();
        const keyword = String(item.match?.keyword || '').toLowerCase();

        // Check matching linked interaction names
        const linkedNames = (item.interactionIds || [])
          .map(id => {
            const found = cachedInteractions.find(ci => String(ci.id) === String(id));
            return found ? found.name.toLowerCase() : '';
          })
          .join(' ');

        return (
          name.includes(searchTerm) ||
          ev.includes(searchTerm) ||
          giftName.includes(searchTerm) ||
          giftId.includes(searchTerm) ||
          keyword.includes(searchTerm) ||
          linkedNames.includes(searchTerm)
        );
      });
    }

    listEl.innerHTML = '';

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 32px 20px; text-align: center; color: var(--text-secondary); background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px; margin: 8px 0;">
          <div style="font-size: 28px; margin-bottom: 8px;">🎯</div>
          <div style="font-weight: 600; color: #f1f5f9; font-size: 14px; margin-bottom: 4px;">
            ${searchTerm ? 'Tidak ada aktivitas yang cocok' : 'Belum ada aktivitas'}
          </div>
          <div style="font-size: 12px; max-width: 440px; margin: 0 auto; line-height: 1.5;">
            ${searchTerm ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Klik tombol <strong>+ Tambah Aktivitas</strong> di atas untuk memetakan Gift atau event TikTok Live ke aksi interaksi Anda.'}
          </div>
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.dataset.id = item.id;
      card.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px 16px;
        margin-bottom: 12px;
        background: #131422;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        transition: all 0.2s ease;
      `;

      const evInfo = getEventLabelAndIcon(item.event);
      const isEnabled = item.enabled !== false;
      const minCombo = Number(item.minCombo || item.match?.minCombo || 1);
      const isStreakEnded = !!(item.streakEnded || item.match?.streakEnded);
      const repeatCount = Number(item.repeat || 1);
      const pickMode = item.pickMode || item.actionPickMode || 'all';

      // Meta Pills / Badges
      const metaBadges = [];

      // 1. Event Pill
      metaBadges.push(`
        <span style="display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:700; padding:2.5px 8px; border-radius:6px; background:rgba(244,114,182,0.14); color:#f472b6; border:1px solid rgba(244,114,182,0.3);">
          <span>${evInfo.icon}</span> <span>${escapeHtml(evInfo.label)}</span>
        </span>
      `);

      // 2. Specific Event details
      if (item.event === 'gift') {
        const giftId = item.match?.giftId;
        const giftName = item.giftName || (giftId ? `Gift ID ${giftId}` : 'Semua Gift');
        const imgHtml = item.giftImage
          ? `<img src="${escapeHtml(item.giftImage)}" style="width:16px; height:16px; border-radius:3px; object-fit:contain; vertical-align:middle; margin-right:3px;" />`
          : '';
        metaBadges.push(`
          <span style="display:inline-flex; align-items:center; font-size:11px; padding:2px 7px; border-radius:6px; background:rgba(255,215,0,0.12); color:#FFD700; border:1px solid rgba(255,215,0,0.25);">
            ${imgHtml} <strong>${escapeHtml(giftName)}</strong>
          </span>
        `);

        if (minCombo > 1) {
          metaBadges.push(`
            <span style="display:inline-flex; align-items:center; gap:3px; font-size:10.5px; font-weight:600; padding:2px 7px; border-radius:6px; background:rgba(249,115,22,0.14); color:#fb923c; border:1px solid rgba(249,115,22,0.28);">
              <span>🔥</span> <span>Combo ≥ ${minCombo}x</span>
            </span>
          `);
        }

        if (isStreakEnded) {
          metaBadges.push(`
            <span style="display:inline-flex; align-items:center; gap:3px; font-size:10.5px; font-weight:600; padding:2px 7px; border-radius:6px; background:rgba(168,85,247,0.14); color:#c084fc; border:1px solid rgba(168,85,247,0.28);" title="Aksi hanya dipicu ketika pengirim selesai melakukan combo">
              <span>🏁</span> <span>Streak Selesai</span>
            </span>
          `);
        }
      } else if (item.event === 'chat' && item.match?.keyword) {
        metaBadges.push(`
          <span style="font-size:11px; padding:2px 7px; border-radius:6px; background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.25);">
            Keyword: <strong>"${escapeHtml(item.match.keyword)}"</strong>
          </span>
        `);
      } else if (item.event === 'like') {
        const minLike = item.match?.minLike || 1;
        metaBadges.push(`
          <span style="font-size:11px; padding:2px 7px; border-radius:6px; background:rgba(239,68,68,0.12); color:#f87171; border:1px solid rgba(239,68,68,0.25);">
            Minimal: <strong>${minLike} Like</strong>
          </span>
        `);
      }

      // 3. Custom Rank Badge
      if (item.customRank) {
        const isRankA = item.customRank === 'rankA';
        metaBadges.push(`
          <span style="font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:6px; background:${isRankA ? 'rgba(234,179,8,0.15)' : 'rgba(147,51,234,0.15)'}; color:${isRankA ? '#facc15' : '#c084fc'}; border:1px solid ${isRankA ? 'rgba(234,179,8,0.3)' : 'rgba(147,51,234,0.3)'};">
            🏆 ${isRankA ? 'TOP RANK A' : 'TOP RANK B'}
          </span>
        `);
      }

      // 4. Execution Mode & Repeat Badges
      if (pickMode === 'random') {
        metaBadges.push(`
          <span style="font-size:10.5px; padding:2px 6px; border-radius:6px; background:rgba(148,163,184,0.12); color:#94a3b8; border:1px solid rgba(148,163,184,0.25);" title="Memilih 1 aksi secara acak dari daftar yang terhubung">
            🎲 Acak 1 Aksi
          </span>
        `);
      }
      if (repeatCount > 1) {
        metaBadges.push(`
          <span style="font-size:10.5px; padding:2px 6px; border-radius:6px; background:rgba(255,255,255,0.08); color:#e2e8f0; border:1px solid rgba(255,255,255,0.15);">
            🔁 Ulangi ${repeatCount}x
          </span>
        `);
      }

      // 5. Linked Interactions Chips
      const interactionIds = item.interactionIds || [];
      const interactionChips = [];

      interactionIds.forEach(id => {
        const found = cachedInteractions.find(ci => String(ci.id) === String(id));
        if (found) {
          // Action type summary icons
          const acts = found.actions || [];
          const hasKey = acts.some(a => a.type === 'key');
          const hasSound = acts.some(a => a.type === 'sound');
          const hasMedia = acts.some(a => a.type === 'media');
          const iconTypes = [];
          if (hasKey) iconTypes.push('⌨️');
          if (hasSound) iconTypes.push('🔊');
          if (hasMedia) iconTypes.push('🎬');

          interactionChips.push(`
            <span style="display:inline-flex; align-items:center; gap:5px; font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.04); color:#f1f5f9; border:1px solid rgba(255,255,255,0.12);" title="Aksi terhubung: ${escapeHtml(found.name)}">
              <span>${iconTypes.join('') || '⚡'}</span>
              <strong>${escapeHtml(found.name || 'Interaksi')}</strong>
            </span>
          `);
        } else {
          interactionChips.push(`
            <span style="display:inline-flex; align-items:center; gap:3px; font-size:10.5px; padding:2px 7px; border-radius:6px; background:rgba(239,68,68,0.1); color:#fca5a5; border:1px dashed rgba(239,68,68,0.3);" title="Interaksi tidak ditemukan atau telah dihapus">
              ⚠️ Aksi Hilang (${escapeHtml(id)})
            </span>
          `);
        }
      });

      card.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${metaBadges.join('')}
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <label class="checkbox" style="margin: 0; cursor: pointer; user-select: none;" title="Aktif / Nonaktifkan Aktivitas">
              <input type="checkbox" class="act-toggle-enabled" data-id="${escapeHtml(item.id)}" ${isEnabled ? 'checked' : ''} style="accent-color: #FFD700; cursor: pointer;" />
              <span style="font-size: 11.5px; font-weight: 600; color: ${isEnabled ? '#4ade80' : '#94a3b8'};">${isEnabled ? 'Aktif' : 'Nonaktif'}</span>
            </label>
            <div style="width: 1px; height: 16px; background: rgba(255,255,255,0.1); margin: 0 2px;"></div>
            <button type="button" class="btn btn-ghost btn-sm btn-test-activity" data-id="${escapeHtml(item.id)}" title="Uji coba aktivitas ini secara langsung">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#fbbf24" />
              </svg>
              <span>Test</span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-edit-activity" data-id="${escapeHtml(item.id)}" title="Edit Aktivitas">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit</span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm btn-delete-activity" data-id="${escapeHtml(item.id)}" style="color: var(--color-error);" title="Hapus Aktivitas">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        <div>
          <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.2px;">
            ${escapeHtml(item.name || 'Aktivitas')}
          </h4>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.06);">
          <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">
            Aksi Interaksi Terhubung:
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${interactionChips.length > 0 ? interactionChips.join('') : '<span class="muted" style="font-size:11px; font-style:italic;">Belum ada interaksi yang dipilih</span>'}
          </div>
        </div>
      `;

      listEl.appendChild(card);
    });
  }

  // ═════════════════════════════════════════════════════════════════
  // 3. SEARCH & RESET CONTROLLER
  // ═════════════════════════════════════════════════════════════════

  function initActivitySearchAndReset() {
    const input = $('activitySearchInput');
    const clearBtn = $('activitySearchClearBtn');
    const btnResetActivities = $('btnResetActivitiesOnly');
    const btnResetAll = $('btnResetAllInteractionsActivities');

    if (input) {
      input.addEventListener('input', () => {
        if (clearBtn) {
          clearBtn.style.display = input.value.trim() ? 'block' : 'none';
        }
        renderActivityList();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (input) input.value = '';
        clearBtn.style.display = 'none';
        renderActivityList();
      });
    }

    // Reset Hanya Aktivitas
    if (btnResetActivities) {
      btnResetActivities.addEventListener('click', async (e) => {
        e.preventDefault();
        const conf = await showConfirmDialog({
          title: 'Reset Daftar Aktivitas',
          message: 'Apakah Anda yakin ingin mereset seluruh daftar aktivitas pemicu? Seluruh pemetaan gift & event akan dihapus.',
          icon: 'danger',
          okText: 'Ya, Reset Aktivitas'
        });

        if (conf) {
          try {
            if (window.api && window.api.resetActivities) {
              await window.api.resetActivities();
              await loadData();
              if (window.showGlassToast) {
                window.showGlassToast('Daftar aktivitas berhasil direset.');
              }
            }
          } catch (err) {
            console.error('[Aktivitas] Reset aktivitas gagal:', err);
            alert('Gagal mereset aktivitas: ' + err.message);
          }
        }
      });
    }

    // Reset SEMUA Interaksi & Aktivitas
    if (btnResetAll) {
      btnResetAll.addEventListener('click', async (e) => {
        e.preventDefault();
        const conf = await showConfirmDialog({
          title: 'Reset Total Interaksi & Aktivitas',
          message: 'Apakah Anda yakin ingin mereset SEMUA daftar Interaksi (Action Library) dan Aktivitas ke pengaturan kosong? Tindakan ini tidak dapat dibatalkan.',
          icon: 'danger',
          okText: 'Ya, Reset Total'
        });

        if (conf) {
          try {
            if (window.api && window.api.resetAllTriggers) {
              await window.api.resetAllTriggers();
              if (typeof window.loadInteractions === 'function') {
                await window.loadInteractions();
              }
              await loadData();
              if (window.showGlassToast) {
                window.showGlassToast('Semua Interaksi & Aktivitas berhasil dibersihkan.');
              }
            }
          } catch (err) {
            console.error('[Aktivitas] Reset total gagal:', err);
            alert('Gagal mereset: ' + err.message);
          }
        }
      });
    }

    // Card delegation (Toggle, Test, Edit, Delete)
    const listEl = $('activityList');
    if (listEl) {
      listEl.addEventListener('change', async (e) => {
        const toggle = e.target.closest('.act-toggle-enabled');
        if (toggle) {
          const actId = toggle.getAttribute('data-id');
          const isEnabled = toggle.checked;
          const labelSpan = toggle.parentElement?.querySelector('span');
          if (labelSpan) {
            labelSpan.textContent = isEnabled ? 'Aktif' : 'Nonaktif';
            labelSpan.style.color = isEnabled ? '#4ade80' : '#94a3b8';
          }

          try {
            if (window.api && window.api.updateActivity) {
              await window.api.updateActivity(actId, { enabled: isEnabled });
              const found = cachedActivities.find(a => String(a.id) === String(actId));
              if (found) found.enabled = isEnabled;
              if (window.showGlassToast) {
                window.showGlassToast(`Aktivitas ${isEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`);
              }
            }
          } catch (err) {
            console.error('[Aktivitas] Gagal toggle enable:', err);
            toggle.checked = !isEnabled;
          }
        }
      });

      listEl.addEventListener('click', async (e) => {
        // 1. Test Trigger Aktivitas
        const btnTest = e.target.closest('.btn-test-activity');
        if (btnTest) {
          e.preventDefault();
          e.stopPropagation();
          const actId = btnTest.getAttribute('data-id');
          const originalHtml = btnTest.innerHTML;
          btnTest.innerHTML = '<span>⏳ Menguji...</span>';
          btnTest.style.pointerEvents = 'none';

          try {
            if (window.api && window.api.testActivity) {
              const res = await window.api.testActivity(actId);
              if (res && res.ok === false) {
                throw new Error(res.error || 'Gagal menjalankan aktivitas');
              }
              const found = cachedActivities.find(a => String(a.id) === String(actId));
              if (window.showGlassToast) {
                window.showGlassToast(`Aktivitas "${found?.name || 'Aktivitas'}" berhasil dijalankan!`);
              }
            }
          } catch (err) {
            console.error('[Aktivitas] Test aktivitas gagal:', err);
            alert(`Uji coba gagal: ${err.message}`);
          } finally {
            btnTest.innerHTML = originalHtml;
            btnTest.style.pointerEvents = '';
          }
          return;
        }

        // 2. Edit Aktivitas
        const btnEdit = e.target.closest('.btn-edit-activity');
        if (btnEdit) {
          e.preventDefault();
          e.stopPropagation();
          const actId = btnEdit.getAttribute('data-id');
          const act = cachedActivities.find(a => String(a.id) === String(actId));
          if (act) {
            openActivityModal(act);
          }
          return;
        }

        // 3. Hapus Aktivitas
        const btnDelete = e.target.closest('.btn-delete-activity');
        if (btnDelete) {
          e.preventDefault();
          e.stopPropagation();
          const actId = btnDelete.getAttribute('data-id');
          const act = cachedActivities.find(a => String(a.id) === String(actId));
          const name = act?.name || 'Aktivitas ini';

          const conf = await showConfirmDialog({
            title: 'Hapus Aktivitas',
            message: `Apakah Anda yakin ingin menghapus "${name}"?`,
            icon: 'danger',
            okText: 'Ya, Hapus'
          });

          if (conf) {
            try {
              if (window.api && window.api.removeActivity) {
                await window.api.removeActivity(actId);
                await loadData();
                if (window.showGlassToast) {
                  window.showGlassToast('Aktivitas berhasil dihapus.');
                }
              }
            } catch (err) {
              console.error('[Aktivitas] Hapus gagal:', err);
              alert('Gagal menghapus aktivitas: ' + err.message);
            }
          }
          return;
        }
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // 4. ACTIVITY MODAL & FORM CONTROLLER
  // ═════════════════════════════════════════════════════════════════

  function updatePickerCount() {
    const checklist = $('activityInteractionChecklist');
    const counter = $('activityPickerCount');
    if (!checklist || !counter) return;

    const checkedBoxes = checklist.querySelectorAll('input[type="checkbox"]:checked');
    counter.textContent = `${checkedBoxes.length} interaksi terpilih`;
  }

  function renderActivityInteractions(selectedIds = []) {
    const container = $('activityInteractionChecklist');
    if (!container) return;

    container.innerHTML = '';

    if (!cachedInteractions || cachedInteractions.length === 0) {
      container.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 12px; grid-column: 1 / -1; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.08); border-radius: 8px;">
          <div style="margin-bottom: 4px; font-weight: 600; color: #f1f5f9;">Belum ada aksi interaksi yang dibuat</div>
          <span style="font-size: 11px; opacity: 0.8;">Buat interaksi terlebih dahulu di panel <strong>Daftar Interaksi</strong> di atas.</span>
        </div>
      `;
      updatePickerCount();
      return;
    }

    const selSet = new Set((selectedIds || []).map(String));

    cachedInteractions.forEach(int => {
      const label = document.createElement('label');
      label.className = 'activity-interaction-item';
      label.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        cursor: pointer;
        user-select: none;
        transition: all 0.15s ease;
      `;

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.value = int.id;
      chk.checked = selSet.has(String(int.id));
      chk.style.accentColor = '#FFD700';
      chk.style.cursor = 'pointer';

      chk.addEventListener('change', () => {
        updatePickerCount();
        label.style.borderColor = chk.checked ? 'rgba(255, 215, 0, 0.35)' : 'rgba(255, 255, 255, 0.08)';
        label.style.background = chk.checked ? 'rgba(255, 215, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)';
      });

      if (chk.checked) {
        label.style.borderColor = 'rgba(255, 215, 0, 0.35)';
        label.style.background = 'rgba(255, 215, 0, 0.06)';
      }

      const span = document.createElement('span');
      span.style.cssText = 'font-size: 12.5px; font-weight: 600; color: #FFFFFF; flex: 1;';
      span.textContent = int.name || `Aksi (${int.id})`;

      // Action type pills inside interaction item
      const actions = int.actions || [];
      const pillContainer = document.createElement('div');
      pillContainer.style.cssText = 'display: flex; align-items: center; gap: 4px; margin-left: auto;';

      const hasKey = actions.some(a => a.type === 'key');
      const hasSound = actions.some(a => a.type === 'sound');
      const hasMedia = actions.some(a => a.type === 'media');

      if (hasKey) {
        const p = document.createElement('span');
        p.style.cssText = 'font-size: 9.5px; padding: 2px 5px; border-radius: 4px; background: rgba(255,215,0,0.12); color: #FFD700; border: 1px solid rgba(255,215,0,0.25);';
        p.textContent = '⌨️ KEY';
        pillContainer.appendChild(p);
      }
      if (hasSound) {
        const p = document.createElement('span');
        p.style.cssText = 'font-size: 9.5px; padding: 2px 5px; border-radius: 4px; background: rgba(96,165,250,0.12); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25);';
        p.textContent = '🔊 SFX';
        pillContainer.appendChild(p);
      }
      if (hasMedia) {
        const p = document.createElement('span');
        p.style.cssText = 'font-size: 9.5px; padding: 2px 5px; border-radius: 4px; background: rgba(232,121,249,0.12); color: #e879f9; border: 1px solid rgba(232,121,249,0.25);';
        p.textContent = '🎬 POPUP';
        pillContainer.appendChild(p);
      }

      label.appendChild(chk);
      label.appendChild(span);
      label.appendChild(pillContainer);
      container.appendChild(label);
    });

    updatePickerCount();
  }

  function updateEventFieldVisibility(eventType) {
    const lblGift = $('lbl_act_giftId');
    const lblCombo = $('lbl_act_minCombo');
    const lblStreak = $('lbl_act_streakEnded');
    const lblCustomRank = $('lbl_act_customRank');
    const lblLike = $('lbl_act_minLike');
    const lblKeyword = $('lbl_act_keyword');

    const isGift = eventType === 'gift';
    const isLike = eventType === 'like';
    const isChat = eventType === 'chat';

    if (lblGift) lblGift.style.display = isGift ? 'block' : 'none';
    if (lblCombo) lblCombo.style.display = isGift ? 'block' : 'none';
    if (lblStreak) lblStreak.style.display = isGift ? 'flex' : 'none';
    if (lblCustomRank) lblCustomRank.style.display = isGift ? 'block' : 'none';
    if (lblLike) lblLike.style.display = isLike ? 'block' : 'none';
    if (lblKeyword) lblKeyword.style.display = isChat ? 'block' : 'none';
  }

  async function openActivityModal(editItem = null) {
    const modal = $('activityModal');
    if (!modal) return;

    if (!cachedInteractions || cachedInteractions.length === 0) {
      try {
        if (window.api && window.api.getConfig) {
          const cfg = await window.api.getConfig();
          if (cfg && Array.isArray(cfg.interactions)) cachedInteractions = cfg.interactions;
        }
      } catch (_) {}
    }

    const formTitle = $('activityFormTitle');
    const editId = $('act_editing_id');
    const nameInput = $('act_name');
    const eventSelect = $('act_event');
    const giftIdInput = $('act_giftId');
    const giftNamePrev = $('act_giftNamePreview');
    const giftIdPrev = $('act_giftIdPreview');
    const giftImgPrev = $('act_giftImgPreview');
    const minComboInput = $('act_minCombo');
    const streakEndedChk = $('act_streakEnded');
    const repeatInput = $('act_repeat');
    const customRankSelect = $('act_customRank');
    const minLikeInput = $('act_minLike');
    const keywordInput = $('act_keyword');

    if (editItem) {
      if (formTitle) formTitle.textContent = 'Edit Aktivitas';
      if (editId) editId.value = editItem.id || '';
      if (nameInput) nameInput.value = editItem.name || '';
      if (eventSelect) eventSelect.value = editItem.event || 'gift';

      const giftVal = editItem.match?.giftId || '';
      if (giftIdInput) giftIdInput.value = giftVal;
      if (giftNamePrev) giftNamePrev.textContent = editItem.giftName || (giftVal ? `Gift ID: ${giftVal}` : 'Semua Gift');
      if (giftIdPrev) giftIdPrev.textContent = giftVal ? `(${giftVal})` : '(Semua)';
      if (giftImgPrev) {
        if (editItem.giftImage) {
          giftImgPrev.src = editItem.giftImage;
          giftImgPrev.style.display = 'block';
        } else {
          giftImgPrev.style.display = 'none';
        }
      }

      if (minComboInput) minComboInput.value = editItem.minCombo || editItem.match?.minCombo || 1;
      if (streakEndedChk) streakEndedChk.checked = !!(editItem.streakEnded || editItem.match?.streakEnded);
      if (repeatInput) repeatInput.value = editItem.repeat || 1;
      if (customRankSelect) customRankSelect.value = editItem.customRank || '';
      if (minLikeInput) minLikeInput.value = editItem.match?.minLike || 1;
      if (keywordInput) keywordInput.value = editItem.match?.keyword || '';

      const pickMode = editItem.pickMode || editItem.actionPickMode || 'all';
      const radio = document.querySelector(`input[name="act_pick_mode"][value="${pickMode}"]`);
      if (radio) radio.checked = true;

      updateEventFieldVisibility(editItem.event || 'gift');
      renderActivityInteractions(editItem.interactionIds || []);
    } else {
      if (formTitle) formTitle.textContent = 'Tambah Aktivitas Baru';
      if (editId) editId.value = '';
      if (nameInput) nameInput.value = '';
      if (eventSelect) eventSelect.value = 'gift';
      if (giftIdInput) giftIdInput.value = '';
      if (giftNamePrev) giftNamePrev.textContent = 'Semua Gift';
      if (giftIdPrev) giftIdPrev.textContent = '(Semua)';
      if (giftImgPrev) giftImgPrev.style.display = 'none';
      if (minComboInput) minComboInput.value = '1';
      if (streakEndedChk) streakEndedChk.checked = false;
      if (repeatInput) repeatInput.value = '1';
      if (customRankSelect) customRankSelect.value = '';
      if (minLikeInput) minLikeInput.value = '1';
      if (keywordInput) keywordInput.value = '';

      const radioAll = document.querySelector('input[name="act_pick_mode"][value="all"]');
      if (radioAll) radioAll.checked = true;

      updateEventFieldVisibility('gift');
      renderActivityInteractions([]);
    }

    const testRes = $('act_testResult');
    if (testRes) {
      testRes.textContent = '';
      testRes.style.color = '';
    }

    modal.style.display = 'flex';
  }

  function closeActivityModal() {
    const modal = $('activityModal');
    if (modal) modal.style.display = 'none';
  }

  // ═════════════════════════════════════════════════════════════════
  // 5. TEST RUN AKTIVITAS DI MODAL (#act_testRun)
  // ═════════════════════════════════════════════════════════════════

  async function handleTestRunInModal() {
    const checklist = $('activityInteractionChecklist');
    const checkedBoxes = checklist ? checklist.querySelectorAll('input[type="checkbox"]:checked') : [];
    const interactionIds = Array.from(checkedBoxes).map(cb => cb.value);
    const testRes = $('act_testResult');
    const btnTest = $('act_testRun');

    if (interactionIds.length === 0) {
      if (testRes) {
        testRes.textContent = '⚠️ Pilih minimal 1 aksi interaksi di checklist terlebih dahulu!';
        testRes.style.color = '#ef4444';
      }
      alert('Pilih minimal satu aksi interaksi di checklist terlebih dahulu!');
      return;
    }

    if (!cachedInteractions || cachedInteractions.length === 0) {
      try {
        if (window.api && window.api.getConfig) {
          const cfg = await window.api.getConfig();
          if (cfg && Array.isArray(cfg.interactions)) cachedInteractions = cfg.interactions;
        }
      } catch (_) {}
    }

    const event = $('act_event')?.value || 'gift';
    const pickModeRadio = document.querySelector('input[name="act_pick_mode"]:checked');
    const pickMode = pickModeRadio ? pickModeRadio.value : 'all';
    const repeat = Math.max(1, parseInt($('act_repeat')?.value || '1', 10) || 1);

    // Collect all actions from selected interactions
    let selectedInteractions = cachedInteractions.filter(i => interactionIds.includes(String(i.id)));
    if (selectedInteractions.length === 0) {
      if (testRes) {
        testRes.textContent = '⚠️ Interaksi terpilih tidak valid atau kosong.';
        testRes.style.color = '#ef4444';
      }
      return;
    }

    if (pickMode === 'random') {
      const randInt = selectedInteractions[Math.floor(Math.random() * selectedInteractions.length)];
      selectedInteractions = [randInt];
    }

    // Flatten actions
    const allActions = [];
    selectedInteractions.forEach(item => {
      if (Array.isArray(item.actions)) {
        allActions.push(...item.actions);
      }
    });

    if (allActions.length === 0) {
      if (testRes) {
        testRes.textContent = '⚠️ Interaksi yang dipilih belum memiliki konfigurasi aksi.';
        testRes.style.color = '#ef4444';
      }
      return;
    }

    if (btnTest) {
      btnTest.disabled = true;
      btnTest.style.opacity = '0.6';
    }
    if (testRes) {
      testRes.textContent = '⏳ Menjalankan test run aksi...';
      testRes.style.color = '#fbbf24';
    }

    try {
      if (window.api && window.api.testTriggerActions) {
        const res = await window.api.testTriggerActions(allActions, event, true, repeat);
        if (res && res.ok === false) {
          throw new Error(res.error || 'Test aksi gagal dieksekusi');
        }
      }
      if (testRes) {
        testRes.textContent = `✅ Test run berhasil dijalankan! (${allActions.length} aksi, ${repeat}x perulangan)`;
        testRes.style.color = '#4ade80';
      }
      if (window.showGlassToast) {
        window.showGlassToast('Test run aktivitas berhasil dijalankan!');
      }
    } catch (err) {
      console.error('[ActivityModal] Test run gagal:', err);
      if (testRes) {
        testRes.textContent = `❌ Gagal: ${err.message}`;
        testRes.style.color = '#ef4444';
      }
    } finally {
      if (btnTest) {
        btnTest.disabled = false;
        btnTest.style.opacity = '1';
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // 6. SUBMIT FORM AKTIVITAS (#activityForm)
  // ═════════════════════════════════════════════════════════════════

  let _isSubmittingActivity = false;
  let _lastActivitySubmitTs = 0;

  async function handleActivitySubmit(e) {
    if (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }

    const now = Date.now();
    if (_isSubmittingActivity || (now - _lastActivitySubmitTs < 800)) {
      console.warn('[ActivityForm] Submit diabaikan (sedang memproses atau klik ganda)');
      return;
    }

    const editId = $('act_editing_id')?.value?.trim();
    const name = $('act_name')?.value?.trim() || '';
    const event = $('act_event')?.value || 'gift';
    const giftId = $('act_giftId')?.value?.trim() || '';
    const giftName = $('act_giftNamePreview')?.textContent?.trim() || '';
    const giftImg = $('act_giftImgPreview')?.src || '';
    const minCombo = parseInt($('act_minCombo')?.value || '1', 10) || 1;
    const streakEnded = !!$('act_streakEnded')?.checked;
    const repeat = parseInt($('act_repeat')?.value || '1', 10) || 1;
    const customRank = $('act_customRank')?.value || '';
    const minLike = parseInt($('act_minLike')?.value || '1', 10) || 1;
    const keyword = $('act_keyword')?.value?.trim() || '';

    const pickModeRadio = document.querySelector('input[name="act_pick_mode"]:checked');
    const pickMode = pickModeRadio ? pickModeRadio.value : 'all';

    const checklist = $('activityInteractionChecklist');
    const checkedBoxes = checklist ? checklist.querySelectorAll('input[type="checkbox"]:checked') : [];
    const interactionIds = Array.from(checkedBoxes).map(cb => cb.value);

    if (interactionIds.length === 0) {
      alert('Pilih minimal satu aksi interaksi yang akan dijalankan oleh aktivitas ini!');
      return;
    }

    const form = $('activityForm');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    _isSubmittingActivity = true;
    _lastActivitySubmitTs = now;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
    }

    const matchObj = {};
    if (event === 'gift') {
      if (giftId) matchObj.giftId = giftId;
      matchObj.minCombo = minCombo;
      matchObj.streakEnded = streakEnded;
    }
    if (event === 'like') matchObj.minLike = minLike;
    if (event === 'chat' && keyword) matchObj.keyword = keyword;

    const activityData = {
      name: name || (event === 'gift' ? (giftName && giftName !== 'Semua Gift' ? `Gift ${giftName}` : 'Semua Gift') : `Aktivitas ${event.toUpperCase()}`),
      event,
      match: matchObj,
      minCombo,
      streakEnded,
      repeat,
      customRank: customRank || undefined,
      pickMode,
      interactionIds,
      giftName: event === 'gift' ? giftName : undefined,
      giftImage: (event === 'gift' && giftImg && !giftImg.endsWith('#')) ? giftImg : undefined,
      enabled: true
    };

    try {
      if (editId) {
        if (window.api && window.api.updateActivity) {
          await window.api.updateActivity(editId, activityData);
        }
      } else {
        if (window.api && window.api.addActivity) {
          await window.api.addActivity(activityData);
        }
      }

      closeActivityModal();
      await loadData();

      if (window.showGlassToast) {
        window.showGlassToast(`Aktivitas "${activityData.name}" berhasil disimpan!`);
      }
    } catch (err) {
      console.error('[ActivityForm] Gagal menyimpan aktivitas:', err);
      alert('Gagal menyimpan aktivitas: ' + err.message);
    } finally {
      _isSubmittingActivity = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    }
  }

  function initActivityModal() {
    const btnOpenAdd = $('btnOpenAddActivityModal');
    const btnClose = $('btnCloseActivityModal');
    const btnCancel = $('act_cancelEditBtn');
    const form = $('activityForm');
    const modal = $('activityModal');
    const eventSelect = $('act_event');
    const btnTestRun = $('act_testRun');

    if (btnOpenAdd) {
      btnOpenAdd.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openActivityModal(null);
      });
    }

    if (btnClose) btnClose.addEventListener('click', closeActivityModal);
    if (btnCancel) btnCancel.addEventListener('click', closeActivityModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeActivityModal();
      });
    }

    if (form) {
      form.addEventListener('submit', handleActivitySubmit);
    }

    if (btnTestRun) {
      btnTestRun.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTestRunInModal();
      });
    }

    if (eventSelect) {
      eventSelect.addEventListener('change', () => {
        updateEventFieldVisibility(eventSelect.value);
      });
    }

    // Expose global methods
    window.openActivityModal = openActivityModal;
    window.closeActivityModal = closeActivityModal;
    window.loadActivities = loadData;
    window.renderActivityList = renderActivityList;
  }

  // ═════════════════════════════════════════════════════════════════
  // 7. INITIALIZATION & CROSS-CONTROLLER SYNC
  // ═════════════════════════════════════════════════════════════════

  function setup() {
    initNavToggle();
    initActivitySearchAndReset();
    initActivityModal();

    // Listen to changes from interactionsController
    window.addEventListener('nurearn:interactionsUpdated', () => {
      loadData();
    });

    // Listen to tab switch to Triggers tab
    document.querySelectorAll('[data-tab="triggers"], .nav-item[data-tab="triggers"]').forEach(btn => {
      btn.addEventListener('click', () => {
        setTimeout(loadData, 50);
      });
    });

    // Initial load
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
