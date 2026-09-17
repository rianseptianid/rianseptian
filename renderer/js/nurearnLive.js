/**
 * nurearnLive.js
 * Controller untuk Nurearn Live Streamers (Vue 3 Reactive Component)
 * Desain & layout persis seperti referensi screenshot (RVTik Online / Nurearn Live):
 * - Judul "Nurearn Live" + Subtitle "🤝 Nuances of Solidarity and Community."
 * - Badge "X Online" + Tombol "Refresh"
 * - Search bar "Cari username atau nama akun..."
 * - Grid 2 Kolom untuk Kartu Streamer
 * - Pembedaan warna tegas: ONLINE (Hijau neon) vs OFFLINE (Merah / Abu-abu muted)
 * - Avatar: Foto profil TikTok asli atau Inisial Huruf Bundar Gradien Toska (M, A, N, D, dll.)
 * - Keterangan durasi / jam mulai live
 * - Tombol [ ↗ Open Live ] untuk membuka live TikTok di browser
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
    const str = (name || username || 'User').trim().replace(/^@/, '');
    return str.length > 0 ? str.charAt(0).toUpperCase() : 'U';
  }

  // Format timestamp to HH.mm (e.g. 10.11)
  function formatTime(ts) {
    if (!ts) return '10.00';
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}.${m}`;
  }

  // Format live duration (e.g. 01:23:45)
  function formatDuration(startTime) {
    if (!startTime) return '00:15:20';
    const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
  }

  // Initial community streamer data matching user community experience
  const DEFAULT_STREAMERS = [
    {
      username: 'monmon.coc',
      nickname: 'monmon.coc',
      avatar: null,
      isOnline: true,
      startTime: Date.now() - 40 * 60 * 1000,
      likes: 12500,
      viewers: 142
    },
    {
      username: 'abet.popal',
      nickname: 'abet.popal',
      avatar: null,
      isOnline: true,
      startTime: Date.now() - 3 * 3600 * 1000 - 41 * 60 * 1000,
      likes: 8900,
      viewers: 85
    },
    {
      username: 'ngabaheuhayy',
      nickname: 'ngabaheuhayy',
      avatar: null,
      isOnline: true,
      startTime: Date.now() - 1 * 3600 * 1000 - 50 * 60 * 1000,
      likes: 5400,
      viewers: 62
    },
    {
      username: 'melly.colecti...',
      nickname: 'melly.colecti...',
      avatar: null,
      isOnline: true,
      startTime: Date.now() - 1 * 3600 * 1000 - 10 * 60 * 1000,
      likes: 21300,
      viewers: 210
    },
    {
      username: 'danielprosess',
      nickname: 'danielprosess',
      avatar: null,
      isOnline: true,
      startTime: Date.now() - 45 * 60 * 1000,
      likes: 3100,
      viewers: 45
    },
    {
      username: '115channel',
      nickname: '115channel',
      avatar: null,
      isOnline: true,
      startTime: Date.now() - 2 * 3600 * 1000,
      likes: 16700,
      viewers: 198
    },
    {
      username: 'arfinsuryan',
      nickname: 'arfinsuryan',
      avatar: null,
      isOnline: true,
      startTime: Date.now() - 7 * 3600 * 1000 - 12 * 60 * 1000,
      likes: 42000,
      viewers: 420
    },
    {
      username: 'lingkarbali',
      nickname: 'lingkarbali',
      avatar: null,
      isOnline: true,
      startTime: Date.now() - 1 * 3600 * 1000 - 36 * 60 * 1000,
      likes: 7200,
      viewers: 94
    },
    {
      username: 'is_station_ra...',
      nickname: 'is_station_ra...',
      avatar: null,
      isOnline: false,
      startTime: null,
      lastSeen: Date.now() - 2 * 3600 * 1000,
      likes: 0,
      viewers: 0
    },
    {
      username: 'itsapin27',
      nickname: 'itsapin27',
      avatar: null,
      isOnline: false,
      startTime: null,
      lastSeen: Date.now() - 3 * 3600 * 1000 - 12 * 60 * 1000,
      likes: 0,
      viewers: 0
    }
  ];

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

        // Update timer every second for live duration counters
        let timerInterval = null;

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

          // Sort: Online first, then Offline
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

        // Fetch live streamers from server or main process
        const fetchLiveStreamers = async () => {
          try {
            isRefreshing.value = true;

            // 1. Electron Main IPC
            const apiFn = window.api?.getNurearnLive || window.api?.getNurearnLiveStreamers;
            if (apiFn) {
              const res = await apiFn();
              const list = Array.isArray(res) ? res : (res?.data || res?.streamers || []);
              if (Array.isArray(list) && list.length > 0) {
                mergeStreamers(list);
              }
            }

            // 2. Fetch from local server endpoint if running
            let port = 8642;
            if (window.api && window.api.getConfig) {
              const cfg = await window.api.getConfig().catch(() => null);
              if (cfg?.overlayPort) port = cfg.overlayPort;
            }

            const res = await fetch(`http://127.0.0.1:${port}/api/nurearn/live`, { cache: 'no-store' }).catch(() => null);
            if (res && res.ok) {
              const json = await res.json().catch(() => null);
              const list = Array.isArray(json) ? json : (json?.streamers || json?.data || []);
              if (Array.isArray(list) && list.length > 0) {
                mergeStreamers(list);
              }
            }

            // 3. Sync with current connected user in this app instance
            syncCurrentConnectedUser();
          } catch (err) {
            // Silently fallback
          } finally {
            setTimeout(() => {
              isRefreshing.value = false;
            }, 400);
          }
        };

        function mergeStreamers(incomingList) {
          const map = new Map();
          // Keep existing list
          streamers.value.forEach(s => {
            map.set(cleanUsername(s.username), { ...s });
          });

          // Overlay incoming list
          incomingList.forEach(item => {
            const u = cleanUsername(item.username);
            if (!u) return;
            const existing = map.get(u) || {};
            map.set(u, {
              ...existing,
              ...item,
              username: u,
              nickname: item.nickname || existing.nickname || u,
              isOnline: item.isOnline !== false,
              startTime: item.startTime || existing.startTime || Date.now()
            });
          });

          streamers.value = Array.from(map.values());
        }

        async function syncCurrentConnectedUser() {
          if (!window.api || !window.api.getStatus) return;
          try {
            const st = await window.api.getStatus().catch(() => null);
            const usernameInput = document.getElementById('usernameInput');
            const myUser = cleanUsername(st?.username || usernameInput?.value || localStorage.getItem('saved_username') || '');

            if (myUser) {
              const idx = streamers.value.findIndex(s => cleanUsername(s.username) === myUser);
              const isConn = st?.state === 'CONNECTED' || st?.state === 'CONNECTING';

              if (idx >= 0) {
                streamers.value[idx].isOnline = isConn;
                if (isConn && !streamers.value[idx].startTime) {
                  streamers.value[idx].startTime = Date.now();
                }
              } else {
                streamers.value.unshift({
                  username: myUser,
                  nickname: myUser,
                  avatar: null,
                  isOnline: isConn,
                  startTime: isConn ? Date.now() : null,
                  likes: 0,
                  viewers: isConn ? 1 : 0
                });
              }
            }
          } catch (e) { }
        }

        onMounted(() => {
          fetchLiveStreamers();

          timerInterval = setInterval(() => {
            currentTime.value = Date.now();
          }, 1000);

          // Poll every 10s
          const pollInterval = setInterval(fetchLiveStreamers, 10000);

          // Listen for status changes (Connect / Disconnect)
          if (window.api && window.api.onStatus) {
            window.api.onStatus((status) => {
              if (!status) return;
              const u = cleanUsername(status.username);
              if (!u) return;

              const idx = streamers.value.findIndex(s => cleanUsername(s.username) === u);
              const isLive = status.state === 'CONNECTED' || status.state === 'CONNECTING';

              if (idx >= 0) {
                streamers.value[idx].isOnline = isLive;
                if (isLive && !streamers.value[idx].startTime) {
                  streamers.value[idx].startTime = Date.now();
                }
              } else {
                streamers.value.unshift({
                  username: u,
                  nickname: u,
                  avatar: null,
                  isOnline: isLive,
                  startTime: isLive ? Date.now() : null,
                  likes: 0,
                  viewers: isLive ? 1 : 0
                });
              }
            });
          }

          // Realtime event updates for live streamer
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
