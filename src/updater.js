// src/updater.js — Auto-Update Notifier for nurearn
// Cek GitHub Releases setiap 6 jam, emit event kalau ada versi baru.
// Zero dependency tambahan — pakai native Node.js https module.

const https = require('https');
const EventEmitter = require('events');

// ── Konfigurasi ─────────────────────────────────────────────────────────────
const GITHUB_OWNER  = 'nurearn';
const GITHUB_REPO   = 'nurearn';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // cek tiap 6 jam
const STARTUP_DELAY_MS  = 12 * 1000;           // tunda 12 detik setelah startup agar tidak menambah lag

// ── Semantic version parser & compare ────────────────────────────────────────
// Mendukung berbagai format penulisan tag/rilis:
// - v1.3.0
// - v.1.3.0
// - -v.1.3.0 atau -v1.0.0
// - release-v1.2.0
function parseVersion(str) {
  if (!str) return [0, 0, 0];
  // Cari kelompok angka utama, misalnya "1.3.0" dari "-v.1.3.0"
  const match = String(str).match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1], 10) || 0,
    parseInt(match[2], 10) || 0,
    parseInt(match[3], 10) || 0
  ];
}

// Return true kalau vRemote > vLocal
function isNewer(vLocal, vRemote) {
  const loc = parseVersion(vLocal);
  const rem = parseVersion(vRemote);

  for (let i = 0; i < 3; i++) {
    const l = loc[i];
    const r = rem[i];
    if (r > l) return true;
    if (r < l) return false;
  }
  return false; // versi identik
}

// ── Fetch GitHub Releases API ────────────────────────────────────────────────
function fetchLatestRelease(owner, repo) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'nurearn-auto-updater/1.0',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 404) {
            // Repo tidak ada atau tidak ada release — skip saja
            return resolve(null);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`GitHub API error: HTTP ${res.statusCode}`));
          }
          const data = JSON.parse(body);
          let tag = data.tag_name || '';
          // Kalau tag bernama 'latest', coba ekstrak nomor versi dari release name (misal: "nurearn v1.2.1")
          if (tag.toLowerCase() === 'latest' && data.name) {
            const match = data.name.match(/v?(\d+\.\d+(\.\d+)?)/i);
            if (match) tag = match[1];
          }
          resolve({
            tag: tag,
            name: data.name || data.tag_name || '',
            body: (data.body || '').slice(0, 500), // changelog snippet
            url: data.html_url || `https://github.com/${owner}/${repo}/releases/latest`,
            publishedAt: data.published_at || ''
          });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('GitHub API request timeout'));
    });

    req.on('error', err => reject(err));
    req.end();
  });
}

// ── UpdateChecker class ──────────────────────────────────────────────────────
class UpdateChecker extends EventEmitter {
  constructor(currentVersion, logger) {
    super();
    this.currentVersion = currentVersion || '0.0.0';
    this.logger = logger || console;
    this._timer = null;
    this._latestKnown = null; // cache tag terakhir yang sudah ditemukan
  }

  /**
   * Mulai pengecekan: tunda startup, lalu cek tiap CHECK_INTERVAL_MS
   */
  start() {
    this.logger.info?.(`[Updater] Aktif — versi lokal: ${this.currentVersion}, cek tiap 6 jam`);

    // Cek pertama setelah delay startup
    setTimeout(() => {
      this._check();
      // Jadwal cek berikutnya
      this._timer = setInterval(() => this._check(), CHECK_INTERVAL_MS);
    }, STARTUP_DELAY_MS);
  }

  /**
   * Hentikan pengecekan
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /**
   * Lakukan satu siklus pengecekan
   */
  async _check() {
    try {
      this.logger.info?.(`[Updater] Mengecek pembaruan dari GitHub...`);
      const release = await fetchLatestRelease(GITHUB_OWNER, GITHUB_REPO);

      if (!release || !release.tag) {
        this.logger.info?.(`[Updater] Tidak ada release ditemukan — skip`);
        return;
      }

      // Jangan spam event yang sama dua kali
      if (this._latestKnown === release.tag) return;

      if (isNewer(this.currentVersion, release.tag)) {
        this._latestKnown = release.tag;
        this.logger.info?.(`[Updater] ✨ Pembaruan tersedia: ${release.tag} (saat ini: ${this.currentVersion})`);
        this.emit('update:available', {
          currentVersion: this.currentVersion,
          latestVersion: release.tag,
          releaseName: release.name,
          changelog: release.body,
          releaseUrl: release.url,
          publishedAt: release.publishedAt
        });
      } else {
        this.logger.info?.(`[Updater] Versi sudah terbaru (${this.currentVersion})`);
      }
    } catch (err) {
      // Jangan crash app kalau gagal cek — cukup log warning
      this.logger.warn?.(`[Updater] Gagal cek pembaruan: ${err.message}`);
    }
  }
}

module.exports = UpdateChecker;
