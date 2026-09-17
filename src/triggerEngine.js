const OriginalTriggerEngine = require('./originalTriggerEngine');

class TriggerEngine extends OriginalTriggerEngine {
  constructor(configManager, logger) {
    super(configManager, logger);
    this.customRanks = {
      rankA: new Map(),
      rankB: new Map()
    };
    this._loadRanksFromStats();
  }

  _loadRanksFromStats() {
    try {
      const stats = this.configManager?.get()?.stats;
      if (stats?.customRankA && typeof stats.customRankA === 'object') {
        for (const [key, val] of Object.entries(stats.customRankA)) {
          this.customRanks.rankA.set(key, val);
        }
      }
      if (stats?.customRankB && typeof stats.customRankB === 'object') {
        for (const [key, val] of Object.entries(stats.customRankB)) {
          this.customRanks.rankB.set(key, val);
        }
      }
    } catch (_) {}
  }

  _persistRanksToStats() {
    try {
      if (this.configManager?.updateStats) {
        const customRankA = Object.fromEntries(this.customRanks.rankA);
        const customRankB = Object.fromEntries(this.customRanks.rankB);
        this.configManager.updateStats({ customRankA, customRankB });
      }
    } catch (_) {}
  }

  getRankList(rankKey) {
    const map = this.customRanks[rankKey] || new Map();
    return Array.from(map.values())
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, 10);
  }

  recordCustomRank(rankKey, payload) {
    if (!this.customRanks[rankKey] || !payload) return;

    const uid = String(payload.uniqueId || payload.userId || payload.nickname || ('anon_' + Date.now()));
    const name = String(payload.nickname || payload.uniqueId || 'Anonim');
    const avatar = String(payload.avatar || '');

    // Koin = Diamond cost * repeatCount
    const diamondCost = Number(payload.diamondCost) || 1;
    const repeatCount = Math.max(1, Number(payload.repeatCount || 1));
    const coins = diamondCost * repeatCount;

    const existing = this.customRanks[rankKey].get(uid) || {
      uniqueId: uid,
      name,
      avatar,
      score: 0,
      count: 0
    };

    existing.name = name;
    if (avatar) existing.avatar = avatar;
    existing.score += coins;
    existing.count += repeatCount;

    this.customRanks[rankKey].set(uid, existing);
    this._persistRanksToStats();

    this.emit('customRank:update', {
      rankKey,
      rankA: this.getRankList('rankA'),
      rankB: this.getRankList('rankB')
    });
  }

  resetCustomRanks() {
    this.customRanks.rankA.clear();
    this.customRanks.rankB.clear();
    this._persistRanksToStats();
    this.emit('customRank:update', {
      rankKey: 'all',
      rankA: [],
      rankB: []
    });
  }

  handleEvent(normalizedEvent) {
    // 1. Run original activity & trigger matching (hotkeys, sounds, alerts, etc.)
    super.handleEvent(normalizedEvent);

    // 2. Custom Rank A / Rank B accumulation for gifts
    if (normalizedEvent && normalizedEvent.type === 'gift' && normalizedEvent.payload) {
      const payload = normalizedEvent.payload;
      const activities = this.configManager?.get()?.activities || [];

      for (const act of activities) {
        if (!act || act.enabled === false) continue;
        if (act.event !== 'gift') continue;

        // Check if gift matches the activity condition
        if (this._matches(act.match, 'gift', payload)) {
          if (act.customRank === 'rankA' || act.customRank === 'rankB') {
            this.recordCustomRank(act.customRank, payload);
          }
        }
      }
    }
  }

  /**
   * Eksekusi aksi interaksi (Keystroke, Suara, Media) dengan sinkronisasi simultan
   * Saat simultaneous = true: Suara & Gambar dijalankan serentak bersamaan saat Keystroke aktif tanpa menunggu delay
   * Saat simultaneous = false: Suara & Gambar menunggu delay/eksekusi keystroke secara berurutan
   */
  async _executeInteractionActions(actions = [], simultaneous = true) {
    if (!Array.isArray(actions) || actions.length === 0) return;

    const isSimultaneous = simultaneous !== false;

    if (isSimultaneous) {
      // 1. Jalankan Suara & Gambar/Video bersamaan saat Keystroke aktif (tanpa menunggu delay)
      for (const item of actions) {
        if (!item) continue;
        if (item.type === 'sound' && item.file) {
          this.emit('sound', {
            file: item.file,
            volume: typeof item.volume === 'number' ? item.volume : 100
          });
        } else if (item.type === 'media' && item.file) {
          const ext = String(item.file).split('.').pop().toLowerCase();
          const isVid = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext);
          this.emit('media', {
            file: item.file,
            mediaType: item.mediaType || (isVid ? 'video' : 'image'),
            durationMs: Number(item.durationMs) || 5000
          });
        }
      }

      // 2. Kirim tombol Keystroke ke target aplikasi secara paralel
      for (const item of actions) {
        if (!item) continue;
        if (item.type === 'key' && item.spec) {
          const defaultDelay = this.configManager?.get()?.keyTrigger?.defaultDelayMs ?? 50;
          this._enqueueKey(
            item.spec,
            (item.delayMs != null && !isNaN(Number(item.delayMs))) ? Number(item.delayMs) : defaultDelay,
            (item.holdMs != null && !isNaN(Number(item.holdMs))) ? Number(item.holdMs) : 0
          );
        }
      }
    } else {
      // Jalankan berurutan: jika ada keystroke dengan jeda/delay, tunggu jeda keystroke terlebih dahulu
      for (const item of actions) {
        if (!item) continue;
        if (item.type === 'key' && item.spec) {
          const defaultDelay = this.configManager?.get()?.keyTrigger?.defaultDelayMs ?? 50;
          const delay = (item.delayMs != null && !isNaN(Number(item.delayMs))) ? Number(item.delayMs) : defaultDelay;
          const hold = (item.holdMs != null && !isNaN(Number(item.holdMs))) ? Number(item.holdMs) : 0;
          this._enqueueKey(item.spec, delay, hold);
          if (delay > 0) {
            await new Promise(res => setTimeout(res, delay));
          }
        } else if (item.type === 'sound' && item.file) {
          this.emit('sound', {
            file: item.file,
            volume: typeof item.volume === 'number' ? item.volume : 100
          });
        } else if (item.type === 'media' && item.file) {
          const ext = String(item.file).split('.').pop().toLowerCase();
          const isVid = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext);
          this.emit('media', {
            file: item.file,
            mediaType: item.mediaType || (isVid ? 'video' : 'image'),
            durationMs: Number(item.durationMs) || 5000
          });
        }
      }
    }
  }
}

module.exports = TriggerEngine;