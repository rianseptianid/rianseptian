/**
 * navAndActivities.js
 * Controller mandiri & anti-gagal untuk:
 * 1. Tombol Navigasi Sembunyikan & Tampilkan Sidebar (#toggleNavBtn, #showNavBtn, Ctrl+B)
 * 2. Tombol Tambah Aktivitas (#btnOpenAddActivityModal) & Activity Modal (#activityModal)
 */

(function () {
  'use strict';

  // ═════════════════════════════════════════════════════════════════
  // 1. NAV TOGGLE CONTROLLER (Sembunyikan & Tampilkan Navigasi)
  // ═════════════════════════════════════════════════════════════════

  function initNavToggle() {
    const appEl = document.getElementById('app');
    const toggleNavBtn = document.getElementById('toggleNavBtn');
    const showNavBtn = document.getElementById('showNavBtn');

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

    // Bind sidebar collapse button
    if (toggleNavBtn) {
      toggleNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setNavCollapsed(true);
      });
    }

    // Bind header show navigation button
    if (showNavBtn) {
      showNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setNavCollapsed(false);
      });
    }

    // Bind Keyboard shortcut: Ctrl + B / Cmd + B
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'b') {
        // Jangan intercept jika user sedang mengetik di input / textarea
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
  // 2. ACTIVITY MODAL & FORM CONTROLLER (Tambah / Edit Aktivitas)
  // ═════════════════════════════════════════════════════════════════

  let cachedInteractions = [];

  async function fetchInteractionsList() {
    try {
      if (window.api && window.api.getConfig) {
        const cfg = await window.api.getConfig();
        if (cfg && Array.isArray(cfg.interactions)) {
          cachedInteractions = cfg.interactions;
          return cfg.interactions;
        }
      }
    } catch (e) { }
    return cachedInteractions;
  }

  function updatePickerCount() {
    const checklist = document.getElementById('activityInteractionChecklist');
    const counter = document.getElementById('activityPickerCount');
    if (!checklist || !counter) return;

    const checkedBoxes = checklist.querySelectorAll('input[type="checkbox"]:checked');
    counter.textContent = `${checkedBoxes.length} interaksi terpilih`;
  }

  async function renderActivityInteractions(selectedIds = []) {
    const container = document.getElementById('activityInteractionChecklist');
    if (!container) return;

    const interactions = await fetchInteractionsList();
    container.innerHTML = '';

    if (!interactions || interactions.length === 0) {
      container.innerHTML = `
        <div style="padding: 12px; text-align: center; color: var(--text-secondary); font-size: 12px; grid-column: 1 / -1;">
          Belum ada aksi interaksi yang dibuat.<br>
          <span style="font-size: 11px; opacity: 0.8;">Buat interaksi terlebih dahulu di panel <strong>Daftar Interaksi</strong>.</span>
        </div>
      `;
      updatePickerCount();
      return;
    }

    const selSet = new Set(selectedIds || []);

    interactions.forEach(int => {
      const label = document.createElement('label');
      label.className = 'activity-interaction-item';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '8px';
      label.style.padding = '8px 10px';
      label.style.background = 'rgba(255, 255, 255, 0.03)';
      label.style.border = '1px solid rgba(255, 255, 255, 0.08)';
      label.style.borderRadius = '8px';
      label.style.cursor = 'pointer';
      label.style.userSelect = 'none';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.value = int.id;
      chk.checked = selSet.has(int.id);
      chk.style.accentColor = '#FFD700';

      chk.addEventListener('change', () => {
        updatePickerCount();
      });

      const span = document.createElement('span');
      span.style.fontSize = '12px';
      span.style.color = '#FFFFFF';
      span.textContent = int.name || `Aksi (${int.type || 'Keyboard'})`;

      const typeBadge = document.createElement('span');
      typeBadge.style.fontSize = '10px';
      typeBadge.style.padding = '2px 6px';
      typeBadge.style.borderRadius = '4px';
      typeBadge.style.marginLeft = 'auto';
      typeBadge.style.background = 'rgba(255, 215, 0, 0.12)';
      typeBadge.style.color = '#FFD700';
      typeBadge.textContent = (int.type || 'Key').toUpperCase();

      label.appendChild(chk);
      label.appendChild(span);
      label.appendChild(typeBadge);
      container.appendChild(label);
    });

    updatePickerCount();
  }

  function updateEventFieldVisibility(eventType) {
    const lblGift = document.getElementById('lbl_act_giftId');
    const lblCombo = document.getElementById('lbl_act_minCombo');
    const lblLike = document.getElementById('lbl_act_minLike');
    const lblKeyword = document.getElementById('lbl_act_keyword');
    const lblCustomRank = document.getElementById('lbl_act_customRank');

    const isGift = eventType === 'gift';
    const isLike = eventType === 'like';
    const isChat = eventType === 'chat';

    if (lblGift) lblGift.style.display = isGift ? 'block' : 'none';
    if (lblCombo) lblCombo.style.display = isGift ? 'block' : 'none';
    if (lblCustomRank) lblCustomRank.style.display = isGift ? 'block' : 'none';
    if (lblLike) lblLike.style.display = isLike ? 'block' : 'none';
    if (lblKeyword) lblKeyword.style.display = isChat ? 'block' : 'none';
  }

  function openActivityModal(editItem = null) {
    const modal = document.getElementById('activityModal');
    if (!modal) return;

    const formTitle = document.getElementById('activityFormTitle');
    const editId = document.getElementById('act_editing_id');
    const nameInput = document.getElementById('act_name');
    const eventSelect = document.getElementById('act_event');
    const giftIdInput = document.getElementById('act_giftId');
    const giftNamePrev = document.getElementById('act_giftNamePreview');
    const giftIdPrev = document.getElementById('act_giftIdPreview');
    const giftImgPrev = document.getElementById('act_giftImgPreview');
    const minComboInput = document.getElementById('act_minCombo');
    const repeatInput = document.getElementById('act_repeat');
    const customRankSelect = document.getElementById('act_customRank');
    const minLikeInput = document.getElementById('act_minLike');
    const keywordInput = document.getElementById('act_keyword');

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

      if (minComboInput) minComboInput.value = editItem.minCombo || 1;
      if (repeatInput) repeatInput.value = editItem.repeat || 1;
      if (customRankSelect) customRankSelect.value = editItem.customRank || '';
      if (minLikeInput) minLikeInput.value = editItem.match?.minLike || 1;
      if (keywordInput) keywordInput.value = editItem.match?.keyword || '';

      const pickMode = editItem.pickMode || 'all';
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
      if (repeatInput) repeatInput.value = '1';
      if (customRankSelect) customRankSelect.value = '';
      if (minLikeInput) minLikeInput.value = '1';
      if (keywordInput) keywordInput.value = '';

      const radioAll = document.querySelector('input[name="act_pick_mode"][value="all"]');
      if (radioAll) radioAll.checked = true;

      updateEventFieldVisibility('gift');
      renderActivityInteractions([]);
    }

    const testRes = document.getElementById('act_testResult');
    if (testRes) testRes.textContent = '';

    modal.style.display = 'flex';
  }

  function closeActivityModal() {
    const modal = document.getElementById('activityModal');
    if (modal) modal.style.display = 'none';
  }

  async function handleActivitySubmit(e) {
    if (e) e.preventDefault();

    const editId = document.getElementById('act_editing_id')?.value?.trim();
    const name = document.getElementById('act_name')?.value?.trim() || '';
    const event = document.getElementById('act_event')?.value || 'gift';
    const giftId = document.getElementById('act_giftId')?.value?.trim() || '';
    const giftName = document.getElementById('act_giftNamePreview')?.textContent?.trim() || '';
    const giftImg = document.getElementById('act_giftImgPreview')?.src || '';
    const minCombo = parseInt(document.getElementById('act_minCombo')?.value || '1', 10) || 1;
    const repeat = parseInt(document.getElementById('act_repeat')?.value || '1', 10) || 1;
    const customRank = document.getElementById('act_customRank')?.value || '';
    const minLike = parseInt(document.getElementById('act_minLike')?.value || '1', 10) || 1;
    const keyword = document.getElementById('act_keyword')?.value?.trim() || '';

    const pickModeRadio = document.querySelector('input[name="act_pick_mode"]:checked');
    const pickMode = pickModeRadio ? pickModeRadio.value : 'all';

    const checklist = document.getElementById('activityInteractionChecklist');
    const checkedBoxes = checklist ? checklist.querySelectorAll('input[type="checkbox"]:checked') : [];
    const interactionIds = Array.from(checkedBoxes).map(cb => cb.value);

    const matchObj = {};
    if (event === 'gift' && giftId) matchObj.giftId = giftId;
    if (event === 'like') matchObj.minLike = minLike;
    if (event === 'chat' && keyword) matchObj.keyword = keyword;

    const activityData = {
      name: name || (event === 'gift' ? (giftName && giftName !== 'Semua Gift' ? `Gift ${giftName}` : 'Semua Gift') : `Aktivitas ${event}`),
      event,
      match: matchObj,
      minCombo,
      repeat,
      customRank: customRank || undefined,
      pickMode,
      interactionIds,
      giftName: event === 'gift' ? giftName : undefined,
      giftImage: (event === 'gift' && giftImg && !giftImg.endsWith('#')) ? giftImg : undefined
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

      // Trigger configuration refresh in app.js
      if (window.api && window.api.getConfig) {
        const updatedCfg = await window.api.getConfig();
        if (typeof window.renderActivityList === 'function') {
          window.renderActivityList();
        } else if (typeof window.loadData === 'function') {
          window.loadData();
        } else {
          // Dispatch custom event to notify listeners
          window.dispatchEvent(new CustomEvent('nurearn:configUpdated', { detail: updatedCfg }));
        }
      }
    } catch (err) {
      console.error('[ActivityForm] Gagal menyimpan aktivitas:', err);
      alert('Gagal menyimpan aktivitas: ' + err.message);
    }
  }

  function initActivityModal() {
    const btnOpenAdd = document.getElementById('btnOpenAddActivityModal');
    const btnClose = document.getElementById('btnCloseActivityModal');
    const btnCancel = document.getElementById('act_cancelEditBtn');
    const form = document.getElementById('activityForm');
    const modal = document.getElementById('activityModal');
    const eventSelect = document.getElementById('act_event');

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

    if (eventSelect) {
      eventSelect.addEventListener('change', () => {
        updateEventFieldVisibility(eventSelect.value);
      });
    }

    // Delegate edit & delete clicks inside #activityList
    const activityList = document.getElementById('activityList');
    if (activityList) {
      activityList.addEventListener('click', async (e) => {
        const btnEdit = e.target.closest('.btn-edit-activity, [data-action="edit-activity"]');
        if (btnEdit) {
          const actId = btnEdit.getAttribute('data-id') || btnEdit.dataset?.id;
          if (actId && window.api && window.api.getConfig) {
            const cfg = await window.api.getConfig().catch(() => null);
            const act = cfg?.activities?.find(a => a.id === actId);
            if (act) {
              e.preventDefault();
              e.stopPropagation();
              openActivityModal(act);
            }
          }
        }
      });
    }

    // Expose functions globally
    window.openActivityModal = openActivityModal;
    window.closeActivityModal = closeActivityModal;
  }

  // ═════════════════════════════════════════════════════════════════
  // INITIALIZATION ON DOM READY
  // ═════════════════════════════════════════════════════════════════

  function setup() {
    initNavToggle();
    initActivityModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
