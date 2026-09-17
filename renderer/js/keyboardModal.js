/**
 * keyboardModal.js
 * Controller untuk Popup Keyboard Lengkap (Virtual & Physical Auto-Detect)
 * Mendukung:
 * - Deteksi keyboard fisik langsung (realtime)
 * - Klik virtual keyboard di layar
 * - Kombinasi tombol (Ctrl+A, Shift+W, Alt+F4, dll.)
 * - Pengulangan tombol berurutan (A, A = 2x, W, W, Space, Space, dll.)
 * - Terhubung langsung ke Interaksi Baru (#int_key_spec) & Soundboard (#sb_key)
 */

(function () {
  let targetInput = null;
  let keySequence = [];
  let virtualModifiers = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false
  };

  let vueKeyboardState = null;

  const modal = document.getElementById('fullKeyboardModal');
  const previewContainer = document.getElementById('keyboardSequencePreview');
  const btnBackspace = document.getElementById('btnVkBackspace');
  const btnClear = document.getElementById('btnVkClear');
  const btnAddComma = document.getElementById('btnVkAddComma');
  const btnApply = document.getElementById('btnApplyKeyboardModal');
  const btnCancel = document.getElementById('btnCancelKeyboardModal');
  const btnClose = document.getElementById('btnCloseKeyboardModal');
  const virtualKeyboardBody = document.getElementById('virtualKeyboardBody');
  const modeIndicator = document.getElementById('keyboardModeIndicator');

  // Initialize Vue 3 Reactive App for Sequence Preview
  function initVueKeyboardApp() {
    if (window.Vue && document.getElementById('keyboardDisplayApp') && !vueKeyboardState) {
      try {
        const { createApp, reactive, toRef } = window.Vue;
        vueKeyboardState = reactive({
          sequence: [...keySequence],
          indicatorText: '● Deteksi Fisik Aktif'
        });

        const app = createApp({
          setup() {
            const removeKey = (index) => {
              keySequence.splice(index, 1);
              syncSequencePreview();
            };
            return {
              sequence: vueKeyboardState.sequence,
              indicatorText: toRef(vueKeyboardState, 'indicatorText'),
              removeKey
            };
          }
        });
        app.mount('#keyboardDisplayApp');
      } catch (err) {
        console.warn('[KeyboardModal] Vue 3 mount fallback to DOM:', err);
      }
    }
  }

  // Update status indicator text reactively
  function setIndicatorText(text) {
    if (vueKeyboardState) {
      vueKeyboardState.indicatorText = text;
    } else if (modeIndicator) {
      modeIndicator.textContent = text;
    }
  }

  // Mapping standard key names to cleaner display / robotjs names
  function normalizeKey(key, code) {
    if (!key) return '';
    if (key === ' ') return 'Space';
    if (key === 'Escape') return 'Escape';
    if (key === 'Control') return 'Ctrl';
    if (key === 'Shift') return 'Shift';
    if (key === 'Alt') return 'Alt';
    if (key === 'Meta') return 'Win';
    if (key === 'ArrowUp') return 'ArrowUp';
    if (key === 'ArrowDown') return 'ArrowDown';
    if (key === 'ArrowLeft') return 'ArrowLeft';
    if (key === 'ArrowRight') return 'ArrowRight';
    if (key === 'Delete') return 'Delete';
    if (key === 'Insert') return 'Insert';
    if (key === 'Home') return 'Home';
    if (key === 'End') return 'End';
    if (key === 'PageUp') return 'PageUp';
    if (key === 'PageDown') return 'PageDown';
    if (key === 'Tab') return 'Tab';
    if (key === 'Enter') return 'Enter';
    if (key === 'Backspace') return 'Backspace';
    if (key === 'CapsLock') return 'CapsLock';
    if (key === 'NumLock') return 'NumLock';
    if (key === 'ScrollLock') return 'ScrollLock';
    if (key === 'PrintScreen') return 'PrintScreen';
    if (key === 'Pause') return 'Pause';

    // Physical Numpad handling
    if (code && code.startsWith('Numpad')) {
      if (code === 'Numpad0') return 'Numpad0';
      if (code === 'Numpad1') return 'Numpad1';
      if (code === 'Numpad2') return 'Numpad2';
      if (code === 'Numpad3') return 'Numpad3';
      if (code === 'Numpad4') return 'Numpad4';
      if (code === 'Numpad5') return 'Numpad5';
      if (code === 'Numpad6') return 'Numpad6';
      if (code === 'Numpad7') return 'Numpad7';
      if (code === 'Numpad8') return 'Numpad8';
      if (code === 'Numpad9') return 'Numpad9';
      if (code === 'NumpadAdd') return 'NumpadAdd';
      if (code === 'NumpadSubtract') return 'NumpadSubtract';
      if (code === 'NumpadMultiply') return 'NumpadMultiply';
      if (code === 'NumpadDivide') return 'NumpadDivide';
      if (code === 'NumpadDecimal') return 'NumpadDecimal';
      if (code === 'NumpadEnter') return 'NumpadEnter';
      if (code === 'NumpadEqual') return 'NumpadEqual';
      return code;
    }

    // Letters: convert to uppercase
    if (/^[a-z]$/i.test(key)) {
      return key.toUpperCase();
    }

    return key;
  }

  // Fallback direct DOM render if Vue 3 is not loaded
  function renderLegacyPreview() {
    if (!previewContainer) return;
    previewContainer.innerHTML = '';

    if (keySequence.length === 0) {
      previewContainer.innerHTML = '<span class="muted" style="font-size: 13px;">(Belum ada tombol ditekan / dipilih - silakan tekan keyboard fisik atau klik tombol di bawah)</span>';
      return;
    }

    keySequence.forEach((item, index) => {
      const chip = document.createElement('div');
      chip.className = 'key-tag-chip';
      
      const label = document.createElement('span');
      label.textContent = item;
      chip.appendChild(label);

      const delBtn = document.createElement('span');
      delBtn.className = 'remove-key-tag';
      delBtn.innerHTML = '✕';
      delBtn.title = 'Hapus tombol ini';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        keySequence.splice(index, 1);
        syncSequencePreview();
      });
      chip.appendChild(delBtn);

      previewContainer.appendChild(chip);

      // Add small arrow separator if not last
      if (index < keySequence.length - 1) {
        const sep = document.createElement('span');
        sep.style.color = '#fbbf24';
        sep.style.fontWeight = '700';
        sep.style.fontSize = '12px';
        sep.style.opacity = '0.7';
        sep.textContent = '➔';
        previewContainer.appendChild(sep);
      }
    });

    // Auto scroll preview to end
    previewContainer.scrollLeft = previewContainer.scrollWidth;
  }

  // Reactive Sync for Vue 3 and Auto-scroll
  function syncSequencePreview() {
    if (vueKeyboardState) {
      vueKeyboardState.sequence.splice(0, vueKeyboardState.sequence.length, ...keySequence);
      setTimeout(() => {
        const p = document.getElementById('keyboardSequencePreview');
        if (p) p.scrollLeft = p.scrollWidth;
      }, 30);
    } else {
      renderLegacyPreview();
    }
  }

  // Animate virtual key press
  function flashVirtualKey(keyName) {
    if (!virtualKeyboardBody) return;
    const clean = String(keyName).toUpperCase();
    const btn = virtualKeyboardBody.querySelector(`[data-vk="${keyName}"]`) ||
                virtualKeyboardBody.querySelector(`[data-vk="${clean}"]`) ||
                virtualKeyboardBody.querySelector(`[data-vk="Numpad${clean}"]`) ||
                virtualKeyboardBody.querySelector(`[data-vk="${clean.replace('NUMPAD', '')}"]`) ||
                Array.from(virtualKeyboardBody.querySelectorAll('.vk-key')).find(b => {
                  const vk = b.getAttribute('data-vk') || b.textContent.trim();
                  return vk.toUpperCase() === clean || ('NUMPAD' + vk.toUpperCase()) === clean;
                });
    if (btn) {
      btn.classList.add('pressed');
      setTimeout(() => {
        btn.classList.remove('pressed');
      }, 200);
    }
  }

  // Update virtual modifier buttons highlight
  function updateModifierButtonsUI() {
    if (!virtualKeyboardBody) return;
    const ctrlBtns = virtualKeyboardBody.querySelectorAll('[data-vk="Ctrl"]');
    const altBtns = virtualKeyboardBody.querySelectorAll('[data-vk="Alt"]');
    const shiftBtns = virtualKeyboardBody.querySelectorAll('[data-vk="Shift"]');
    const metaBtns = virtualKeyboardBody.querySelectorAll('[data-vk="Meta"]');

    ctrlBtns.forEach(b => b.classList.toggle('active-mod', virtualModifiers.ctrl));
    altBtns.forEach(b => b.classList.toggle('active-mod', virtualModifiers.alt));
    shiftBtns.forEach(b => b.classList.toggle('active-mod', virtualModifiers.shift));
    metaBtns.forEach(b => b.classList.toggle('active-mod', virtualModifiers.meta));
  }

  // Add a key or combination to sequence
  function addKeyToken(baseKey, mods = null) {
    const activeMods = mods || virtualModifiers;
    const comboParts = [];

    if (activeMods.ctrl) comboParts.push('Ctrl');
    if (activeMods.alt) comboParts.push('Alt');
    if (activeMods.shift) comboParts.push('Shift');
    if (activeMods.meta) comboParts.push('Win');

    let token = '';
    if (comboParts.length > 0) {
      if (!comboParts.includes(baseKey)) {
        comboParts.push(baseKey);
      }
      token = comboParts.join('+');
    } else {
      token = baseKey;
    }

    keySequence.push(token);

    // Reset virtual modifiers after non-modifier combination added
    virtualModifiers = { ctrl: false, alt: false, shift: false, meta: false };
    updateModifierButtonsUI();

    flashVirtualKey(baseKey);
    syncSequencePreview();
  }

  // Physical Key Down Handler
  function onPhysicalKeyDown(e) {
    if (!modal || modal.style.display === 'none') return;

    // Prevent default browser shortcuts while modal is focused
    e.preventDefault();
    e.stopPropagation();

    // Check if modifier key pressed alone
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      if (e.key === 'Control') virtualModifiers.ctrl = true;
      if (e.key === 'Shift') virtualModifiers.shift = true;
      if (e.key === 'Alt') virtualModifiers.alt = true;
      if (e.key === 'Meta') virtualModifiers.meta = true;
      updateModifierButtonsUI();
      flashVirtualKey(normalizeKey(e.key));
      return;
    }

    // Physical modifiers state
    const mods = {
      ctrl: e.ctrlKey || virtualModifiers.ctrl,
      alt: e.altKey || virtualModifiers.alt,
      shift: e.shiftKey || virtualModifiers.shift,
      meta: e.metaKey || virtualModifiers.meta
    };

    const normKey = normalizeKey(e.key, e.code);
    addKeyToken(normKey, mods);
  }

  // Physical Key Up Handler (sync modifiers)
  function onPhysicalKeyUp(e) {
    if (!modal || modal.style.display === 'none') return;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      if (!e.ctrlKey) virtualModifiers.ctrl = false;
      if (!e.shiftKey) virtualModifiers.shift = false;
      if (!e.altKey) virtualModifiers.alt = false;
      if (!e.metaKey) virtualModifiers.meta = false;
      updateModifierButtonsUI();
    }
  }

  // Open Full Keyboard Modal
  function openKeyboardModal(targetEl) {
    targetInput = targetEl;
    keySequence = [];
    virtualModifiers = { ctrl: false, alt: false, shift: false, meta: false };

    // Prepopulate from existing value if any
    if (targetInput && targetInput.value) {
      const existing = targetInput.value.split(',').map(s => s.trim()).filter(Boolean);
      keySequence = [...existing];
    }

    syncSequencePreview();
    updateModifierButtonsUI();

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('show');
    }

    // Enable physical key listening
    window.addEventListener('keydown', onPhysicalKeyDown, true);
    window.addEventListener('keyup', onPhysicalKeyUp, true);
  }

  // Close Keyboard Modal
  function closeKeyboardModal() {
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
    window.removeEventListener('keydown', onPhysicalKeyDown, true);
    window.removeEventListener('keyup', onPhysicalKeyUp, true);
    targetInput = null;
  }

  // Apply Selected Keys to Target Input
  function applySelection() {
    if (!targetInput) {
      closeKeyboardModal();
      return;
    }

    const result = keySequence.join(', ');
    targetInput.value = result;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    targetInput.dispatchEvent(new Event('change', { bubbles: true }));

    // If target is interaction key spec, auto-check the Keyboard checkbox!
    if (targetInput.id === 'int_key_spec') {
      const chk = document.getElementById('int_key_enabled');
      if (chk) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    closeKeyboardModal();
  }

  // Setup Event Listeners
  function init() {
    initVueKeyboardApp();

    // 1. Virtual Keyboard Key Buttons Click
    if (virtualKeyboardBody) {
      virtualKeyboardBody.querySelectorAll('.vk-key').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const vk = btn.getAttribute('data-vk') || btn.textContent.trim();

          // Modifiers toggle
          if (vk === 'Ctrl') {
            virtualModifiers.ctrl = !virtualModifiers.ctrl;
            updateModifierButtonsUI();
            return;
          }
          if (vk === 'Alt') {
            virtualModifiers.alt = !virtualModifiers.alt;
            updateModifierButtonsUI();
            return;
          }
          if (vk === 'Shift') {
            virtualModifiers.shift = !virtualModifiers.shift;
            updateModifierButtonsUI();
            return;
          }
          if (vk === 'Meta') {
            virtualModifiers.meta = !virtualModifiers.meta;
            updateModifierButtonsUI();
            return;
          }

          // Normal key click (including Backspace and Delete)
          addKeyToken(vk);
        });
      });
    }

    // 2. Control Toolbar Buttons
    if (btnBackspace) {
      btnBackspace.addEventListener('click', () => {
        if (keySequence.length > 0) {
          keySequence.pop();
          syncSequencePreview();
        }
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        keySequence = [];
        virtualModifiers = { ctrl: false, alt: false, shift: false, meta: false };
        updateModifierButtonsUI();
        syncSequencePreview();
      });
    }

    if (btnAddComma) {
      btnAddComma.addEventListener('click', () => {
        // Visual cue or if user wants to ensure multi-sequence
        setIndicatorText('➕ Siap untuk tombol berikutnya...');
        setTimeout(() => {
          setIndicatorText('● Deteksi Fisik Aktif');
        }, 1500);
      });
    }

    // 3. Modal Actions
    if (btnApply) btnApply.addEventListener('click', applySelection);
    if (btnCancel) btnCancel.addEventListener('click', closeKeyboardModal);
    if (btnClose) btnClose.addEventListener('click', closeKeyboardModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeKeyboardModal();
      });
    }

    // 4. Hook Trigger Inputs & Buttons
    // Interaction modal triggers:
    const btnRecordKey = document.getElementById('btn_record_key');
    const intKeySpec = document.getElementById('int_key_spec');
    const btnAppendKey = document.getElementById('btn_append_key');

    if (btnRecordKey && intKeySpec) {
      btnRecordKey.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openKeyboardModal(intKeySpec);
      });
    }

    if (intKeySpec) {
      intKeySpec.addEventListener('click', (e) => {
        e.preventDefault();
        openKeyboardModal(intKeySpec);
      });
    }

    if (btnAppendKey && intKeySpec) {
      btnAppendKey.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openKeyboardModal(intKeySpec);
      });
    }

    // Soundboard modal triggers:
    const btnRecordSbKey = document.getElementById('btn_record_sb_key');
    const sbKey = document.getElementById('sb_key');

    if (btnRecordSbKey && sbKey) {
      btnRecordSbKey.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        openKeyboardModal(sbKey);
      }, true); // Capture phase to prevent old soundboard.js recorder from firing
    }

    if (sbKey) {
      sbKey.addEventListener('click', (e) => {
        e.preventDefault();
        openKeyboardModal(sbKey);
      });
    }
  }

  // Export to window
  window.openFullKeyboardModal = openKeyboardModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
