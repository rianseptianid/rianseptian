/**
 * dom-trim.js — Tugas 2: Trim DOM list chat & gift agar tidak unbounded
 * File ini berdiri sendiri, TIDAK mengubah app.js yang ter-obfuscate.
 *
 * Cara kerja:
 * - Memantau container chat & gift dengan MutationObserver
 * - Kalau jumlah item melebihi batas, hapus item paling lama (FIFO)
 * - Berlaku untuk semua container yang diberi atribut data-trim-max
 *   ATAU yang match selector #chatList, #giftList, .chat-list, .gift-list
 */

;(function domTrimInit() {
  'use strict';

  // ── KONSTANTA ──────────────────────────────────────────────────────────────
  const MAX_CHAT_ITEMS = 200;   // Lebih dari ini → item lama dihapus
  const MAX_GIFT_ITEMS = 100;   // Gift list lebih ringkas
  const CHECK_INTERVAL_MS = 2000; // Cek tiap 2 detik (fallback untuk container yg tidak di-observe)

  // ── FUNGSI TRIM ────────────────────────────────────────────────────────────
  /**
   * Trim container: hapus children paling awal sampai jumlah <= maxItems
   * @param {Element} container
   * @param {number} maxItems
   */
  function trimContainer(container, maxItems) {
    const children = container.children;
    while (children.length > maxItems) {
      container.removeChild(children[0]);
    }
  }

  /**
   * Helper reusable: append element ke container dengan auto-trim
   * Gunakan ini sebagai pengganti container.appendChild() jika ingin trim otomatis.
   * @param {Element} container
   * @param {Element} element
   * @param {number} [maxItems=200]
   */
  function appendChatItem(container, element, maxItems) {
    if (!container || !element) return;
    container.appendChild(element);
    trimContainer(container, maxItems ?? MAX_CHAT_ITEMS);
  }
  window.appendChatItem = appendChatItem;

  /**
   * Helper untuk gift list
   */
  function appendGiftItem(container, element) {
    return appendChatItem(container, element, MAX_GIFT_ITEMS);
  }
  window.appendGiftItem = appendGiftItem;

  // ── SETUP OBSERVER PER CONTAINER ──────────────────────────────────────────
  function setupObserver(container, maxItems) {
    if (!container || container._domTrimObserverActive) return;
    container._domTrimObserverActive = true;

    const observer = new MutationObserver(() => {
      if (container.children.length > maxItems) {
        trimContainer(container, maxItems);
      }
    });
    observer.observe(container, { childList: true });
  }

  // ── SELECTORS YANG DIPANTAU ────────────────────────────────────────────────
  // Cocokkan ID/class yang mungkin dipakai app.js obfuscated
  const CHAT_SELECTORS = [
    '#chatFeed', '#chatList', '#chat-list', '.chat-list', '.chat-container',
    '[data-type="chat"]', '#liveChatList', '#commentList', '.comment-list',
    '#chat-feed', '.chat-feed', '#eventFeed', '.event-feed',
    '#liveChat', '.live-chat-list'
  ];
  const GIFT_SELECTORS = [
    '#giftList', '#gift-list', '.gift-list', '.gift-container',
    '[data-type="gift"]', '#liveGiftList', '.gift-feed', '#giftFeed'
  ];

  function attachObservers() {
    CHAT_SELECTORS.forEach(sel => {
      try {
        const el = document.querySelector(sel);
        if (el) setupObserver(el, MAX_CHAT_ITEMS);
      } catch (_) {}
    });
    GIFT_SELECTORS.forEach(sel => {
      try {
        const el = document.querySelector(sel);
        if (el) setupObserver(el, MAX_GIFT_ITEMS);
      } catch (_) {}
    });

    // Juga tangkap container yang pakai atribut data-trim-max
    document.querySelectorAll('[data-trim-max]').forEach(el => {
      const max = parseInt(el.getAttribute('data-trim-max'), 10);
      if (max > 0) setupObserver(el, max);
    });
  }

  // ── FALLBACK INTERVAL: trim paksa tiap 2 detik ───────────────────────────
  // Ini jaring pengaman untuk container yang baru muncul setelah DOMContentLoaded
  function intervalTrim() {
    CHAT_SELECTORS.forEach(sel => {
      try {
        const el = document.querySelector(sel);
        if (!el) return;
        if (!el._domTrimObserverActive) setupObserver(el, MAX_CHAT_ITEMS);
        if (el.children.length > MAX_CHAT_ITEMS) trimContainer(el, MAX_CHAT_ITEMS);
      } catch (_) {}
    });
    GIFT_SELECTORS.forEach(sel => {
      try {
        const el = document.querySelector(sel);
        if (!el) return;
        if (!el._domTrimObserverActive) setupObserver(el, MAX_GIFT_ITEMS);
        if (el.children.length > MAX_GIFT_ITEMS) trimContainer(el, MAX_GIFT_ITEMS);
      } catch (_) {}
    });
  }

  // ── INIT ───────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachObservers();
      setInterval(intervalTrim, CHECK_INTERVAL_MS);
    });
  } else {
    // Sudah loaded (script diload defer/async atau inject manual)
    attachObservers();
    setInterval(intervalTrim, CHECK_INTERVAL_MS);
  }

  console.log('[dom-trim] Aktif — MAX_CHAT=' + MAX_CHAT_ITEMS + ', MAX_GIFT=' + MAX_GIFT_ITEMS);
})();
