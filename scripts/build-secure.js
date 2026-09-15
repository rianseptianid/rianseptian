const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

const rootDir = path.join(__dirname, '..');
const tempDir = path.join(rootDir, '.build-tmp');

function getAllJsFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (item !== 'node_modules' && item !== '.git' && item !== 'dist' && item !== 'scripts') {
                results = results.concat(getAllJsFiles(fullPath));
            }
        } else if (item.endsWith('.js') && !item.endsWith('.min.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

async function secureBuild() {
    console.log('====================================================');
    console.log('       STARTING SECURE PRODUCTION REBUILD           ');
    console.log('   (Target: 100% Human-Unreadable Code & Clean)     ');
    console.log('====================================================');

    // 1. Clean and create temp directory
    if (fs.existsSync(tempDir)) {
        fs.removeSync(tempDir);
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // 2. Copy necessary production files to temp directory
    const filesToCopy = [
        'main.js',
        'preload.js',
        'package.json',
        'src',
        'renderer',
        'overlay',
        'config',
        'assets',
        'scripts'
    ];

    console.log('[1/5] Copying source files to secure staging environment...');
    for (const item of filesToCopy) {
        const srcPath = path.join(rootDir, item);
        const destPath = path.join(tempDir, item);
        if (fs.existsSync(srcPath)) {
            fs.copySync(srcPath, destPath);
        }
    }

    // 3. Purge test files, private generator, logs, backups from staging
    console.log('[2/5] Purging test logs, backups, and private tools...');
    const pathsToPurge = [
        path.join(tempDir, 'config', 'backups'),
        path.join(tempDir, 'logs'),
        path.join(tempDir, 'scratch'),
        path.join(tempDir, 'test-goal.log'),
        path.join(tempDir, 'license-generator.html')
    ];
    for (const p of pathsToPurge) {
        if (fs.existsSync(p)) {
            fs.removeSync(p);
        }
    }

    // Ensure default-config in staging is 100% reset & clean
    const stagedDefaultCfgPath = path.join(tempDir, 'config', 'default-config.json');
    if (fs.existsSync(stagedDefaultCfgPath)) {
        try {
            const raw = fs.readFileSync(stagedDefaultCfgPath, 'utf8');
            const parsed = JSON.parse(raw);
            parsed.tiktokUsername = '';
            parsed.interactions = [];
            parsed.activities = [];
            parsed.triggers = [];
            parsed.presets = [];
            parsed.soundboard = [];
            parsed.stats = {
                totalGifts: 0,
                totalComments: 0,
                totalLikes: 0,
                totalViewers: 0,
                gifters: {},
                giftStats: {},
                likers: {},
                customRankA: {},
                customRankB: {}
            };
            fs.writeFileSync(stagedDefaultCfgPath, JSON.stringify(parsed, null, 2), 'utf8');
            console.log('      - Reset default-config.json to clean pure default state (kosong murni).');
        } catch (e) {
            console.warn('      - Warning: Failed to clean staged default-config.json:', e.message);
        }
    }

    // 4. Obfuscate ALL JavaScript files to make code completely unreadable
    console.log('[3/5] Obfuscating ALL source code with maximum anti-decompilation protection...');
    const allJsFiles = getAllJsFiles(tempDir);

    const nodeObfOptions = {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.85,
        deadCodeInjection: false,
        stringArray: true,
        stringArrayEncoding: ['rc4', 'base64'],
        stringArrayThreshold: 0.85,
        splitStrings: true,
        splitStringsChunkLength: 5,
        numbersToExpressions: true,
        identifierNamesGenerator: 'hexadecimal',
        simplify: true,
        target: 'node'
    };

    const browserObfOptions = {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: false,
        stringArray: true,
        stringArrayEncoding: ['rc4', 'base64'],
        stringArrayThreshold: 0.85,
        splitStrings: true,
        splitStringsChunkLength: 5,
        numbersToExpressions: true,
        identifierNamesGenerator: 'hexadecimal',
        simplify: true,
        target: 'browser'
    };

    let obfuscatedCount = 0;
    for (const file of allJsFiles) {
        const rel = path.relative(tempDir, file);
        // Do not obfuscate build-time scripts
        if (rel.startsWith('scripts')) continue;

        const isBrowser = rel.startsWith('renderer') || rel.startsWith('overlay');
        const options = isBrowser ? browserObfOptions : nodeObfOptions;

        const originalCode = fs.readFileSync(file, 'utf8');
        try {
            const obfuscated = JavaScriptObfuscator.obfuscate(originalCode, options);
            fs.writeFileSync(file, obfuscated.getObfuscatedCode(), 'utf8');
            console.log(`      ✓ Obfuscated [${isBrowser ? 'Browser' : 'Node'}]: ${rel}`);
            obfuscatedCount++;
        } catch (err) {
            console.error(`      ✗ Failed to obfuscate ${rel}:`, err.message);
        }
    }
    console.log(`      Total files obfuscated: ${obfuscatedCount}`);

    // 5. Build application icon and run electron-builder
    console.log('[4/5] Generating application icons...');
    execSync('node scripts/build-icon.js', { cwd: tempDir, stdio: 'inherit' });

    console.log('[5/5] Compiling and packaging into nurearn .exe installer...');
    const outDir = path.join(rootDir, 'dist');
    try {
        execSync(`npx electron-builder --projectDir . --win nsis -c.directories.output="${outDir}"`, {
            cwd: tempDir,
            stdio: 'inherit'
        });

        console.log('====================================================');
        console.log('       ✓ SECURE PRODUCTION BUILD SUCCEEDED!         ');
        console.log(`       Output folder: ${outDir}`);
        console.log('====================================================');
    } catch (error) {
        console.error('Build failed during electron-builder packaging:', error.message);
    } finally {
        console.log('Cleaning up temporary staging workspace...');
        fs.removeSync(tempDir);
    }
}

secureBuild();
