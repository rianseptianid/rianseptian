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
    const repeatCount = Math.max(1, Number(payload.repeatCount || payload.combo || 1));
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

  /**
   * Evaluasi kecocokan rule/event pemicu dengan payload TikTok live
   * Mendukung pemanggilan: _matches(ruleOrMatch, event, payload, rule)
   */
  _matches(ruleOrMatch = {}, event, payload = {}, rule = {}) {
    if (!event) return false;

    // Normalkan targetRule dan targetMatch agar fleksibel
    const targetRule = (rule && Object.keys(rule).length > 0) ? rule : (ruleOrMatch.match ? ruleOrMatch : {});
    const targetMatch = ruleOrMatch.match ? ruleOrMatch.match : ruleOrMatch;

    if (event === 'gift') {
      const matchGiftId = targetMatch?.giftId ?? targetRule?.match?.giftId;
      // Jika giftId diset (bukan 0 atau kosong), harus cocok dengan payload
      if (matchGiftId != null && matchGiftId !== '' && matchGiftId !== 0 && matchGiftId !== '0') {
        const matchStr = String(matchGiftId).trim().toLowerCase();
        const payloadId = String(payload?.giftId ?? '').trim().toLowerCase();
        const payloadName = String(payload?.giftName ?? '').trim().toLowerCase();
        if (matchStr !== payloadId && matchStr !== payloadName) {
          return false;
        }
      }

      // Minimal combo check
      const minCombo = Math.max(1, Number(targetMatch?.minCombo ?? targetRule?.minCombo ?? 1));
      const combo = Math.max(1, Number(payload?.repeatCount ?? payload?.combo ?? 1));
      if (minCombo > 1 && combo < minCombo) {
        return false;
      }

      // Streak ended check (Picu hanya saat streak combo selesai)
      const streakEnded = targetMatch?.streakEnded ?? targetRule?.streakEnded ?? targetRule?.match?.streakEnded;
      if (streakEnded === true) {
        const isEnded = payload?.repeatEnd != null ? Boolean(payload.repeatEnd) : Boolean(payload?.streakEnded);
        if (!isEnded) {
          return false;
        }
      }

      return true;
    }

    if (event === 'chat') {
      const kw = String(targetMatch?.keyword ?? targetRule?.match?.keyword ?? '').trim().toLowerCase();
      if (kw) {
        const comment = String(payload?.comment ?? payload?.text ?? '').toLowerCase();
        if (!comment.includes(kw)) return false;
      }
      return true;
    }

    if (event === 'like') {
      const minLike = Math.max(1, Number(targetMatch?.minLike ?? targetRule?.match?.minLike ?? 1));
      if (minLike > 1) {
        const likeCount = Number(payload?.likeCount ?? payload?.count ?? 1);
        const totalLikeCount = Number(payload?.totalLikeCount ?? payload?.totalLikes ?? 0);
        if (likeCount < minLike && totalLikeCount < minLike) return false;
      }
      return true;
    }

    // Follow, Share, Subscribe, Join
    return true;
  }

  /**
   * Tangani event realtime TikTok yang masuk dari TiktokConnector
   */
  handleEvent(normalizedEvent, maybePayload = {}) {
    if (!normalizedEvent) return;
    const type = (typeof normalizedEvent === 'object' && normalizedEvent.type)
      ? normalizedEvent.type
      : normalizedEvent;
    const payload = (typeof normalizedEvent === 'object' && normalizedEvent.payload)
      ? normalizedEvent.payload
      : (maybePayload || {});

    if (!type) return;

    // Follower & Share counter stats update
    if (type === 'follow') {
      try {
        this.configManager?.updateStats?.(s => {
          s.totalFollows = (s.totalFollows || 0) + 1;
        });
      } catch (_) {}
    } else if (type === 'share') {
      try {
        this.configManager?.updateStats?.(s => {
          s.totalShares = (s.totalShares || 0) + 1;
        });
      } catch (_) {}
    }

    const cfg = this.configManager?.get() || {};
    const activities = cfg.activities || [];

    // 1. Eksekusi Aktivitas (Gift & Event Mapping v1.2+)
    for (const act of activities) {
      if (!act || act.enabled === false) continue;
      if (act.event !== type) continue;
      if (!this._matches(act.match, type, payload, act)) continue;

      this._fireActivity(act, payload).catch(err => {
        this.logger?.error?.(`Gagal mengeksekusi aktivitas "${act.name || act.id}": ${err.message}`);
      });

      // Custom Rank A / Rank B accumulation for gifts
      if (type === 'gift' && payload) {
        if (act.customRank === 'rankA' || act.customRank === 'rankB') {
          this.recordCustomRank(act.customRank, payload);
        }
      }
    }

    // 2. Eksekusi legacy Triggers jika ada yang aktif
    const triggers = cfg.triggers || [];
    for (const trig of triggers) {
      if (!trig || trig.enabled === false) continue;
      if (trig.event !== type) continue;
      if (!this._matches(trig.match, type, payload, trig)) continue;

      this._fire(trig, payload).catch(err => {
        this.logger?.error?.(`Gagal mengeksekusi trigger "${trig.name || trig.id}": ${err.message}`);
      });
    }
  }

  /**
   * Eksekusi pemicu aktivitas lengkap
   */
  async _fireActivity(rule, payload = {}) {
    if (!rule) return;
    this.emit('fired', { rule, payload });

    const cfg = this.configManager?.get() || {};
    const interactions = cfg.interactions || [];
    const interactionIds = Array.isArray(rule.interactionIds) ? rule.interactionIds : [];

    // Kumpulkan aksi interaksi yang terhubung
    let targets = interactionIds
      .map(id => interactions.find(i => String(i.id) === String(id)))
      .filter(Boolean);

    // Fallback: Jika rule memiliki actions inline (format legacy)
    if (targets.length === 0 && Array.isArray(rule.actions) && rule.actions.length > 0) {
      targets = [{
        id: 'inline_' + rule.id,
        name: rule.name || 'Aksi Langsung',
        actions: rule.actions,
        simultaneous: Boolean(rule.simultaneous)
      }];
    }

    if (targets.length === 0) {
      this.logger?.warn?.(`Aktivitas "${rule.name || rule.id}" tidak memiliki interaksi yang valid terhubung.`);
      return;
    }

    const repeat = Math.max(1, Number(rule.repeat || rule.match?.repeat || 1));
    const pickMode = rule.pickMode || rule.actionPickMode || 'all';

    for (let r = 0; r < repeat; r++) {
      if (r > 0) {
        await new Promise(res => setTimeout(res, 60));
      }

      let chosen = targets;
      if (pickMode === 'random' && targets.length > 1) {
        const randIdx = Math.floor(Math.random() * targets.length);
        chosen = [targets[randIdx]];
      }

      for (const item of chosen) {
        if (!item || !Array.isArray(item.actions)) continue;
        await this._executeInteractionActions(item.actions, Boolean(item.simultaneous));
      }
    }
  }

  /**
   * Eksekusi aksi interaksi (Keystroke, Suara, Media)
   * - simultaneous = false (Default): Suara & Media menunggu delay keystroke dan aktif BERSAMAAN saat keystroke ditekan.
   * - simultaneous = true (Ceklis dicentang): Suara & Media langsung dimainkan seketika tanpa menunggu delay keystroke.
   */
  async _executeInteractionActions(actions = [], simultaneous = false) {
    if (!Array.isArray(actions) || actions.length === 0) return;

    const keyActions = actions.filter(item => item && item.type === 'key' && item.spec);
    const otherActions = actions.filter(item => item && (item.type === 'sound' || item.type === 'media'));

    const emitOtherActions = () => {
      for (const item of otherActions) {
        if (item.type === 'sound' && item.file) {
          const soundFile = String(item.file).trim();
          this.emit('sound', {
            file: soundFile,
            volume: typeof item.volume === 'number' ? item.volume : 100
          });
        } else if (item.type === 'media' && item.file) {
          const mediaFile = String(item.file).trim();
          const ext = mediaFile.split('.').pop().toLowerCase();
          const isVid = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext);
          this.emit('media', {
            file: mediaFile,
            mediaType: item.mediaType || (isVid ? 'video' : 'image'),
            durationMs: Number(item.durationMs) > 0 ? Number(item.durationMs) : 5000
          });
        }
      }
    };

    const defaultDelay = this.configManager?.get()?.keyTrigger?.defaultDelayMs ?? 50;
    const firstKey = keyActions[0];
    const keyDelay = firstKey
      ? ((firstKey.delayMs != null && !isNaN(Number(firstKey.delayMs))) ? Number(firstKey.delayMs) : defaultDelay)
      : 0;

    if (simultaneous) {
      // 1. Jalankan Suara & Media langsung tanpa menunggu delay keystroke
      emitOtherActions();

      // 2. Kirim keystroke ke antrean background native
      for (const item of keyActions) {
        const delay = (item.delayMs != null && !isNaN(Number(item.delayMs))) ? Number(item.delayMs) : defaultDelay;
        const hold = (item.holdMs != null && !isNaN(Number(item.holdMs))) ? Number(item.holdMs) : 0;
        this._enqueueKey(item.spec, delay, hold);
      }
    } else {
      // DEFAULT (simultaneous = false): Suara & Media bareng dengan Keystroke
      // Enqueue keystroke ke antrean
      for (const item of keyActions) {
        const delay = (item.delayMs != null && !isNaN(Number(item.delayMs))) ? Number(item.delayMs) : defaultDelay;
        const hold = (item.holdMs != null && !isNaN(Number(item.holdMs))) ? Number(item.holdMs) : 0;
        this._enqueueKey(item.spec, delay, hold);
      }

      if (keyDelay > 0 && otherActions.length > 0) {
        // Tunggu delay keystroke selesai agar suara & media terpicu bersamaan saat keystroke ditekan
        await new Promise(res => setTimeout(res, keyDelay));
        emitOtherActions();
      } else {
        emitOtherActions();
      }
    }
  }

  /**
   * Uji coba Aktivitas berdasarkan ID atau Objek data aktivitas langsung
   */
  async testActivity(idOrObj) {
    if (!idOrObj) throw new Error('Data aktivitas tidak valid.');
    const cfg = this.configManager?.get() || {};
    let act = idOrObj;
    if (typeof idOrObj === 'string') {
      act = (cfg.activities || []).find(a => String(a.id) === String(idOrObj))
        || (cfg.triggers || []).find(t => String(t.id) === String(idOrObj));
      if (!act) {
        throw new Error(`Aktivitas dengan ID "${idOrObj}" tidak ditemukan.`);
      }
    }

    const interactions = cfg.interactions || [];
    const interactionIds = Array.isArray(act.interactionIds) ? act.interactionIds : [];
    const linked = interactionIds.map(iid => interactions.find(i => String(i.id) === String(iid))).filter(Boolean);
    const hasInline = Array.isArray(act.actions) && act.actions.length > 0;

    if (linked.length === 0 && !hasInline) {
      throw new Error(`Aktivitas "${act.name || act.id || 'Pilihan'}" belum terhubung ke aksi Interaksi apa pun. Silakan hubungkan aksi Interaksi terlebih dahulu.`);
    }

    const totalActionsCount = linked.reduce((sum, item) => sum + (Array.isArray(item.actions) ? item.actions.length : 0), 0)
      + (hasInline ? act.actions.length : 0);

    if (totalActionsCount === 0) {
      throw new Error(`Interaksi yang terhubung ke aktivitas "${act.name || act.id || 'Pilihan'}" belum memiliki konfigurasi aksi (Keyboard, Sound, atau Media).`);
    }

    const dummy = this._dummyPayload(act.event || 'gift');
    if (act.event === 'gift') {
      if (act.match?.giftId) dummy.giftId = act.match.giftId;
      if (act.giftName) dummy.giftName = act.giftName;
      dummy.repeatCount = Math.max(1, Number(act.repeat || act.match?.repeat || 1));
      dummy.diamondCost = 1;
    } else if (act.event === 'chat' && act.match?.keyword) {
      dummy.comment = `Uji coba ${act.match.keyword}`;
    } else if (act.event === 'like') {
      dummy.likeCount = Number(act.match?.minLike || 10);
    }

    await this._fireActivity(act, dummy);
  }

  /**
   * Uji coba Trigger / Aktivitas generik
   */
  async testTrigger(id) {
    const cfg = this.configManager?.get() || {};
    const act = (cfg.activities || []).find(a => String(a.id) === String(id));
    if (act) {
      return this.testActivity(id);
    }
    const trig = (cfg.triggers || []).find(t => String(t.id) === String(id));
    if (trig) {
      await this._fire(trig, this._dummyPayload(trig.event || 'gift'));
      return;
    }
    throw new Error(`Trigger atau Aktivitas dengan ID "${id}" tidak ditemukan.`);
  }

  /**
   * Uji coba Interaksi langsung berdasarkan ID atau Objek data
   */
  async testInteraction(data) {
    if (!data) throw new Error('Data interaksi tidak valid.');
    let item = data;
    if (typeof data === 'string') {
      const cfg = this.configManager?.get() || {};
      item = (cfg.interactions || []).find(i => String(i.id) === String(data));
      if (!item) throw new Error(`Interaksi dengan ID "${data}" tidak ditemukan.`);
    } else if (typeof data === 'object') {
      if (data.id && (!Array.isArray(data.actions) || data.actions.length === 0)) {
        const cfg = this.configManager?.get() || {};
        const found = (cfg.interactions || []).find(i => String(i.id) === String(data.id));
        if (found) item = found;
      }
    }
    if (!item.actions || item.actions.length === 0) {
      throw new Error(`Interaksi "${item.name || 'Pilihan'}" belum memiliki konfigurasi aksi (Keyboard, Sound, atau Media).`);
    }
    await this._executeInteractionActions(item.actions, Boolean(item.simultaneous));
  }

  /**
   * Uji coba daftar aksi langsung
   */
  async testActions(actions, event = 'gift', simultaneous = false, repeat = 1) {
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new Error('Pilih dan isi setidaknya satu aksi untuk diuji.');
    }
    const count = Math.max(1, Number(repeat || 1));
    for (let i = 0; i < count; i++) {
      if (i > 0) await new Promise(res => setTimeout(res, 60));
      await this._executeInteractionActions(actions, Boolean(simultaneous));
    }
  }
}

module.exports = TriggerEngine;