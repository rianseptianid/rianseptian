/**
 * nurearnLive.js
 * Controller untuk Komunitas Streamer Nurearn Live (Vue 3 Reactive Component)
 * - Hanya menampilkan streamer asli yang terhubung ke aplikasi Nurearn Studio.
 * - Mengambil profil asli TikTok (avatar, nickname, username, viewers, likes, start time).
 * - Sinkronisasi realtime melalui IPC, server overlay lokal, dan domain tunnel overlay.nurearn.site.
 * - Tema visual diselaraskan 100% dengan Nurearn Studio (Dark Glassmorphism & Gold/Emerald).
 */

(function () {
  'use strict';

  function cleanUsername(u) {
    return String(u || '').replace(/^@/, '').trim();
  }

  function formatUsername(u) {
    if (!u) return '@user';
    return u.startsWith('@') ? u : `@${u}`;
  }

  function getInitialChar(name, username) {
    const str = (name || username || 'U').trim().replace(/^@/, '');
    return str.length > 0 ? str.charAt(0).toUpperCase() : 'U';
  }

  // Format timestamp to HH.mm (e.g. 14.30)
  function formatTime(ts) {
    if (!ts) return '--:--';
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}.${m}`;
  }

  // Format live duration (e.g. 01:23:45)
  function formatDuration(startTime) {
    if (!startTime) return '00:00:00';
    const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
  }

  // Daftar streamer awal KOSONG — HANYA pengguna asli yang terhubung ke Nurearn Studio
  const DEFAULT_STREAMERS = [];

  let vueLiveApp = null;
  const sharedState = {
    streamers: null,
    searchQuery: null,
    isRefreshing: null
  };

  // Check if Vue 3 is loaded
  if (window.Vue && window.Vue.createApp) {
    const { createApp, ref, computed, onMounted, onUnmounted } = window.Vue;

    vueLiveApp = createApp({
      setup() {
        const streamers = ref([...DEFAULT_STREAMERS]);
        const searchQuery = ref('');
        const isRefreshing = ref(false);
        const currentTime = ref(Date.now());

        let timerInterval = null;
        let pollInterval = null;

        sharedState.streamers = streamers;
        sharedState.searchQuery = searchQuery;
        sharedState.isRefreshing = isRefreshing;

        // Online count
        const onlineCount = computed(() => {
          return streamers.value.filter(s => s.isOnline !== false).length;
        });

        // Filtered streamers based on search query
        const filteredStreamers = computed(() => {
          const q = searchQuery.value.trim().toLowerCase().replace(/^@/, '');
          let list = streamers.value;

          if (q) {
            list = list.filter(s => {
              const u = cleanUsername(s.username).toLowerCase();
              const n = (s.nickname || '').toLowerCase();
              return u.includes(q) || n.includes(q);
            });
          }

          // Sort: Online first, then Offline, ordered by start time
          return [...list].sort((a, b) => {
            const aOn = a.isOnline !== false ? 1 : 0;
            const bOn = b.isOnline !== false ? 1 : 0;
            if (aOn !== bOn) return bOn - aOn;
            return (b.startTime || b.lastSeen || 0) - (a.startTime || a.lastSeen || 0);
          });
        });

        const clearSearch = () => {
          searchQuery.value = '';
        };

        const focusConnectInput = () => {
          const inp = document.getElementById('usernameInput');
          if (inp) {
            inp.focus();
            inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inp.classList.add('link-copied-flash');
            setTimeout(() => inp.classList.remove('link-copied-flash'), 1400);
          }
        };

        const openLive = (username) => {
          const clean = cleanUsername(username);
          if (!clean) return;
          const url = `https://www.tiktok.com/@${clean}/live`;

          if (window.api && window.api.openOverlayInBrowser) {
            window.api.openOverlayInBrowser(url);
          } else {
            window.open(url, '_blank');
          }
        };

        const handleAvatarError = (s) => {
          s.avatar = null;
        };

        // Merge incoming list of active streamers from server / IPC
        function mergeStreamers(incomingList) {
          if (!Array.isArray(incomingList)) return;
          const activeMap = new Map();

          // Retain state for incoming streamers
          incomingList.forEach(item => {
            const u = cleanUsername(item.username);
            if (!u) return;
            const existing = streamers.value.find(s => cleanUsername(s.username) === u) || {};
            activeMap.set(u, {
              ...existing,
              ...item,
              username: u,
              nickname: item.nickname || existing.nickname || u,
              avatar: item.avatar || existing.avatar || null,
              isOnline: item.isOnline !== false,
              startTime: item.startTime || existing.startTime || Date.now(),
              likes: Number(item.likes ?? existing.likes ?? 0),
              viewers: Number(item.viewers ?? existing.viewers ?? 0),
              diamonds: Number(item.diamonds ?? existing.diamonds ?? 0),
              version: item.version || existing.version || null
            });
          });

          // Also retain locally connected streamer if currently online
          const usernameInput = document.getElementById('usernameInput');
          const myUser = cleanUsername(usernameInput?.value || localStorage.getItem('saved_username') || '');
          if (myUser && !activeMap.has(myUser)) {
            const myExisting = streamers.value.find(s => cleanUsername(s.username) === myUser);
            if (myExisting && myExisting.isOnline) {
              activeMap.set(myUser, myExisting);
            }
          }

          streamers.value = Array.from(activeMap.values());
        }

        // Sync with currently connected TikTok account in this application instance
        async function syncCurrentConnectedUser() {
          if (!window.api || !window.api.getStatus) return;
          try {
            const st = await window.api.getStatus().catch(() => null);
            const usernameInput = document.getElementById('usernameInput');
            const myUser = cleanUsername(st?.username || usernameInput?.value || localStorage.getItem('saved_username') || '');

            if (myUser) {
              const isConn = st?.state === 'CONNECTED';
              const idx = streamers.value.findIndex(s => cleanUsername(s.username) === myUser);
              const nickname = st?.nickname || myUser;
              const avatar = st?.avatar || null;

              if (isConn) {
                if (idx >= 0) {
                  streamers.value[idx].isOnline = true;
                  if (nickname && nickname !== myUser) streamers.value[idx].nickname = nickname;
                  if (avatar) streamers.value[idx].avatar = avatar;
                  if (!streamers.value[idx].startTime) streamers.value[idx].startTime = Date.now();
                } else {
                  streamers.value.unshift({
                    username: myUser,
                    nickname: nickname,
                    avatar: avatar,
                    isOnline: true,
                    startTime: Date.now(),
                    likes: 0,
                    viewers: 1
                  });
                }
              } else if (idx >= 0) {
                streamers.value[idx].isOnline = false;
                streamers.value[idx].lastSeen = Date.now();
              }
            }
          } catch (_) { }
        }

        // Fetch live streamers from local IPC, local server, and domain
        const fetchLiveStreamers = async () => {
          try {
            isRefreshing.value = true;

            // 1. Electron Main IPC
            const apiFn = window.api?.getNurearnLive || window.api?.getNurearnLiveStreamers;
            if (apiFn) {
              const res = await apiFn().catch(() => null);
              const list = Array.isArray(res) ? res : (res?.data || res?.streamers || []);
              if (Array.isArray(list)) {
                mergeStreamers(list);
              }
            }

            // 2. Fetch from local server endpoint
            let port = 8642;
            if (window.api && window.api.getConfig) {
              const cfg = await window.api.getConfig().catch(() => null);
              if (cfg?.overlayPort) port = Number(cfg.overlayPort) || 8642;
            }

            try {
              const localRes = await fetch(`http://127.0.0.1:${port}/api/nurearn/live`, { cache: 'no-store' });
              if (localRes && localRes.ok) {
                const json = await localRes.json().catch(() => null);
                const list = Array.isArray(json) ? json : (json?.streamers || json?.data || []);
                if (Array.isArray(list)) mergeStreamers(list);
              }
            } catch (_) { }

            // 3. Fetch from remote domain (overlay.nurearn.site) if available
            try {
              const remoteRes = await fetch('https://overlay.nurearn.site/api/nurearn/live', {
                cache: 'no-store',
                signal: AbortSignal.timeout(2500)
              });
              if (remoteRes && remoteRes.ok) {
                const json = await remoteRes.json().catch(() => null);
                const list = Array.isArray(json) ? json : (json?.streamers || json?.data || []);
                if (Array.isArray(list)) mergeStreamers(list);
              }
            } catch (_) { }

            // 4. Sync current connected user
            await syncCurrentConnectedUser();
          } catch (_) {
          } finally {
            setTimeout(() => {
              isRefreshing.value = false;
            }, 300);
          }
        };

        onMounted(() => {
          fetchLiveStreamers();

          timerInterval = setInterval(() => {
            currentTime.value = Date.now();
          }, 1000);

          // Poll every 12 detik
          pollInterval = setInterval(fetchLiveStreamers, 12000);

          // Listen for status changes (Connect / Disconnect)
          if (window.api && window.api.onStatus) {
            window.api.onStatus((status) => {
              if (!status) return;
              const u = cleanUsername(status.username);
              if (!u) return;

              const idx = streamers.value.findIndex(s => cleanUsername(s.username) === u);
              const isLive = status.state === 'CONNECTED';
              const nickname = status.nickname || u;
              const avatar = status.avatar || null;

              if (idx >= 0) {
                streamers.value[idx].isOnline = isLive;
                if (nickname) streamers.value[idx].nickname = nickname;
                if (avatar) streamers.value[idx].avatar = avatar;
                if (isLive && !streamers.value[idx].startTime) {
                  streamers.value[idx].startTime = Date.now();
                }
              } else if (isLive) {
                streamers.value.unshift({
                  username: u,
                  nickname: nickname,
                  avatar: avatar,
                  isOnline: true,
                  startTime: Date.now(),
                  likes: 0,
                  viewers: 1
                });
              }
            });
          }

          // Realtime event updates for live streamers
          if (window.api && window.api.onNurearnLiveUpdate) {
            window.api.onNurearnLiveUpdate((data) => {
              const list = Array.isArray(data) ? data : (data?.streamers || data?.data);
              if (Array.isArray(list)) mergeStreamers(list);
            });
          }

          onUnmounted(() => {
            if (timerInterval) clearInterval(timerInterval);
            if (pollInterval) clearInterval(pollInterval);
          });
        });

        return {
          streamers,
          searchQuery,
          isRefreshing,
          onlineCount,
          filteredStreamers,
          clearSearch,
          focusConnectInput,
          openLive,
          handleAvatarError,
          formatTime,
          formatDuration,
          getInitialChar,
          cleanUsername,
          formatUsername,
          refresh: fetchLiveStreamers
        };
      }
    });

    function mountVue() {
      const el = document.getElementById('nurearnLiveApp');
      if (el && !el.__vue_app__) {
        vueLiveApp.mount(el);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountVue);
    } else {
      mountVue();
    }
  }

  // Global window access
  window.NurearnLive = {
    refresh() {
      if (sharedState.isRefreshing) {
        sharedState.isRefreshing.value = true;
      }
    }
  };
})();
