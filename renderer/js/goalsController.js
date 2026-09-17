/**
 * goalsController.js
 * Dedicated, robust controller for Goal Overlay cards, Customize Modal,
 * Reset Progress, Quick Add simulation, and Interaction triggers.
 */

(function () {
  'use strict';

  const GOAL_TYPES = ['likes', 'followers', 'shares', 'subscribers', 'coins', 'viewers'];

  const DEFAULT_CONFIGS = {
    likes: {
      title: 'Gempa Bumi',
      unit: 'Likes',
      target: 5000,
      current: 0,
      font: 'Passion One',
      fontSize: 26,
      shape: 'rounded',
      barHeight: 36,
      showPercentage: true,
      bgOpacity: 85,
      bgColor: '#080B12',
      titleColor: '#F8FAFC',
      targetColor: '#94A3B8',
      barColor: 'linear-gradient(90deg, #FB7185 0%, #F43F5E 50%, #8B5CF6 100%)',
      barRemainingColor: '#151B27',
      targetAction: 'increase',
      interactionIds: []
    },
    followers: {
      title: 'Target Followers',
      unit: 'Followers',
      target: 100,
      current: 0,
      font: 'Passion One',
      fontSize: 26,
      shape: 'rounded',
      barHeight: 36,
      showPercentage: true,
      bgOpacity: 85,
      bgColor: '#080B12',
      titleColor: '#F8FAFC',
      targetColor: '#94A3B8',
      barColor: 'linear-gradient(90deg, #38BDF8 0%, #0EA5E9 50%, #0284C7 100%)',
      barRemainingColor: '#151B27',
      targetAction: 'increase',
      interactionIds: []
    },
    shares: {
      title: 'Target Shares',
      unit: 'Shares',
      target: 100,
      current: 0,
      font: 'Passion One',
      fontSize: 26,
      shape: 'rounded',
      barHeight: 36,
      showPercentage: true,
      bgOpacity: 85,
      bgColor: '#080B12',
      titleColor: '#F8FAFC',
      targetColor: '#94A3B8',
      barColor: 'linear-gradient(90deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)',
      barRemainingColor: '#151B27',
      targetAction: 'increase',
      interactionIds: []
    },
    subscribers: {
      title: 'Target Subscriber',
      unit: 'Subscribers',
      target: 50,
      current: 0,
      font: 'Passion One',
      fontSize: 26,
      shape: 'rounded',
      barHeight: 36,
      showPercentage: true,
      bgOpacity: 85,
      bgColor: '#080B12',
      titleColor: '#F8FAFC',
      targetColor: '#94A3B8',
      barColor: 'linear-gradient(135deg, #C084FC 0%, #A855F7 50%, #6366F1 100%)',
      barRemainingColor: '#151B27',
      targetAction: 'increase',
      interactionIds: []
    },
    coins: {
      title: 'Target Koin',
      unit: 'Koin',
      target: 1000,
      current: 0,
      font: 'Passion One',
      fontSize: 26,
      shape: 'rounded',
      barHeight: 36,
      showPercentage: true,
      bgOpacity: 85,
      bgColor: '#080B12',
      titleColor: '#F8FAFC',
      targetColor: '#94A3B8',
      barColor: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 50%, #D4AF37 100%)',
      barRemainingColor: '#151B27',
      targetAction: 'increase',
      interactionIds: []
    },
    viewers: {
      title: 'Target Penonton',
      unit: 'Viewers',
      target: 100,
      current: 0,
      font: 'Passion One',
      fontSize: 26,
      shape: 'rounded',
      barHeight: 36,
      showPercentage: true,
      bgOpacity: 85,
      bgColor: '#080B12',
      titleColor: '#F8FAFC',
      targetColor: '#94A3B8',
      barColor: 'linear-gradient(90deg, #00F0FF 0%, #7000FF 100%)',
      barRemainingColor: '#151B27',
      targetAction: 'increase',
      interactionIds: []
    }
  };

  let loadedGoals = {};
  let activeCustomizingGoalType = 'likes';
  let currentCustomBarColor = '';
  let tempSelectedInteractionIds = [];
  let availableInteractions = [];

  // Helper: Hex to RGBA
  function hexToRgba(hex, opacity = 1) {
    if (!hex || typeof hex !== 'string') return `rgba(8, 11, 18, ${opacity})`;
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(x => x + x).join('');
    }
    const num = parseInt(clean, 16);
    if (isNaN(num)) return `rgba(8, 11, 18, ${opacity})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // Toast message
  function showGoalToast(message, type = 'success') {
    let toast = document.getElementById('goalToastNotification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'goalToastNotification';
      toast.style.cssText = `
        position: fixed;
        bottom: 26px;
        right: 26px;
        z-index: 99999;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid rgba(255, 215, 0, 0.4);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(255, 215, 0, 0.25);
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 13.5px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0;
        transform: translateY(14px);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }
    const iconSvg = type === 'success'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    toast.innerHTML = `<span style="display:inline-flex; align-items:center;">${iconSvg}</span><span>${message}</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(14px)';
    }, 2800);
  }

  // Custom Confirmation Dialog
  function showConfirmDialog({ title = 'Konfirmasi Tindakan', message = 'Lanjutkan tindakan ini?', icon = 'warn', okText = 'Ya, Lanjutkan', cancelText = 'Batal' }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('customConfirmModal');
      const titleEl = document.getElementById('customConfirmTitle');
      const msgEl = document.getElementById('customConfirmMessage');
      const iconEl = document.getElementById('customConfirmIcon');
      const okBtn = document.getElementById('customConfirmOkBtn');
      const cancelBtn = document.getElementById('customConfirmCancelBtn');

      if (!modal) {
        resolve(window.confirm(message));
        return;
      }

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (iconEl) {
        if (icon === 'refresh' || icon === '🔄') {
          iconEl.innerHTML = `<svg class="custom-dialog-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
        } else if (icon === 'warn' || icon === '⚠️') {
          iconEl.innerHTML = `<svg class="custom-dialog-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        } else if (typeof icon === 'string' && icon.includes('<svg')) {
          iconEl.innerHTML = icon;
        } else {
          iconEl.textContent = icon;
        }
      }
      if (okBtn) okBtn.textContent = okText;
      if (cancelBtn) cancelBtn.textContent = cancelText;

      const cleanup = () => {
        modal.style.display = 'none';
        okBtn?.removeEventListener('click', onOk);
        cancelBtn?.removeEventListener('click', onCancel);
      };

      const onOk = () => {
        cleanup();
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      okBtn?.addEventListener('click', onOk);
      cancelBtn?.addEventListener('click', onCancel);
      modal.style.display = 'flex';
    });
  }

  /**
   * Load and render goal cards in the Goals tab
   */
  async function loadGoalsUI() {
    try {
      if (window.api && (window.api.getAllGoals || window.api.getGoals)) {
        const fetcher = window.api.getAllGoals || window.api.getGoals;
        loadedGoals = (await fetcher()) || {};
      }
    } catch (err) {
      console.warn('[GoalsController] Error loading goals from backend:', err);
    }

    GOAL_TYPES.forEach((type) => {
      const g = loadedGoals[type] || DEFAULT_CONFIGS[type];
      loadedGoals[type] = { ...DEFAULT_CONFIGS[type], ...g };
      renderCard(type, loadedGoals[type]);
    });
  }

  /**
   * Update DOM card representation of a single goal
   */
  function renderCard(type, goal) {
    if (!goal) return;

    // 1. Title
    const titleEl = document.getElementById(`preview_title_${type}`);
    if (titleEl) {
      titleEl.textContent = goal.title || DEFAULT_CONFIGS[type]?.title || type.toUpperCase();
      if (goal.titleColor) titleEl.style.color = goal.titleColor;
      if (goal.font) titleEl.style.fontFamily = `"${goal.font}", sans-serif`;
    }

    // 2. Count & Percent
    const current = Number(goal.current) || 0;
    const target = Math.max(1, Number(goal.target) || 100);
    const unit = goal.unit || DEFAULT_CONFIGS[type]?.unit || '';
    const pct = Math.min(100, Math.round((current / target) * 100));

    const countEl = document.getElementById(`preview_count_${type}`);
    if (countEl) {
      countEl.textContent = `${current.toLocaleString()} / ${target.toLocaleString()} ${unit}`;
      if (goal.targetColor) countEl.style.color = goal.targetColor;
      if (goal.font) countEl.style.fontFamily = `"${goal.font}", sans-serif`;
    }

    // 3. Fill bar & Badge
    const fillEl = document.getElementById(`preview_fill_${type}`);
    if (fillEl) {
      fillEl.style.width = `${pct}%`;
      const barColor = goal.barColor || goal.colors?.progress || DEFAULT_CONFIGS[type]?.barColor;
      if (barColor) {
        fillEl.style.background = barColor;
      }
    }

    const badgeEl = document.getElementById(`preview_badge_${type}`);
    if (badgeEl) {
      badgeEl.textContent = `${pct}%`;
      const showPct = goal.showPercentage !== false && goal.showPercent !== false;
      badgeEl.style.display = showPct ? 'inline-block' : 'none';
    }

    // 4. Track
    const trackEl = document.getElementById(`preview_track_${type}`);
    if (trackEl) {
      if (goal.barHeight) {
        trackEl.style.height = `${goal.barHeight}px`;
      }
      const remColor = goal.barRemainingColor || goal.colors?.remaining || '#151B27';
      trackEl.style.backgroundColor = remColor;
    }

    // 5. Container widget styling (shape, opacity, bg)
    const widgetEl = document.getElementById(`preview_widget_${type}`);
    if (widgetEl) {
      // Shape
      const shapes = ['water', 'crystal', 'neon-capsule', 'glass', 'rounded', 'pill', 'cyber', 'classic'];
      shapes.forEach(s => widgetEl.classList.remove(`shape-${s}`));
      widgetEl.classList.add(`shape-${goal.shape || 'rounded'}`);

      // Background color & opacity
      const opacity = typeof goal.bgOpacity === 'number' ? goal.bgOpacity / 100 : 0.85;
      const bgHex = goal.bgColor || goal.colors?.background || '#080B12';
      widgetEl.style.backgroundColor = hexToRgba(bgHex, opacity);
    }
  }

  /**
   * Open Customize Modal for a goal type
   */
  async function openCustomizeModal(type) {
    activeCustomizingGoalType = type;

    // Refresh data if available
    try {
      if (window.api && (window.api.getGoal || window.api.getAllGoals)) {
        const data = window.api.getGoal ? await window.api.getGoal(type) : (await window.api.getAllGoals())?.[type];
        if (data) {
          loadedGoals[type] = { ...DEFAULT_CONFIGS[type], ...data };
        }
      }
    } catch (_) {}

    const goal = loadedGoals[type] || DEFAULT_CONFIGS[type];

    // Populate inputs
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    setVal('goal_activeType', type);
    setVal('goal_font', goal.font || goal.fontFamily || 'Passion One');
    setVal('goal_fontSize', goal.fontSize || 26);
    setVal('goal_title', goal.title || '');
    setVal('goal_target', goal.target || 100);
    setVal('goal_targetAction', goal.targetAction || goal.onReached || 'increase');
    setVal('goal_shape', goal.shape || 'rounded');
    setVal('goal_barHeight', goal.barHeight || 36);

    const showPctEl = document.getElementById('goal_showPercentage');
    if (showPctEl) {
      showPctEl.checked = goal.showPercentage !== false && goal.showPercent !== false;
    }

    const opVal = typeof goal.bgOpacity === 'number' ? goal.bgOpacity : 85;
    setVal('goal_bgOpacity', opVal);
    const opText = document.getElementById('text_bgOpacity');
    if (opText) opText.textContent = `${opVal}%`;

    // Colors
    const syncColor = (colorId, btnId, textId, val) => {
      const input = document.getElementById(colorId);
      const btn = document.getElementById(btnId);
      const txt = document.getElementById(textId);
      if (input && val) input.value = val.startsWith('#') ? val : '#080B12';
      if (btn && val) btn.style.backgroundColor = val;
      if (txt && val) txt.textContent = val;
    };

    const bgCol = goal.bgColor || goal.colors?.background || '#080B12';
    syncColor('goal_bgColor', 'btn_pick_bgColor', 'text_bgColor', bgCol);

    const titleCol = goal.titleColor || goal.colors?.title || '#F8FAFC';
    syncColor('goal_titleColor', 'btn_pick_titleColor', 'text_titleColor', titleCol);

    const targetCol = goal.targetColor || goal.colors?.target || '#94A3B8';
    syncColor('goal_targetColor', 'btn_pick_targetColor', 'text_targetColor', targetCol);

    const remCol = goal.barRemainingColor || goal.colors?.remaining || '#151B27';
    syncColor('goal_barRemainingColor', 'btn_pick_barRemainingColor', 'text_barRemainingColor', remCol);

    // Progress Bar color (could be gradient or solid)
    currentCustomBarColor = goal.barColor || goal.colors?.progress || DEFAULT_CONFIGS[type]?.barColor;
    const barBtn = document.getElementById('btn_pick_barColor');
    const barTxt = document.getElementById('text_barColor');
    const barInp = document.getElementById('goal_barColor');
    if (barBtn) barBtn.style.background = currentCustomBarColor;
    if (currentCustomBarColor.startsWith('#')) {
      if (barInp) barInp.value = currentCustomBarColor;
      if (barTxt) barTxt.textContent = currentCustomBarColor;
    } else {
      if (barTxt) barTxt.textContent = 'Gradient / Custom';
    }

    // Interactions
    tempSelectedInteractionIds = Array.isArray(goal.interactionIds) ? [...goal.interactionIds] : [];
    await loadAvailableInteractions();
    renderSelectedBadges();

    // Live preview
    updateModalPreview();

    // Show modal
    const modal = document.getElementById('goalCustomizeModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * Close Customize Modal
   */
  function closeCustomizeModal() {
    const modal = document.getElementById('goalCustomizeModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Fetch available interactions from config
   */
  async function loadAvailableInteractions() {
    try {
      if (window.api && window.api.getConfig) {
        const cfg = await window.api.getConfig();
        availableInteractions = Array.isArray(cfg?.interactions) ? cfg.interactions : [];
      }
    } catch (_) {
      availableInteractions = [];
    }
  }

  /**
   * Render badges inside `#goalSelectedBadgesContainer`
   */
  function renderSelectedBadges() {
    const container = document.getElementById('goalSelectedBadgesContainer');
    if (!container) return;

    if (!tempSelectedInteractionIds || tempSelectedInteractionIds.length === 0) {
      container.innerHTML = '<span class="muted" style="font-size: 11.5px;">(Belum ada interaksi dipilih - opsional)</span>';
      return;
    }

    container.innerHTML = '';
    tempSelectedInteractionIds.forEach((id) => {
      const match = availableInteractions.find(it => String(it.id) === String(id));
      const label = match ? match.name : id;

      const badge = document.createElement('span');
      badge.className = 'goal-selected-badge';
      badge.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(34, 211, 238, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.35);
        border-radius: 6px;
        padding: 4px 9px;
        font-size: 11.5px;
        font-weight: 600;
        margin: 2px 4px 2px 0;
      `;
      badge.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="#38bdf8" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>${label}</span>
        <button type="button" class="btn-remove-goal-interaction" data-id="${id}" style="background:none; border:none; color:#94a3b8; font-size:13px; cursor:pointer; padding:0; line-height:1; display:flex; align-items:center;">&times;</button>
      `;
      container.appendChild(badge);
    });
  }

  /**
   * Update modal live preview widget with current input values
   */
  function updateModalPreview() {
    const type = activeCustomizingGoalType || 'likes';
    const goal = loadedGoals[type] || DEFAULT_CONFIGS[type];

    const titleVal = document.getElementById('goal_title')?.value || goal.title || 'Goal Target';
    const targetVal = Number(document.getElementById('goal_target')?.value) || goal.target || 100;
    const fontVal = document.getElementById('goal_font')?.value || 'Passion One';
    const fontSizeVal = document.getElementById('goal_fontSize')?.value || 26;
    const shapeVal = document.getElementById('goal_shape')?.value || 'rounded';
    const barHeightVal = document.getElementById('goal_barHeight')?.value || 36;
    const showPct = document.getElementById('goal_showPercentage')?.checked !== false;

    const opVal = Number(document.getElementById('goal_bgOpacity')?.value) || 85;
    const bgHex = document.getElementById('goal_bgColor')?.value || '#080B12';
    const titleHex = document.getElementById('goal_titleColor')?.value || '#F8FAFC';
    const targetHex = document.getElementById('goal_targetColor')?.value || '#94A3B8';
    const remHex = document.getElementById('goal_barRemainingColor')?.value || '#151B27';

    // 1. Title
    const previewTitle = document.getElementById('modal_preview_title');
    if (previewTitle) {
      previewTitle.textContent = titleVal;
      previewTitle.style.color = titleHex;
      previewTitle.style.fontFamily = `"${fontVal}", sans-serif`;
      previewTitle.style.fontSize = `${fontSizeVal}px`;
    }

    // 2. Count
    const previewCount = document.getElementById('modal_preview_count');
    if (previewCount) {
      const unit = goal.unit || '';
      const sampleCurrent = Math.round(targetVal * 0.27);
      previewCount.textContent = `${sampleCurrent.toLocaleString()} / ${targetVal.toLocaleString()} ${unit}`;
      previewCount.style.color = targetHex;
      previewCount.style.fontFamily = `"${fontVal}", sans-serif`;
    }

    // 3. Track
    const previewTrack = document.getElementById('modal_preview_track');
    if (previewTrack) {
      previewTrack.style.height = `${barHeightVal}px`;
      previewTrack.style.backgroundColor = remHex;
    }

    // 4. Fill
    const previewFill = document.getElementById('modal_preview_fill');
    if (previewFill) {
      previewFill.style.background = currentCustomBarColor || 'linear-gradient(90deg, #FB7185, #8B5CF6)';
      previewFill.style.width = '27%';
    }

    // 5. Badge
    const previewBadge = document.getElementById('modal_preview_badge');
    if (previewBadge) {
      previewBadge.style.display = showPct ? 'inline-block' : 'none';
    }

    // 6. Widget box
    const widget = document.getElementById('modal_preview_widget');
    if (widget) {
      const shapes = ['water', 'crystal', 'neon-capsule', 'glass', 'rounded', 'pill', 'cyber', 'classic'];
      shapes.forEach(s => widget.classList.remove(`shape-${s}`));
      widget.classList.add(`shape-${shapeVal}`);
      widget.style.backgroundColor = hexToRgba(bgHex, opVal / 100);
    }
  }

  /**
   * Save customized goal
   */
  async function saveCustomizeGoal() {
    const type = activeCustomizingGoalType || 'likes';
    const currentGoal = loadedGoals[type] || DEFAULT_CONFIGS[type];

    const font = document.getElementById('goal_font')?.value || 'Passion One';
    const fontSize = Number(document.getElementById('goal_fontSize')?.value) || 26;
    const title = document.getElementById('goal_title')?.value || currentGoal.title || type.toUpperCase();
    const target = Number(document.getElementById('goal_target')?.value) || currentGoal.target || 100;
    const targetAction = document.getElementById('goal_targetAction')?.value || 'increase';
    const shape = document.getElementById('goal_shape')?.value || 'rounded';
    const barHeight = Number(document.getElementById('goal_barHeight')?.value) || 36;
    const showPercentage = document.getElementById('goal_showPercentage')?.checked !== false;
    const bgOpacity = Number(document.getElementById('goal_bgOpacity')?.value) || 85;

    const bgColor = document.getElementById('goal_bgColor')?.value || '#080B12';
    const titleColor = document.getElementById('goal_titleColor')?.value || '#F8FAFC';
    const targetColor = document.getElementById('goal_targetColor')?.value || '#94A3B8';
    const barColor = currentCustomBarColor || document.getElementById('goal_barColor')?.value || currentGoal.barColor;
    const barRemainingColor = document.getElementById('goal_barRemainingColor')?.value || '#151B27';

    const updates = {
      font,
      fontFamily: font,
      fontSize,
      title,
      target,
      targetAction,
      onReached: targetAction,
      shape,
      barHeight,
      showPercentage,
      showPercent: showPercentage,
      bgOpacity,
      bgColor,
      titleColor,
      targetColor,
      barColor,
      barRemainingColor,
      colors: {
        background: bgColor,
        title: titleColor,
        target: targetColor,
        progress: barColor,
        remaining: barRemainingColor
      },
      interactionIds: [...tempSelectedInteractionIds]
    };

    try {
      if (window.api && (window.api.updateGoal || window.api.saveGoal)) {
        const updater = window.api.updateGoal || window.api.saveGoal;
        await updater(type, updates);
      }
    } catch (err) {
      console.error('[GoalsController] Error saving goal:', err);
    }

    // Update local cache & DOM
    loadedGoals[type] = { ...currentGoal, ...updates };
    renderCard(type, loadedGoals[type]);
    closeCustomizeModal();
    showGoalToast(`Goal "${title}" berhasil disimpan!`);
  }

  /**
   * Reset goal to default settings
   */
  async function resetGoalToDefaultSettings() {
    const type = activeCustomizingGoalType || 'likes';
    const confirmed = await showConfirmDialog({
      title: 'Reset Default Goal',
      message: `Kembalikan pengaturan goal "${type}" ke pengaturan bawaan awal?`,
      icon: 'refresh',
      okText: 'Ya, Reset Default',
      cancelText: 'Batal'
    });

    if (!confirmed) return;

    try {
      if (window.api && (window.api.resetGoalDefault || window.api.resetGoalToDefault)) {
        const resetter = window.api.resetGoalDefault || window.api.resetGoalToDefault;
        const res = await resetter(type);
        if (res) loadedGoals[type] = { ...DEFAULT_CONFIGS[type], ...res };
      }
    } catch (err) {
      console.error('[GoalsController] Error resetting default:', err);
    }

    if (!loadedGoals[type]) loadedGoals[type] = { ...DEFAULT_CONFIGS[type] };

    // Re-open/refresh modal inputs
    await openCustomizeModal(type);
    renderCard(type, loadedGoals[type]);
    showGoalToast(`Goal "${type}" berhasil di-reset ke default!`);
  }

  /**
   * Reset current progress count of a goal to 0
   */
  async function resetGoalProgressCount(type) {
    const goal = loadedGoals[type] || DEFAULT_CONFIGS[type];
    const name = goal.title || type.toUpperCase();

    const confirmed = await showConfirmDialog({
      title: 'Reset Hitungan Goal',
      message: `Apakah Anda yakin ingin me-reset hitungan goal "${name}" kembali ke 0?`,
      icon: 'warn',
      okText: 'Ya, Reset ke 0',
      cancelText: 'Batal'
    });

    if (!confirmed) return;

    try {
      if (window.api && (window.api.resetGoalProgress || window.api.resetGoal)) {
        const resetter = window.api.resetGoalProgress || window.api.resetGoal;
        await resetter(type);
      }
    } catch (err) {
      console.error('[GoalsController] Error resetting progress:', err);
    }

    if (loadedGoals[type]) {
      loadedGoals[type].current = 0;
    }
    renderCard(type, loadedGoals[type]);
    showGoalToast(`Hitungan goal "${name}" berhasil di-reset ke 0!`);
  }

  /**
   * Quick add progress for testing/simulation
   */
  async function quickAddGoalProgress(type, amount) {
    const num = Number(amount) || 50;
    try {
      if (window.api && window.api.addGoalProgress) {
        const res = await window.api.addGoalProgress(type, num);
        if (res) {
          loadedGoals[type] = { ...(loadedGoals[type] || DEFAULT_CONFIGS[type]), ...res };
        } else if (loadedGoals[type]) {
          loadedGoals[type].current = (Number(loadedGoals[type].current) || 0) + num;
        }
      } else if (loadedGoals[type]) {
        loadedGoals[type].current = (Number(loadedGoals[type].current) || 0) + num;
      }
    } catch (err) {
      console.error('[GoalsController] Error adding progress:', err);
      if (loadedGoals[type]) {
        loadedGoals[type].current = (Number(loadedGoals[type].current) || 0) + num;
      }
    }

    renderCard(type, loadedGoals[type]);
    showGoalToast(`+${num} ditambahkan ke goal "${type}"`);
  }

  /**
   * Open Interaction Picker Modal
   */
  async function openInteractionPicker() {
    await loadAvailableInteractions();
    const modal = document.getElementById('goalInteractionPickerModal');
    const list = document.getElementById('goalInteractionListCheckboxes');
    const search = document.getElementById('goalInteractionSearchInput');
    const count = document.getElementById('goalInteractionSelectedCount');

    if (!modal || !list) return;

    if (search) search.value = '';

    const renderList = (filterText = '') => {
      list.innerHTML = '';
      const filtered = availableInteractions.filter(it =>
        !filterText || (it.name || '').toLowerCase().includes(filterText.toLowerCase())
      );

      if (filtered.length === 0) {
        list.innerHTML = `<div class="muted" style="padding: 14px; text-align: center; font-size: 12.5px;">${
          availableInteractions.length === 0
            ? 'Belum ada aksi interaksi yang dibuat di tab Interaksi.'
            : 'Tidak ada interaksi yang cocok dengan pencarian.'
        }</div>`;
        return;
      }

      filtered.forEach(it => {
        const isChecked = tempSelectedInteractionIds.includes(String(it.id));
        const item = document.createElement('label');
        item.className = 'activity-interaction-item';
        item.style.cssText = `
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        `;
        item.innerHTML = `
          <input type="checkbox" class="chk-goal-interaction" value="${it.id}" ${isChecked ? 'checked' : ''} />
          <span style="font-size: 13px; font-weight: 500;">${it.name}</span>
        `;
        list.appendChild(item);
      });

      updateCount();
    };

    const updateCount = () => {
      if (count) {
        count.textContent = `${tempSelectedInteractionIds.length} terpilih`;
      }
    };

    renderList();
    modal.style.display = 'flex';
  }

  /**
   * Bind all event listeners
   */
  function setupEventListeners() {
    // 1. Document Click Handler (Delegated for maximum robustness)
    document.addEventListener('click', (e) => {
      // Customize Button on Card
      const custBtn = e.target.closest('.btn-customize-goal, .btn-goal-action-customize');
      if (custBtn) {
        e.preventDefault();
        const goalType = custBtn.getAttribute('data-goal') || custBtn.dataset.goal || 'likes';
        openCustomizeModal(goalType);
        return;
      }

      // Reset Progress Button on Card
      const resetBtn = e.target.closest('.btn-goal-reset-progress');
      if (resetBtn) {
        e.preventDefault();
        const goalType = resetBtn.getAttribute('data-goal') || resetBtn.dataset.goal || 'likes';
        resetGoalProgressCount(goalType);
        return;
      }

      // Quick Add Button on Card
      const quickAddBtn = e.target.closest('.btn-goal-quick-add');
      if (quickAddBtn) {
        e.preventDefault();
        const goalType = quickAddBtn.getAttribute('data-goal') || quickAddBtn.dataset.goal || 'likes';
        const amount = Number(quickAddBtn.getAttribute('data-amount') || quickAddBtn.dataset.amount) || 50;
        quickAddGoalProgress(goalType, amount);
        return;
      }

      // Remove single interaction badge
      const removeBadgeBtn = e.target.closest('.btn-remove-goal-interaction');
      if (removeBadgeBtn) {
        e.preventDefault();
        const id = removeBadgeBtn.getAttribute('data-id');
        tempSelectedInteractionIds = tempSelectedInteractionIds.filter(x => String(x) !== String(id));
        renderSelectedBadges();
        return;
      }

      // Preset Gradient buttons in Customize Modal
      const gradBtn = e.target.closest('.btn-grad-preset');
      if (gradBtn) {
        e.preventDefault();
        const grad = gradBtn.getAttribute('data-grad');
        if (grad) {
          currentCustomBarColor = grad;
          const barBtn = document.getElementById('btn_pick_barColor');
          const barTxt = document.getElementById('text_barColor');
          if (barBtn) barBtn.style.background = grad;
          if (barTxt) barTxt.textContent = 'Gradient / Custom';
          updateModalPreview();
        }
        return;
      }

      // Close modal by clicking backdrop
      const modal = document.getElementById('goalCustomizeModal');
      if (modal && e.target === modal) {
        closeCustomizeModal();
      }

      // Close interaction picker by backdrop
      const pickModal = document.getElementById('goalInteractionPickerModal');
      if (pickModal && e.target === pickModal) {
        pickModal.style.display = 'none';
      }
    });

    // 2. Customize Modal Action Buttons
    document.getElementById('btnCloseGoalModal')?.addEventListener('click', closeCustomizeModal);
    document.getElementById('btnSaveGoalCustomize')?.addEventListener('click', saveCustomizeGoal);
    document.getElementById('btnResetGoalDefault')?.addEventListener('click', resetGoalToDefaultSettings);

    // 3. Modal Inputs Realtime Listeners
    const triggerPreviewUpdate = () => updateModalPreview();

    ['goal_font', 'goal_fontSize', 'goal_title', 'goal_target', 'goal_targetAction', 'goal_shape', 'goal_barHeight', 'goal_showPercentage'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', triggerPreviewUpdate);
        el.addEventListener('change', triggerPreviewUpdate);
      }
    });

    // Opacity range slider
    const opSlider = document.getElementById('goal_bgOpacity');
    if (opSlider) {
      opSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const txt = document.getElementById('text_bgOpacity');
        if (txt) txt.textContent = `${val}%`;
        updateModalPreview();
      });
    }

    // 4. Color Pickers Wiring
    const setupColorPicker = (btnId, inputId, textId, onCustom) => {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      const txt = document.getElementById(textId);
      if (!btn || !input) return;

      btn.addEventListener('click', () => input.click());
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        btn.style.backgroundColor = val;
        btn.style.background = val;
        if (txt) txt.textContent = val;
        if (onCustom) onCustom(val);
        updateModalPreview();
      });
    };

    setupColorPicker('btn_pick_bgColor', 'goal_bgColor', 'text_bgColor');
    setupColorPicker('btn_pick_titleColor', 'goal_titleColor', 'text_titleColor');
    setupColorPicker('btn_pick_targetColor', 'goal_targetColor', 'text_targetColor');
    setupColorPicker('btn_pick_barRemainingColor', 'goal_barRemainingColor', 'text_barRemainingColor');
    setupColorPicker('btn_pick_barColor', 'goal_barColor', 'text_barColor', (hex) => {
      currentCustomBarColor = hex;
    });

    // 5. Interaction Picker Modal Buttons
    document.getElementById('btnGoalPickInteractions')?.addEventListener('click', openInteractionPicker);
    document.getElementById('btnCloseGoalInteractionPickerModal')?.addEventListener('click', () => {
      const m = document.getElementById('goalInteractionPickerModal');
      if (m) m.style.display = 'none';
    });
    document.getElementById('btnCancelGoalInteractionPicker')?.addEventListener('click', () => {
      const m = document.getElementById('goalInteractionPickerModal');
      if (m) m.style.display = 'none';
    });
    document.getElementById('btnApplyGoalInteractionPicker')?.addEventListener('click', () => {
      const list = document.getElementById('goalInteractionListCheckboxes');
      if (list) {
        const checked = list.querySelectorAll('.chk-goal-interaction:checked');
        tempSelectedInteractionIds = Array.from(checked).map(c => String(c.value));
      }
      renderSelectedBadges();
      const m = document.getElementById('goalInteractionPickerModal');
      if (m) m.style.display = 'none';
    });

    // Search filter in interaction picker
    document.getElementById('goalInteractionSearchInput')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const items = document.querySelectorAll('#goalInteractionListCheckboxes .activity-interaction-item');
      items.forEach((item) => {
        const txt = item.textContent.toLowerCase();
        item.style.display = txt.includes(q) ? 'flex' : 'none';
      });
    });

    // Checkbox change in interaction picker to update counter
    document.getElementById('goalInteractionListCheckboxes')?.addEventListener('change', () => {
      const checked = document.querySelectorAll('#goalInteractionListCheckboxes .chk-goal-interaction:checked');
      const count = document.getElementById('goalInteractionSelectedCount');
      if (count) count.textContent = `${checked.length} terpilih`;
    });

    // 6. Realtime Backend Listeners
    if (window.api && window.api.onGoalReached) {
      window.api.onGoalReached((data) => {
        if (data && data.type && loadedGoals[data.type]) {
          if (data.goal) {
            loadedGoals[data.type] = { ...loadedGoals[data.type], ...data.goal };
          }
          renderCard(data.type, loadedGoals[data.type]);
        }
      });
    }

    if (window.api && window.api.onGoalUpdate) {
      window.api.onGoalUpdate((data) => {
        if (data && data.type && loadedGoals[data.type]) {
          if (data.goal) {
            loadedGoals[data.type] = { ...loadedGoals[data.type], ...data.goal };
          }
          renderCard(data.type, loadedGoals[data.type]);
        }
      });
    }

    if (window.api && window.api.onGoalsAll) {
      window.api.onGoalsAll((allGoals) => {
        if (allGoals && typeof allGoals === 'object') {
          GOAL_TYPES.forEach((type) => {
            if (allGoals[type]) {
              loadedGoals[type] = { ...loadedGoals[type], ...allGoals[type] };
              renderCard(type, loadedGoals[type]);
            }
          });
        }
      });
    }

    // Direct synchronization with Dashboard stats in real-time
    if (window.api && window.api.onStatsUpdate) {
      window.api.onStatsUpdate((stats) => {
        if (!stats || typeof stats !== 'object') return;

        if (typeof stats.totalLikes === 'number' && loadedGoals.likes) {
          loadedGoals.likes.current = stats.totalLikes;
          renderCard('likes', loadedGoals.likes);
        }
        if (typeof stats.totalGifts === 'number' && loadedGoals.coins) {
          loadedGoals.coins.current = stats.totalGifts;
          renderCard('coins', loadedGoals.coins);
        }
        if (typeof stats.totalFollows === 'number' && loadedGoals.followers) {
          loadedGoals.followers.current = stats.totalFollows;
          renderCard('followers', loadedGoals.followers);
        }
        if (typeof stats.totalShares === 'number' && loadedGoals.shares) {
          loadedGoals.shares.current = stats.totalShares;
          renderCard('shares', loadedGoals.shares);
        }
        if (typeof stats.totalSubscribers === 'number' && loadedGoals.subscribers) {
          loadedGoals.subscribers.current = stats.totalSubscribers;
          renderCard('subscribers', loadedGoals.subscribers);
        }
        if (typeof stats.totalViewers === 'number' && loadedGoals.viewers) {
          loadedGoals.viewers.current = stats.totalViewers;
          renderCard('viewers', loadedGoals.viewers);
        }
      });
    }
  }

  // Self-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners();
      loadGoalsUI();
    });
  } else {
    setupEventListeners();
    loadGoalsUI();
  }

  // Export to window for debugging or manual reloads
  window.goalsController = {
    loadGoalsUI,
    openCustomizeModal,
    closeCustomizeModal,
    resetGoalProgressCount,
    quickAddGoalProgress
  };
})();
