// src/ttsReader.js — Modular Text-To-Speech Chat Reader Engine for TikTok LIVE
// Provides queue management, role filtering, keyword blacklist, anti-spam rate limiting,
// and natural voice delivery.

const EventEmitter = require('events');

class TtsReader extends EventEmitter {
  constructor(configManager, logger) {
    super();
    this.configManager = configManager;
    this.logger = logger;
    this.queue = [];
    this.isSpeaking = false;
    this.cooldownTimer = null;
    this.lastSpokenTs = 0;
    this.minIntervalMs = 800; // Anti-spam delay between utterances
  }

  getSettings() {
    const cfg = this.configManager?.get() || {};
    const tts = cfg.ttsReader || {};
    return {
      enabled: tts.enabled ?? false,
      readChat: tts.readChat ?? true,
      readGift: tts.readGift ?? false,
      readLike: tts.readLike ?? false,
      readShare: tts.readShare ?? false,
      readFollow: tts.readFollow ?? false,
      readJoin: tts.readJoin ?? false,
      role: tts.role || 'all', // 'all' | 'follower' | 'subscriber' | 'moderator'
      voice: tts.voice || 'g-id',
      engine: tts.engine || 'google',
      rate: Number(tts.rate ?? 1.0),
      pitch: Number(tts.pitch ?? 1.0),
      volume: Number(tts.volume ?? 100),
      templateChat: tts.templateChat || '{comment}',
      templateGift: tts.templateGift || 'Terima kasih {nickname} mengirim {giftName}',
      blacklist: Array.isArray(tts.blacklist) ? tts.blacklist : [],
      minGiftDiamonds: Number(tts.minGiftDiamonds ?? 1),
      maxQueueSize: Number(tts.maxQueueSize ?? 25),
      ignoreCommands: tts.ignoreCommands ?? true
    };
  }

  updateSettings(partial) {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    if (this.configManager?.update) {
      this.configManager.update({ ttsReader: updated });
    }
    this.emit('settings:update', updated);
    return updated;
  }

  /**
   * Evaluates whether a chat message qualifies for TTS based on role and blacklist
   */
  shouldReadChat(chatPayload) {
    const settings = this.getSettings();
    if (!settings.enabled || !settings.readChat) return false;
    if (!chatPayload || !chatPayload.comment) return false;

    const comment = String(chatPayload.comment).trim();
    if (!comment) return false;

    // Ignore bot commands like !play, !skip, !req
    if (settings.ignoreCommands && comment.startsWith('!')) return false;

    // Role filtering
    if (settings.role !== 'all') {
      const isSub = Boolean(chatPayload.isSubscriber || chatPayload.user?.isSubscriber);
      const isMod = Boolean(chatPayload.isModerator || chatPayload.user?.isModerator);
      const isFollower = Boolean(chatPayload.isFollower || chatPayload.user?.isFollower);

      if (settings.role === 'moderator' && !isMod) return false;
      if (settings.role === 'subscriber' && !isSub && !isMod) return false;
      if (settings.role === 'follower' && !isFollower && !isSub && !isMod) return false;
    }

    // Blacklist filter
    if (this._containsBlacklist(comment, settings.blacklist)) {
      this.logger?.info(`[TTS] Chat diabaikan karena blacklist: "${comment}"`);
      return false;
    }

    return true;
  }

  /**
   * Evaluates whether a gift qualifies for TTS
   */
  shouldReadGift(giftPayload) {
    const settings = this.getSettings();
    if (!settings.enabled || !settings.readGift) return false;
    if (!giftPayload) return false;

    const diamonds = Number(giftPayload.diamondCost) || 0;
    if (diamonds < settings.minGiftDiamonds) return false;

    return true;
  }

  _containsBlacklist(text, blacklist) {
    if (!Array.isArray(blacklist) || blacklist.length === 0) return false;
    const lower = text.toLowerCase();
    return blacklist.some(word => {
      const clean = String(word).trim().toLowerCase();
      return clean && lower.includes(clean);
    });
  }

  formatChatMessage(chatPayload) {
    const settings = this.getSettings();
    const nickname = chatPayload.nickname || chatPayload.uniqueId || 'Anonim';
    const comment = chatPayload.comment || '';
    return settings.templateChat
      .replace(/\{nickname\}/gi, nickname)
      .replace(/\{comment\}/gi, comment);
  }

  formatGiftMessage(giftPayload) {
    const settings = this.getSettings();
    const nickname = giftPayload.nickname || giftPayload.uniqueId || 'Anonim';
    const giftName = giftPayload.giftName || 'hadiah';
    const count = giftPayload.repeatCount || 1;
    return settings.templateGift
      .replace(/\{nickname\}/gi, nickname)
      .replace(/\{giftName\}/gi, giftName)
      .replace(/\{count\}/gi, String(count));
  }

  /**
   * Handle incoming TikTok event
   */
  handleEvent(evt) {
    if (!evt || !evt.type || !evt.payload) return;

    if (evt.type === 'chat') {
      if (this.shouldReadChat(evt.payload)) {
        const text = this.formatChatMessage(evt.payload);
        this.enqueue(text, { category: 'chat', user: evt.payload.nickname });
      }
    } else if (evt.type === 'gift') {
      // Alert when streak ends or non-streak to avoid spamming every tap
      if (evt.payload.streakEnded || !evt.payload.isStreak || (evt.payload.repeatCount || 1) % 5 === 0) {
        if (this.shouldReadGift(evt.payload)) {
          const text = this.formatGiftMessage(evt.payload);
          this.enqueue(text, { category: 'gift', user: evt.payload.nickname });
        }
      }
    } else {
      const settings = this.getSettings();
      if (!settings.enabled) return;
      const nickname = evt.payload.nickname || evt.payload.uniqueId || 'Anonim';
      
      if (evt.type === 'like' && settings.readLike) {
        // Prevent spam by only reading likes occasionally or grouping them
        if (evt.payload.totalLikeCount % 50 === 0 || evt.payload.likeCount > 10) {
          this.enqueue(`${nickname} menyukai live ini`, { category: 'like', user: nickname });
        }
      } else if (evt.type === 'share' && settings.readShare) {
        this.enqueue(`Terima kasih ${nickname} sudah membagikan live ini`, { category: 'share', user: nickname });
      } else if (evt.type === 'follow' && settings.readFollow) {
        this.enqueue(`Terima kasih ${nickname} sudah follow`, { category: 'follow', user: nickname });
      } else if (evt.type === 'member' && settings.readJoin) {
        this.enqueue(`Selamat datang ${nickname}`, { category: 'join', user: nickname });
      }
    }
  }

  enqueue(text, meta = {}) {
    if (!text || typeof text !== 'string') return;
    const cleanText = text.replace(/https?:\/\/\S+/gi, '').trim();
    if (!cleanText) return;

    const settings = this.getSettings();
    if (this.queue.length >= settings.maxQueueSize) {
      this.queue.shift(); // Drop oldest to prevent overflow
    }

    this.queue.push({
      id: 'tts_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      text: cleanText,
      meta,
      settings: {
        voice: settings.voice,
        engine: settings.engine || 'google',
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume / 100
      }
    });

    this.processQueue();
  }

  processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;

    const now = Date.now();
    if (now - this.lastSpokenTs < this.minIntervalMs) {
      if (!this.cooldownTimer) {
        this.cooldownTimer = setTimeout(() => {
          this.cooldownTimer = null;
          this.processQueue();
        }, this.minIntervalMs - (now - this.lastSpokenTs));
      }
      return;
    }

    const item = this.queue.shift();
    this.isSpeaking = true;
    this.emit('speak', item);
  }

  /**
   * Called by the renderer window after finishing speech utterance
   */
  finishCurrent() {
    this.isSpeaking = false;
    this.lastSpokenTs = Date.now();
    this.emit('speak:ended');
    setTimeout(() => this.processQueue(), 200);
  }

  clearQueue() {
    this.queue = [];
    this.isSpeaking = false;
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.emit('clear');
  }
}

module.exports = TtsReader;
