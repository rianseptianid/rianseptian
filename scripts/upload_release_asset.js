const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

async function getGitHubToken() {
  return new Promise((resolve, reject) => {
    const p = spawn('git', ['credential', 'fill']);
    p.stdin.write('protocol=https\nhost=github.com\n\n');
    let out = '';
    p.stdout.on('data', d => out += d);
    p.on('close', code => {
      if (code !== 0) return reject(new Error('git credential fill failed'));
      const passLine = out.split('\n').find(l => l.startsWith('password='));
      if (!passLine) return reject(new Error('No password/token found in git credentials'));
      resolve(passLine.replace('password=', '').trim());
    });
  });
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (_) {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function uploadAsset(uploadUrl, filePath, assetName, token) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  console.log(`[Upload] Uploading ${assetName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB) via curl...`);

  const url = uploadUrl.replace(/\{.*\}/, '') + `?name=${encodeURIComponent(assetName)}`;

  return new Promise((resolve, reject) => {
    const args = [
      '-L',
      '-X', 'POST',
      '-H', 'Accept: application/vnd.github+json',
      '-H', `Authorization: Bearer ${token}`,
      '-H', 'X-GitHub-Api-Version: 2022-11-28',
      '-H', 'Content-Type: application/octet-stream',
      '--progress-bar',
      url,
      '--data-binary', `@${filePath}`
    ];

    const cp = spawn('curl.exe', args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let responseBody = '';
    cp.stdout.on('data', d => responseBody += d);
    cp.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`curl exited with code ${code}`));
      }
      try {
        const json = JSON.parse(responseBody);
        if (json.id) resolve(json);
        else reject(new Error(responseBody));
      } catch (_) {
        resolve({ raw: responseBody });
      }
    });
  });
}

async function main() {
  try {
    console.log('[1/4] Retrieving GitHub authentication token...');
    const token = await getGitHubToken();

    const owner = 'nurearn';
    const repo = 'nurearn';
    const tag = 'v1.3.0';

    console.log(`[2/4] Fetching release details for ${owner}/${repo} tag ${tag}...`);
    const relRes = await requestJson(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'nurearn-release-uploader',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (relRes.status !== 200 || !relRes.data?.id) {
      throw new Error(`Release not found (status ${relRes.status}): ${JSON.stringify(relRes.data)}`);
    }

    const release = relRes.data;
    console.log(`      Found Release: "${release.name}" (ID: ${release.id})`);

    // Check existing assets
    if (Array.isArray(release.assets)) {
      for (const asset of release.assets) {
        if (asset.name === 'nurearn.Setup.1.3.0.exe' || asset.name === 'nurearn Setup 1.3.0.exe') {
          console.log(`[3/4] Deleting previous asset "${asset.name}" (ID: ${asset.id})...`);
          const delRes = await requestJson(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`, {
            method: 'DELETE',
            headers: {
              'User-Agent': 'nurearn-release-uploader',
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          console.log(`      Delete status: ${delRes.status}`);
        }
      }
    }

    const distFile = path.join(__dirname, '..', 'dist', 'nurearn Setup 1.3.0.exe');
    if (!fs.existsSync(distFile)) {
      throw new Error(`Executable file not found at: ${distFile}`);
    }

    console.log('[4/4] Uploading new .exe to GitHub Release...');
    // We upload as nurearn.Setup.1.3.0.exe (matching the original release asset naming)
    const uploadedAsset = await uploadAsset(release.upload_url, distFile, 'nurearn.Setup.1.3.0.exe', token);

    console.log('====================================================');
    console.log('       ✓ RELEASE ASSET UPDATED SUCCESSFULLY!        ');
    console.log(`       Release: ${release.html_url}`);
    console.log(`       Asset Name: ${uploadedAsset.name}`);
    console.log(`       Asset ID: ${uploadedAsset.id}`);
    console.log(`       Download URL: ${uploadedAsset.browser_download_url}`);
    console.log('====================================================');
  } catch (err) {
    console.error('Error uploading release asset:', err.message);
    process.exit(1);
  }
}

main();
