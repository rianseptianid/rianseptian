const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { WebSocketServer } = require('ws');

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
    this.port = null;

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
    this.app.get(['/overlay/ranka', '/overlay/rankA'], (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'overlay', 'rankA.html'));
    });
    this.app.get(['/overlay/rankb', '/overlay/rankB'], (req, res) => {
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

    this.app.get(['/overlay/goal', '/overlay/goal/*'], (req, res) => {
      res.sendFile(goalOverlayHtml);
    });

    // Dedicated Battle Arena Overlay routes
    this.app.get(['/battle', '/overlay/battle', '/overlay/battle/*'], (req, res) => {
      res.sendFile(battleOverlayHtml);
    });

    // Dedicated YouTube Music Overlay route
    this.app.get(['/youtube', '/overlay/youtube'], (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'overlay', 'youtube.html'));
    });

    // Dedicated Web Player for Brave / External Browser
    this.app.get(['/player/youtube', '/player', '/player/'], (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'overlay', 'player.html'));
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

  start(port) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.app);
      this.wss = new WebSocketServer({ server: this.server });

      this.wss.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress;
        this.logger.info(`[OverlayServer] Client OBS terhubung: ${clientIp}. Total klien aktif: ${this.wss.clients.size}`);
        if (this.configManager) {
          try {
            const stats = this.configManager.get()?.stats;
            if (stats) {
              ws.send(JSON.stringify({ type: 'event:stats', payload: stats }));
            }
            const taptapSettings = this.configManager.getTopLikeSettings?.();
            if (taptapSettings) {
              ws.send(JSON.stringify({ type: 'overlay:taptap-settings', payload: taptapSettings }));
            }
            const topgiftSettings = this.configManager.getTopGiftSettings?.();
            if (topgiftSettings) {
              ws.send(JSON.stringify({ type: 'overlay:topgift-settings', payload: topgiftSettings }));
            }
            const battleConfig = this.configManager.getBattleConfig?.();
            if (battleConfig) {
              ws.send(JSON.stringify({ type: 'battle:config', payload: battleConfig }));
            }
          } catch (err) {
            this.logger.warn(`[OverlayServer] Gagal mengirim initial stats ke client: ${err.message}`);
          }
        }
        
        if (this.triggerEngine) {
          try {
            ws.send(JSON.stringify({
              type: 'rank:update',
              payload: {
                rankA: this.triggerEngine.getRankList('rankA'),
                rankB: this.triggerEngine.getRankList('rankB')
              }
            }));
          } catch (_) {}
        }

        if (this.goalManager) {
          try {
            ws.send(JSON.stringify({ type: 'overlay:goals-all', payload: this.goalManager.getAllGoals() }));
          } catch (_) {}
        }
        if (this.youtubeManager) {
          try {
            if (this.youtubeManager.currentSong) {
              ws.send(JSON.stringify({ type: 'youtube:play', payload: this.youtubeManager.currentSong }));
            }
            if (this.youtubeManager.queue && this.youtubeManager.queue.length > 0) {
              ws.send(JSON.stringify({ type: 'youtube:queue', payload: this.youtubeManager.queue }));
            }
          } catch (_) {}
        }
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
          this.logger.info(`[OverlayServer] Client OBS terputus. Sisa klien aktif: ${this.wss.clients.size}`);
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
          this.logger.warn(`WebSocket error: ${err.message}`);
        });
      }

      this.server.listen(port, '0.0.0.0', () => {
        this.port = port;
        this.logger.info(`Overlay server running at http://localhost:${port}/overlay (and http://127.0.0.1:${port}/overlay)`);
        resolve(port);
      });
    });
  }

  stop() {
    return new Promise(resolve => {
      if (this.wss) this.wss.clients.forEach(ws => ws.terminate());
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /** Sends a JSON message to every connected overlay browser source. */
  broadcast(type, payload) {
    if (!this.wss || this.wss.clients.size === 0) return;
    const msg = JSON.stringify({ type, payload, ts: Date.now() });
    this.wss.clients.forEach(ws => {
      if (ws.readyState === 1) {
        try {
          ws.send(msg);
        } catch (_) {}
      }
    });
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
}

module.exports = OverlayServer;
