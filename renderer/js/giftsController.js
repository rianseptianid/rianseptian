/**
 * renderer/js/giftsController.js
 * Controller for TikTok Gift Gallery, Live Gift Log, Gift Picker for Activities,
 * and Gift CRUD (Tambah / Edit / Hapus Gift).
 */

(function () {
  'use strict';

  // Cached state
  let allGifts = [];
  let isGiftsLoaded = false;
  let activeTab = 'gallery'; // 'gallery' | 'feed'
  let liveGiftsCount = 0;

  const GIFT_SVG_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>`;
  const GIFT_FALLBACK_HTML = `<span class="gift-fallback-box">${GIFT_SVG_ICON}</span>`;
  window.__renderGiftFallback = function (el) {
    if (el && el.parentNode) {
      el.outerHTML = GIFT_FALLBACK_HTML;
    }
  };

  // Vue 3 Reactive Feed State
  let vueGiftFeedApp = null;
  const giftFeedState = {
    list: null
  };

  if (window.Vue && window.Vue.createApp) {
    const { createApp, ref } = window.Vue;
    const giftFeedList = ref([]);
    giftFeedState.list = giftFeedList;

    vueGiftFeedApp = createApp({
      setup() {
        const clearGiftFeed = () => {
          giftFeedList.value = [];
        };

        const handleAvatarError = (evt) => {
          evt.target.src = 'images/logo.png';
        };

        return {
          giftFeedList,
          clearGiftFeed,
          handleAvatarError
        };
      }
    });

    const mountFeedApp = () => {
      const mountEl = document.getElementById('giftFeedSection');
      if (mountEl && !mountEl.__vue_app__) {
        vueGiftFeedApp.mount(mountEl);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountFeedApp);
    } else {
      mountFeedApp();
    }
  }

  // DOM Elements
  const els = {
    // Galeri & Feed Tab
    tabGifts: document.getElementById('tab-gifts'),
    btnSwitchGiftGallery: document.getElementById('btnSwitchGiftGallery'),
    btnSwitchGiftFeed: document.getElementById('btnSwitchGiftFeed'),
    btnOpenAddGiftModal: document.getElementById('btnOpenAddGiftModal'),
    giftGallerySection: document.getElementById('giftGallerySection'),
    giftFeedSection: document.getElementById('giftFeedSection'),
    giftGalleryGrid: document.getElementById('giftGalleryGrid'),
    giftGalleryCountBadge: document.getElementById('giftGalleryCountBadge'),
    giftSearchInput: document.getElementById('giftSearchInput'),
    giftSortSelect: document.getElementById('giftSortSelect'),
    giftFeed: document.getElementById('giftFeed'),

    // Activity Gift Picker
    btnOpenGiftModal: document.getElementById('btnOpenGiftModal'),
    modalGiftPicker: document.getElementById('modalGiftPicker'),
    giftPickerSearchInput: document.getElementById('giftPickerSearchInput'),
    btnSelectAllGiftsOption: document.getElementById('btnSelectAllGiftsOption'),
    giftPickerGrid: document.getElementById('giftPickerGrid'),
    giftPickerTotalInfo: document.getElementById('giftPickerTotalInfo'),
    btnCloseGiftPickerModal: document.getElementById('btnCloseGiftPickerModal'),
    btnCancelGiftPicker: document.getElementById('btnCancelGiftPicker'),

    // Activity Form Elements
    actGiftId: document.getElementById('act_giftId'),
    actGiftNamePreview: document.getElementById('act_giftNamePreview'),
    actGiftIdPreview: document.getElementById('act_giftIdPreview'),
    actGiftImgPreview: document.getElementById('act_giftImgPreview'),
    activityModal: document.getElementById('activityModal'),

    // Add / Edit Gift Modal
    modalGiftEdit: document.getElementById('modalGiftEdit'),
    giftModalTitle: document.getElementById('giftModalTitle'),
    giftForm: document.getElementById('giftForm'),
    giftEditOriginalId: document.getElementById('giftEditOriginalId'),
    giftFormName: document.getElementById('giftFormName'),
    giftFormId: document.getElementById('giftFormId'),
    giftFormDiamond: document.getElementById('giftFormDiamond'),
    giftFormImage: document.getElementById('giftFormImage'),
    btnPickGiftImage: document.getElementById('btnPickGiftImage'),
    giftFormImagePreviewWrap: document.getElementById('giftFormImagePreviewWrap'),
    giftFormPrevName: document.getElementById('giftFormPrevName'),
    giftFormPrevMeta: document.getElementById('giftFormPrevMeta'),
    btnCloseGiftEditModal: document.getElementById('btnCloseGiftEditModal'),
    btnCancelGiftModal: document.getElementById('btnCancelGiftModal'),
    btnSaveGift: document.getElementById('btnSaveGift'),

    // Confirmation Modal
    customConfirmModal: document.getElementById('customConfirmModal'),
    customConfirmTitle: document.getElementById('customConfirmTitle'),
    customConfirmMessage: document.getElementById('customConfirmMessage'),
    customConfirmOkBtn: document.getElementById('customConfirmOkBtn'),
    customConfirmCancelBtn: document.getElementById('customConfirmCancelBtn')
  };

  /**
   * Helper to normalize gift image URL / path.
   */
  function getGiftImageSrc(gift) {
    if (!gift) return 'images/gifts/5655.png';
    if (gift.image && gift.image.trim()) {
      const img = gift.image.trim();
      // If it starts with http://, https://, data:, or images/
      if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:') || img.startsWith('images/')) {
        return img;
      }
      // If file path
      if (img.includes('\\') || img.includes('/')) {
        return img.replace(/\\/g, '/');
      }
      return 'images/gifts/' + img;
    }
    return `images/gifts/${gift.id}.png`;
  }

  /**
   * Load all gifts from backend (IPC) or fallback to gifts.json.
   */
  async function loadGifts() {
    try {
      if (window.api && typeof window.api.getGifts === 'function') {
        const raw = await window.api.getGifts();
        if (Array.isArray(raw) && raw.length > 0) {
          allGifts = raw.map(g => ({
            id: Number(g.id),
            name: String(g.name || 'Gift ' + g.id),
            diamond: Number(g.diamond || 0),
            image: g.image || `images/gifts/${g.id}.png`
          }));
          isGiftsLoaded = true;
        }
      }
    } catch (err) {
      console.warn('[GiftsController] Error fetching gifts via window.api.getGifts:', err);
    }

    // Fallback if empty
    if (!allGifts || allGifts.length === 0) {
      try {
        const res = await fetch('../assets/gifts/gifts.json');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            allGifts = json.map(g => ({
              id: Number(g.id),
              name: String(g.name || 'Gift ' + g.id),
              diamond: Number(g.diamond || 0),
              image: g.image || `images/gifts/${g.id}.png`
            }));
            isGiftsLoaded = true;
          }
        }
      } catch (err) {
        console.warn('[GiftsController] Fallback fetch gifts.json error:', err);
      }
    }

    // Render components
    renderGallery();
    renderPicker();
    syncActivityPreviewFromInput();
  }

  /**
   * Sort gifts helper.
   */
  function sortGifts(giftsList, sortBy) {
    const list = [...giftsList];
    switch (sortBy) {
      case 'diamond-desc':
        return list.sort((a, b) => (b.diamond - a.diamond) || (a.name.localeCompare(b.name)));
      case 'diamond-asc':
        return list.sort((a, b) => (a.diamond - b.diamond) || (a.name.localeCompare(b.name)));
      case 'name-asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'id-asc':
        return list.sort((a, b) => a.id - b.id);
      default:
        return list.sort((a, b) => (b.diamond - a.diamond) || (a.name.localeCompare(b.name)));
    }
  }

  /**
   * Filter gifts by search query.
   */
  function filterGifts(giftsList, query) {
    if (!query) return giftsList;
    const q = query.trim().toLowerCase();
    return giftsList.filter(g => {
      const nameMatch = g.name.toLowerCase().includes(q);
      const idMatch = String(g.id).includes(q);
      const diaMatch = String(g.diamond).includes(q);
      return nameMatch || idMatch || diaMatch;
    });
  }

  /**
   * Render Galeri Gift Grid.
   */
  function renderGallery() {
    if (!els.giftGalleryGrid) return;

    const query = els.giftSearchInput ? els.giftSearchInput.value : '';
    const sortBy = els.giftSortSelect ? els.giftSortSelect.value : 'diamond-desc';

    const filtered = filterGifts(allGifts, query);
    const sorted = sortGifts(filtered, sortBy);

    if (els.giftGalleryCountBadge) {
      els.giftGalleryCountBadge.textContent = query
        ? `${sorted.length} / ${allGifts.length} gift`
        : `${allGifts.length} gift`;
    }

    if (sorted.length === 0) {
      els.giftGalleryGrid.innerHTML = `
        <div class="muted" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center;">
          <div style="margin-bottom: 12px; display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.25);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #f1f5f9;">Tidak ada gift ditemukan</div>
          <div style="font-size: 12px; color: var(--text-muted);">Coba ubah kata kunci pencarian atau tambahkan gift baru.</div>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    sorted.forEach(g => {
      const card = document.createElement('div');
      card.className = 'gift-gallery-card';
      card.dataset.id = g.id;

      const imgSrc = getGiftImageSrc(g);

      card.innerHTML = `
        <div class="gift-card-img-wrap">
          <img class="gift-card-img" src="${imgSrc}" alt="${g.name}" onerror="window.__renderGiftFallback(this)" loading="lazy" />
        </div>
        <div class="gift-card-name" title="${g.name}">${g.name}</div>
        <div class="gift-card-id-row">
          <span class="gift-id-badge">ID: ${g.id}</span>
        </div>
        <div class="gift-card-price-row">
          <span class="gift-coin-badge">
            <img src="images/tiktok-coin.png" class="coin-icon-xs" alt="Coin" onerror="this.style.display='none'" />
            ${g.diamond.toLocaleString()}
          </span>
        </div>
        <div class="gift-card-actions">
          <button type="button" class="btn-gift-edit" data-id="${g.id}" title="Edit Gift">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>
          <button type="button" class="btn-gift-delete" data-id="${g.id}" title="Hapus Gift">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Hapus
          </button>
        </div>
      `;

      // Event listeners on card buttons
      const btnEdit = card.querySelector('.btn-gift-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditGiftModal(g);
        });
      }

      const btnDelete = card.querySelector('.btn-gift-delete');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          confirmDeleteGift(g);
        });
      }

      fragment.appendChild(card);
    });

    els.giftGalleryGrid.innerHTML = '';
    els.giftGalleryGrid.appendChild(fragment);
  }

  /**
   * Render Gift Picker Modal (for Tambah Aktivitas Baru).
   */
  function renderPicker() {
    if (!els.giftPickerGrid) return;

    const query = els.giftPickerSearchInput ? els.giftPickerSearchInput.value : '';
    const selectedId = els.actGiftId ? els.actGiftId.value : '';

    const filtered = filterGifts(allGifts, query);
    // Sort picker by diamond descending then name
    const sorted = sortGifts(filtered, 'diamond-desc');

    if (els.giftPickerTotalInfo) {
      els.giftPickerTotalInfo.textContent = query
        ? `Menampilkan ${sorted.length} dari ${allGifts.length} gift`
        : `${allGifts.length} gift terdaftar`;
    }

    if (sorted.length === 0) {
      els.giftPickerGrid.innerHTML = `
        <div class="muted" style="grid-column: 1 / -1; padding: 24px; text-align: center;">
          Tidak ada gift cocok dengan "${query}".
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    sorted.forEach(g => {
      const item = document.createElement('div');
      item.className = 'gift-picker-item' + (String(g.id) === String(selectedId) ? ' selected' : '');
      item.dataset.id = g.id;

      const imgSrc = getGiftImageSrc(g);

      item.innerHTML = `
        <div class="gift-picker-img-wrap">
          <img class="gift-picker-img" src="${imgSrc}" alt="${g.name}" onerror="window.__renderGiftFallback(this)" loading="lazy" />
        </div>
        <div class="gift-picker-name" title="${g.name}">${g.name}</div>
        <div class="gift-picker-meta">
          <span style="color:#FFD700; font-weight:700; display:inline-flex; align-items:center; gap:3px;">
            <img src="images/tiktok-coin.png" class="coin-icon-xs" style="width:11px; height:11px;" alt="" />
            ${g.diamond}
          </span>
          <span>•</span>
          <span>ID: ${g.id}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        selectGiftForActivity(g);
      });

      fragment.appendChild(item);
    });

    els.giftPickerGrid.innerHTML = '';
    els.giftPickerGrid.appendChild(fragment);
  }

  /**
   * Select a gift in the Activity Form.
   */
  function selectGiftForActivity(gift) {
    if (els.actGiftId) {
      els.actGiftId.value = gift ? gift.id : '';
      els.actGiftId.dispatchEvent(new Event('input', { bubbles: true }));
      els.actGiftId.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (gift) {
      if (els.actGiftNamePreview) els.actGiftNamePreview.textContent = gift.name;
      if (els.actGiftIdPreview) els.actGiftIdPreview.textContent = `(ID: ${gift.id} • ${gift.diamond} koin)`;
      if (els.actGiftImgPreview) {
        els.actGiftImgPreview.src = getGiftImageSrc(gift);
        els.actGiftImgPreview.style.display = 'inline-block';
      }
    } else {
      if (els.actGiftNamePreview) els.actGiftNamePreview.textContent = 'Semua Gift';
      if (els.actGiftIdPreview) els.actGiftIdPreview.textContent = '(Semua)';
      if (els.actGiftImgPreview) {
        els.actGiftImgPreview.src = '';
        els.actGiftImgPreview.style.display = 'none';
      }
    }

    closeGiftPicker();
  }

  /**
   * Open the Gift Picker Modal.
   */
  function openGiftPicker() {
    if (!els.modalGiftPicker) return;
    if (els.giftPickerSearchInput) {
      els.giftPickerSearchInput.value = '';
    }
    renderPicker();
    els.modalGiftPicker.style.display = 'flex';
    if (els.giftPickerSearchInput) {
      setTimeout(() => els.giftPickerSearchInput.focus(), 50);
    }
  }

  /**
   * Close the Gift Picker Modal.
   */
  function closeGiftPicker() {
    if (els.modalGiftPicker) {
      els.modalGiftPicker.style.display = 'none';
    }
  }

  /**
   * Sync Activity Gift Preview from current act_giftId.value.
   */
  function syncActivityPreviewFromInput() {
    if (!els.actGiftId) return;
    const val = els.actGiftId.value ? els.actGiftId.value.trim() : '';
    if (!val) {
      if (els.actGiftNamePreview) els.actGiftNamePreview.textContent = 'Semua Gift';
      if (els.actGiftIdPreview) els.actGiftIdPreview.textContent = '(Semua)';
      if (els.actGiftImgPreview) {
        els.actGiftImgPreview.src = '';
        els.actGiftImgPreview.style.display = 'none';
      }
      return;
    }

    const g = allGifts.find(item => String(item.id) === String(val));
    if (g) {
      if (els.actGiftNamePreview) els.actGiftNamePreview.textContent = g.name;
      if (els.actGiftIdPreview) els.actGiftIdPreview.textContent = `(ID: ${g.id} • ${g.diamond} koin)`;
      if (els.actGiftImgPreview) {
        els.actGiftImgPreview.src = getGiftImageSrc(g);
        els.actGiftImgPreview.style.display = 'inline-block';
      }
    } else {
      if (els.actGiftNamePreview) els.actGiftNamePreview.textContent = `Gift #${val}`;
      if (els.actGiftIdPreview) els.actGiftIdPreview.textContent = `(ID: ${val})`;
      if (els.actGiftImgPreview) {
        els.actGiftImgPreview.src = `images/gifts/${val}.png`;
        els.actGiftImgPreview.style.display = 'inline-block';
      }
    }
  }

  /**
   * Switch between Gallery and Feed in tab-gifts.
   */
  function switchGiftsTab(tab) {
    activeTab = tab;
    if (tab === 'gallery') {
      if (els.giftGallerySection) els.giftGallerySection.style.display = 'block';
      if (els.giftFeedSection) els.giftFeedSection.style.display = 'none';
      if (els.btnSwitchGiftGallery) {
        els.btnSwitchGiftGallery.classList.add('active', 'btn-primary');
        els.btnSwitchGiftGallery.classList.remove('btn-ghost');
      }
      if (els.btnSwitchGiftFeed) {
        els.btnSwitchGiftFeed.classList.remove('active', 'btn-primary');
        els.btnSwitchGiftFeed.classList.add('btn-ghost');
      }
      renderGallery();
    } else {
      if (els.giftGallerySection) els.giftGallerySection.style.display = 'none';
      if (els.giftFeedSection) els.giftFeedSection.style.display = 'block';
      if (els.btnSwitchGiftFeed) {
        els.btnSwitchGiftFeed.classList.add('active', 'btn-primary');
        els.btnSwitchGiftFeed.classList.remove('btn-ghost');
      }
      if (els.btnSwitchGiftGallery) {
        els.btnSwitchGiftGallery.classList.remove('active', 'btn-primary');
        els.btnSwitchGiftGallery.classList.add('btn-ghost');
      }
    }
  }

  /**
   * Open Modal to Add a new Gift.
   */
  function openAddGiftModal() {
    if (!els.modalGiftEdit) return;
    if (els.giftModalTitle) els.giftModalTitle.textContent = 'Tambah Gift Baru';
    if (els.giftEditOriginalId) els.giftEditOriginalId.value = '';
    if (els.giftFormName) els.giftFormName.value = '';
    if (els.giftFormId) {
      els.giftFormId.value = '';
      els.giftFormId.disabled = false;
    }
    if (els.giftFormDiamond) els.giftFormDiamond.value = '1';
    if (els.giftFormImage) els.giftFormImage.value = '';

    updateGiftFormPreview();
    els.modalGiftEdit.style.display = 'flex';
    if (els.giftFormName) {
      setTimeout(() => els.giftFormName.focus(), 50);
    }
  }

  /**
   * Open Modal to Edit an existing Gift.
   */
  function openEditGiftModal(gift) {
    if (!els.modalGiftEdit || !gift) return;
    if (els.giftModalTitle) els.giftModalTitle.textContent = `Edit Gift: ${gift.name}`;
    if (els.giftEditOriginalId) els.giftEditOriginalId.value = gift.id;
    if (els.giftFormName) els.giftFormName.value = gift.name;
    if (els.giftFormId) {
      els.giftFormId.value = gift.id;
      els.giftFormId.disabled = true; // ID should not be changed when editing
    }
    if (els.giftFormDiamond) els.giftFormDiamond.value = gift.diamond || 0;
    if (els.giftFormImage) els.giftFormImage.value = gift.image || '';

    updateGiftFormPreview();
    els.modalGiftEdit.style.display = 'flex';
    if (els.giftFormName) {
      setTimeout(() => els.giftFormName.focus(), 50);
    }
  }

  /**
   * Close the Add / Edit Gift Modal.
   */
  function closeGiftEditModal() {
    if (els.modalGiftEdit) {
      els.modalGiftEdit.style.display = 'none';
    }
  }

  /**
   * Update the live preview card in the Add / Edit modal.
   */
  function updateGiftFormPreview() {
    const name = els.giftFormName ? els.giftFormName.value.trim() : '';
    const id = els.giftFormId ? els.giftFormId.value.trim() : '';
    const diamond = els.giftFormDiamond ? els.giftFormDiamond.value.trim() : '1';
    const image = els.giftFormImage ? els.giftFormImage.value.trim() : '';

    if (els.giftFormPrevName) {
      els.giftFormPrevName.textContent = name || 'Nama Gift';
    }

    if (els.giftFormPrevMeta) {
      els.giftFormPrevMeta.innerHTML = `ID: ${id || '-'} • <img src="images/tiktok-coin.png" class="coin-icon-xs" alt="" /> ${diamond || 0}`;
    }

    if (els.giftFormImagePreviewWrap) {
      let previewSrc = '';
      if (image) {
        previewSrc = image;
      } else if (id) {
        previewSrc = `images/gifts/${id}.png`;
      }

      if (previewSrc) {
        els.giftFormImagePreviewWrap.innerHTML = `
          <img src="${previewSrc}" alt="Preview" onerror="window.__renderGiftFallback(this)" style="width:38px; height:38px; object-fit:contain;" />
        `;
      } else {
        els.giftFormImagePreviewWrap.innerHTML = GIFT_FALLBACK_HTML;
      }
    }
  }

  /**
   * Save (Add or Update) Gift.
   */
  async function saveGift() {
    const name = els.giftFormName ? els.giftFormName.value.trim() : '';
    const idStr = els.giftFormId ? els.giftFormId.value.trim() : '';
    const diamondStr = els.giftFormDiamond ? els.giftFormDiamond.value.trim() : '0';
    let image = els.giftFormImage ? els.giftFormImage.value.trim() : '';

    if (!name) {
      alert('Silakan masukkan nama gift.');
      if (els.giftFormName) els.giftFormName.focus();
      return;
    }

    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) {
      alert('Silakan masukkan ID gift TikTok yang valid (angka positif).');
      if (els.giftFormId) els.giftFormId.focus();
      return;
    }

    const diamond = parseInt(diamondStr, 10) || 0;
    if (!image) {
      image = `images/gifts/${id}.png`;
    }

    const originalId = els.giftEditOriginalId ? els.giftEditOriginalId.value.trim() : '';
    const isEditing = Boolean(originalId);

    const giftData = { id, name, diamond, image };

    if (els.btnSaveGift) {
      els.btnSaveGift.disabled = true;
      els.btnSaveGift.textContent = 'Menyimpan...';
    }

    try {
      if (isEditing) {
        if (window.api && window.api.updateGift) {
          await window.api.updateGift(parseInt(originalId, 10), giftData);
        }
      } else {
        if (window.api && window.api.addGift) {
          await window.api.addGift(giftData);
        }
      }

      closeGiftEditModal();
      await loadGifts();
    } catch (err) {
      console.error('[GiftsController] Error saving gift:', err);
      alert('Gagal menyimpan gift: ' + (err.message || err));
    } finally {
      if (els.btnSaveGift) {
        els.btnSaveGift.disabled = false;
        els.btnSaveGift.textContent = 'Simpan Gift';
      }
    }
  }

  /**
   * Confirm and delete gift.
   */
  async function confirmDeleteGift(gift) {
    if (!gift) return;

    const confirmed = confirm(`Apakah Anda yakin ingin menghapus gift "${gift.name}" (ID: ${gift.id}) dari database?`);
    if (!confirmed) return;

    try {
      if (window.api && window.api.deleteGift) {
        await window.api.deleteGift(gift.id);
      }
      await loadGifts();
    } catch (err) {
      console.error('[GiftsController] Error deleting gift:', err);
      alert('Gagal menghapus gift: ' + (err.message || err));
    }
  }

  /**
   * Append live incoming gift to #giftFeed.
   */
  function handleLiveGift(evt) {
    if (!evt) return;
    const p = evt.payload || evt;
    if (!p) return;

    liveGiftsCount++;
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const nickname = p.nickname || p.uniqueId || 'Anonim';
    const giftName = p.giftName || 'Gift';
    const repeatCount = Math.max(1, Number(p.repeatCount || 1));
    const diamondCost = Number(p.diamondCost || p.diamondCount || 0);
    const diamondTotal = diamondCost * repeatCount;
    const avatar = p.profilePictureUrl || 'images/logo.png';
    const giftId = p.giftId || '';
    const giftImg = `images/gifts/${giftId}.png`;

    // Vue 3 Reactive Feed Push
    if (giftFeedState.list && giftFeedState.list.value) {
      giftFeedState.list.value.unshift({
        id: 'gift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        nickname,
        giftName,
        repeatCount,
        diamondTotal,
        avatar,
        giftImg,
        timeStr
      });
      if (giftFeedState.list.value.length > 100) {
        giftFeedState.list.value.length = 100;
      }
      return;
    }

    if (!els.giftFeed) return;
    const item = document.createElement('div');
    item.className = 'feed-item gift';
    item.innerHTML = `
      <img class="avatar" src="${avatar}" onerror="this.src='images/logo.png'" alt="${nickname}" />
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="name">${nickname}</span>
          <span style="font-size: 11px; color: var(--text-muted);">${timeStr}</span>
        </div>
        <div style="font-size: 12.5px; margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span class="text">mengirim <strong>${giftName}</strong></span>
          <span style="background: rgba(255, 215, 0, 0.15); color: #FFD700; border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 4px; padding: 1px 6px; font-weight: 700; font-size: 11px;">
            x${repeatCount}
          </span>
          <span style="color: #FFD700; font-size: 11.5px; font-weight: 600;">(${diamondTotal} koin)</span>
        </div>
      </div>
      <div style="width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
        <img src="${giftImg}" onerror="window.__renderGiftFallback(this)" style="width: 28px; height: 28px; object-fit: contain;" alt="${giftName}" />
      </div>
    `;

    els.giftFeed.prepend(item);

    // Limit feed to 100 items to prevent RAM bloat
    while (els.giftFeed.children.length > 100) {
      els.giftFeed.removeChild(els.giftFeed.lastChild);
    }
  }

  /**
   * Setup Property Interceptor & MutationObserver on act_giftId.
   */
  function setupActivityGiftSync() {
    if (!els.actGiftId) return;

    // Observe changes to value property
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    try {
      Object.defineProperty(els.actGiftId, 'value', {
        get() {
          return descriptor.get.call(this);
        },
        set(val) {
          descriptor.set.call(this, val);
          syncActivityPreviewFromInput();
        }
      });
    } catch (e) {
      console.warn('[GiftsController] Could not define property on actGiftId:', e);
    }

    // Also observe when activityModal is shown
    if (els.activityModal) {
      const observer = new MutationObserver(() => {
        if (els.activityModal.style.display !== 'none') {
          syncActivityPreviewFromInput();
        }
      });
      observer.observe(els.activityModal, { attributes: true, attributeFilter: ['style'] });
    }
  }

  /**
   * Bind all event listeners.
   */
  function bindEvents() {
    // 1. Activity Modal: Open Gift Picker on clicking btnOpenGiftModal
    if (els.btnOpenGiftModal) {
      els.btnOpenGiftModal.style.cursor = 'pointer';
      els.btnOpenGiftModal.addEventListener('click', (e) => {
        e.preventDefault();
        openGiftPicker();
      });
    }

    // 2. Gift Picker Modal Actions
    if (els.btnCloseGiftPickerModal) {
      els.btnCloseGiftPickerModal.addEventListener('click', closeGiftPicker);
    }
    if (els.btnCancelGiftPicker) {
      els.btnCancelGiftPicker.addEventListener('click', closeGiftPicker);
    }
    if (els.modalGiftPicker) {
      els.modalGiftPicker.addEventListener('click', (e) => {
        if (e.target === els.modalGiftPicker) closeGiftPicker();
      });
    }
    if (els.btnSelectAllGiftsOption) {
      els.btnSelectAllGiftsOption.addEventListener('click', () => {
        selectGiftForActivity(null);
      });
    }
    if (els.giftPickerSearchInput) {
      els.giftPickerSearchInput.addEventListener('input', () => {
        renderPicker();
      });
    }

    // 3. Tab Gifts: Switch between Galeri and Live Feed
    if (els.btnSwitchGiftGallery) {
      els.btnSwitchGiftGallery.addEventListener('click', () => switchGiftsTab('gallery'));
    }
    if (els.btnSwitchGiftFeed) {
      els.btnSwitchGiftFeed.addEventListener('click', () => switchGiftsTab('feed'));
    }

    // 4. Tab Gifts: Search & Sort
    if (els.giftSearchInput) {
      els.giftSearchInput.addEventListener('input', () => {
        renderGallery();
      });
    }
    if (els.giftSortSelect) {
      els.giftSortSelect.addEventListener('change', () => {
        renderGallery();
      });
    }

    // 5. Tab Gifts: Open Add Gift Modal
    if (els.btnOpenAddGiftModal) {
      els.btnOpenAddGiftModal.addEventListener('click', openAddGiftModal);
    }

    // 6. Add/Edit Modal Actions
    if (els.btnCloseGiftEditModal) {
      els.btnCloseGiftEditModal.addEventListener('click', closeGiftEditModal);
    }
    if (els.btnCancelGiftModal) {
      els.btnCancelGiftModal.addEventListener('click', closeGiftEditModal);
    }
    if (els.modalGiftEdit) {
      els.modalGiftEdit.addEventListener('click', (e) => {
        if (e.target === els.modalGiftEdit) closeGiftEditModal();
      });
    }
    if (els.btnSaveGift) {
      els.btnSaveGift.addEventListener('click', saveGift);
    }

    // 7. Live Preview inputs in Add/Edit form
    const formInputs = [els.giftFormName, els.giftFormId, els.giftFormDiamond, els.giftFormImage];
    formInputs.forEach(input => {
      if (input) {
        input.addEventListener('input', updateGiftFormPreview);
      }
    });

    // 8. Asset Gift Folder integration for "Pilih File"
    if (els.btnPickGiftImage) {
      els.btnPickGiftImage.addEventListener('click', () => {
        if (window.assetFolders && typeof window.assetFolders.openGiftPicker === 'function') {
          window.assetFolders.openGiftPicker((filePath) => {
            if (!filePath) return;
            if (els.giftFormImage) {
              els.giftFormImage.value = filePath;
              updateGiftFormPreview();
            }
          });
        } else {
          // Fallback simple prompt
          const path = prompt('Masukkan URL gambar atau path file:', els.giftFormImage ? els.giftFormImage.value : '');
          if (path !== null && els.giftFormImage) {
            els.giftFormImage.value = path.trim();
            updateGiftFormPreview();
          }
        }
      });
    }

    // 9. Sidebar Tab Switch to 'gifts'
    const tabGiftsBtn = document.querySelector('.tab-btn[data-tab="gifts"]');
    if (tabGiftsBtn) {
      tabGiftsBtn.addEventListener('click', () => {
        if (!isGiftsLoaded) {
          loadGifts();
        } else {
          renderGallery();
        }
      });
    }

    // 10. Listen to live TikTok gift events for Live Feed
    if (window.api && typeof window.api.onEvent === 'function') {
      window.api.onEvent((evt) => {
        if (evt && evt.type === 'gift') {
          handleLiveGift(evt);
        }
      });
    }

    // 11. Activity modal triggers to sync preview
    const btnOpenAddAct = document.getElementById('btnOpenAddActivityModal');
    if (btnOpenAddAct) {
      btnOpenAddAct.addEventListener('click', () => {
        setTimeout(() => syncActivityPreviewFromInput(), 50);
      });
    }

    const actList = document.getElementById('activityList');
    if (actList) {
      actList.addEventListener('click', () => {
        setTimeout(() => syncActivityPreviewFromInput(), 50);
      });
    }
  }

  // Initialization
  async function init() {
    setupActivityGiftSync();
    bindEvents();
    await loadGifts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export to global window for potential integrations
  window.giftsController = {
    loadGifts,
    openGiftPicker,
    closeGiftPicker,
    selectGiftForActivity,
    openAddGiftModal,
    openEditGiftModal,
    getAllGifts: () => allGifts
  };

})();
