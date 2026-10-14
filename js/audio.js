/* ============================================================
   RealScan Pro — Sistema de Alertas Sonoras y Feedback Auditivo
   Desarrollado con Web Audio API (100% Offline, Cero Dependencias)
   ============================================================ */

(function(global) {
  'use strict';

  let audioCtx = null;
  const AUDIO_PREFS_KEY = 'realscan_audio_prefs_v1';

  function getAudioContext() {
    if (!audioCtx && (typeof window !== 'undefined')) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          audioCtx = new AudioContextClass();
        } catch (e) {
          console.warn('[RealScan Audio] No se pudo instanciar AudioContext:', e);
        }
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function() {});
    }
    return audioCtx;
  }

  // Desbloqueo de AudioContext tras el primer gesto de usuario
  if (typeof document !== 'undefined') {
    const unlockAudio = function() {
      getAudioContext();
      document.removeEventListener('click', unlockAudio, true);
      document.removeEventListener('keydown', unlockAudio, true);
      document.removeEventListener('touchstart', unlockAudio, true);
    };
    document.addEventListener('click', unlockAudio, true);
    document.addEventListener('keydown', unlockAudio, true);
    document.addEventListener('touchstart', unlockAudio, true);
  }

  function loadAudioPrefs() {
    try {
      const raw = localStorage.getItem(AUDIO_PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.enabled === 'boolean' && global.state) global.state.audioFeedbackEnabled = p.enabled;
        if (typeof p.volume === 'number' && global.state) global.state.audioVolume = Math.max(0, Math.min(1, p.volume));
      }
    } catch(e) {}
  }

  function saveAudioPrefs() {
    try {
      const st = global.state || {};
      localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify({
        enabled: !!st.audioFeedbackEnabled,
        volume: typeof st.audioVolume === 'number' ? st.audioVolume : 0.7
      }));
    } catch(e) {}
  }

  function playTone(freq, durationMs, type, startGain, endGain, delayMs) {
    const st = global.state || {};
    if (!st.audioFeedbackEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    delayMs = delayMs || 0;
    const masterVol = typeof st.audioVolume === 'number' ? st.audioVolume : 0.7;
    const startTime = ctx.currentTime + (delayMs / 1000);
    const stopTime = startTime + (durationMs / 1000);

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const g0 = Math.max(0.0001, (startGain || 0.15) * masterVol);
      const g1 = Math.max(0.0001, (endGain || 0.001) * masterVol);

      gain.gain.setValueAtTime(g0, startTime);
      gain.gain.exponentialRampToValueAtTime(g1, stopTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(stopTime);
    } catch (err) {
      console.warn('[RealScan Audio] Error al emitir tono:', err);
    }
  }

  const RealScanAudio = {
    playSuccess: function() {
      // Tono doble ascendente armónico (C5 -> E5)
      playTone(523.25, 90, 'sine', 0.12, 0.04, 0);
      playTone(659.25, 140, 'sine', 0.14, 0.001, 80);
    },

    playWarning: function() {
      // Tono suave medio de atención (A4 -> G4)
      playTone(440.0, 110, 'triangle', 0.15, 0.05, 0);
      playTone(392.0, 130, 'triangle', 0.13, 0.001, 90);
    },

    playError: function() {
      // Tono grave descendente discreto (E4 -> C4)
      playTone(329.63, 120, 'sine', 0.18, 0.06, 0);
      playTone(261.63, 180, 'sine', 0.16, 0.001, 100);
    },

    playCapture: function() {
      // Simulación de obturador suave
      playTone(800, 30, 'triangle', 0.12, 0.01, 0);
      playTone(400, 50, 'sine', 0.08, 0.001, 35);
    },

    playReceive: function() {
      // Campanilla de recepción de archivo (G5 -> C6)
      playTone(783.99, 100, 'sine', 0.13, 0.05, 0);
      playTone(1046.50, 200, 'sine', 0.16, 0.001, 85);
    },

    testAudio: function() {
      this.playReceive();
    },

    setEnabled: function(enabled) {
      if (global.state) global.state.audioFeedbackEnabled = !!enabled;
      saveAudioPrefs();
    },

    setVolume: function(volume) {
      const v = Math.max(0, Math.min(1, parseFloat(volume) || 0.7));
      if (global.state) global.state.audioVolume = v;
      saveAudioPrefs();
    },

    init: function() {
      loadAudioPrefs();
    }
  };

  global.RealScanAudio = RealScanAudio;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { RealScanAudio.init(); });
    } else {
      RealScanAudio.init();
    }
  }

})(typeof window !== 'undefined' ? window : this);
