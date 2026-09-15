/**
 * updater-ui.js — Update Notifier UI untuk nurearn renderer
 * Listen IPC 'update:available', tampilkan banner, handle tombol.
 * Tidak bergantung pada app.js yang obfuscated.
 */
;(function updaterUiInit() {
  'use strict';

  const api = window.api; // exposed by preload.js

  // Elemen DOM
  const banner      = document.getElementById('updateBanner');
  const bannerTitle = document.getElementById('updateBannerTitle');
  const bannerSub   = document.getElementById('updateBannerSub');
  const openBtn     = document.getElementById('updateBannerOpenBtn');
  const dismissBtn  = document.getElementById('updateBannerDismissBtn');

  if (!banner || !bannerTitle || !bannerSub || !openBtn || !dismissBtn) {
    console.warn('[updater-ui] Elemen banner tidak ditemukan — pastikan HTML sudah diperbarui.');
    return;
  }

  // URL release aktif — disimpan agar tombol bisa membukanya
  let _releaseUrl = 'https://github.com/nurearn/nurearn/releases/latest';

  /**
   * Tampilkan banner dengan info pembaruan
   * @param {{ latestVersion, releaseName, currentVersion, releaseUrl, changelog }} info
   */
  function showBanner(info) {
    const ver = info.latestVersion || '';
    const cur = info.currentVersion || '';
    const name = info.releaseName || ver;

    _releaseUrl = info.releaseUrl || _releaseUrl;

    bannerTitle.textContent = `✨ Pembaruan tersedia — nurearn ${ver}`;
    bannerSub.textContent   = cur ? `(versi kamu: ${cur})` : '';

    // Tampilkan banner + tambah class ke body agar layout turun
    banner.style.display = 'flex';
    document.body.classList.add('has-update-banner');

    // Re-trigger animasi kalau banner sudah pernah tampil
    banner.style.animation = 'none';
    void banner.offsetHeight; // reflow
    banner.style.animation = '';

    console.info(`[updater-ui] 🚀 Update tersedia: ${ver} (saat ini: ${cur})`);
  }

  /**
   * Sembunyikan banner
   */
  function hideBanner() {
    banner.style.display = 'none';
    document.body.classList.remove('has-update-banner');
  }

  // ── Event Handlers ──────────────────────────────────────────────────────────

  // Buka halaman GitHub Release di browser default
  openBtn.addEventListener('click', async () => {
    try {
      if (api && typeof api.openRelease === 'function') {
        await api.openRelease(_releaseUrl);
      } else if (api && typeof api.invoke === 'function') {
        await api.invoke('update:openRelease', _releaseUrl);
      } else {
        window.open(_releaseUrl, '_blank');
      }
    } catch (err) {
      console.error('[updater-ui] Gagal buka release URL:', err);
    }
  });

  // Tutup banner (dismiss sampai app restart)
  dismissBtn.addEventListener('click', () => {
    hideBanner();
  });

  // ── Listen IPC dari main process ────────────────────────────────────────────
  if (api && typeof api.onUpdateAvailable === 'function') {
    api.onUpdateAvailable((info) => {
      showBanner(info);
    });
    console.info('[updater-ui] Aktif — menunggu notifikasi pembaruan via onUpdateAvailable...');
  } else if (api && typeof api.on === 'function') {
    api.on('update:available', (_event, info) => {
      showBanner(info);
    });
    console.info('[updater-ui] Aktif — menunggu notifikasi pembaruan via api.on...');
  } else {
    console.warn('[updater-ui] window.api listener tidak tersedia');
  }
})();
