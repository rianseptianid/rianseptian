// renderer/js/audioEffects.js — Custom Voice Effects Engine
// Powered by Web Audio API (built-in to Electron/Chromium, 0 dependencies, 0 extra CPU)
// Applies EQ, distortion, reverb, compression per voice character profile.

(function () {
  "use strict";

  let _audioCtx = null;

  function getAudioContext() {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "playback" });
    }
    if (_audioCtx.state === "suspended") {
      _audioCtx.resume().catch(function() {});
    }
    return _audioCtx;
  }

  function createReverbImpulse(ctx, duration, decay) {
    var rate = ctx.sampleRate;
    var len = Math.floor(rate * duration);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function makeDistortionCurve(amount) {
    var k = amount || 50;
    var n = 512;
    var curve = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  var VOICE_EFFECTS = {
    "tokoh-prabowo": {
      playbackRate: 0.91,
      bass:    { freq: 160,  gain: 8  },
      mid:     { freq: 800,  gain: -2 },
      treble:  { freq: 7000, gain: -5 },
      reverb:  { duration: 1.4, decay: 2.8, wet: 0.30 },
      compress:{ threshold: -22, ratio: 6, attack: 0.003, release: 0.25 }
    },
    "tokoh-jokowi": {
      playbackRate: 0.86,
      bass:    { freq: 220,  gain: 5  },
      mid:     { freq: 900,  gain: 6  },
      treble:  { freq: 5500, gain: -6 },
      reverb:  { duration: 0.9, decay: 2.2, wet: 0.20 },
      compress:{ threshold: -18, ratio: 4, attack: 0.005, release: 0.30 }
    },
    "tokoh-doraemon": {
      playbackRate: 1.40,
      bass:    { freq: 200,  gain: -6 },
      treble:  { freq: 4500, gain: 10 },
      reverb:  { duration: 0.25, decay: 0.8, wet: 0.04 },
      compress:{ threshold: -10, ratio: 2, attack: 0.001, release: 0.08 }
    },
    "tokoh-naruto": {
      playbackRate: 1.16,
      bass:    { freq: 250,  gain: 4  },
      treble:  { freq: 5000, gain: 7  },
      reverb:  { duration: 0.5, decay: 1.5, wet: 0.10 },
      compress:{ threshold: -14, ratio: 3, attack: 0.002, release: 0.12 }
    },
    "kocak-chipmunk": {
      playbackRate: 1.70,
      bass:    { freq: 200,  gain: -10 },
      treble:  { freq: 4000, gain: 13 },
      reverb:  { duration: 0.1, decay: 0.4, wet: 0.02 },
      compress:{ threshold: -8, ratio: 2, attack: 0.001, release: 0.05 }
    },
    "kocak-monster": {
      playbackRate: 0.50,
      bass:    { freq: 75,   gain: 15 },
      treble:  { freq: 8000, gain: -12 },
      distortion: 35,
      reverb:  { duration: 2.8, decay: 4.0, wet: 0.50 },
      compress:{ threshold: -28, ratio: 9, attack: 0.01, release: 0.6 }
    },
    "kocak-bocil": {
      playbackRate: 1.30,
      bass:    { freq: 200,  gain: -4 },
      treble:  { freq: 5000, gain: 8  },
      reverb:  { duration: 0.2, decay: 0.8, wet: 0.04 },
      compress:{ threshold: -12, ratio: 2, attack: 0.002, release: 0.10 }
    },
    "kocak-robot": {
      playbackRate: 1.0,
      bass:    { freq: 300,  gain: 4  },
      mid:     { freq: 1200, gain: -8 },
      treble:  { freq: 4000, gain: 9  },
      distortion: 12,
      reverb:  { duration: 0.3, decay: 1.0, wet: 0.08 },
      compress:{ threshold: -15, ratio: 5, attack: 0.001, release: 0.10 }
    },
    "kocak-speedster": {
      playbackRate: 1.85,
      treble:  { freq: 5000, gain: 4  },
      compress:{ threshold: -10, ratio: 3, attack: 0.001, release: 0.05 }
    },
    "kocak-kakek": {
      playbackRate: 0.78,
      bass:    { freq: 200,  gain: 6  },
      mid:     { freq: 2500, gain: -6 },
      treble:  { freq: 8000, gain: -9 },
      reverb:  { duration: 1.1, decay: 2.5, wet: 0.25 },
      compress:{ threshold: -20, ratio: 5, attack: 0.005, release: 0.35 }
    },
    "id-gadis":     { playbackRate: 1.0 },
    "id-ardi":      { playbackRate: 1.0 },
    "daerah-dimas": { playbackRate: 1.0 },
    "daerah-siti":  { playbackRate: 1.0 },
    "daerah-jajang":{ playbackRate: 1.0 },
    "daerah-tuti":  { playbackRate: 1.0 },
    "google-id":    { playbackRate: 1.0 }
  };

  async function fetchArrayBuffer(src) {
    if (src.startsWith("data:")) {
      var b64 = src.split(",")[1];
      var bin = atob(b64);
      var buf = new ArrayBuffer(bin.length);
      var view = new Uint8Array(buf);
      for (var i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
      return buf;
    }
    var res = await fetch(src);
    if (!res.ok) throw new Error("Fetch audio gagal: " + res.status);
    return res.arrayBuffer();
  }

  async function playWithEffects(src, voiceId, volume, userRate, onEnded, onError) {
    var sourceNode = null;
    var stopped = false;

    var stop = function() {
      stopped = true;
      try { if (sourceNode) { sourceNode.stop(); sourceNode = null; } } catch (_) {}
    };

    try {
      var ctx = getAudioContext();
      var profile = VOICE_EFFECTS[voiceId] || {};

      var arrayBuffer = await fetchArrayBuffer(src);
      if (stopped) return stop;

      var audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (stopped) return stop;

      sourceNode = ctx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      var finalRate = (profile.playbackRate || 1.0) * (userRate || 1.0);
      sourceNode.playbackRate.value = Math.max(0.1, Math.min(4.0, finalRate));
      var chain = sourceNode;

      if (profile.bass) {
        var f1 = ctx.createBiquadFilter();
        f1.type = "lowshelf";
        f1.frequency.value = profile.bass.freq;
        f1.gain.value = profile.bass.gain;
        chain.connect(f1); chain = f1;
      }

      if (profile.mid) {
        var f2 = ctx.createBiquadFilter();
        f2.type = "peaking";
        f2.frequency.value = profile.mid.freq;
        f2.Q.value = 1.2;
        f2.gain.value = profile.mid.gain;
        chain.connect(f2); chain = f2;
      }

      if (profile.treble) {
        var f3 = ctx.createBiquadFilter();
        f3.type = "highshelf";
        f3.frequency.value = profile.treble.freq;
        f3.gain.value = profile.treble.gain;
        chain.connect(f3); chain = f3;
      }

      if (profile.distortion) {
        var ws = ctx.createWaveShaper();
        ws.curve = makeDistortionCurve(profile.distortion);
        ws.oversample = "4x";
        chain.connect(ws); chain = ws;
      }

      var comp = ctx.createDynamicsCompressor();
      var c = profile.compress || {};
      comp.threshold.value = c.threshold !== undefined ? c.threshold : -24;
      comp.ratio.value     = c.ratio     !== undefined ? c.ratio     : 3;
      comp.attack.value    = c.attack    !== undefined ? c.attack    : 0.003;
      comp.release.value   = c.release   !== undefined ? c.release   : 0.25;
      comp.knee.value      = 6;
      chain.connect(comp); chain = comp;

      var masterGain = ctx.createGain();
      masterGain.gain.value = Math.max(0, Math.min(2.0, volume !== undefined ? volume : 1.0));

      if (profile.reverb && profile.reverb.wet > 0) {
        var rv = profile.reverb;
        var convolver = ctx.createConvolver();
        convolver.buffer = createReverbImpulse(ctx, rv.duration || 1.0, rv.decay || 2.0);
        var dryGain = ctx.createGain();
        dryGain.gain.value = 1 - rv.wet;
        var wetGain = ctx.createGain();
        wetGain.gain.value = rv.wet;
        chain.connect(dryGain);
        chain.connect(convolver);
        convolver.connect(wetGain);
        dryGain.connect(masterGain);
        wetGain.connect(masterGain);
      } else {
        chain.connect(masterGain);
      }

      masterGain.connect(ctx.destination);

      sourceNode.onended = function() {
        if (!stopped && typeof onEnded === "function") onEnded();
      };
      sourceNode.start(0);

    } catch (err) {
      console.error("[AudioEffects] Error:", err);
      if (!stopped && typeof onError === "function") onError(err);
    }

    return stop;
  }

  window.AudioEffectsEngine = {
    playWithEffects: playWithEffects,
    VOICE_EFFECTS: VOICE_EFFECTS,
    getAudioContext: getAudioContext
  };

  console.log("[AudioEffects] Web Audio API Effects Engine loaded. Profiles:", Object.keys(VOICE_EFFECTS).length);
})();
