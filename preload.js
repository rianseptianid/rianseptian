const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // TikTok Connector
  connect: (username) => ipcRenderer.invoke('tiktok:connect', username),
  disconnect: () => ipcRenderer.invoke('tiktok:disconnect'),
  getStatus: () => ipcRenderer.invoke('tiktok:status'),
  onStatus: (cb) => ipcRenderer.on('tiktok:status', (_, d) => cb(d)),
  onEvent: (cb) => ipcRenderer.on('tiktok:event', (_, d) => cb(d)),

  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (partial) => ipcRenderer.invoke('config:update', partial),
  addTrigger: (trigger) => ipcRenderer.invoke('config:addTrigger', trigger),
  updateTrigger: (id, data) => ipcRenderer.invoke('config:updateTrigger', { id, data }),
  removeTrigger: (id) => ipcRenderer.invoke('config:removeTrigger', id),
  setTriggers: (triggers) => ipcRenderer.invoke('config:setTriggers', triggers),

  // Interactions
  addInteraction: (data) => ipcRenderer.invoke('config:addInteraction', data),
  updateInteraction: (id, data) => ipcRenderer.invoke('config:updateInteraction', { id, data }),
  removeInteraction: (id) => ipcRenderer.invoke('config:removeInteraction', id),
  resetInteractions: () => ipcRenderer.invoke('config:resetInteractions'),
  testInteraction: (data) => ipcRenderer.invoke('trigger:testInteraction', data),

  // Activities
  addActivity: (data) => ipcRenderer.invoke('config:addActivity', data),
  updateActivity: (id, data) => ipcRenderer.invoke('config:updateActivity', { id, data }),
  removeActivity: (id) => ipcRenderer.invoke('config:removeActivity', id),
  resetActivities: () => ipcRenderer.invoke('config:resetActivities'),
  resetAllTriggers: () => ipcRenderer.invoke('config:resetAllTriggers'),
  testActivity: (id) => ipcRenderer.invoke('trigger:testActivity', id),

  // Stats
  resetStats: () => ipcRenderer.invoke('config:resetStats'),
  onStatsUpdate: (cb) => ipcRenderer.on('stats:update', (_, d) => cb(d)),

  // Gifts
  getGifts: () => ipcRenderer.invoke('gift:getAll'),
  addGift: (data) => ipcRenderer.invoke('gift:add', data),
  updateGift: (id, giftData) => ipcRenderer.invoke('gift:update', { id, giftData }),
  deleteGift: (id) => ipcRenderer.invoke('gift:delete', id),

  // Presets
  getPresets: () => ipcRenderer.invoke('preset:getAll'),
  savePreset: (name, extra) => ipcRenderer.invoke('preset:save', { name, extra }),
  deletePreset: (id) => ipcRenderer.invoke('preset:delete', id),
  applyPreset: (id) => ipcRenderer.invoke('preset:apply', id),
  importPreset: () => ipcRenderer.invoke('preset:import'),
  exportPreset: (data) => ipcRenderer.invoke('preset:export', data),
  resetPureDefault: () => ipcRenderer.invoke('config:resetPureDefault'),

  // Triggers testing & events
  testTrigger: (id) => ipcRenderer.invoke('trigger:test', id),
  testTriggerActions: (actions, event, simultaneous, repeat) =>
    ipcRenderer.invoke('trigger:testActions', { actions, event, simultaneous, repeat }),
  onTriggerFired: (cb) => ipcRenderer.on('trigger:fired', (_, d) => cb(d)),
  onTriggerKey: (cb) => ipcRenderer.on('trigger:key', (_, d) => cb(d)),
  onSoundPlay: (cb) => ipcRenderer.on('sound:play', (_, d) => cb(d)),

  // Dialogs & Folder Media
  pickSoundFile: () => ipcRenderer.invoke('dialog:pickSoundFile'),
  pickMediaFile: () => ipcRenderer.invoke('dialog:pickMediaFile'),
  pickFolder: () => ipcRenderer.invoke('dialog:pickFolder'),
  listFolderMedia: (folderPath, type) => ipcRenderer.invoke('folder:listMedia', { folderPath, type }),
  addFolderFile: (targetFolder, type) => ipcRenderer.invoke('folder:addFile', { targetFolder, type }),
  openFolderInExplorer: (folderPath) => ipcRenderer.invoke('folder:openExplorer', folderPath),
  onOverlayMediaPreview: (cb) => ipcRenderer.on('overlay:mediaPreview', (_, d) => cb(d)),

  // YouTube Music
  getYoutubeQueue: () => ipcRenderer.invoke('youtube:queue'),
  getYoutubeHistory: () => ipcRenderer.invoke('youtube:history'),
  replayYoutubeSong: (data) => ipcRenderer.invoke('youtube:replaySong', data),
  getYoutubeSettings: () => ipcRenderer.invoke('youtube:settings'),
  updateYoutubeSettings: (data) => ipcRenderer.invoke('youtube:updateSettings', data),
  skipYoutubeSong: () => ipcRenderer.invoke('youtube:skip'),
  stopYoutubeSong: () => ipcRenderer.invoke('youtube:stop'),
  clearYoutubeQueue: () => ipcRenderer.invoke('youtube:clear'),
  removeYoutubeSong: (id) => ipcRenderer.invoke('youtube:remove', id),
  playYoutubeInView: (videoId, query) => ipcRenderer.invoke('youtube:playInView', videoId, query),
  youtubeViewCommand: (cmd, arg) => ipcRenderer.invoke('youtube:viewCommand', cmd, arg),
  requestYoutubeSong: (query, user) => ipcRenderer.invoke('youtube:requestSong', query, user),
  notifyYoutubeVideoEnded: () => ipcRenderer.invoke('youtube:videoEnded'),
  toggleYoutubePlayerWindow: () => ipcRenderer.invoke('youtube:togglePlayerWindow'),
  openBravePlayer: () => ipcRenderer.invoke('youtube:openBravePlayer'),
  onYoutubeQueue: (cb) => ipcRenderer.on('youtube:queue', (_, d) => cb(d)),
  onYoutubeHistory: (cb) => ipcRenderer.on('youtube:history', (_, d) => cb(d)),
  onYoutubePlay: (cb) => ipcRenderer.on('youtube:play', (_, d) => cb(d)),
  onYoutubeStop: (cb) => ipcRenderer.on('youtube:stop', () => cb()),
  onYoutubeProgress: (cb) => ipcRenderer.on('youtube:progress', (_, d) => cb(d)),
  onYoutubeState: (cb) => ipcRenderer.on('youtube:state', (_, d) => cb(d)),
  onYoutubePlayerVisibility: (cb) => ipcRenderer.on('youtube:playerVisibility', (_, d) => cb(d)),
  onYoutubeVideoEnded: (cb) => ipcRenderer.on('youtube:videoEnded', () => cb()),

  // Soundboard
  getSoundboard: () => ipcRenderer.invoke('soundboard:get'),
  addSoundboardItem: (item) => ipcRenderer.invoke('soundboard:add', item),
  updateSoundboardItem: (id, data) => ipcRenderer.invoke('soundboard:update', { id, data }),
  removeSoundboardItem: (id) => ipcRenderer.invoke('soundboard:remove', id),
  setSoundboard: (items) => ipcRenderer.invoke('soundboard:set', items),
  registerGlobalHotkeys: (items, enabled) => ipcRenderer.invoke('soundboard:registerGlobalHotkeys', { items, enabled }),
  triggerSoundboardMedia: (id) => ipcRenderer.invoke('soundboard:triggerMedia', id),
  onSoundboardTrigger: (cb) => ipcRenderer.on('soundboard:trigger', (_, d) => cb(d)),

  // Overlay
  getOverlayUrl: (type, layout) => ipcRenderer.invoke('overlay:getUrl', type, layout),
  getLocalIps: () => ipcRenderer.invoke('overlay:getLocalIps'),
  getCustomCss: (type) => ipcRenderer.invoke('overlay:getCustomCss', type),
  setCustomCss: (type, css) => ipcRenderer.invoke('overlay:setCustomCss', { type, css }),
  getTopLikeSettings: () => ipcRenderer.invoke('overlay:getTopLikeSettings'),
  setTopLikeSettings: (settings) => ipcRenderer.invoke('overlay:setTopLikeSettings', settings),
  getTopGiftSettings: () => ipcRenderer.invoke('overlay:getTopGiftSettings'),
  setTopGiftSettings: (settings) => ipcRenderer.invoke('overlay:setTopGiftSettings', settings),
  openOverlayInBrowser: (url) => ipcRenderer.invoke('overlay:openInBrowser', url),

  // Goals
  getAllGoals: () => ipcRenderer.invoke('goal:getAll'),
  getGoal: (type) => ipcRenderer.invoke('goal:get', type),
  updateGoal: (type, updates) => ipcRenderer.invoke('goal:update', { type, updates }),
  resetGoalProgress: (type) => ipcRenderer.invoke('goal:resetProgress', type),
  resetGoalDefault: (type) => ipcRenderer.invoke('goal:resetDefault', type),
  addGoalProgress: (type, amount) => ipcRenderer.invoke('goal:addProgress', { type, amount }),
  getGoalUrl: (type, layout) => ipcRenderer.invoke('goal:getUrl', type, layout),
  onGoalReached: (cb) => ipcRenderer.on('goal:reached', (_, d) => cb(d)),

  // Logs
  getLogTail: (lines) => ipcRenderer.invoke('log:tail', lines),
  clearLogs: () => ipcRenderer.invoke('log:clear'),
  onLogEntry: (cb) => ipcRenderer.on('log:entry', (_, d) => cb(d)),
  onLogCleared: (cb) => ipcRenderer.on('log:cleared', () => cb()),

  // Localhost status / Tunnel
  startTunnel: (pref) => ipcRenderer.invoke('tunnel:start', pref),
  stopTunnel: () => ipcRenderer.invoke('tunnel:stop'),
  getTunnelStatus: () => ipcRenderer.invoke('tunnel:status'),
  onTunnelStatus: (cb) => ipcRenderer.on('tunnel:status', (_, d) => cb(d)),

  // Battle Arena
  saveBattleConfig: (config) => ipcRenderer.invoke('battle:saveConfig', config),
  resetBattle: () => ipcRenderer.invoke('battle:reset'),
  testBattleGift: (data) => ipcRenderer.invoke('battle:testGift', data),

  // TTS Chat Reader
  getTtsSettings: () => ipcRenderer.invoke('tts:getSettings'),
  updateTtsSettings: (partial) => ipcRenderer.invoke('tts:updateSettings', partial),
  testTtsSpeak: (data) => ipcRenderer.invoke('tts:testSpeak', data),
  finishTtsCurrent: () => ipcRenderer.invoke('tts:finishCurrent'),
  clearTtsQueue: () => ipcRenderer.invoke('tts:clearQueue'),
  getTtsAudio: (data) => ipcRenderer.invoke('tts:getAudio', data),
  getTtsVoiceCatalog: () => ipcRenderer.invoke('tts:getVoiceCatalog'),
  installIndonesianTts: () => ipcRenderer.invoke('system:installIndoTts'),
  onTtsSpeak: (cb) => ipcRenderer.on('tts:speak', (_, d) => cb(d)),
  onTtsClear: (cb) => ipcRenderer.on('tts:clear', () => cb()),

  // Auto-Update Notifier
  onUpdateAvailable: (cb) => ipcRenderer.on('update:available', (_, d) => cb(d)),
  openRelease: (url) => ipcRenderer.invoke('update:openRelease', url),
  getAppVersion: () => ipcRenderer.invoke('update:getVersion'),

  // Generic invoke (dipakai oleh updater-ui.js dan modul lain)
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  // Generic on (dipakai oleh updater-ui.js)
  on: (channel, cb) => ipcRenderer.on(channel, (_, ...args) => cb(_, ...args))
});