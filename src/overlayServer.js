const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { WebSocketServer } = require('ws');
const { Server: SocketIOServer } = require('socket.io');

/**
 * Serves overlay/index.html at http://localhost:<port>/overlay so it can
 * be added as an OBS Browser Source, and pushes live events to it (and to
 * any other listener) over a WebSocket at the same port.
 */
class OverlayServer {
  constructor(logger, configManager = null, goalManager = null, triggerEngine = null) {
    this.triggerEngine = triggerEngine;
    this.logger = (logger && typeof logger.info === 'function') ? logger : console;
    this.configManager = configManager;
    this.goalManager = goalManager;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.io = null;
    this.port = null;
    this.currentUsername = '';

    const overlayHtml = path.join(__dirname, '..', 'overlay', 'index.html');
    const goalOverlayHtml = path.join(__dirname, '..', 'overlay', 'goal.html');
    const battleOverlayHtml = path.join(__dirname, '..', 'overlay', 'battle.html');

    // Global CORS & Cache-Control for OBS & TikTok LIVE Studio Browser Sources
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // ── Nurearn Live Streamers API (Presence & Heartbeat) ────────────────
    this.liveStreamers = new Map();

    this.app.post('/api/nurearn/heartbeat', (req, res) => {
      try {
        const body = req.body || {};
        if (!body.username) return res.status(400).json({ ok: false, error: 'Username required' });
        const username = String(body.username).toLowerCase().trim().replace(/^@/, '');
        const streamer = {
          username,
          nickname: body.nickname || username,
          avatar: body.avatar || null,
          likes: Number(body.likes || 0),
          viewers: Number(body.viewers || 0),
          version: body.version || '1.3.14',
          lastSeen: Date.now()
        };
        this.liveStreamers.set(username, streamer);
        res.json({ ok: true, streamer });
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });

    this.app.get('/api/nurearn/live', (req, res) => {
      const now = Date.now();
      for (const [user, s] of this.liveStreamers.entries()) {
        if (now - s.lastSeen > 60000) {
          this.liveStreamers.delete(user);
        }
      }
      const streamers = Array.from(this.liveStreamers.values());
      res.json({ ok: true, count: streamers.length, streamers });
    });

    this.app.post('/api/nurearn/leave', (req, res) => {
      const user = req.body?.username;
      if (user) {
        const clean = String(user).toLowerCase().trim().replace(/^@/, '');
        this.liveStreamers.delete(clean);
      }
      res.json({ ok: true });
    });

    this.app.use('/overlay', express.static(path.join(__dirname, '..', 'overlay')));
    this.app.use('/images', express.static(path.join(__dirname, '..', 'overlay', 'images')));
    this.app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
    this.app.use(express.static(path.join(__dirname, '..', 'overlay')));

    // Endpoint for dynamic custom CSS per overlay mode
    this.app.get('/api/css/:type?', (req, res) => {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      const rawType = (req.params.type || req.query.type || 'all').toLowerCase();
      let mode = rawType;
      if (mode === 'vidio') mode = 'video';
      if (mode === 'gambar') mode = 'image';
      if (mode === 'chats') mode = 'chat';
      if (mode === 'gifts') mode = 'gift';
      if (mode === 'top10' || mode === 'leaderboard' || mode === 'top' || mode === 'topgift' || mode === 'topgifts') mode = 'topgift';
      if (mode === 'alert' || mode === 'alerts') mode = 'alert';
      if (mode === 'join' || mode === 'member' || mode === 'joins' || mode === 'bergabung') mode = 'join';
      if (mode === 'follow' || mode === 'follower' || mode === 'followers') mode = 'follow';
      if (mode === 'share' || mode === 'shares') mode = 'share';
      if (mode === 'tap' || mode === 'toplike' || mode === 'toplikes' || mode === 'like' || mode === 'likes') mode = 'taptap';

      let css = '';
      if (this.configManager) {
        const customCss = this.configManager.get()?.customCss || {};
        if (mode === 'all') {
          const keys = ['all', 'chat', 'gift', 'alert', 'topgift', 'taptap', 'join', 'follow', 'share', 'video', 'image'];
          css = keys.map(k => customCss[k]).filter(Boolean).join('\n\n');
        } else {
          css = customCss[mode] || customCss[rawType] || '';
          if (customCss.all && mode !== 'all') {
            css = `${customCss.all}\n\n${css}`;
          }
        }
      }
      res.send(css);
    });

    // Dedicated Goal Overlay routes
    
    // Custom Rank Overlays (Rank A and Rank B)
    this.app.get([
      '/overlay/ranka', '/overlay/rankA',
      '/overlay/:user/ranka', '/overlay/:user/rankA',
      '/overlay/@:user/ranka', '/overlay/@:user/rankA'
    ], (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'overlay', 'rankA.html'));
    });
    this.app.get([
      '/overlay/rankb', '/overlay/rankB',
      '/overlay/:user/rankb', '/overlay/:user/rankB',
      '/overlay/@:user/rankb', '/overlay/@:user/rankB'
    ], (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'overlay', 'rankB.html'));
    });
    this.app.get('/api/ranka', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json(this.triggerEngine?.getRankList ? this.triggerEngine.getRankList('rankA') : []);
    });
    this.app.get('/api/rankb', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json(this.triggerEngine?.getRankList ? this.triggerEngine.getRankList('rankB') : []);
    });

    this.app.get([
      '/overlay/goal', '/overlay/goal/*',
      '/overlay/:user/goal', '/overlay/:user/goal/*',
      '/overlay/@:user/goal', '/overlay/@:user/goal/*'
    ], (req, res) => {
      res.sendFile(goalOverlayHtml);
    });

    // Dedicated Battle Arena Overlay routes
    this.app.get([
      '/battle', '/overlay/battle', '/overlay/battle/*',
      '/overlay/:user/battle', '/overlay/:user/battle/*',
      '/overlay/@:user/battle', '/overlay/@:user/battle/*'
    ], (req, res) => {
      res.sendFile(battleOverlayHtml);
    });

    // Dedicated YouTube Music Overlay route
    this.app.get([
      '/youtube', '/overlay/youtube',
      '/overlay/:user/youtube', '/overlay/@:user/youtube'
    ], (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'overlay', 'youtube.html'));
    });

    // Dedicated Web Player for Brave / External Browser
    this.app.get(['/player/youtube', '/player', '/player/'], (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'overlay', 'player.html'));
    });

    this.app.get('/api/yt-stream/:videoId', async (req, res) => {
      const videoId = String(req.params.videoId || '').trim();
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).send('Invalid video id');
      }
      if (!this.youtubeManager || typeof this.youtubeManager.getDirectAudioUrl !== 'function') {
        return res.status(503).send('YouTube engine not ready');
      }
      try {
        const streamUrl = await this.youtubeManager.getDirectAudioUrl(videoId);
        if (!streamUrl) return res.status(404).send('Stream not found');

        const client = streamUrl.startsWith('https:') ? https : http;
        const upstream = client.get(streamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: '*/*'
          }
        }, (up) => {
          if (up.statusCode && up.statusCode >= 300 && up.statusCode < 400 && up.headers.location) {
            up.resume();
            return res.redirect(up.headers.location);
          }
          if (up.statusCode !== 200) {
            up.resume();
            if (!res.headersSent) res.status(up.statusCode || 502).send('Upstream stream error');
            return;
          }
          res.status(200);
          res.setHeader('Content-Type', up.headers['content-type'] || 'audio/mp4');
          res.setHeader('Cache-Control', 'no-store');
          up.pipe(res);
        });
        upstream.on('error', (err) => {
          this.logger.warn(`[YouTube] Stream fetch error: ${err.message}`);
          if (!res.headersSent) res.status(502).send('Failed to fetch audio stream');
        });
        req.on('close', () => {
          try { upstream.destroy(); } catch (_) {}
        });
      } catch (err) {
        this.logger.warn(`[YouTube] Stream proxy error: ${err.message}`);
        if (!res.headersSent) res.status(502).send('Failed to resolve audio stream');
      }
    });

    // Dedicated Soundboard Media Overlay route
    this.app.get(['/soundboard', '/overlay/soundboard', '/overlay/soundboard/*'], (req, res) => {
      res.sendFile(overlayHtml);
    });

    this.app.get(['/overlay', '/overlay/*'], (req, res) => {
      res.sendFile(overlayHtml);
    });
    this.app.get('/:type(chat|chats|gift|gifts|video|vidio|image|gambar|media|alert|alerts|topgift|top10|leaderboard|top|join|member|bergabung|follow|follower|followers|share|shares|taptap|toplike|like|likes|likers|soundboard|sb|all)', (req, res) => {
      res.redirect(`/overlay/${req.params.type}`);
    });
    this.app.get('/', (req, res) => {
      res.redirect('/overlay');
    });

    this.app.get('/api/goals', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.json(this.goalManager?.getAllGoals() || {});
    });

    this.app.get('/api/goals/:type', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      const goal = this.goalManager?.getGoal(req.params.type);
      if (!goal) return res.status(404).json({ error: 'Goal not found' });
      res.json(goal);
    });

    this.app.get('/api/settings/taptap', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      const settings = this.configManager?.getTopLikeSettings() || {
        alignRight: false,
        showRank: true,
        showCrown: true,
        showTrophy: true,
        showHeart: true,
        heartAnim: true,
        transparentBg: false,
        hideBorder: false,
        hideAvatar: false,
        compactMode: false
      };
      res.json(settings);
    });

    this.app.get('/api/settings/topgift', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      const settings = this.configManager?.getTopGiftSettings() || {
        alignRight: false,
        showRank: true,
        showCrown: true,
        showTrophy: true,
        showCoin: true,
        transparentBg: false,
        hideBorder: false,
        hideAvatar: false,
        compactMode: false
      };
      res.json(settings);
    });

    this.app.get('/api/battle', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      const battle = this.configManager?.getBattleConfig() || {};
      res.json(battle);
    });

    // Serves an arbitrary local file (image/video picked by the user for a
    // trigger) so the overlay page (loaded via http:// in OBS) can display
    // it. This app is single-user/local-only, so no auth is needed here.
    this.app.get('/api/media', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const filePath = req.query.path;
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).send('Missing ?path=');
      }
      try {
        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) {
          this.logger.warn(`Overlay media file not found: "${resolved}"`);
          return res.status(404).send('File not found');
        }
        res.sendFile(resolved, err => {
          if (err && !res.headersSent) {
            this.logger.warn(`Overlay media request failed for "${resolved}": ${err.message}`);
            res.status(500).send('Error sending file');
          }
        });
      } catch (err) {
        this.logger.error(`Error resolving media path "${filePath}": ${err.message}`);
        res.status(500).send('Server error');
      }
    });

    // Native Indonesian & Fun TTS audio streaming route
    const ttsEngine = require('./ttsEngine');
    this.app.get('/api/tts', async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const text = (req.query.text || '').slice(0, 500).trim();
      if (!text) return res.status(400).send('Text is required');
      const voice = req.query.voice || req.query.lang || 'id-gadis';
      const rate = parseFloat(req.query.rate || 1.0);
      const pitch = parseFloat(req.query.pitch || 1.0);
      try {
        const buffer = await ttsEngine.synthesizeBuffer(text, voice, rate, pitch);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
      } catch (err) {
        this.logger.warn?.(`[TTS API] Failed to synthesize TTS: ${err.message}`);
        if (!res.headersSent) res.status(500).send(err.message);
      }
    });
  }

  setCurrentUsername(username) {
    this.currentUsername = username ? String(username).toLowerCase().trim().replace(/^@/, '') : '';
    this.logger.info?.(`[OverlayServer] Active TikTok username set to: "${this.currentUsername || 'none'}"`);
    this.broadcast('tiktok:username', { username: this.currentUsername });
  }

  getCurrentUsername() {
    return this.currentUsername;
  }

  _sendInitialState(client, isSocketIo = false) {
    const send = (type, payload) => {
      try {
        if (isSocketIo) {
          client.emit(type, payload);
        } else if (client.readyState === 1) {
          client.send(JSON.stringify({ type, payload }));
        }
      } catch (_) {}
    };

    // 1. Username status
    send('tiktok:username', { username: this.currentUsername });

    // 2. Stats & configurations
    if (this.configManager) {
      try {
        const stats = this.configManager.get()?.stats;
        if (stats) send('event:stats', stats);

        const taptapSettings = this.configManager.getTopLikeSettings?.();
        if (taptapSettings) send('overlay:taptap-settings', taptapSettings);

        const topgiftSettings = this.configManager.getTopGiftSettings?.();
        if (topgiftSettings) send('overlay:topgift-settings', topgiftSettings);

        const battleConfig = this.configManager.getBattleConfig?.();
        if (battleConfig) send('battle:config', battleConfig);
      } catch (err) {
        this.logger.warn?.(`[OverlayServer] Error sending initial stats: ${err.message}`);
      }
    }

    // 3. Custom ranks
    if (this.triggerEngine) {
      try {
        send('rank:update', {
          rankA: this.triggerEngine.getRankList('rankA'),
          rankB: this.triggerEngine.getRankList('rankB')
        });
      } catch (_) {}
    }

    // 4. Goals
    if (this.goalManager) {
      try {
        send('overlay:goals-all', this.goalManager.getAllGoals());
      } catch (_) {}
    }

    // 5. YouTube player
    if (this.youtubeManager) {
      try {
        if (this.youtubeManager.currentSong) send('youtube:play', this.youtubeManager.currentSong);
        if (this.youtubeManager.queue && this.youtubeManager.queue.length > 0) {
          send('youtube:queue', this.youtubeManager.queue);
        }
      } catch (_) {}
    }
  }

  start(port) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.app);

      // ── Socket.IO Server Setup (Multi-room per username) ──
      try {
        this.io = new SocketIOServer(this.server, {
          cors: {
            origin: '*',
            methods: ['GET', 'POST', 'OPTIONS']
          }
        });

        this.io.on('connection', (socket) => {
          const rawUser = socket.handshake.query.username || socket.handshake.query.user || '';
          const targetUser = String(rawUser).toLowerCase().trim().replace(/^@/, '');
          socket.targetUsername = targetUser;

          if (targetUser) {
            socket.join(`room:${targetUser}`);
            this.logger.info?.(`[OverlayServer Socket.IO] Client terhubung ke room: "room:${targetUser}" (ID: ${socket.id})`);
          } else {
            socket.join('room:all');
            this.logger.info?.(`[OverlayServer Socket.IO] Client terhubung ke room global "room:all" (ID: ${socket.id})`);
          }

          // Initial state via Socket.IO
          this._sendInitialState(socket, true);

          // Listeners for YouTube & overlay commands via Socket.IO
          socket.on('youtube:request-state', () => {
            if (this.youtubeManager) {
              if (this.youtubeManager.currentSong) socket.emit('youtube:play', this.youtubeManager.currentSong);
              socket.emit('youtube:queue', this.youtubeManager.queue || []);
            }
          });
          socket.on('youtube:videoEnded', () => {
            if (this.youtubeManager) {
              if (this.youtubeManager.queue && this.youtubeManager.queue.length > 0) {
                this.youtubeManager.playNext();
              } else {
                this.youtubeManager.stopCurrent();
              }
            }
          });
          socket.on('youtube:progress', (payload) => {
            this.broadcast('youtube:progress', payload);
          });
          socket.on('youtube:skip', () => {
            if (this.youtubeManager) this.youtubeManager.skipSong();
          });
          socket.on('youtube:stop', () => {
            if (this.youtubeManager) this.youtubeManager.stopCurrent();
          });

          socket.on('disconnect', (reason) => {
            this.logger.info?.(`[OverlayServer Socket.IO] Client disconnected: ${socket.id} (${reason})`);
          });
        });
      } catch (err) {
        this.logger.warn?.(`[OverlayServer] Gagal inisialisasi Socket.IO: ${err.message}`);
      }

      // ── Native WebSocket Server Setup (ws with noServer: true for clean co-existence with Socket.IO) ──
      this.wss = new WebSocketServer({ noServer: true });

      this.server.on('upgrade', (request, socket, head) => {
        let pathname = '/';
        try {
          pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
        } catch (_) {}

        // Let Socket.IO handle /socket.io/ paths exclusively
        if (pathname.startsWith('/socket.io')) {
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      });

      this.wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        let targetUser = '';
        try {
          const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          targetUser = (reqUrl.searchParams.get('username') || reqUrl.searchParams.get('user') || '').toLowerCase().trim().replace(/^@/, '');
        } catch (_) {}

        ws.targetUsername = targetUser;
        this.logger.info?.(`[OverlayServer WebSocket] Client OBS terhubung: ${clientIp} (Filter: "${ws.targetUsername || 'SEMUA/DEFAULT'}"). Total klien aktif: ${this.wss.clients.size}`);

        // Initial state via Native WebSocket
        this._sendInitialState(ws, false);

        ws.on('message', (msg) => {
          try {
            const data = JSON.parse(msg.toString());
            if (data.type === 'youtube:request-state' && this.youtubeManager) {
              if (this.youtubeManager.currentSong) {
                ws.send(JSON.stringify({ type: 'youtube:play', payload: this.youtubeManager.currentSong }));
              }
              ws.send(JSON.stringify({ type: 'youtube:queue', payload: this.youtubeManager.queue || [] }));
            } else if (data.type === 'youtube:videoEnded') {
              if (this.youtubeManager) {
                if (this.youtubeManager.queue && this.youtubeManager.queue.length > 0) {
                  this.youtubeManager.playNext();
                } else {
                  this.youtubeManager.stopCurrent();
                }
              }
            } else if (data.type === 'youtube:progress' && data.payload) {
              this.broadcast('youtube:progress', data.payload);
            } else if (data.type === 'youtube:skip' && this.youtubeManager) {
              this.youtubeManager.skipSong();
            } else if (data.type === 'youtube:stop' && this.youtubeManager) {
              this.youtubeManager.stopCurrent();
            }
          } catch (_) {}
        });

        ws.on('close', () => {
          this.logger.info?.(`[OverlayServer WebSocket] Client OBS terputus. Sisa klien aktif: ${this.wss.clients.size}`);
        });
      });

      this.server.on('error', err => {
        this.logger.error(`Overlay server error on port ${port}: ${err.message}`);
        if (err.code === 'EADDRINUSE') {
          this.port = port;
          this.logger.warn(`Port ${port} is already in use. Reusing existing port.`);
          resolve(port);
        } else {
          reject(err);
        }
      });

      if (this.wss) {
        this.wss.on('error', err => {
          this.logger.warn?.(`WebSocket error: ${err.message}`);
        });
      }

      this.server.listen(port, '0.0.0.0', () => {
        this.port = this.server.address()?.port || port;
        this.logger.info(`Overlay server running at http://localhost:${this.port}/overlay (and http://127.0.0.1:${this.port}/overlay)`);
        resolve(this.port);
      });
    });
  }

  stop() {
    return new Promise(resolve => {
      if (this.io) {
        try { this.io.close(); } catch (_) {}
      }
      if (this.wss) {
        this.wss.clients.forEach(ws => ws.terminate());
      }
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Sends a message to overlay clients.
   * If eventUsername is provided, filters delivery so only overlay instances
   * matching that username (or without filter) receive it.
   */
  broadcast(type, payload, eventUsername) {
    const cleanEventUser = eventUsername 
      ? String(eventUsername).toLowerCase().trim().replace(/^@/, '') 
      : (this.currentUsername || '');

    // 1. Broadcast to Socket.IO clients
    if (this.io) {
      try {
        if (cleanEventUser) {
          // Deliver to specific username room and the global all room
          this.io.to(`room:${cleanEventUser}`).to('room:all').emit(type, payload);
        } else {
          this.io.emit(type, payload);
        }
      } catch (err) {
        this.logger.warn?.(`[OverlayServer Socket.IO] Broadcast error: ${err.message}`);
      }
    }

    // 2. Broadcast to Native WebSocket clients
    if (this.wss && this.wss.clients.size > 0) {
      const msg = JSON.stringify({
        type,
        payload,
        username: cleanEventUser,
        ts: Date.now()
      });

      this.wss.clients.forEach(ws => {
        if (ws.readyState === 1) { // OPEN
          // If client has a username filter and event has a specific user
          if (ws.targetUsername && cleanEventUser && ws.targetUsername !== 'all') {
            if (ws.targetUsername !== cleanEventUser) {
              return; // Skip client if not matching requested username
            }
          }
          try {
            ws.send(msg);
          } catch (_) {}
        }
      });
    }
  }

  setGoalManager(goalManager) {
    this.goalManager = goalManager;
  }

  setTriggerEngine(triggerEngine) {
    this.triggerEngine = triggerEngine;
  }

  setYoutubeManager(youtubeManager) {
    this.youtubeManager = youtubeManager;
  }

  registerLiveStreamer(data) {
    if (!data || !data.username) return;
    const username = String(data.username).toLowerCase().trim().replace(/^@/, '');
    if (!this.liveStreamers) this.liveStreamers = new Map();
    this.liveStreamers.set(username, {
      username,
      nickname: data.nickname || username,
      avatar: data.avatar || null,
      likes: Number(data.likes || 0),
      viewers: Number(data.viewers || 0),
      diamonds: Number(data.diamonds || 0),
      version: data.version || '1.3.14',
      lastSeen: Date.now()
    });
  }

  removeLiveStreamer(username) {
    if (!username || !this.liveStreamers) return;
    const clean = String(username).toLowerCase().trim().replace(/^@/, '');
    this.liveStreamers.delete(clean);
  }

  getLiveStreamers() {
    if (!this.liveStreamers) return [];
    const now = Date.now();
    for (const [user, s] of this.liveStreamers.entries()) {
      if (now - s.lastSeen > 60000) {
        this.liveStreamers.delete(user);
      }
    }
    return Array.from(this.liveStreamers.values());
  }
}

module.exports = OverlayServer;
