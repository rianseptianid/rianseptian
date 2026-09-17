/**
 * liveChatFeed.js
 * Controller untuk Live Chat Feed pada Dashboard:
 * - Menangkap komentar penonton TikTok LIVE realtime dengan format kartu overlay (gold highlight, border, avatar)
 * - Menangkap event viewer BERGABUNG (member / join) dan menampilkannya di feed
 * - Menangkap event follow dan share
 * - Menjaga auto-scroll ke bawah saat komentar baru masuk
 * - Menghandle tombol Bersihkan Chat (#btnClearChatFeed) dan tombol Test Chat & Join (#btnTestChatFeed)
 */

(function () {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(ts) {
    const d = ts ? new Date(ts) : new Date();
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function getChatFeedContainer() {
    return document.getElementById('chatFeed');
  }

  function removeEmptyState(container) {
    if (!container) return;
    const emptyEl = container.querySelector('#chatFeedEmpty');
    if (emptyEl) emptyEl.remove();
  }

  function appendChatComment(payload, ts) {
    const container = getChatFeedContainer();
    if (!container) return;
    removeEmptyState(container);

    const name = escapeHtml(payload?.nickname || payload?.uniqueId || 'Penonton');
    const comment = escapeHtml(payload?.comment || '');
    const avatarUrl = payload?.avatar ? escapeHtml(payload.avatar) : '';
    const time = formatTime(ts);
    const initial = (name.charAt(0) || '💬').toUpperCase();

    const item = document.createElement('div');
    item.className = 'feed-item feed-item-chat';
    item.innerHTML = `
      ${avatarUrl ? `<img class="avatar" src="${avatarUrl}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="avatar-fallback" style="display:none;">${initial}</div>` : `<div class="avatar-fallback">${initial}</div>`}
      <div class="content">
        <span class="name">${name}</span>
        <span class="comment-body">${comment}</span>
      </div>
      <span class="ts">${time}</span>
    `;

    // Cap maximum chat feed items to avoid DOM lag
    const items = container.querySelectorAll('.feed-item');
    if (items.length > 150) {
      items[0].remove();
    }

    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  function appendJoinEvent(payload, ts) {
    const container = getChatFeedContainer();
    if (!container) return;
    removeEmptyState(container);

    const name = escapeHtml(payload?.nickname || payload?.uniqueId || 'Penonton');
    const avatarUrl = payload?.avatar ? escapeHtml(payload.avatar) : '';
    const time = formatTime(ts);
    const initial = (name.charAt(0) || '👋').toUpperCase();

    const item = document.createElement('div');
    item.className = 'feed-item feed-item-join';
    item.innerHTML = `
      ${avatarUrl ? `<img class="avatar" src="${avatarUrl}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="avatar-fallback" style="display:none;">${initial}</div>` : `<div class="chat-event-icon">👋</div>`}
      <div class="content">
        <span class="join-badge">👋 BERGABUNG</span>
        <span class="name">${name}</span>
        <span class="join-desc">bergabung ke siaran LIVE</span>
      </div>
      <span class="ts">${time}</span>
    `;

    // Cap maximum items
    const items = container.querySelectorAll('.feed-item');
    if (items.length > 150) {
      items[0].remove();
    }

    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  function appendFollowEvent(payload, ts) {
    const container = getChatFeedContainer();
    if (!container) return;
    removeEmptyState(container);

    const name = escapeHtml(payload?.nickname || payload?.uniqueId || 'Penonton');
    const avatarUrl = payload?.avatar ? escapeHtml(payload.avatar) : '';
    const time = formatTime(ts);
    const initial = (name.charAt(0) || '➕').toUpperCase();

    const item = document.createElement('div');
    item.className = 'feed-item feed-item-follow';
    item.innerHTML = `
      ${avatarUrl ? `<img class="avatar" src="${avatarUrl}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="avatar-fallback" style="display:none;">${initial}</div>` : `<div class="chat-event-icon">➕</div>`}
      <div class="content">
        <span class="follow-badge">➕ FOLLOW</span>
        <span class="name">${name}</span>
        <span class="follow-desc">mulai mengikuti host</span>
      </div>
      <span class="ts">${time}</span>
    `;

    const items = container.querySelectorAll('.feed-item');
    if (items.length > 150) {
      items[0].remove();
    }

    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  function appendShareEvent(payload, ts) {
    const container = getChatFeedContainer();
    if (!container) return;
    removeEmptyState(container);

    const name = escapeHtml(payload?.nickname || payload?.uniqueId || 'Penonton');
    const avatarUrl = payload?.avatar ? escapeHtml(payload.avatar) : '';
    const time = formatTime(ts);
    const initial = (name.charAt(0) || '🔁').toUpperCase();

    const item = document.createElement('div');
    item.className = 'feed-item feed-item-share';
    item.innerHTML = `
      ${avatarUrl ? `<img class="avatar" src="${avatarUrl}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" /><div class="avatar-fallback" style="display:none;">${initial}</div>` : `<div class="chat-event-icon">🔁</div>`}
      <div class="content">
        <span class="share-badge">🔁 SHARE</span>
        <span class="name">${name}</span>
        <span class="share-desc">membagikan siaran LIVE</span>
      </div>
      <span class="ts">${time}</span>
    `;

    const items = container.querySelectorAll('.feed-item');
    if (items.length > 150) {
      items[0].remove();
    }

    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  // Hook realtime TikTok events
  function initRealtimeFeed() {
    if (window.api && typeof window.api.onEvent === 'function') {
      window.api.onEvent((event) => {
        if (!event) return;
        const { type, payload, ts } = event;

        // Viewer realtime chat comments - format mirip overlay (gold username & border)
        if (type === 'chat') {
          appendChatComment(payload, ts);
        }
        // Viewer join events (member / join) - "yang bergabung juga datanya masuk situ"
        else if (type === 'member' || type === 'join') {
          appendJoinEvent(payload, ts);
        }
        // Follow event
        else if (type === 'follow') {
          appendFollowEvent(payload, ts);
        }
        // Share event
        else if (type === 'share') {
          appendShareEvent(payload, ts);
        }
      });
    }

    // Auto-scroll observer for any items appended (including those from app.js)
    const chatFeed = getChatFeedContainer();
    if (chatFeed) {
      const observer = new MutationObserver(() => {
        const emptyEl = chatFeed.querySelector('#chatFeedEmpty');
        const hasItems = chatFeed.querySelectorAll('.feed-item').length > 0;
        if (hasItems) {
          if (emptyEl) emptyEl.remove();
          chatFeed.scrollTop = chatFeed.scrollHeight;
        }
      });
      observer.observe(chatFeed, { childList: true });
    }

    // Test Chat & Join simulation button
    const btnTest = document.getElementById('btnTestChatFeed');
    if (btnTest) {
      const sampleNames = ['Rian Gaming', 'Siti_Official', 'Budi Santoso', 'GamerSejati', 'Putri_Live', 'DimasPratama'];
      const sampleComments = [
        'Halo bang, mantap live streamnya! 🔥',
        'Semangat terus live-nya bang!',
        'Keren banget overlay dan interaksinya 👍',
        'Sapa aku dong bang 👋',
        'Auto follow & like banyak-banyak ❤️'
      ];
      let testCount = 0;

      btnTest.addEventListener('click', (e) => {
        e.preventDefault();
        testCount++;
        const randName = sampleNames[testCount % sampleNames.length];
        const randComment = sampleComments[testCount % sampleComments.length];

        if (testCount % 2 === 1) {
          // Add comment
          appendChatComment({
            uniqueId: randName.toLowerCase().replace(/\s+/g, '_'),
            nickname: randName,
            comment: randComment,
            avatar: ''
          }, Date.now());
          if (window.showGlassToast) {
            window.showGlassToast(`Simulasi komentar dari ${randName} berhasil masuk!`);
          }
        } else {
          // Add join
          appendJoinEvent({
            uniqueId: randName.toLowerCase().replace(/\s+/g, '_'),
            nickname: randName,
            avatar: ''
          }, Date.now());
          if (window.showGlassToast) {
            window.showGlassToast(`Simulasi penonton ${randName} bergabung!`);
          }
        }
      });
    }
  }

  // Expose methods for testing or other scripts
  window.appendChatComment = appendChatComment;
  window.appendJoinEvent = appendJoinEvent;
  window.appendFollowEvent = appendFollowEvent;
  window.appendShareEvent = appendShareEvent;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRealtimeFeed);
  } else {
    initRealtimeFeed();
  }
})();
