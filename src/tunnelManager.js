const EventEmitter = require('events');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let cloudflaredPkg = null;
try {
  cloudflaredPkg = require('cloudflared');
} catch (_) {}

class TunnelManager extends EventEmitter {
  constructor(port = 8642, logger = null) {
    super();
    this.port = Number(port) || 8642;
    this.logger = logger;
    this.process = null;
    this.active = false;
    this.url = null;
    this.provider = null;
    this.lastError = null;

    // Custom named tunnel config if available
    this.customDomain = 'https://overlay.nurearn.site';
    this.tunnelName = 'nurearn-overlay';

    if (this.hasCustomTunnel()) {
      this.active = true;
      this.url = this.customDomain;
      this.provider = 'cloudflare (nurearn.site)';
    }
  }

  setPort(port) {
    this.port = Number(port) || 8642;
  }

  hasCustomTunnel() {
    try {
      const userHome = process.env.USERPROFILE || process.env.HOME || '';
      const creds = path.join(userHome, '.cloudflared', 'c7762626-8138-45aa-91fb-381798b61c8c.json');
      const cfg = path.join(userHome, '.cloudflared', 'config.yml');
      return fs.existsSync(creds) && fs.existsSync(cfg);
    } catch (_) {
      return false;
    }
  }

  async start() {
    if (this.active) {
      await this.stop();
    }
    this.lastError = null;

    const bin = (cloudflaredPkg && cloudflaredPkg.bin) ? cloudflaredPkg.bin : path.join(__dirname, '..', 'node_modules', 'cloudflared', 'bin', 'cloudflared.exe');

    // 1. Try Custom Permanent Tunnel (overlay.nurearn.site)
    if (this.hasCustomTunnel() && fs.existsSync(bin)) {
      try {
        if (this.logger) this.logger.info(`[TunnelManager] Menghubungkan Custom Domain permanen Cloudflare: ${this.customDomain}...`);

        return await new Promise((resolve, reject) => {
          let hasResolved = false;
          const child = spawn(bin, ['tunnel', 'run', this.tunnelName], {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
          });
          this.process = child;

          const timer = setTimeout(() => {
            if (!hasResolved) {
              hasResolved = true;
              this.active = true;
              this.url = this.customDomain;
              this.provider = 'cloudflare (nurearn.site)';
              this.emit('status', this.getStatus());
              resolve({ ok: true, url: this.url, provider: this.provider, status: this.getStatus() });
            }
          }, 4000);

          child.stderr.on('data', (data) => {
            const str = data.toString();
            if (str.includes('Registered tunnel connection')) {
              if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timer);
                this.active = true;
                this.url = this.customDomain;
                this.provider = 'cloudflare (nurearn.site)';
                if (this.logger) this.logger.info(`[TunnelManager] Custom Domain ${this.customDomain} AKTIF & TERHUBUNG!`);
                this.emit('status', this.getStatus());
                resolve({ ok: true, url: this.url, provider: this.provider, status: this.getStatus() });
              }
            }
          });

          child.on('close', (code) => {
            this.process = null;
            if (this.logger) this.logger.warn(`[TunnelManager] Process tunnel exited with code ${code}. Reconnecting in 3s...`);
            // Keep URL permanent and retry connecting in background
            if (this.hasCustomTunnel()) {
              setTimeout(() => {
                if (!this.process) {
                  this.start().catch(() => {});
                }
              }, 3000);
            } else {
              this.active = false;
              this.url = null;
              this.emit('status', this.getStatus());
            }
            if (!hasResolved) {
              clearTimeout(timer);
              reject(new Error(`Tunnel process exited with code ${code}`));
            }
          });

          child.on('error', (err) => {
            this.lastError = err.message;
            if (!hasResolved) {
              clearTimeout(timer);
              reject(err);
            }
          });
        });
      } catch (err) {
        if (this.logger) this.logger.warn(`[TunnelManager] Custom tunnel gagal, fallback ke quick tunnel: ${err.message}`);
      }
    }

    // 2. Fallback to Quick Tunnel
    if (cloudflaredPkg && cloudflaredPkg.tunnel) {
      try {
        if (this.logger) this.logger.info(`[TunnelManager] Menghubungkan Quick Cloudflare Tunnel untuk port ${this.port}...`);
        const targetUrl = `http://127.0.0.1:${this.port}`;
        const tun = cloudflaredPkg.tunnel({ '--url': targetUrl });
        this.process = tun;
        this.provider = 'cloudflare';

        const quickUrl = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Cloudflare Tunnel timeout')), 15000);
          tun.on('url', (url) => {
            clearTimeout(timeout);
            resolve(url);
          });
          tun.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        this.url = quickUrl;
        this.active = true;
        this.emit('status', this.getStatus());
        return { ok: true, url: this.url, provider: this.provider, status: this.getStatus() };
      } catch (err) {
        this.lastError = err.message;
      }
    }

    this.active = false;
    this.url = null;
    this.emit('status', this.getStatus());
    return { ok: false, error: this.lastError || 'Gagal memulai tunnel', status: this.getStatus() };
  }

  async stop() {
    this.active = false;
    this.url = null;
    this.provider = null;
    this.lastError = null;

    if (this.process) {
      try {
        if (typeof this.process.stop === 'function') {
          this.process.stop();
        } else if (typeof this.process.kill === 'function') {
          this.process.kill();
        }
      } catch (_) {}
      this.process = null;
    }

    this.emit('status', this.getStatus());
    return { ok: true, active: false, status: this.getStatus() };
  }

  getStatus() {
    return {
      active: this.active,
      url: this.url,
      provider: this.provider,
      port: this.port,
      customDomain: this.hasCustomTunnel() ? this.customDomain : null,
      error: this.lastError
    };
  }
}

module.exports = TunnelManager;