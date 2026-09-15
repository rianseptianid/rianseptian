const fs = require('fs');
const path = require('path');

async function buildIcon() {
  const rootDir = path.resolve(__dirname, '..');
  const logoPath = path.join(rootDir, 'assets', 'logo.png');
  const iconIcoPath = path.join(rootDir, 'assets', 'icon.ico');
  const buildDir = path.join(rootDir, 'build');
  const buildIcoPath = path.join(buildDir, 'icon.ico');
  const iconPngPath = path.join(rootDir, 'assets', 'icon.png');
  const rendererLogoPath = path.join(rootDir, 'renderer', 'images', 'logo.png');

  if (!fs.existsSync(logoPath)) {
    console.error('[build-icon] Error: assets/logo.png not found at', logoPath);
    process.exit(1);
  }

  console.log('[build-icon] Generating Windows .ico from assets/logo.png...');
  
  let pngToIco;
  try {
    const mod = require('png-to-ico');
    pngToIco = mod.default || mod;
  } catch (err) {
    console.error('[build-icon] Error loading png-to-ico:', err.message);
    process.exit(1);
  }

  const icoBuffer = await pngToIco(logoPath);
  fs.writeFileSync(iconIcoPath, icoBuffer);
  console.log(`[build-icon] Created ${iconIcoPath} (${icoBuffer.length} bytes)`);

  // Ensure build/ directory exists and copy icon.ico there too
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  fs.writeFileSync(buildIcoPath, icoBuffer);
  console.log(`[build-icon] Created ${buildIcoPath}`);

  // Sync icon.png and renderer/images/logo.png if different
  const logoBuf = fs.readFileSync(logoPath);
  if (!fs.existsSync(iconPngPath) || !fs.readFileSync(iconPngPath).equals(logoBuf)) {
    fs.writeFileSync(iconPngPath, logoBuf);
    console.log(`[build-icon] Synced assets/icon.png`);
  }
  if (!fs.existsSync(rendererLogoPath) || !fs.readFileSync(rendererLogoPath).equals(logoBuf)) {
    fs.writeFileSync(rendererLogoPath, logoBuf);
    console.log(`[build-icon] Synced renderer/images/logo.png`);
  }

  console.log('[build-icon] Icon generation complete!');
}

buildIcon().catch(err => {
  console.error('[build-icon] Failed:', err);
  process.exit(1);
});
