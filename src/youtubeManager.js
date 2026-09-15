const EventEmitter = require('events');
const https = require('https');

/**
 * YoutubeManager — manages song request queue, search, playback events.
 * Audio is played by the YouTube BrowserWindow via IFrame API / native player.
 */
class YoutubeManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.queue = [];
    this.history = [];
    this.currentSong = null;
    this.settings = {
      reqEnabled: true,
      skipEnabled: true,
      reqRole: 'all',
      maxQueue: 10,
      maxPerUser: 2
    };

    // Anti double-trigger playNext
    this.__playingNext = false;

    // Cooldown per user untuk !play (ms)
    this.__playCooldown = new Map();
    this.__playCooldownMs = 3000;
  }

  updateSettings(partial) {
    this.settings = { ...this.settings, ...partial };
    this.emit('settingsUpdated', this.settings);
  }

  checkRole(payload, role) {
    if (!role || role === 'all') return true;
    if (role === 'subscriber') return payload.isSubscriber || payload.isModerator;
    if (role === 'moderator') return payload.isModerator;
    if (role === 'friend') return payload.isFriend || payload.isModerator;
    return true;
  }

  async handleChatCommand(payload) {
    const comment = (payload.comment || '').trim();
    const uniqueId = payload.uniqueId;
    const nickname = payload.nickname || uniqueId;

    if (!comment.startsWith('!')) return false;
    if (!this.checkRole(payload, this.settings.reqRole)) return false;

    const parts = comment.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    // ── !play / !req / !lagu / !musik / !song ──────────────
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

        // Cooldown anti-spam
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
        this.emit('queueUpdated', this.queue);
        this.emit('notify', { type: 'success', message: `✓ @${nickname} → ${song.title}` });
        if (!this.currentSong) this.playNext();
      } else {
        this.logger?.warn(`[YouTube] Could not find: ${arg}`);
        this.emit('notify', { type: 'error', message: `Lagu "${arg}" tidak ditemukan.` });
      }

      return true;
    }

    // ── !skip ─────────────────────────────────────────────
    if (cmd === '!skip' && this.settings.skipEnabled) {
      this.logger?.info(`[YouTube] Skip requested by ${nickname}`);
      this.__playingNext = false; // reset guard biar skip langsung jalan
      this.skipSong();
      this.emit('notify', { type: 'info', message: `⏭ @${nickname} skip lagu.` });
      return true;
    }

    // ── !stop ─────────────────────────────────────────────
    if (cmd === '!stop') {
      this.logger?.info(`[YouTube] Stop requested by ${nickname}`);
      this.__playingNext = false; // reset guard
      this.stopCurrent();
      this.emit('notify', { type: 'info', message: `⏹ @${nickname} stop musik.` });
      return true;
    }

    // ── !revoke / !remove / !cancel ───────────────────────
    if (cmd === '!revoke' || cmd === '!remove' || cmd === '!cancel') {
      if (arg) {
        const idx = this.queue.findIndex(s =>
          s.requesterId === uniqueId &&
          s.title.toLowerCase().includes(arg.toLowerCase())
        );
        if (idx >= 0) {
          const removed = this.queue.splice(idx, 1)[0];
          this.logger?.info(`[YouTube] ${nickname} revoked: ${removed.title}`);
          this.emit('queueUpdated', this.queue);
        }
      } else {
        for (let i = this.queue.length - 1; i >= 0; i--) {
          if (this.queue[i].requesterId === uniqueId) {
            const removed = this.queue.splice(i, 1)[0];
            this.logger?.info(`[YouTube] ${nickname} revoked: ${removed.title}`);
            this.emit('queueUpdated', this.queue);
            break;
          }
        }
      }
      return true;
    }

    return false;
  }

  // ──────────────────────────────────────────────────────────
  // Playback controls
  // ──────────────────────────────────────────────────────────

  playNext() {
    // Guard anti double-trigger
    if (this.__playingNext) {
      this.logger?.info('[YouTube] playNext() ignored — already in progress');
      return;
    }
    this.__playingNext = true;
    setTimeout(() => { this.__playingNext = false; }, 1000);

    if (this.queue.length > 0) {
      const song = this.queue.shift();
      this.currentSong = song;
      this.currentSong.status = 'playing';

      this.history.unshift(song);
      // Tugas 2 (bonus): trim history agar tidak tumbuh tanpa batas saat live 8 jam
      if (this.history.length > 50) this.history.length = 50;

      // Trim playCooldown Map: hapus entry lebih dari 5 menit lalu agar tidak bocor
      const cutoff = Date.now() - 5 * 60 * 1000;
      for (const [uid, ts] of this.__playCooldown) {
        if (ts < cutoff) this.__playCooldown.delete(uid);
      }

      this.emit('playSong', this.currentSong);
      this.emit('queueUpdated', this.queue);
      this.emit('historyUpdated', this.history);
    } else {
      const hadSong = !!this.currentSong;
      this.currentSong = null;
      if (hadSong || this.queue.length === 0) {
        this.emit('stopSong');
      }
      this.emit('queueUpdated', this.queue);
    }
  }

  skipSong() {
    if (this.currentSong) {
      this.currentSong.status = 'skipped';
      this.emit('historyUpdated', this.history);
    }
    this.currentSong = null;
    this.__playingNext = false; // reset guard biar playNext langsung jalan
    this.playNext();
  }

  stopCurrent() {
    if (this.currentSong) {
      this.currentSong.status = 'stopped';
      this.emit('historyUpdated', this.history);
    }
    this.currentSong = null;
    this.emit('stopSong');
    this.emit('queueUpdated', this.queue);
  }

  stop() { this.stopCurrent(); }
  skip() { this.skipSong(); }

  clearQueue() {
    this.queue = [];
    this.emit('queueUpdated', this.queue);
  }

  removeSong(idx) {
    if (idx >= 0 && idx < this.queue.length) {
      this.queue.splice(idx, 1);
      this.emit('queueUpdated', this.queue);
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
      requester: song.requester ? `${song.requester} (Replay)` : 'Host (Replay)'
    };
    this.queue.push(cloned);
    this.emit('queueUpdated', this.queue);
    if (!this.currentSong) {
      this.__playingNext = false;
      this.playNext();
    }
    return true;
  }

  // ──────────────────────────────────────────────────────────
  // YouTube Search (scrapes ytInitialData)
  // ──────────────────────────────────────────────────────────

  searchYoutube(query) {
    return new Promise((resolve) => {
      const url =
        'https://www.youtube.com/results?search_query=' +
        encodeURIComponent(query) +
        '&sp=EgIQAQ%3D%3D';

      const options = {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
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
                this.logger?.warn('[YouTube] Unexpected ytInitialData structure');
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

              this.logger?.warn(`[YouTube] No video results for: ${query}`);
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