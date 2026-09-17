const EventEmitter = require('events');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

/**
 * YoutubeManager — antrian song request dari live chat TikTok.
 * Metadata + audio stream diambil lewat yt-dlp (tanpa iklan YouTube).
 */
class YoutubeManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.queue = [];
    this.history = [];
    this.currentSong = null;
    this.overlayPort = 8642;
    this.settings = {
      reqEnabled: true,
      skipEnabled: true,
      reqRole: 'all',
      maxQueue: 10,
      maxPerUser: 2
    };

    this.__playingNext = false;
    this.__playCooldown = new Map();
    this.__playCooldownMs = 3000;
    this.__streamCache = new Map();
  }

  setOverlayPort(port) {
    if (port) this.overlayPort = Number(port) || this.overlayPort;
  }

  updateSettings(partial) {
    this.settings = { ...this.settings, ...partial };
    this.emit('settingsUpdated', this.settings);
  }

  checkRole(payload, role) {
    if (!payload) return false;
    if (payload.uniqueId === 'host_id') return true;
    if (!role || role === 'all') return true;
    if (role === 'follower') {
      return Boolean(payload.isFollower || payload.isSubscriber || payload.isModerator
        || payload.user?.isFollower || payload.user?.isSubscriber || payload.user?.isModerator);
    }
    if (role === 'subscriber') {
      return Boolean(payload.isSubscriber || payload.isModerator
        || payload.user?.isSubscriber || payload.user?.isModerator);
    }
    if (role === 'moderator') {
      return Boolean(payload.isModerator || payload.user?.isModerator);
    }
    if (role === 'friend') return Boolean(payload.isFriend || payload.isModerator);
    return true;
  }

  async handleChatCommand(payload) {
    const comment = (payload.comment || '').trim();
    const uniqueId = payload.uniqueId;
    const nickname = payload.nickname || uniqueId;

    if (!comment.startsWith('!')) return false;
    if (!this.checkRole(payload, this.settings.reqRole)) return false;

    const parts = comment.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    if ((cmd === '!play' || cmd === '!req' || cmd === '!lagu' || cmd === '!musik' || cmd === '!song') && this.settings.reqEnabled) {
      if (!arg) return true;

      if (this.queue.length >= this.settings.maxQueue) {
        this.logger?.info(`[YouTube] Queue full — rejected request from ${nickname}`);
        this.emit('notify', { type: 'warn', message: `Antrian penuh! Maks ${this.settings.maxQueue} lagu.` });
        return true;
      }

      if (uniqueId !== 'host_id') {
        const userCount = this.queue.filter(s => s.requesterId === uniqueId).length;
        if (userCount >= this.settings.maxPerUser) {
          this.logger?.info(`[YouTube] Per-user limit reached — rejected from ${nickname}`);
          this.emit('notify', { type: 'warn', message: `@${nickname} sudah mencapai limit ${this.settings.maxPerUser} lagu.` });
          return true;
        }

        const lastPlay = this.__playCooldown.get(uniqueId) || 0;
        if (Date.now() - lastPlay < this.__playCooldownMs) {
          this.logger?.info(`[YouTube] Cooldown active for ${nickname}`);
          return true;
        }
        this.__playCooldown.set(uniqueId, Date.now());
      }

      this.logger?.info(`[YouTube] Searching for: ${arg} (req by ${nickname})`);
      const song = await this.searchYoutube(arg);

      if (song) {
        song.nickname = nickname;
        song.requesterId = uniqueId;
        song.requester = nickname;
        song.status = 'queued';
        this.queue.push(song);
        this.logger?.info(`[YouTube] Added to queue: ${song.title}`);
        this.emit('queueUpdated', [...this.queue]);
        this.emit('notify', { type: 'success', message: `✓ @${nickname} → ${song.title}` });
        if (!this.currentSong) await this.playNext();
      } else {
        this.logger?.warn(`[YouTube] Could not find: ${arg}`);
        this.emit('notify', { type: 'error', message: `Lagu "${arg}" tidak ditemukan.` });
      }

      return true;
    }

    if (cmd === '!skip' && this.settings.skipEnabled) {
      this.logger?.info(`[YouTube] Skip requested by ${nickname}`);
      this.__playingNext = false;
      this.skipSong();
      this.emit('notify', { type: 'info', message: `⏭ @${nickname} skip lagu.` });
      return true;
    }

    if (cmd === '!stop') {
      this.logger?.info(`[YouTube] Stop requested by ${nickname}`);
      this.__playingNext = false;
      this.stopCurrent();
      this.emit('notify', { type: 'info', message: `⏹ @${nickname} stop musik.` });
      return true;
    }

    if (cmd === '!revoke' || cmd === '!remove' || cmd === '!cancel') {
      if (arg) {
        const idx = this.queue.findIndex(s =>
          s.requesterId === uniqueId &&
          String(s.title || '').toLowerCase().includes(arg.toLowerCase())
        );
        if (idx >= 0) {
          const removed = this.queue.splice(idx, 1)[0];
          this.logger?.info(`[YouTube] ${nickname} revoked: ${removed.title}`);
          this.emit('queueUpdated', [...this.queue]);
        }
      } else {
        for (let i = this.queue.length - 1; i >= 0; i--) {
          if (this.queue[i].requesterId === uniqueId) {
            const removed = this.queue.splice(i, 1)[0];
            this.logger?.info(`[YouTube] ${nickname} revoked: ${removed.title}`);
            this.emit('queueUpdated', [...this.queue]);
            break;
          }
        }
      }
      return true;
    }

    return false;
  }

  async playNext() {
    if (this.__playingNext) {
      this.logger?.info('[YouTube] playNext() ignored — already in progress');
      return;
    }
    this.__playingNext = true;

    try {
      if (this.queue.length > 0) {
        const song = this.queue.shift();
        song.status = 'playing';
        song.streamUrl = this.buildProxyStreamUrl(song.videoId);

        this.currentSong = song;
        this.history.unshift(song);
        if (this.history.length > 50) this.history.length = 50;

        const cutoff = Date.now() - 5 * 60 * 1000;
        for (const [uid, ts] of this.__playCooldown) {
          if (ts < cutoff) this.__playCooldown.delete(uid);
        }

        this.logger?.info(`[YouTube] ▶ Playing (ad-free): ${song.title} (${song.videoId})`);
        this.emit('playSong', this.currentSong);
        this.emit('queueUpdated', [...this.queue]);
        this.emit('historyUpdated', [...this.history]);
      } else {
        const hadSong = !!this.currentSong;
        this.currentSong = null;
        if (hadSong) this.emit('stopSong');
        this.emit('queueUpdated', [...this.queue]);
      }
    } finally {
      setTimeout(() => { this.__playingNext = false; }, 800);
    }
  }

  skipSong() {
    if (this.currentSong) {
      this.currentSong.status = 'skipped';
      this.emit('historyUpdated', [...this.history]);
    }
    this.currentSong = null;
    this.__playingNext = false;
    this.playNext();
  }

  stopCurrent() {
    if (this.currentSong) {
      this.currentSong.status = 'stopped';
      this.emit('historyUpdated', [...this.history]);
    }
    this.currentSong = null;
    this.emit('stopSong');
    this.emit('queueUpdated', [...this.queue]);
  }

  stop() { this.stopCurrent(); }
  skip() { this.skipSong(); }

  clearQueue() {
    this.queue = [];
    this.emit('queueUpdated', [...this.queue]);
  }

  removeSong(idx) {
    if (idx >= 0 && idx < this.queue.length) {
      this.queue.splice(idx, 1);
      this.emit('queueUpdated', [...this.queue]);
    }
  }

  replaySong(indexOrSong) {
    let song = null;
    if (typeof indexOrSong === 'number') {
      song = this.history[indexOrSong];
    } else if (indexOrSong && typeof indexOrSong === 'object') {
      song = indexOrSong;
    }
    if (!song || !song.videoId) return false;

    const cloned = {
      ...song,
      status: 'queued',
      streamUrl: this.buildProxyStreamUrl(song.videoId),
      requester: song.requester ? `${song.requester} (Replay)` : 'Host (Replay)'
    };
    this.queue.push(cloned);
    this.emit('queueUpdated', [...this.queue]);
    if (!this.currentSong) {
      this.__playingNext = false;
      this.playNext();
    }
    return true;
  }

  buildProxyStreamUrl(videoId) {
    return `http://127.0.0.1:${this.overlayPort}/api/yt-stream/${encodeURIComponent(videoId)}`;
  }

  getYtDlpPath() {
    const names = process.platform === 'win32' ? ['yt-dlp.exe', 'yt-dlp'] : ['yt-dlp'];
    const dirs = [];
    if (process.resourcesPath) {
      dirs.push(path.join(process.resourcesPath, 'bin'));
      dirs.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'bin'));
    }
    dirs.push(path.join(__dirname, '..', 'bin'));
    dirs.push(path.join(process.cwd(), 'bin'));

    for (const dir of dirs) {
      for (const name of names) {
        const full = path.join(dir, name);
        if (fs.existsSync(full)) return full;
      }
    }
    return null;
  }

  runYtDlp(args, timeoutMs = 35000) {
    return new Promise((resolve, reject) => {
      const bin = this.getYtDlpPath();
      if (!bin) {
        reject(new Error('yt-dlp.exe tidak ditemukan di folder bin/'));
        return;
      }
      execFile(bin, args, {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024
      }, (err, stdout, stderr) => {
        if (err) {
          const detail = (stderr || err.message || '').toString().slice(0, 400);
          reject(new Error(detail || 'yt-dlp gagal'));
          return;
        }
        resolve(String(stdout || '').trim());
      });
    });
  }

  extractVideoId(query) {
    const text = String(query || '').trim();
    const m = text.match(/(?:v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
    return null;
  }

  formatDuration(sec) {
    const n = Number(sec);
    if (!n || n < 0 || Number.isNaN(n)) return '?';
    const m = Math.floor(n / 60);
    const s = Math.floor(n % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  songFromYtDlpInfo(info, fallbackTitle) {
    if (!info || !info.id) return null;
    const thumbs = Array.isArray(info.thumbnails) ? info.thumbnails : [];
    const bestThumb = thumbs.length ? thumbs[thumbs.length - 1].url : (info.thumbnail || '');
    return {
      videoId: info.id,
      title: info.title || fallbackTitle || 'YouTube Music',
      channel: info.uploader || info.channel || info.artist || 'YouTube',
      duration: this.formatDuration(info.duration),
      thumbnail: bestThumb,
      webpageUrl: info.webpage_url || `https://www.youtube.com/watch?v=${info.id}`
    };
  }

  async searchYoutube(query) {
    const videoId = this.extractVideoId(query);
    const ytdlp = this.getYtDlpPath();

    if (ytdlp) {
      try {
        const target = videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : `ytsearch1:${query}`;
        const raw = await this.runYtDlp([
          '--dump-json',
          '--no-download',
          '--no-playlist',
          '--no-warnings',
          '--skip-download',
          target
        ], 40000);
        const line = raw.split(/\r?\n/).find(l => l.trim().startsWith('{'));
        if (line) {
          const info = JSON.parse(line);
          const song = this.songFromYtDlpInfo(info, query);
          if (song) {
            this.logger?.info(`[YouTube] yt-dlp found: ${song.title}`);
            return song;
          }
        }
      } catch (err) {
        this.logger?.warn(`[YouTube] yt-dlp search fallback: ${err.message}`);
      }
    } else {
      this.logger?.warn('[YouTube] yt-dlp.exe tidak ada — memakai pencarian HTML');
    }

    return this.searchYoutubeHtml(query, videoId);
  }

  async getDirectAudioUrl(videoId) {
    if (!videoId) return null;
    const cached = this.__streamCache.get(videoId);
    if (cached && cached.expires > Date.now()) return cached.url;

    const ytdlp = this.getYtDlpPath();
    if (!ytdlp) return null;

    const url = await this.runYtDlp([
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '-g',
      '--no-playlist',
      '--no-warnings',
      `https://www.youtube.com/watch?v=${videoId}`
    ], 35000);

    const streamUrl = url.split(/\r?\n/).map(s => s.trim()).find(s => s.startsWith('http'));
    if (!streamUrl) return null;

    this.__streamCache.set(videoId, { url: streamUrl, expires: Date.now() + 4 * 60 * 1000 });
    return streamUrl;
  }

  searchYoutubeHtml(query, knownId) {
    return new Promise((resolve) => {
      if (knownId) {
        resolve({
          videoId: knownId,
          title: query,
          channel: 'YouTube',
          duration: '?',
          thumbnail: `https://i.ytimg.com/vi/${knownId}/hqdefault.jpg`
        });
        return;
      }

      const url =
        'https://www.youtube.com/results?search_query=' +
        encodeURIComponent(query) +
        '&sp=EgIQAQ%3D%3D';

      const options = {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      };

      https
        .get(url, options, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const match = body.match(/var ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s);
              if (!match || !match[1]) {
                this.logger?.warn('[YouTube] ytInitialData not found in response');
                resolve(null);
                return;
              }

              const data = JSON.parse(match[1]);
              const contents =
                data?.contents
                  ?.twoColumnSearchResultsRenderer
                  ?.primaryContents
                  ?.sectionListRenderer
                  ?.contents;

              if (!contents) {
                resolve(null);
                return;
              }

              for (const section of contents) {
                const items = section?.itemSectionRenderer?.contents;
                if (!items) continue;
                for (const item of items) {
                  const vr = item?.videoRenderer;
                  if (!vr || !vr.videoId) continue;
                  const title = vr.title?.runs?.[0]?.text || query;
                  const channel =
                    vr.ownerText?.runs?.[0]?.text ||
                    vr.longBylineText?.runs?.[0]?.text ||
                    'YouTube';
                  const duration = vr.lengthText?.simpleText || '?';
                  const thumbnail =
                    vr.thumbnail?.thumbnails?.[vr.thumbnail.thumbnails.length - 1]?.url || '';
                  resolve({ videoId: vr.videoId, title, channel, duration, thumbnail });
                  return;
                }
              }
              resolve(null);
            } catch (err) {
              this.logger?.error(`[YouTube] Search parse error: ${err.message}`);
              resolve(null);
            }
          });
        })
        .on('error', (err) => {
          this.logger?.error(`[YouTube] Search network error: ${err.message}`);
          resolve(null);
        });
    });
  }
}

module.exports = YoutubeManager;
