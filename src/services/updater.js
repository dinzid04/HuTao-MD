const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const axios = require('axios');
const { execFileSync, execSync } = require('child_process');
const botCtx = require('../core/context');

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const TMP_DIR = path.join(ROOT_DIR, 'tmp');
const STATE_PATH = path.join(DATA_DIR, 'update-state.json');
const IGNORE_PATH = path.join(DATA_DIR, 'update-ignore.json');
const BACKUP_ROOT = path.join(DATA_DIR, 'update-backups');

const DEFAULT_REPO = 'dinzid04/HuTao-MD';
const DEFAULT_BRANCH = 'main';
const UPSTREAM_BRAND_NAME = 'HuTao - MD';
const UPSTREAM_OWNER_NAME = 'DinzID';

const HARD_PROTECTED_ROOTS = new Set([
    'settings.js',
    'data',
    'session',
    'jadibot-session',
    'tmp',
    'bin',
    'node_modules',
    '.git',
    '.env',
    '.env.local',
    'package-lock.json'
]);

const HARD_PROTECTED_PREFIXES = [
    'data/',
    'session/',
    'jadibot-session/',
    'tmp/',
    'bin/',
    'node_modules/',
    '.git/',
    'assets/media/'
];

const UA = 'HuTao-MD-AutoUpdater/1.1';

function getRepoConfig() {
    const rawRepo = String(global.updateRepo || DEFAULT_REPO).trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '');
    const branch = String(global.updateBranch || DEFAULT_BRANCH).trim() || DEFAULT_BRANCH;
    return { repo: rawRepo || DEFAULT_REPO, branch };
}

function readJsonSafe(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_) {
        return fallback;
    }
}

function writeJsonSafe(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (_) {}
}

function getLocalChangelog() {
    return readJsonSafe(path.join(ROOT_DIR, 'CHANGELOG.json'), null);
}

function getLocalPackageVersion() {
    const pkg = readJsonSafe(path.join(ROOT_DIR, 'package.json'), {});
    return pkg.version || '1.0.0';
}

function getUpdateState() {
    const fallback = {
        currentSha: '',
        currentVersion: getLocalChangelog()?.version || getLocalPackageVersion(),
        lastNotifiedSha: '',
        lastUpdatedAt: 0,
        history: []
    };
    const stored = readJsonSafe(STATE_PATH, null);
    if (!stored || typeof stored !== 'object') return fallback;
    return { ...fallback, ...stored };
}

function saveUpdateState(patch = {}) {
    const next = { ...getUpdateState(), ...patch };
    writeJsonSafe(STATE_PATH, next);
    return next;
}

function getCustomProtectedList() {
    const list = readJsonSafe(IGNORE_PATH, []);
    return Array.isArray(list) ? [...new Set(list.map(normalizeRelPath).filter(Boolean))] : [];
}

function saveCustomProtectedList(list) {
    const cleaned = [...new Set((list || []).map(normalizeRelPath).filter(Boolean))];
    writeJsonSafe(IGNORE_PATH, cleaned);
    return cleaned;
}

function normalizeRelPath(p) {
    return String(p || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .trim();
}

function isProtectedPath(relPath, customProtected = []) {
    const norm = normalizeRelPath(relPath);
    if (!norm) return true;
    const topSegment = norm.split('/')[0];
    if (HARD_PROTECTED_ROOTS.has(norm) || HARD_PROTECTED_ROOTS.has(topSegment)) return true;
    for (const pref of HARD_PROTECTED_PREFIXES) {
        if (norm === pref.slice(0, -1) || norm.startsWith(pref)) return true;
    }
    for (const custom of customProtected) {
        if (!custom) continue;
        if (norm === custom || norm.startsWith(`${custom}/`)) return true;
    }
    return false;
}

function extractUserBranding() {
    const settingsPath = path.join(ROOT_DIR, 'settings.js');
    const brand = {
        botname: String(global._mainConfig?.botname || global.botname || '').trim(),
        namaOwner: String(global._mainConfig?.namaOwner || global.namaOwner || '').trim(),
        packname: String(global._mainConfig?.packname || global.packname || '').trim(),
        asciiName: String(global._mainConfig?.asciiName || global.asciiName || '').trim(),
        owner: String(global._mainConfig?.owner || global.owner || '').trim()
    };
    if (fs.existsSync(settingsPath)) {
        try {
            const src = fs.readFileSync(settingsPath, 'utf8');
            const pick = (key) => {
                const m = src.match(new RegExp(`global\\.${key}\\s*=\\s*['"\`]([^'"\`\\n]+)['"\`]`));
                return m ? m[1].trim() : '';
            };
            brand.botname = pick('botname') || brand.botname;
            brand.namaOwner = pick('namaOwner') || brand.namaOwner;
            brand.packname = pick('packname') || brand.packname;
            brand.asciiName = pick('asciiName') || brand.asciiName;
            brand.owner = pick('owner') || brand.owner;
        } catch (_) {}
    }
    return brand;
}

function applyBrandingPreservation(relPath, contentBuffer, userBrand) {
    const norm = normalizeRelPath(relPath);
    if (!norm.endsWith('.js')) return contentBuffer;
    if (norm === 'src/services/updater.js' || norm === 'src/plugins/owner/updatesc.js') return contentBuffer;
    if (norm.startsWith('src/plugins/obfuscator/')) return contentBuffer;
    // Skip file obfuscated / sangat besar (> 250 KB) agar tidak merusak string ter-encode
    if (contentBuffer.length > 250 * 1024) return contentBuffer;

    const customBot = userBrand?.botname && userBrand.botname !== UPSTREAM_BRAND_NAME ? userBrand.botname : '';
    const customOwner = userBrand?.namaOwner && userBrand.namaOwner !== UPSTREAM_OWNER_NAME ? userBrand.namaOwner : '';
    if (!customBot && !customOwner) return contentBuffer;

    let text = contentBuffer.toString('utf8');
    let changed = false;

    if (customBot && text.includes(UPSTREAM_BRAND_NAME)) {
        const safeBot = customBot.replace(/['"`\\]/g, '');
        text = text.replace(new RegExp(`'${UPSTREAM_BRAND_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'), `'${safeBot}'`);
        text = text.replace(new RegExp(`"${UPSTREAM_BRAND_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), `"${safeBot}"`);
        changed = true;
    }

    if (customOwner && text.includes(UPSTREAM_OWNER_NAME)) {
        const safeOwn = customOwner.replace(/['"`\\]/g, '');
        text = text.replace(new RegExp(`'${UPSTREAM_OWNER_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'), `'${safeOwn}'`);
        text = text.replace(new RegExp(`"${UPSTREAM_OWNER_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), `"${safeOwn}"`);
        changed = true;
    }

    return changed ? Buffer.from(text, 'utf8') : contentBuffer;
}

function mergeMissingSettingsKeys(upstreamSettingsPath) {
    const localSettingsPath = path.join(ROOT_DIR, 'settings.js');
    if (!fs.existsSync(localSettingsPath) || !fs.existsSync(upstreamSettingsPath)) return [];
    try {
        let localSrc = fs.readFileSync(localSettingsPath, 'utf8');
        const upSrc = fs.readFileSync(upstreamSettingsPath, 'utf8');
        const addedKeys = [];
        const lineRe = /^global\.([A-Za-z0-9_]+)\s*=\s*([^\n]+;.*)$/gm;
        let match;
        while ((match = lineRe.exec(upSrc)) !== null) {
            const key = match[1];
            const fullLine = match[0].trim();
            // Hanya tambahkan key global sederhana (1 baris) yang belum ada di settings.js user
            if (fullLine.includes('{') && !fullLine.includes('}')) continue;
            if (!new RegExp(`global\\.${key}\\s*=`).test(localSrc)) {
                const anchor = '// Auto-reload otomatis';
                const insertBlock = `${fullLine}\n`;
                if (localSrc.includes(anchor)) {
                    localSrc = localSrc.replace(anchor, `${insertBlock}\n${anchor}`);
                } else {
                    localSrc = `${localSrc.trimEnd()}\n${insertBlock}`;
                }
                addedKeys.push(key);
            }
        }
        if (addedKeys.length > 0) {
            fs.writeFileSync(localSettingsPath, localSrc, 'utf8');
        }
        return addedKeys;
    } catch (_) {
        return [];
    }
}

async function fetchRemoteUpdateInfo() {
    const { repo, branch } = getRepoConfig();
    const state = getUpdateState();
    const localChangelog = getLocalChangelog();
    const localVersion = localChangelog?.version || state.currentVersion || getLocalPackageVersion();

    const commitRes = await axios.get(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(branch)}`, {
        timeout: 20000,
        headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' }
    });
    const commitData = commitRes.data;
    const remoteSha = String(commitData?.sha || '').trim();
    if (!remoteSha) throw new Error('Gagal membaca commit terbaru dari GitHub.');

    let remoteChangelog = null;
    try {
        const clRes = await axios.get(`https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/CHANGELOG.json?t=${Date.now()}`, {
            timeout: 15000,
            headers: { 'User-Agent': UA }
        });
        if (clRes.data && typeof clRes.data === 'object') {
            remoteChangelog = clRes.data;
        }
    } catch (_) {}

    let commits = [];
    if (state.currentSha && state.currentSha !== remoteSha) {
        try {
            const cmpRes = await axios.get(
                `https://api.github.com/repos/${repo}/compare/${state.currentSha}...${remoteSha}`,
                { timeout: 15000, headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' } }
            );
            if (Array.isArray(cmpRes.data?.commits)) {
                commits = cmpRes.data.commits.slice(-8).reverse().map((c) => ({
                    sha: String(c.sha || '').slice(0, 7),
                    message: String(c.commit?.message || '').split(/\r?\n/)[0].trim(),
                    date: c.commit?.committer?.date || ''
                }));
            }
        } catch (_) {}
    }
    if (commits.length === 0) {
        commits = [{
            sha: remoteSha.slice(0, 7),
            message: String(commitData?.commit?.message || '').split(/\r?\n/)[0].trim(),
            date: commitData?.commit?.committer?.date || ''
        }];
    }

    const remoteVersion = remoteChangelog?.version || localVersion;
    const changelogDiff = Boolean(
        remoteChangelog &&
        (!localChangelog || JSON.stringify(remoteChangelog) !== JSON.stringify(localChangelog))
    );
    const hasUpdate = state.currentSha
        ? state.currentSha !== remoteSha
        : (remoteVersion !== localVersion || changelogDiff);

    return {
        repo,
        branch,
        hasUpdate,
        isFirstSync: !state.currentSha,
        localSha: state.currentSha || '',
        remoteSha,
        shortLocal: state.currentSha ? state.currentSha.slice(0, 7) : 'belum-sync',
        shortRemote: remoteSha.slice(0, 7),
        localVersion,
        remoteVersion,
        commitMessage: String(commitData?.commit?.message || '').split(/\r?\n/)[0].trim(),
        commitAuthor: commitData?.commit?.author?.name || commitData?.author?.login || 'Developer',
        commitDate: commitData?.commit?.committer?.date || '',
        changelog: remoteChangelog,
        commits
    };
}

function formatUpdateCaption(info, { mode = 'check', result = null, usedPrefix = '.' } = {}) {
    const cl = info.changelog || {};
    const added = Array.isArray(cl.added) ? cl.added.filter(Boolean) : [];
    const fixed = Array.isArray(cl.fixed) ? cl.fixed.filter(Boolean) : [];
    const changed = Array.isArray(cl.changed) ? cl.changed.filter(Boolean) : [];

    const headerMap = {
        notify: '`🔔 UPDATE SC TERSEDIA!`',
        check: info.hasUpdate ? '`📦 CEK UPDATE SCRIPT`' : '`✅ SCRIPT SUDAH TERBARU`',
        applying: '`⏳ MEMPERBARUI SCRIPT...`',
        done: '`✅ UPDATE SC BERHASIL!`'
    };

    const lines = [
        headerMap[mode] || '`📦 UPDATE SCRIPT`',
        `> ◦ *Repo :* github.com/${info.repo} (${info.branch})`,
        `> ◦ *Versi :* v${info.localVersion} ➔ *v${info.remoteVersion}*`,
        `> ◦ *Commit :* \`${info.shortLocal}\` ➔ \`${info.shortRemote}\``
    ];

    if (cl.summary) {
        lines.push(`> ◦ *Ringkasan :* ${cl.summary}`);
    }
    if (info.commitDate) {
        try {
            const d = new Date(info.commitDate);
            lines.push(`> ◦ *Tanggal :* ${d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`);
        } catch (_) {}
    }

    if (added.length > 0) {
        lines.push('', '*✨ Fitur Baru:*');
        for (const item of added) lines.push(`> • ${item}`);
    }
    if (fixed.length > 0) {
        lines.push('', '*🔧 Fitur Diperbaiki:*');
        for (const item of fixed) lines.push(`> • ${item}`);
    }
    if (changed.length > 0) {
        lines.push('', '*⚡ Peningkatan Lainnya:*');
        for (const item of changed) lines.push(`> • ${item}`);
    }

    if (Array.isArray(info.commits) && info.commits.length > 0) {
        lines.push('', '*📝 Log Commit Terbaru:*');
        for (const c of info.commits.slice(0, 5)) {
            lines.push(`> ◦ \`${c.sha}\` ${c.message}`);
        }
    }

    if (mode === 'done' && result) {
        lines.push(
            '',
            '*🛡️ Hasil Pembaruan & Proteksi:*',
            `> ◦ *File Diperbarui :* ${result.updatedCount} file`,
            `> ◦ *File Dilindungi :* ${result.skippedCount} file (settings.js, data/, session/, assets/media/ aman)`,
            `> ◦ *Renamean Bot :* ${result.brandPreserved ? `Tetap aman (${result.brandLabel})` : 'Tetap aman (default)'}`,
            `> ◦ *NPM Install :* ${result.npmRan ? 'Dependencies baru terpasang' : 'Tidak ada dependency baru'}`
        );
        if (result.addedSettingsKeys && result.addedSettingsKeys.length > 0) {
            lines.push(`> ◦ *Key Baru di settings.js :* ${result.addedSettingsKeys.join(', ')}`);
        }
        lines.push('', '_Bot akan restart otomatis dalam 3 detik untuk memuat update terbaru..._');
    } else if (mode === 'notify') {
        lines.push(
            '',
            `💡 Ketik \`${usedPrefix}updatesc\` untuk update otomatis langsung di panel (renamean & data tetap aman!).`,
            `🔕 Matikan notif otomatis: \`${usedPrefix}notifupdate off\``
        );
    } else if (mode === 'check') {
        if (info.hasUpdate) {
            lines.push(
                '',
                `💡 Ketik \`${usedPrefix}updatesc\` untuk langsung mengupdate SC ini tanpa menghapus renamean & data kamu.`
            );
        } else {
            lines.push('', `ℹ️ Tidak ada update baru. Ketik \`${usedPrefix}updatesc force\` jika ingin sinkron ulang paksa.`);
        }
    }

    return lines.join('\n');
}

function extractTarGzPureNode(tgzPath, destDir) {
    const gzBuf = fs.readFileSync(tgzPath);
    const tarBuf = zlib.gunzipSync(gzBuf);
    let offset = 0;

    while (offset + 512 <= tarBuf.length) {
        const header = tarBuf.subarray(offset, offset + 512);
        let allZero = true;
        for (let i = 0; i < 512; i++) {
            if (header[i] !== 0) { allZero = false; break; }
        }
        if (allZero) break;

        const nameRaw = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
        const prefixRaw = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
        const fullName = prefixRaw ? `${prefixRaw}/${nameRaw}` : nameRaw;
        const sizeOctal = header.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
        const fileSize = parseInt(sizeOctal || '0', 8) || 0;
        const typeFlag = String.fromCharCode(header[156] || 48);

        offset += 512;
        const dataEnd = offset + fileSize;
        const nextOffset = offset + Math.ceil(fileSize / 512) * 512;

        if (fullName && !fullName.includes('..') && typeFlag !== 'g' && typeFlag !== 'x') {
            const targetPath = path.join(destDir, fullName);
            if (typeFlag === '5') {
                fs.mkdirSync(targetPath, { recursive: true });
            } else if (typeFlag === '0' || typeFlag === '\0') {
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.writeFileSync(targetPath, tarBuf.subarray(offset, dataEnd));
            }
        }
        offset = nextOffset;
    }
}

function extractTarGz(tgzPath, destDir) {
    fs.mkdirSync(destDir, { recursive: true });
    try {
        execFileSync('tar', ['-xzf', tgzPath, '-C', destDir], { stdio: 'ignore', timeout: 60000 });
        return;
    } catch (_) {}
    extractTarGzPureNode(tgzPath, destDir);
}

function walkFiles(dir, baseDir = dir, out = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        const rel = normalizeRelPath(path.relative(baseDir, full));
        if (ent.isDirectory()) {
            walkFiles(full, baseDir, out);
        } else if (ent.isFile()) {
            out.push({ full, rel });
        }
    }
    return out;
}

function pruneOldBackups(keep = 3) {
    try {
        if (!fs.existsSync(BACKUP_ROOT)) return;
        const dirs = fs.readdirSync(BACKUP_ROOT)
            .map((name) => {
                const full = path.join(BACKUP_ROOT, name);
                const st = fs.statSync(full);
                return { name, full, mtime: st.mtimeMs };
            })
            .sort((a, b) => b.mtime - a.mtime);
        for (const old of dirs.slice(keep)) {
            try { fs.rmSync(old.full, { recursive: true, force: true }); } catch (_) {}
        }
    } catch (_) {}
}

async function applyUpdate({ force = false } = {}) {
    const info = await fetchRemoteUpdateInfo();
    if (!force && !info.hasUpdate) {
        return { upToDate: true, info };
    }

    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
    const stamp = Date.now();
    const tgzPath = path.join(TMP_DIR, `update_${stamp}.tar.gz`);
    const extractDir = path.join(TMP_DIR, `update_ext_${stamp}`);
    const backupDir = path.join(BACKUP_ROOT, `backup_${stamp}`);

    const userBrand = extractUserBranding();
    const customProtected = getCustomProtectedList();
    const oldPkgDeps = JSON.stringify(readJsonSafe(path.join(ROOT_DIR, 'package.json'), {}).dependencies || {});

    try {
        const tarballUrl = `https://api.github.com/repos/${info.repo}/tarball/${encodeURIComponent(info.branch)}`;
        const res = await axios({
            method: 'GET',
            url: tarballUrl,
            responseType: 'stream',
            timeout: 120000,
            maxRedirects: 8,
            headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' }
        });

        await new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(tgzPath);
            res.data.on('error', reject);
            writer.on('error', reject);
            writer.on('finish', resolve);
            res.data.pipe(writer);
        });

        extractTarGz(tgzPath, extractDir);

        const topDirs = fs.readdirSync(extractDir).filter((d) => fs.statSync(path.join(extractDir, d)).isDirectory());
        if (topDirs.length === 0) throw new Error('Arsip update dari GitHub kosong.');
        const repoExtractRoot = path.join(extractDir, topDirs[0]);

        const allFiles = walkFiles(repoExtractRoot);
        let updatedCount = 0;
        let skippedCount = 0;

        for (const { full, rel } of allFiles) {
            if (isProtectedPath(rel, customProtected)) {
                skippedCount++;
                continue;
            }
            const destPath = path.join(ROOT_DIR, rel);
            if (fs.existsSync(destPath)) {
                try {
                    const bkTarget = path.join(backupDir, rel);
                    fs.mkdirSync(path.dirname(bkTarget), { recursive: true });
                    fs.copyFileSync(destPath, bkTarget);
                } catch (_) {}
            }
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            const rawBuf = fs.readFileSync(full);
            const finalBuf = applyBrandingPreservation(rel, rawBuf, userBrand);
            fs.writeFileSync(destPath, finalBuf);
            updatedCount++;
        }

        const addedSettingsKeys = mergeMissingSettingsKeys(path.join(repoExtractRoot, 'settings.js'));
        pruneOldBackups(3);

        const newPkgDeps = JSON.stringify(readJsonSafe(path.join(ROOT_DIR, 'package.json'), {}).dependencies || {});
        let npmRan = false;
        if (newPkgDeps !== oldPkgDeps) {
            try {
                execSync('npm install --allow-git=all --no-audit', { cwd: ROOT_DIR, stdio: 'ignore', timeout: 180000 });
                npmRan = true;
            } catch (_) {}
        }

        const prevState = getUpdateState();
        const history = Array.isArray(prevState.history) ? prevState.history.slice(0, 9) : [];
        history.unshift({
            sha: info.remoteSha,
            version: info.remoteVersion,
            summary: info.changelog?.summary || info.commitMessage,
            updatedAt: Date.now()
        });

        saveUpdateState({
            currentSha: info.remoteSha,
            currentVersion: info.remoteVersion,
            lastNotifiedSha: info.remoteSha,
            lastUpdatedAt: Date.now(),
            history
        });

        const brandPreserved = Boolean(
            (userBrand.botname && userBrand.botname !== UPSTREAM_BRAND_NAME) ||
            (userBrand.namaOwner && userBrand.namaOwner !== UPSTREAM_OWNER_NAME)
        );
        const brandLabel = `${userBrand.botname || UPSTREAM_BRAND_NAME} / ${userBrand.namaOwner || UPSTREAM_OWNER_NAME}`;

        return {
            upToDate: false,
            info,
            updatedCount,
            skippedCount,
            addedSettingsKeys,
            npmRan,
            brandPreserved,
            brandLabel
        };
    } finally {
        try { if (fs.existsSync(tgzPath)) fs.unlinkSync(tgzPath); } catch (_) {}
        try { if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true }); } catch (_) {}
    }
}

async function checkAndNotifyOwner(sock) {
    try {
        if (!sock || typeof sock.sendMessage !== 'function') return false;
        const rootDb = botCtx.getRootDb();
        // Default OFF! Hanya jalan kalau owner mengaktifkan notifUpdate === true
        if (rootDb?.settings?.notifUpdate !== true) return false;

        const info = await fetchRemoteUpdateInfo();
        const state = getUpdateState();

        // Jika belum pernah sync sebelumnya, catat SHA saat ini sebagai baseline tanpa spam notif palsu
        if (!state.currentSha) {
            saveUpdateState({
                currentSha: info.remoteSha,
                currentVersion: info.remoteVersion,
                lastNotifiedSha: info.remoteSha
            });
            return false;
        }

        if (!info.hasUpdate || state.lastNotifiedSha === info.remoteSha) {
            return false;
        }

        const mainOwner = String(botCtx.getMainOwner() || global.owner || '').replace(/[^0-9]/g, '');
        if (!mainOwner) return false;

        const pfx = rootDb?.settings?.prefixMode === 'single' ? (rootDb?.settings?.prefix || '.') : '.';
        const caption = formatUpdateCaption(info, { mode: 'notify', usedPrefix: pfx });
        await sock.sendMessage(`${mainOwner}@s.whatsapp.net`, { text: caption });
        saveUpdateState({ lastNotifiedSha: info.remoteSha });
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = {
    getRepoConfig,
    getUpdateState,
    saveUpdateState,
    getCustomProtectedList,
    saveCustomProtectedList,
    fetchRemoteUpdateInfo,
    formatUpdateCaption,
    applyUpdate,
    checkAndNotifyOwner,
    HARD_PROTECTED_ROOTS,
    HARD_PROTECTED_PREFIXES
};
