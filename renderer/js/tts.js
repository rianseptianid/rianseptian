// renderer/js/tts.js — Frontend Controller TTS (v2, Premium UI)
// Lucide Icons via CDN + animasi halus + antrian async-friendly.

(function () {
  let currentSettings = null;
  let activeTtsAudio = null;
  let neuralCatalog = [];

  const els = {
    toggleEnabled: document.getElementById('tts_enabled'),
    badgeStatus: document.getElementById('tts_status_badge'),
    selRole: document.getElementById('tts_role'),
    chkReadChat: document.getElementById('tts_read_chat'),
    chkReadGift: document.getElementById('tts_read_gift'),
    chkIgnoreCommands: document.getElementById('tts_ignore_commands'),
    selVoice: document.getElementById('tts_voice'),
    rangeSpeed: document.getElementById('tts_rate'),
    valSpeed: document.getElementById('tts_rate_val'),
    rangePitch: document.getElementById('tts_pitch'),
    valPitch: document.getElementById('tts_pitch_val'),
    rangeVolume: document.getElementById('tts_volume'),
    valVolume: document.getElementById('tts_volume_val'),
    txtTemplateChat: document.getElementById('tts_template_chat'),
    txtTemplateGift: document.getElementById('tts_template_gift'),
    numMinDiamonds: document.getElementById('tts_min_diamonds'),
    txtBlacklist: document.getElementById('tts_blacklist'),
    btnSave: document.getElementById('btnSaveTts'),
    btnTestVoice: document.getElementById('btnTestTtsVoice'),
    btnClearQueue: document.getElementById('btnClearTtsQueue'),
    queueBadge: document.getElementById('tts_queue_count')
  };

  /* ── Helper: refresh icon Lucide ───────────────────────── */
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons(); } catch (_) { }
    }
  }

  /* ── Voice population ──────────────────────────────────── */
  async function loadVoices() {
    if (window.api && window.api.getTtsVoiceCatalog) {
      try { neuralCatalog = await window.api.getTtsVoiceCatalog(); } catch (_) { }
    }
    if (!els.selVoice) return;

    const currentVal = els.selVoice.value;
    els.selVoice.innerHTML = '';

    const idGroup = document.createElement('optgroup');
    idGroup.label = '🇮🇩 Bahasa Indonesia';
    const duniaGroup = document.createElement('optgroup');
    duniaGroup.label = '🌍 Bahasa Dunia';

    if (Array.isArray(neuralCatalog) && neuralCatalog.length > 0) {
      neuralCatalog.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.name;
        if (v.category === 'id-pria' || v.category === 'id-cewek') idGroup.appendChild(opt);
        else duniaGroup.appendChild(opt);
      });
    } else {
      const optPria = document.createElement('option');
      optPria.value = 'id-pria'; optPria.textContent = '🇮🇩 Indonesia — Pria (Ardi)';
      idGroup.appendChild(optPria);
      const optCewek = document.createElement('option');
      optCewek.value = 'id-cewek'; optCewek.textContent = '🇮🇩 Indonesia — Cewek (Gadis)';
      idGroup.appendChild(optCewek);
    }

    if (idGroup.children.length) els.selVoice.appendChild(idGroup);
    if (duniaGroup.children.length) els.selVoice.appendChild(duniaGroup);

    if (currentVal) els.selVoice.value = currentVal;
    else if (currentSettings?.voice) els.selVoice.value = currentSettings.voice;
    else els.selVoice.value = 'id-pria';
  }

  /* ── Settings ──────────────────────────────────────────── */
  async function initSettings() {
    if (!window.api?.getTtsSettings) return;
    try {
      currentSettings = await window.api.getTtsSettings();
      applySettingsToDom(currentSettings);
    } catch (err) {
      console.error('[TTS] Gagal ambil settings:', err);
    }
  }

  function applySettingsToDom(cfg) {
    if (!cfg) return;
    if (els.toggleEnabled) els.toggleEnabled.checked = Boolean(cfg.enabled);
    updateStatusBadge(Boolean(cfg.enabled));

    if (els.selRole) els.selRole.value = cfg.role || 'all';
    if (els.chkReadChat) els.chkReadChat.checked = cfg.readChat !== false;
    if (els.chkReadGift) els.chkReadGift.checked = Boolean(cfg.readGift);
    if (els.chkIgnoreCommands) els.chkIgnoreCommands.checked = cfg.ignoreCommands !== false;

    if (els.selVoice && cfg.voice) els.selVoice.value = cfg.voice;
    else if (els.selVoice && !els.selVoice.value) els.selVoice.value = 'id-pria';

    if (els.rangeSpeed) {
      els.rangeSpeed.value = cfg.rate ?? 1.0;
      if (els.valSpeed) els.valSpeed.textContent = (cfg.rate ?? 1.0) + 'x';
    }
    if (els.rangePitch) {
      els.rangePitch.value = cfg.pitch ?? 1.0;
      if (els.valPitch) els.valPitch.textContent = (cfg.pitch ?? 1.0) + 'x';
    }
    if (els.rangeVolume) {
      els.rangeVolume.value = cfg.volume ?? 100;
      if (els.valVolume) els.valVolume.textContent = (cfg.volume ?? 100) + '%';
    }

    if (els.txtTemplateChat) els.txtTemplateChat.value = cfg.templateChat || '{comment}';
    if (els.txtTemplateGift) els.txtTemplateGift.value = cfg.templateGift || 'Terima kasih {nickname} mengirim {giftName}';
    if (els.numMinDiamonds) els.numMinDiamonds.value = cfg.minGiftDiamonds ?? 1;
    if (els.txtBlacklist && Array.isArray(cfg.blacklist)) els.txtBlacklist.value = cfg.blacklist.join(', ');
  }

  function updateStatusBadge(enabled) {
    if (!els.badgeStatus) return;
    if (enabled) {
      els.badgeStatus.innerHTML = '<i data-lucide="radio" style="width:12px;height:12px;display:inline-block;vertical-align:-1px;margin-right:4px"></i>AKTIF';
      els.badgeStatus.className = 'status-badge active';
      els.badgeStatus.style.background = 'linear-gradient(135deg, rgba(34,197,94,.25), rgba(16,185,129,.15))';
      els.badgeStatus.style.color = '#22c55e';
      els.badgeStatus.style.border = '1px solid rgba(34,197,94,.5)';
    } else {
      els.badgeStatus.innerHTML = '<i data-lucide="radio" style="width:12px;height:12px;display:inline-block;vertical-align:-1px;margin-right:4px"></i>NONAKTIF';
      els.badgeStatus.className = 'status-badge inactive';
      els.badgeStatus.style.background = 'rgba(100,116,139,.15)';
      els.badgeStatus.style.color = '#94a3b8';
      els.badgeStatus.style.border = '1px solid rgba(100,116,139,.35)';
    }
    refreshIcons();
  }

  /* ── Save ──────────────────────────────────────────────── */
  async function saveSettings(silent = false) {
    if (!window.api?.updateTtsSettings) return;

    const blacklistRaw = (els.txtBlacklist?.value || '')
      .split(',').map(w => w.trim()).filter(Boolean);

    const payload = {
      enabled: Boolean(els.toggleEnabled?.checked),
      role: els.selRole?.value || 'all',
      readChat: Boolean(els.chkReadChat?.checked),
      readGift: Boolean(els.chkReadGift?.checked),
      ignoreCommands: Boolean(els.chkIgnoreCommands?.checked),
      voice: els.selVoice?.value || 'id-pria',
      rate: parseFloat(els.rangeSpeed?.value || 1.0),
      pitch: parseFloat(els.rangePitch?.value || 1.0),
      volume: parseInt(els.rangeVolume?.value || 100, 10),
      templateChat: els.txtTemplateChat?.value || '{comment}',
      templateGift: els.txtTemplateGift?.value || 'Terima kasih {nickname} mengirim {giftName}',
      minGiftDiamonds: parseInt(els.numMinDiamonds?.value || 1, 10),
      blacklist: blacklistRaw
    };

    try {
      currentSettings = await window.api.updateTtsSettings(payload);
      updateStatusBadge(payload.enabled);
      if (!silent && els.btnSave) {
        const orig = els.btnSave.innerHTML;
        els.btnSave.innerHTML = '<i data-lucide="check-circle" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;margin-right:4px"></i>Tersimpan!';
        refreshIcons();
        els.btnSave.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
        setTimeout(() => {
          els.btnSave.innerHTML = orig;
          els.btnSave.style.background = '';
          refreshIcons();
        }, 1500);
      }
    } catch (err) {
      console.error('[TTS] Gagal simpan:', err);
    }
  }

  /* ── Playback ──────────────────────────────────────────── */
  function stopActivePlayback() {
    if (activeTtsAudio) {
      try { activeTtsAudio.pause(); activeTtsAudio.currentTime = 0; } catch (_) { }
      activeTtsAudio = null;
    }
  }

  function speakItem(item) {
    if (!item || !item.text) {
      if (window.api?.finishTtsCurrent) window.api.finishTtsCurrent();
      return;
    }
    stopActivePlayback();

    const s = item.settings || {};
    const voiceChoice = s.voice || els.selVoice?.value || 'id-pria';

    function done() {
      activeTtsAudio = null;
      if (window.api?.finishTtsCurrent) window.api.finishTtsCurrent();
    }

    const playAudioSrc = (dataUrl) => {
      try {
        const audio = new Audio(dataUrl);
        activeTtsAudio = audio;
        audio.volume = s.volume !== undefined ? Math.max(0, Math.min(1, s.volume)) : 1.0;

        let finished = false;
        const onDone = () => { if (finished) return; finished = true; done(); };
        audio.onended = onDone;
        audio.onerror = (e) => { console.warn('[TTS] audio error', e); onDone(); };

        const p = audio.play();
        if (p && p.catch) p.catch(err => { console.warn('[TTS] play() err', err); done(); });
      } catch (err) { console.error('[TTS] audio init err', err); done(); }
    };

    if (window.api?.getTtsAudio) {
      window.api.getTtsAudio({
        text: item.text,
        voice: voiceChoice,
        rate: s.rate ?? 1.0,
        pitch: s.pitch ?? 1.0
      }).then(res => {
        if (res?.ok && res.dataUrl) playAudioSrc(res.dataUrl);
        else { console.warn('[TTS] no audio', res); done(); }
      }).catch(err => { console.warn('[TTS] IPC err', err); done(); });
    } else done();
  }

  /* ── Sliders ───────────────────────────────────────────── */
  if (els.rangeSpeed) els.rangeSpeed.addEventListener('input', () => {
    if (els.valSpeed) els.valSpeed.textContent = els.rangeSpeed.value + 'x';
  });
  if (els.rangePitch) els.rangePitch.addEventListener('input', () => {
    if (els.valPitch) els.valPitch.textContent = els.rangePitch.value + 'x';
  });
  if (els.rangeVolume) els.rangeVolume.addEventListener('input', () => {
    if (els.valVolume) els.valVolume.textContent = els.rangeVolume.value + '%';
  });

  /* ── Toggle + Buttons ──────────────────────────────────── */
  if (els.toggleEnabled) els.toggleEnabled.addEventListener('change', () => {
    updateStatusBadge(els.toggleEnabled.checked);
    saveSettings(true);
  });

  if (els.btnSave) els.btnSave.addEventListener('click', () => saveSettings(false));

  if (els.btnClearQueue) els.btnClearQueue.addEventListener('click', () => {
    stopActivePlayback();
    if (window.api?.clearTtsQueue) window.api.clearTtsQueue();
  });

  const btnInstallWindowsTts = document.getElementById('btnInstallWindowsTts');
  if (btnInstallWindowsTts) {
    btnInstallWindowsTts.addEventListener('click', async () => {
      if (!window.api?.installIndonesianTts) return;
      const orig = btnInstallWindowsTts.innerHTML;
      btnInstallWindowsTts.disabled = true;
      btnInstallWindowsTts.innerHTML = '<i data-lucide="loader-2" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;margin-right:4px;animation:spin 1s linear infinite"></i>Menjalankan Installer...';
      refreshIcons();
      try {
        const res = await window.api.installIndonesianTts();
        if (res.ok) alert('Jendela UAC Administrator terbuka. Klik "Yes" untuk install paket suara Bahasa Indonesia.');
        else alert('Gagal: ' + (res.error || 'Unknown'));
      } catch (err) { alert('Gagal: ' + err.message); }
      finally {
        btnInstallWindowsTts.disabled = false;
        btnInstallWindowsTts.innerHTML = orig;
        refreshIcons();
      }
    });
  }

  /* ── Test Voice ────────────────────────────────────────── */
  if (els.btnTestVoice) {
    els.btnTestVoice.addEventListener('click', async () => {
      const selectedVoice = els.selVoice?.value || 'id-pria';
      const catalogItem = neuralCatalog.find(c => c.id === selectedVoice);
      let sampleText = catalogItem?.sample || 'Halo! Ini adalah tes suara pembaca komentar TikTok LIVE.';

      const orig = els.btnTestVoice.innerHTML;
      els.btnTestVoice.innerHTML = '<i data-lucide="volume-2" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;margin-right:4px"></i>Memutar...';
      els.btnTestVoice.disabled = true;
      refreshIcons();

      const resetBtn = () => {
        els.btnTestVoice.innerHTML = orig;
        els.btnTestVoice.disabled = false;
        refreshIcons();
      };
      const timer = setTimeout(resetBtn, 8000);

      speakItem({
        text: sampleText,
        settings: {
          voice: selectedVoice,
          rate: parseFloat(els.rangeSpeed?.value || 1.0),
          pitch: parseFloat(els.rangePitch?.value || 1.0),
          volume: parseInt(els.rangeVolume?.value || 100, 10) / 100
        }
      });

      setTimeout(() => {
        if (activeTtsAudio) {
          const prev = activeTtsAudio.onended;
          activeTtsAudio.onended = () => {
            clearTimeout(timer); resetBtn();
            if (typeof prev === 'function') prev();
          };
        }
      }, 300);
    });
  }

  /* ── IPC listeners ─────────────────────────────────────── */
  if (window.api?.onTtsSpeak) window.api.onTtsSpeak(item => speakItem(item));
  if (window.api?.onTtsClear) window.api.onTtsClear(() => stopActivePlayback());

  /* ── Init ──────────────────────────────────────────────── */
  function boot() {
    loadVoices();
    initSettings();
    refreshIcons();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();