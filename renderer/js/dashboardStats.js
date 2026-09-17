/**
 * dashboardStats.js
 * Realtime synchronization between Dashboard Live Stats and Goals System.
 * Handles:
 * - Realtime animated updates for Coins, Comments, Likes, and Followers on Dashboard.
 * - Reset Statistics action with confirmation.
 * - Initial state population from backend config.
 */

(function () {
  'use strict';

  const statEls = {
    gifts: document.getElementById('statGiftsVal'),
    comments: document.getElementById('statComments'),
    likes: document.getElementById('statLikes'),
    follows: document.getElementById('statFollows')
  };

  const currentValues = {
    gifts: 0,
    comments: 0,
    likes: 0,
    follows: 0
  };

  // Animate counter numbers smoothly
  function updateElementValue(el, key, targetNum) {
    if (!el) return;
    const cleanNum = Math.max(0, Number(targetNum) || 0);
    currentValues[key] = cleanNum;
    el.textContent = cleanNum.toLocaleString();

    // Pulse animation
    el.classList.remove('stat-pulse-active');
    void el.offsetWidth;
    el.classList.add('stat-pulse-active');
  }

  // Update all dashboard cards from stats payload
  function applyStats(stats) {
    if (!stats || typeof stats !== 'object') return;

    if (typeof stats.totalGifts === 'number') {
      updateElementValue(statEls.gifts, 'gifts', stats.totalGifts);
    }
    if (typeof stats.totalComments === 'number') {
      updateElementValue(statEls.comments, 'comments', stats.totalComments);
    }
    if (typeof stats.totalLikes === 'number') {
      updateElementValue(statEls.likes, 'likes', stats.totalLikes);
    }
    if (typeof stats.totalFollows === 'number') {
      updateElementValue(statEls.follows, 'follows', stats.totalFollows);
    }
  }

  // Initial load
  async function loadInitialStats() {
    try {
      if (window.api && window.api.getConfig) {
        const cfg = await window.api.getConfig();
        if (cfg?.stats) {
          applyStats(cfg.stats);
        }
      }
    } catch (err) {
      console.warn('[DashboardStats] Gagal memuat statistik awal:', err);
    }
  }

  // Setup Reset Button
  function setupResetStatsButton() {
    const btnReset = document.getElementById('resetStatsBtn');
    if (!btnReset) return;

    btnReset.addEventListener('click', async (e) => {
      e.preventDefault();

      // Show confirmation dialog if available
      let confirmed = false;
      const modal = document.getElementById('customConfirmModal');
      if (modal) {
        const titleEl = document.getElementById('customConfirmTitle');
        const msgEl = document.getElementById('customConfirmMessage');
        const okBtn = document.getElementById('customConfirmOkBtn');
        const cancelBtn = document.getElementById('customConfirmCancelBtn');

        confirmed = await new Promise((resolve) => {
          if (titleEl) titleEl.textContent = 'Reset Statistik Sesi';
          if (msgEl) msgEl.textContent = 'Apakah Anda yakin ingin me-reset semua statistik koin, like, komentar, follower, dan progress goal sesi ini kembali ke 0?';
          if (okBtn) okBtn.textContent = 'Ya, Reset Semua';

          const cleanup = () => {
            modal.style.display = 'none';
            okBtn?.removeEventListener('click', onOk);
            cancelBtn?.removeEventListener('click', onCancel);
          };
          const onOk = () => { cleanup(); resolve(true); };
          const onCancel = () => { cleanup(); resolve(false); };

          okBtn?.addEventListener('click', onOk);
          cancelBtn?.addEventListener('click', onCancel);
          modal.style.display = 'flex';
        });
      } else {
        confirmed = window.confirm('Reset semua data statistik sesi saat ini ke 0?');
      }

      if (!confirmed) return;

      try {
        if (window.api && window.api.resetStats) {
          const fresh = await window.api.resetStats();
          applyStats(fresh || { totalGifts: 0, totalComments: 0, totalLikes: 0, totalFollows: 0 });
        }
      } catch (err) {
        console.error('[DashboardStats] Gagal reset statistik:', err);
      }
    });
  }

  // Listen to IPC stats update from main process
  function setupRealtimeListener() {
    if (window.api && window.api.onStatsUpdate) {
      window.api.onStatsUpdate((stats) => {
        applyStats(stats);
      });
    }
  }

  function init() {
    setupResetStatsButton();
    setupRealtimeListener();
    loadInitialStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
